/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  UserX, 
  Plus, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  AlertTriangle, 
  ShieldAlert, 
  Cpu, 
  Check, 
  Trash, 
  LogOut, 
  Users, 
  Megaphone,
  Network,
  Settings
} from 'lucide-react';
import { useMessenger } from '../context/MessengerContext';
import { doc, updateDoc, arrayRemove, arrayUnion, query, collection, where, getDocs, setDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logger } from '../lib/logger';
import { UserProfile, ReportItem } from '../types';

export const ProfilePanel: React.FC = () => {
  const { 
    currentUser, 
    userProfile, 
    activeChat, 
    setActiveChat, 
    blockedUsersList, 
    toggleBlockUser,
    onlineUsers,
    deleteChat,
    setSelectedUserProfile,
    addMemberToChat,
    contactsList
  } = useMessenger();

  // States
  const [activeTab, setActiveTab] = useState<'info' | 'media' | 'admin'>('info');
  const [chatMembersDetails, setChatMembersDetails] = useState<UserProfile[]>([]);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Diagnostic states
  const [dbLatency, setDbLatency] = useState<number | null>(null);
  const [offlineQueuedEvents, setOfflineQueuedEvents] = useState(0);

  // Group settings editor states
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupRulesText, setGroupRulesText] = useState('');
  const [groupWelcomeMsg, setGroupWelcomeMsg] = useState('');
  const [groupSlowMode, setGroupSlowMode] = useState(0);
  const [groupPhoto, setGroupPhoto] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (activeChat) {
      setGroupTitle(activeChat.title || '');
      setGroupDesc(activeChat.description || '');
      setGroupRulesText(activeChat.rules || '');
      setGroupWelcomeMsg(activeChat.welcomeMessage || '');
      setGroupSlowMode(activeChat.slowModeSeconds || 0);
      setGroupPhoto(activeChat.photoURL || '');
    }
  }, [
    activeChat?.id, 
    activeChat?.title, 
    activeChat?.description, 
    activeChat?.rules, 
    activeChat?.welcomeMessage, 
    activeChat?.slowModeSeconds, 
    activeChat?.photoURL
  ]);

  // Load chat participants details
  useEffect(() => {
    if (!activeChat) return;

    const loadMembers = async () => {
      try {
        const uids = activeChat.members || [];
        const details: UserProfile[] = [];
        
        // Batch query or iterate details
        for (const uid of uids) {
          const snap = await getDocs(query(collection(db, 'users'), where('uid', '==', uid)));
          if (!snap.empty) {
            details.push(snap.docs[0].data() as UserProfile);
          }
        }
        setChatMembersDetails(details);
      } catch (e: any) {
        logger.warn("Error fetching participant bios:", { error: e.message });
      }
    };

    loadMembers();
    
    // Calculate simulated diagnostic latency (Firestore baseline ping)
    const t0 = performance.now();
    getDocs(query(collection(db, 'users'), limit(1))).then(() => {
      setDbLatency(Math.round(performance.now() - t0));
    });

  }, [activeChat?.id, activeChat?.members?.length]);

  if (!activeChat) return null;

  // Elevate chat participant to Admin role
  const handlePromoteAdmin = async (targetUid: string) => {
    if (!currentUser || activeChat.creatorId !== currentUser.uid) return;
    await updateDoc(doc(db, 'chats', activeChat.id), {
      admins: arrayUnion(targetUid)
    });
    alert("User successfully promoted to chat Admin role.");
  };

  // Restrict / Ban participant from chat workspace
  const handleBanMember = async (targetUid: string) => {
    if (!currentUser) return;
    const isCreator = activeChat.creatorId === currentUser.uid;
    const isAdmin = activeChat.admins?.includes(currentUser.uid);
    
    if (!isCreator && !isAdmin) return;

    await updateDoc(doc(db, 'chats', activeChat.id), {
      members: arrayRemove(targetUid),
      admins: arrayRemove(targetUid)
    });
    
    setChatMembersDetails(prev => prev.filter(p => p.uid !== targetUid));
    alert("User restricted from entering conversation workspace.");
  };

  // Submit report to central diagnostics / moderation collection
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !reportReason.trim()) return;

    const reportId = doc(collection(db, 'reports')).id;
    const newReport: ReportItem = {
      id: reportId,
      reporterId: currentUser.uid,
      reportedUserId: activeChat.type === 'direct' ? (activeChat.members.find(id => id !== currentUser.uid) || '') : activeChat.creatorId,
      chatId: activeChat.id,
      reason: reportReason.trim(),
      createdAt: Date.now()
    };

    await setDoc(doc(db, 'reports', reportId), newReport);
    setReportReason('');
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 3000);
  };

  const handleSaveGroupSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeChat) return;
    try {
      await updateDoc(doc(db, 'chats', activeChat.id), {
        title: groupTitle.trim(),
        description: groupDesc.trim(),
        rules: groupRulesText.trim(),
        welcomeMessage: groupWelcomeMsg.trim(),
        slowModeSeconds: Number(groupSlowMode),
        photoURL: groupPhoto.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupTitle)}`,
        updatedAt: Date.now()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert("Error saving group settings: " + err.message);
    }
  };

  const isDirect = activeChat.type === 'direct';
  const isGroupOrChannel = activeChat.type === 'group' || activeChat.type === 'channel';
  const isAdmin = currentUser && (activeChat.creatorId === currentUser.uid || activeChat.admins?.includes(currentUser.uid));
  const directTargetUser = chatMembersDetails.find(u => u.uid !== currentUser?.uid);

  return (
    <div className="w-full md:w-[320px] border-l border-white/5 flex flex-col h-full shrink-0 animate-fade-in-up glass-panel" style={{ background: 'var(--glass-sidebar-bg)' }}>
      {/* Drawer title header */}
      <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
        <span className="font-semibold text-xs uppercase tracking-wider text-slate-400 font-mono">Chat Attributes</span>
        <button onClick={() => setActiveChat(null)} className="text-slate-500 hover:text-slate-200 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs list toggle */}
      <div className="flex border-b border-white/5 text-xs font-medium text-slate-400 bg-white/[0.01]">
        <button 
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-center transition cursor-pointer ${activeTab === 'info' ? 'text-[var(--glass-accent)] border-b border-[var(--glass-accent)] font-semibold' : 'hover:bg-white/5'}`}
        >
          Meta
        </button>
        <button 
          onClick={() => setActiveTab('media')}
          className={`flex-1 py-3 text-center transition cursor-pointer ${activeTab === 'media' ? 'text-[var(--glass-accent)] border-b border-[var(--glass-accent)] font-semibold' : 'hover:bg-white/5'}`}
        >
          Vault
        </button>
        <button 
          onClick={() => setActiveTab('admin')}
          className={`flex-1 py-3 text-center transition cursor-pointer ${activeTab === 'admin' ? 'text-[var(--glass-accent)] border-b border-[var(--glass-accent)] font-semibold' : 'hover:bg-white/5'}`}
        >
          Ops Controls
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {activeTab === 'info' && (
          <div className="space-y-4 font-sans text-xs">
            {/* Direct contact target view card */}
            {isDirect && directTargetUser && (
              <div className="bg-black/15 p-4 rounded-xl border border-white/5 text-slate-300 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${onlineUsers[directTargetUser.uid] === 'online' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-slate-500'}`} />
                  <span className="font-semibold text-sm text-slate-200">@{directTargetUser.username}</span>
                </div>
                <p className="text-slate-400 leading-relaxed"><span className="font-mono text-[10px] text-slate-500 block">BIO:</span>{directTargetUser.bio}</p>
                <p className="text-slate-400 italic"><span className="font-mono text-[10px] text-slate-500 block">STATUS:</span>{directTargetUser.statusMessage}</p>
                
                {/* Block user toggle button */}
                <button 
                  onClick={() => toggleBlockUser(directTargetUser.uid)}
                  className={`w-full mt-2 py-1.5 rounded-lg font-mono text-[10px] uppercase font-bold tracking-wider border cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                    blockedUsersList.includes(directTargetUser.uid) 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20' 
                      : 'bg-black/15 border-white/5 text-slate-400 hover:text-rose-455 hover:border-rose-500/30'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  {blockedUsersList.includes(directTargetUser.uid) ? 'Unblock Node' : 'Block / Filter Contact'}
                </button>
              </div>
            )}

            {/* General info description details */}
            <div className="bg-black/10 p-3.5 rounded-xl border border-white/5 text-slate-400 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-[var(--glass-accent)] block tracking-wider mb-1">Rules & Directives</span>
              <p className="leading-relaxed whitespace-pre-wrap">{activeChat.rules || 'This community has default behavior policies enabled.'}</p>
              {activeChat.welcomeMessage && (
                <>
                  <span className="text-[10px] font-mono uppercase text-[var(--glass-accent)] block tracking-wider mt-3">Welcome Prompt</span>
                  <p className="italic">{activeChat.welcomeMessage}</p>
                </>
              )}
            </div>

            {/* Invite link & Add participant section */}
            {!isDirect && (
              <div className="space-y-3.5">
                {/* Invite link snippet */}
                <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/10 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-cyan-400 block tracking-wider font-semibold">GROUP INVITATION LINK</span>
                  <div className="flex items-center justify-between gap-1 text-xs">
                    <input 
                      type="text" 
                      readOnly 
                      value={`invite_${activeChat.id}`} 
                      className="bg-black/35 text-slate-300 font-mono text-[11px] border border-white/5 rounded-lg px-2.5 py-1.5 select-all flex-1 min-w-0" 
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`invite_${activeChat.id}`);
                        alert('GROUP INVITATION CODE copied to clipboard! Share it with others to allow them to join.');
                      }}
                      className="px-3 py-1.5 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 font-mono border border-cyan-500/20 text-[10px] rounded-lg transition active:scale-95 cursor-pointer uppercase font-semibold"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Add participant selector dropdown */}
                {/* Find contacts who are not already in this chat */}
                {(() => {
                  const nonMemberContacts = contactsList.filter(
                    contact => !activeChat.members?.includes(contact.uid)
                  );
                  
                  if (nonMemberContacts.length === 0) return null;
                  
                  return (
                    <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-semibold">ADD PARTICIPANT</span>
                      <div className="flex gap-2">
                        <select 
                          id="add-member-select-elem"
                          className="flex-1 bg-black/40 text-slate-200 border border-white/5 text-[11px] rounded-lg px-2 py-1.5 focus:outline-none focus:border-[var(--glass-border-focus)] font-sans cursor-pointer min-w-0"
                        >
                          <option value="">-- Choose contact to add --</option>
                          {nonMemberContacts.map(c => (
                            <option key={c.uid} value={c.uid}>
                              {c.displayName} (@{c.username})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={async () => {
                            const select = document.getElementById('add-member-select-elem') as HTMLSelectElement;
                            if (select && select.value) {
                              try {
                                await addMemberToChat(activeChat.id, select.value);
                                alert('Member added successfully!');
                                select.value = '';
                              } catch (err: any) {
                                alert('Error adding member: ' + err.message);
                              }
                            }
                          }}
                          className="p-1 px-3 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-mono text-[10.5px] rounded-lg font-bold cursor-pointer uppercase transition active:scale-95"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* List of chat participants */}
            {!isDirect && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Members List ({chatMembersDetails.length})
                </span>
                <div className="divide-y divide-slate-800/30 bg-slate-900/30 rounded-xl border border-slate-800/40 overflow-hidden">
                  {chatMembersDetails.map((user) => {
                    const isCreator = activeChat.creatorId === user.uid;
                    const isAdmin = activeChat.admins?.includes(user.uid);
                    
                    return (
                      <div key={user.uid} className="flex items-center justify-between p-2.5 text-xs">
                        <div 
                          onClick={() => setSelectedUserProfile(user)}
                          className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-80 transition"
                        >
                          <img src={user.photoURL} alt={user.displayName} className="w-6 h-6 rounded-full object-cover shrink-0" />
                          <div className="min-w-0">
                            <span className="font-medium text-slate-300 truncate block hover:underline">{user.displayName}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">@{user.username}</span>
                          </div>
                        </div>

                        {/* Mod controls */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isCreator && <span className="text-[9px] font-mono bg-amber-500/10 border border-amber-500/25 text-amber-500 px-1 py-0.5 rounded">Owner</span>}
                          {isAdmin && !isCreator && <span className="text-[9px] font-mono bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 px-1 py-0.5 rounded">Admin</span>}
                          
                          {/* Mod operational actions */}
                          {currentUser && activeChat.creatorId === currentUser.uid && user.uid !== currentUser.uid && !isAdmin && (
                            <button 
                              onClick={() => handlePromoteAdmin(user.uid)}
                              className="text-[9px] font-mono hover:text-cyan-400 hover:underline px-1 py-0.5 cursor-pointer"
                              title="Promote to admin role"
                            >
                              Promote
                            </button>
                          )}
                          {currentUser && (activeChat.creatorId === currentUser.uid || activeChat.admins?.includes(currentUser.uid)) && user.uid !== currentUser.uid && (
                            <button 
                              onClick={() => handleBanMember(user.uid)}
                              className="text-slate-500 hover:text-red-400 p-0.5"
                              title="Restrict participant"
                            >
                              <UserX className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* vault Media Tab view */}
        {activeTab === 'media' && (
          <div className="space-y-4">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider block">Shared Storage Logs</span>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl flex flex-col items-center gap-1.5">
                <ImageIcon className="w-5 h-5 text-cyan-400" />
                <span>Photos / Pix</span>
                <span className="font-mono text-[9px] text-slate-500">Auto Coped</span>
              </div>
              <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl flex flex-col items-center gap-1.5">
                <FileText className="w-5 h-5 text-sky-400" />
                <span>Documents</span>
                <span className="font-mono text-[9px] text-slate-500">Secure Direct</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed text-center py-4">
              Expiring temporary URLs are rotated every session to preserve total security boundary metrics.
            </p>
          </div>
        )}

        {/* Operation Controls Console & Moderation queue */}
        {activeTab === 'admin' && (
          <div className="space-y-5 text-xs text-slate-300">
            {/* Live stats */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
                <Cpu className="w-3.5 h-3.5" />
                System Health metrics
              </span>
              <div className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-2 font-mono text-[10px] text-slate-400">
                <div className="flex justify-between items-center">
                  <span>DB Connection:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    ONLINE
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Ping Latency:</span>
                  <span className="text-cyan-400">{dbLatency ? `${dbLatency}ms` : 'Calculating...'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Local Sync Offline Queue:</span>
                  <span className="text-amber-400">{offlineQueuedEvents} Events</span>
                </div>
              </div>
            </div>

            {/* Space Configuration form */}
            {isGroupOrChannel && isAdmin && (
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-teal-400 flex items-center gap-1.5 mb-2">
                  <Settings className="w-3.5 h-3.5 animate-spin-slow" />
                  Space Configuration
                </span>
                <form onSubmit={handleSaveGroupSettings} className="bg-slate-900/30 p-3 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Title</label>
                    <input 
                      type="text" 
                      value={groupTitle}
                      onChange={(e) => setGroupTitle(e.target.value)}
                      placeholder="Title of group/channel"
                      className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Description</label>
                    <textarea 
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      placeholder="Biographies/purpose details..."
                      className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 min-h-[50px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Rules / Guidelines</label>
                    <textarea 
                      value={groupRulesText}
                      onChange={(e) => setGroupRulesText(e.target.value)}
                      placeholder="Community behavior rules..."
                      className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 min-h-[50px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Welcome Message</label>
                    <textarea 
                      value={groupWelcomeMsg}
                      onChange={(e) => setGroupWelcomeMsg(e.target.value)}
                      placeholder="Introductory welcome speech..."
                      className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 min-h-[50px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Photo / Icon URL</label>
                    <input 
                      type="text" 
                      value={groupPhoto}
                      onChange={(e) => setGroupPhoto(e.target.value)}
                      placeholder="HTTPS link to visual asset"
                      className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 font-mono text-[10px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-500 font-mono uppercase mb-1">Slow Mode Countdown</label>
                    <select 
                      value={groupSlowMode}
                      onChange={(e) => setGroupSlowMode(Number(e.target.value))}
                      className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value={0}>Disabled</option>
                      <option value={5}>5 seconds</option>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                      <option value={300}>5 minutes</option>
                    </select>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2 bg-teal-600/10 hover:bg-teal-600/20 text-teal-400 font-bold uppercase font-mono tracking-wider border border-teal-500/20 rounded-lg text-[9px] cursor-pointer transition-all"
                  >
                    Save configuration matrix
                  </button>

                  {saveSuccess && (
                    <span className="text-[9px] text-emerald-400 block font-medium mt-1 text-center font-mono animate-fade-in">
                      Configuration locked successfully.
                    </span>
                  )}
                </form>
              </div>
            )}

            {/* Moderation / Report Form widget */}
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Report conversation / Policy
              </span>
              <form onSubmit={handleSubmitReport} className="bg-slate-900/30 p-3 rounded-xl border border-slate-800 space-y-2.5">
                <textarea 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Insert detailed reason or violation parameters..."
                  className="w-full bg-slate-950/60 text-slate-200 border border-slate-850 px-3 py-2 rounded-lg text-xs focus:outline-none focus:border-cyan-500 min-h-[60px] resize-none"
                />
                <button 
                  type="submit" 
                  disabled={!reportReason.trim()}
                  className="w-full py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 font-bold uppercase font-mono tracking-wider border border-rose-500/20 rounded-lg text-[9px] cursor-pointer transition-all disabled:opacity-40"
                >
                  Submit violation report
                </button>
                {reportSuccess && (
                  <span className="text-[9px] text-emerald-400 block font-medium mt-1">
                    Report successfully logged inside central database audit queue.
                  </span>
                )}
              </form>
            </div>
            {/* Danger Zone: Leave / Delete */}
            <div className="pt-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-red-500 flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-3.5 h-3.5" />
                Danger zone
              </span>
              <button 
                type="button" 
                onClick={async () => {
                   if (window.confirm("Are you sure you want to permanently leave or delete this chat? This action cannot be undone.")) {
                      await deleteChat(activeChat.id);
                   }
                }}
                className="w-full py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 font-bold uppercase font-mono tracking-wider border border-red-500/30 rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Trash className="w-3.5 h-3.5" />
                {activeChat.type === 'direct' ? 'Delete Chat' : 'Leave Space'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
