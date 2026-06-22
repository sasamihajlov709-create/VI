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
  Settings,
  Link,
  Clock,
  VolumeX,
  Volume2,
  ShieldAlert as ShieldIcon,
  Crown,
  UserCheck,
  CheckCircle2,
  Lock,
  Unlock
} from 'lucide-react';
import { useMessenger } from '../context/MessengerContext';
import { doc, updateDoc, arrayRemove, arrayUnion, query, collection, where, getDocs, setDoc, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logger } from '../lib/logger';
import { UserProfile, ReportItem, CustomInviteLink, JoinRequest, AdminAction } from '../types';

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
    contactsList,
    updateChatDetails,
    updateMemberRole,
    kickMember,
    banMember,
    unbanMember,
    muteMember,
    unmuteMember,
    generateInviteLink,
    revokeInviteLink,
    handleJoinRequest,
    isRightPanelOpen,
    setIsRightPanelOpen
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
  const [groupIsPublic, setGroupIsPublic] = useState(false);
  const [groupUsername, setGroupUsername] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Custom invites and Join requests states
  const [activeInvites, setActiveInvites] = useState<CustomInviteLink[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [showInviteCreator, setShowInviteCreator] = useState(false);
  const [inviteUsageLimit, setInviteUsageLimit] = useState<number | ''>('');
  const [inviteExpiresHours, setInviteExpiresHours] = useState<number | ''>('');
  const [createdLinkInfo, setCreatedLinkInfo] = useState<CustomInviteLink | null>(null);

  // Inline member editing states
  const [editingMemberUid, setEditingMemberUid] = useState<string | null>(null);
  const [memberMuteMinutes, setMemberMuteMinutes] = useState<number>(15);

  const handleCreateInviteLink = async () => {
    if (!currentUser || !activeChat) return;
    try {
      const link = await generateInviteLink(
        activeChat.id,
        inviteUsageLimit === '' ? undefined : inviteUsageLimit,
        inviteExpiresHours === '' ? undefined : inviteExpiresHours
      );
      setCreatedLinkInfo(link);
      alert('Custom invite link successfully generated and registered!');
    } catch (e: any) {
      alert('Failed to generate invite link: ' + e.message);
    }
  };

  useEffect(() => {
    if (activeChat) {
      setGroupTitle(activeChat.title || '');
      setGroupDesc(activeChat.description || '');
      setGroupRulesText(activeChat.rules || '');
      setGroupWelcomeMsg(activeChat.welcomeMessage || '');
      setGroupSlowMode(activeChat.slowModeSeconds || 0);
      setGroupPhoto(activeChat.photoURL || '');
      setGroupIsPublic(activeChat.isPublic || false);
      setGroupUsername(activeChat.username || '');
    }
  }, [
    activeChat?.id, 
    activeChat?.title, 
    activeChat?.description, 
    activeChat?.rules, 
    activeChat?.welcomeMessage, 
    activeChat?.slowModeSeconds, 
    activeChat?.photoURL,
    activeChat?.isPublic,
    activeChat?.username
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

  // Real-time invites and join requests listener
  useEffect(() => {
    if (!activeChat || activeChat.type === 'direct') return;

    const invitesQuery = query(collection(db, 'invites'), where('chatId', '==', activeChat.id), where('isRevoked', '==', false));
    const unsubscribeInvites = onSnapshot(invitesQuery, (snap) => {
      const list: CustomInviteLink[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as CustomInviteLink);
      });
      setActiveInvites(list);
    }, (error) => {
      console.warn("Permission error on snapshots (expected if not admin):", error);
    });

    const reqsQuery = query(collection(db, 'joinRequests'), where('chatId', '==', activeChat.id), where('status', '==', 'pending'));
    const unsubscribeReqs = onSnapshot(reqsQuery, (snap) => {
      const list: JoinRequest[] = [];
      snap.forEach((doc) => {
        list.push(doc.data() as JoinRequest);
      });
      setPendingRequests(list);
    }, (error) => {
      console.warn("Permission error on snapshots:", error);
    });

    return () => {
      unsubscribeInvites();
      unsubscribeReqs();
    };
  }, [activeChat?.id]);

  if (!activeChat) return null;

  // Elevate chat participant to Admin role
  const handlePromoteAdmin = async (targetUid: string, targetName: string) => {
    if (!currentUser) return;
    try {
      await updateMemberRole(activeChat.id, targetUid, 'admin', targetName);
      alert("User successfully promoted to chat Admin role.");
    } catch (e: any) {
      alert("Failed to promote user: " + e.message);
    }
  };

  // Restrict / Ban participant from chat workspace
  const handleBanMember = async (targetUid: string, targetName: string) => {
    if (!currentUser) return;
    try {
      await banMember(activeChat.id, targetUid, targetName);
      setChatMembersDetails(prev => prev.filter(p => p.uid !== targetUid));
      alert("User restricted/banned from entering conversation workspace.");
    } catch (e: any) {
      alert("Failed to ban member: " + e.message);
    }
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
      await updateChatDetails(activeChat.id, {
        title: groupTitle.trim(),
        description: groupDesc.trim(),
        rules: groupRulesText.trim(),
        welcomeMessage: groupWelcomeMsg.trim(),
        slowModeSeconds: Number(groupSlowMode),
        photoURL: groupPhoto.trim() || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(groupTitle)}`,
        isPublic: groupIsPublic,
        username: groupUsername.trim()
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
        <button onClick={() => setIsRightPanelOpen(false)} className="text-slate-500 hover:text-slate-200 cursor-pointer">
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
              <div className="space-y-4">
                {/* Invite link snippet */}
                <div className="p-3.5 bg-cyan-950/20 border border-cyan-500/10 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block tracking-wider font-semibold">GROUP INVITATION CODES</span>
                  </div>
                  
                  {/* Default code */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Primary Access Code:</span>
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <input 
                        type="text" 
                        readOnly 
                        value={`invite_${activeChat.id}`} 
                        className="bg-black/35 text-slate-300 font-mono text-[11.5px] border border-white/5 rounded-lg px-2.5 py-1.5 select-all flex-1 min-w-0" 
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`invite_${activeChat.id}`);
                          alert('GROUP INVITATION CODE copied to clipboard!');
                        }}
                        className="px-3 py-1.5 bg-cyan-900/40 hover:bg-cyan-800 text-cyan-300 font-mono border border-cyan-500/20 text-[10px] rounded-lg transition active:scale-95 cursor-pointer uppercase font-semibold shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Custom invite builder */}
                  {currentUser && (activeChat.creatorId === currentUser.uid || activeChat.admins?.includes(currentUser.uid)) && (
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <button 
                        type="button"
                        onClick={() => setShowInviteCreator(!showInviteCreator)}
                        className="w-full py-1 text-center font-mono text-[10px] hover:text-cyan-300 border border-dashed border-white/5 hover:border-cyan-500/25 rounded-md text-slate-400 cursor-pointer flex items-center justify-center gap-1 transition"
                      >
                        <Link className="w-3 h-3" />
                        {showInviteCreator ? 'Close Link Builder' : 'Build Custom Invite Link'}
                      </button>

                      {showInviteCreator && (
                        <div className="bg-black/20 p-2.5 rounded-lg border border-white/5 space-y-2.5 animate-fade-in-up">
                          <div>
                            <label className="block text-[8px] font-mono text-slate-500 uppercase mb-0.5">Use limit count</label>
                            <select 
                              value={inviteUsageLimit} 
                              onChange={(e) => setInviteUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-slate-950/60 text-slate-300 border border-slate-800 rounded px-2 py-1 text-[10px] cursor-pointer"
                            >
                              <option value="">Unlimited Uses</option>
                              <option value={1}>1 time use</option>
                              <option value={5}>5 times use</option>
                              <option value={10}>10 times use</option>
                              <option value={50}>50 times use</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[8px] font-mono text-slate-500 uppercase mb-0.5">Expires After</label>
                            <select 
                              value={inviteExpiresHours} 
                              onChange={(e) => setInviteExpiresHours(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-full bg-slate-950/60 text-slate-300 border border-slate-800 rounded px-2 py-1 text-[10px] cursor-pointer"
                            >
                              <option value="">Never Expires</option>
                              <option value={1}>1 Hour</option>
                              <option value={12}>12 Hours</option>
                              <option value={24}>24 Hours</option>
                              <option value={168}>7 Days</option>
                            </select>
                          </div>

                          <button 
                            type="button" 
                            onClick={handleCreateInviteLink}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-slate-950 font-bold uppercase font-mono text-[9px] py-1.5 rounded transition"
                          >
                            Generate Custom Link
                          </button>

                          {createdLinkInfo && (
                            <div className="p-2 bg-slate-900/60 rounded border border-cyan-500/10 font-mono text-[9px] text-cyan-400 space-y-1 mt-1 break-all select-all">
                              <div>Created Active URL:</div>
                              <div className="text-slate-200 select-all p-1 bg-black/40 rounded truncate">
                                https://vi-messenger.app/join/{createdLinkInfo.id}
                              </div>
                              <button 
                                type="button" 
                                onClick={() => {
                                  navigator.clipboard.writeText(`https://vi-messenger.app/join/${createdLinkInfo.id}`);
                                  alert('Custom invite URL copied!');
                                }}
                                className="text-[8px] hover:underline block uppercase text-right w-full font-bold pt-0.5"
                              >
                                Copy Dynamic URL
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* List of active custom invite links */}
                      {activeInvites.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[9px] text-slate-500 font-mono uppercase block">Active Custom Links ({activeInvites.length}):</span>
                          <div className="max-h-[100px] overflow-y-auto space-y-1 divide-y divide-white/5 pr-1">
                            {activeInvites.map((inv) => (
                              <div key={inv.id} className="flex items-center justify-between py-1 text-[9px] font-mono select-none">
                                <div className="text-slate-300 truncate max-w-[140px]" title={inv.id}>
                                  URL ID: {inv.id.substring(0, 8)}...
                                  <div className="text-[8px] text-slate-500">
                                    Uses: {inv.usageCount}/{inv.usageLimit || '∞'} 
                                    {inv.expiresAt ? ` • Exp: ${new Date(inv.expiresAt).toLocaleDateString()}` : ''}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(`https://vi-messenger.app/join/${inv.id}`);
                                      alert('Copied custom URL!');
                                    }}
                                    className="px-1 py-0.5 hover:bg-slate-800 rounded text-cyan-400 font-bold"
                                  >
                                    Copy
                                  </button>
                                  <button 
                                    type="button"
                                    onClick={async () => {
                                      await revokeInviteLink(inv.id);
                                    }}
                                    className="px-1 py-0.5 hover:bg-rose-950 hover:text-rose-400 text-slate-500 rounded"
                                    title="Revoke active link"
                                  >
                                    Revoke
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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

            {/* List of chat participants with Hierarchical Controls */}
            {!isDirect && (
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Members List ({chatMembersDetails.length})
                </span>
                <div className="divide-y divide-slate-800/30 bg-slate-900/40 rounded-xl border border-white/5 overflow-hidden">
                  {chatMembersDetails.map((user) => {
                    const isCreator = activeChat.creatorId === user.uid;
                    const isAdmin = activeChat.admins?.includes(user.uid);
                    const isModerator = activeChat.moderatorIds?.includes(user.uid);
                    const isRestricted = activeChat.restrictedIds?.includes(user.uid);
                    
                    const mutedUntilTime = activeChat.mutedUntil?.[user.uid] || 0;
                    const isMuted = activeChat.mutedIds?.includes(user.uid) || (mutedUntilTime > Date.now());

                    // Calculate hierarchy power values for safe permissions gating
                    const viewerPower = 
                      currentUser?.uid === activeChat.creatorId ? 4 : 
                      activeChat.admins?.includes(currentUser?.uid || '') ? 3 : 
                      activeChat.moderatorIds?.includes(currentUser?.uid || '') ? 2 : 1;

                    const targetPower = 
                      activeChat.creatorId === user.uid ? 4 : 
                      activeChat.admins?.includes(user.uid) ? 3 : 
                      activeChat.moderatorIds?.includes(user.uid) ? 2 : 
                      activeChat.restrictedIds?.includes(user.uid) ? 0 : 1;

                    const isEditable = targetPower < viewerPower && user.uid !== currentUser?.uid;

                    return (
                      <div key={user.uid} className="p-2.5 transition hover:bg-white/[0.01]">
                        <div className="flex items-center justify-between text-xs">
                          <div 
                            onClick={() => setSelectedUserProfile(user)}
                            className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-85"
                          >
                            <img src={user.photoURL || undefined} alt={user.displayName} className="w-6.5 h-6.5 rounded-full object-cover shrink-0 border border-white/5" />
                            <div className="min-w-0">
                              <span className="font-medium text-slate-200 truncate block hover:underline">{user.displayName}</span>
                              <span className="text-[9.5px] text-slate-400 font-mono block">@{user.username}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 select-none">
                            {isCreator && <span className="text-[8.5px] font-mono bg-amber-500/10 border border-amber-500/25 text-amber-500 px-1 py-0.5 rounded flex items-center gap-0.5"><Crown className="w-2.5 h-2.5" />Owner</span>}
                            {isAdmin && !isCreator && <span className="text-[8.5px] font-mono bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 px-1 py-0.5 rounded flex items-center gap-0.5"><ShieldIcon className="w-2.5 h-2.5" />Admin</span>}
                            {isModerator && <span className="text-[8.5px] font-mono bg-teal-500/10 border border-teal-500/25 text-teal-400 px-1 py-0.5 rounded">Mod</span>}
                            {isRestricted && <span className="text-[8.5px] font-mono bg-rose-500/10 border border-rose-500/25 text-rose-400 px-1 py-0.5 rounded">Restricted</span>}
                            {isMuted && <span className="text-[8.5px] font-mono bg-slate-500/20 text-slate-400 px-1 py-0.5 rounded flex items-center gap-0.5" title={mutedUntilTime ? `Timed mute until ${new Date(mutedUntilTime).toLocaleTimeString()}` : 'Muted indefinitely'}><VolumeX className="w-2.5 h-2.5" />Muted</span>}

                            {isEditable && (
                              <button 
                                type="button"
                                onClick={() => setEditingMemberUid(editingMemberUid === user.uid ? null : user.uid)}
                                className={`p-1.5 rounded-md border text-[10px] font-mono cursor-pointer transition ${
                                  editingMemberUid === user.uid 
                                    ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' 
                                    : 'bg-black/20 border-white/5 hover:border-slate-500 hover:text-slate-200'
                                }`}
                              >
                                Manage
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expandable Inline Mod Controls */}
                        {editingMemberUid === user.uid && (
                          <div className="mt-2.5 p-3.5 bg-black/45 rounded-xl border border-white/5 space-y-3.5 animate-fade-in-up font-sans">
                            <span className="text-[9.5px] font-mono uppercase text-slate-400 block tracking-wider font-semibold border-b border-white/5 pb-1 flex items-center gap-1">
                              <Settings className="w-3 h-3 text-cyan-400" />
                              OPERATIONS PANEL: {user.displayName}
                            </span>
                            
                            {/* Role Dropdown Selector */}
                            {viewerPower >= 3 && (
                              <div className="space-y-1">
                                <label className="block text-[8.5px] font-mono text-slate-500 uppercase">Modify Space Privilege Role:</label>
                                <select 
                                  value={isCreator ? 'owner' : isAdmin ? 'admin' : isModerator ? 'moderator' : isRestricted ? 'restricted' : 'member'} 
                                  onChange={async (e) => {
                                    const val = e.target.value as 'admin' | 'moderator' | 'member' | 'restricted';
                                    try {
                                      await updateMemberRole(activeChat.id, user.uid, val, user.displayName);
                                      alert("Privilege role adjusted successfully.");
                                    } catch (err: any) {
                                      alert("Failed to adjust role: " + err.message);
                                    }
                                  }}
                                  className="w-full bg-slate-950/60 text-slate-300 border border-slate-800 rounded px-2 py-1 text-[11px] cursor-pointer"
                                >
                                  <option value="member">Normal Member</option>
                                  <option value="moderator">Community Moderator</option>
                                  {viewerPower === 4 && <option value="admin">Space Administrator</option>}
                                  <option value="restricted">Restricted Member (Read-only)</option>
                                </select>
                              </div>
                            )}

                            {/* Mutes manager */}
                            <div className="space-y-1.5">
                              <label className="block text-[8.5px] font-mono text-slate-500 uppercase">Mute Timer Adjustment:</label>
                              {isMuted ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await unmuteMember(activeChat.id, user.uid, user.displayName);
                                      alert("User unmuted.");
                                    } catch (err: any) {
                                      alert("Error unmuting user: " + err.message);
                                    }
                                  }}
                                  className="w-full py-1.5 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 font-mono text-[9px] uppercase font-bold tracking-wider rounded cursor-pointer"
                                >
                                  Unmute / Allow Voice
                                </button>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex gap-1.5">
                                    <select 
                                      value={memberMuteMinutes} 
                                      onChange={(e) => setMemberMuteMinutes(Number(e.target.value))}
                                      className="flex-1 bg-slate-950/60 text-slate-300 border border-slate-800 rounded px-2 py-1 text-[10px] cursor-pointer font-sans"
                                    >
                                      <option value={15}>15 Minutes</option>
                                      <option value={60}>1 Hour</option>
                                      <option value={1440}>1 Day</option>
                                      <option value={10080}>1 Week</option>
                                      <option value={0}>Forever / Permanent</option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        try {
                                          await muteMember(activeChat.id, user.uid, user.displayName, memberMuteMinutes);
                                          alert("User speaking access suspended.");
                                        } catch (err: any) {
                                          alert("Error muting: " + err.message);
                                        }
                                      }}
                                      className="p-1 px-3 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 font-bold font-mono text-[9px] uppercase tracking-wider rounded cursor-pointer"
                                    >
                                      Mute
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Kicks and Bans */}
                            <div className="flex gap-2 pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`Kick ${user.displayName} from this conversation workspace?`)) {
                                    try {
                                      await kickMember(activeChat.id, user.uid, user.displayName);
                                      setChatMembersDetails(prev => prev.filter(p => p.uid !== user.uid));
                                      setEditingMemberUid(null);
                                      alert("User removed.");
                                    } catch (err: any) {
                                      alert("Error kicking member: " + err.message);
                                    }
                                  }
                                }}
                                className="flex-1 py-1.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 font-mono text-[9px] uppercase font-bold tracking-wider rounded cursor-pointer"
                              >
                                Remove / Kick
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (window.confirm(`Ban ${user.displayName} from this conversation? They will not be able to re-join unless unbanned.`)) {
                                    try {
                                      await handleBanMember(user.uid, user.displayName);
                                      setEditingMemberUid(null);
                                    } catch (err: any) {
                                      alert("Error banning member: " + err.message);
                                    }
                                  }
                                }}
                                className="flex-1 py-1.5 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 font-mono text-[9px] uppercase font-bold tracking-wider rounded cursor-pointer"
                              >
                                Ban Space
                              </button>
                            </div>
                          </div>
                        )}
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

                  {/* Public visibility with username alias */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block tracking-wider font-semibold">Privacy Discoverability</span>
                    <div className="flex items-center justify-between py-1 bg-black/25 px-2.5 py-1.5 rounded-lg border border-white/5">
                      <span className="text-[11px] text-slate-300">Public Space (Searchable Handle)</span>
                      <button
                        type="button"
                        onClick={() => setGroupIsPublic(!groupIsPublic)}
                        className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${groupIsPublic ? 'bg-cyan-500' : 'bg-slate-800'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform duration-200 transform ${groupIsPublic ? 'translate-x-4' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {groupIsPublic && (
                      <div className="animate-fade-in-up mt-1.5">
                        <label className="block text-[8.5px] text-slate-500 font-mono uppercase mb-1">Space Custom Handle (Username)</label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-slate-500 font-mono text-xs">@</span>
                          <input 
                            type="text" 
                            value={groupUsername}
                            onChange={(e) => setGroupUsername(e.target.value)}
                            placeholder="vi_handle_address"
                            className="w-full bg-slate-950/60 text-slate-200 border border-slate-800 pl-6 pr-2.5 py-1.5 rounded-lg text-xs focus:outline-none focus:border-cyan-500 font-mono text-cyan-400"
                          />
                        </div>
                      </div>
                    )}
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

                {/* Live Join Approval Queue */}
                {pendingRequests.length > 0 && (
                  <div className="space-y-2.5 bg-black/15 p-3.5 rounded-xl border border-white/5 mt-4">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Join Requests queue ({pendingRequests.length})
                    </span>
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 divide-y divide-white/5">
                      {pendingRequests.map((req) => (
                        <div key={req.id} className="pt-2 text-[11px] space-y-1.5">
                          <div className="flex items-center gap-2">
                            <img src={req.userPhotoURL || undefined} alt="User Avatar" className="w-5 h-5 rounded-full object-cover shrink-0" />
                            <span className="font-semibold text-slate-200 truncate">{req.userDisplayName}</span>
                          </div>
                          {req.reason && <p className="text-[10px] text-slate-400 leading-relaxed italic">" {req.reason} "</p>}
                          <div className="flex gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await handleJoinRequest(req.id, 'approved');
                                  alert('Request approved!');
                                } catch (e: any) {
                                  alert('Approval failed: ' + e.message);
                                }
                              }}
                              className="flex-1 py-1 bg-emerald-600/10 hover:bg-emerald-600/30 text-emerald-400 font-mono text-[9px] uppercase font-bold tracking-wider rounded border border-emerald-500/10 transition cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await handleJoinRequest(req.id, 'rejected');
                                  alert('Request rejected.');
                                } catch (e: any) {
                                  alert('Rejection failed: ' + e.message);
                                }
                              }}
                              className="flex-1 py-1 bg-rose-600/10 hover:bg-rose-600/30 text-rose-400 font-mono text-[9px] uppercase font-bold tracking-wider rounded border border-rose-500/10 transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Admin Audit Action logs timeline */}
                {activeChat.adminActionsHistory && activeChat.adminActionsHistory.length > 0 && (
                  <div className="space-y-2 bg-black/15 p-3.5 rounded-xl border border-white/5 mt-4">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-teal-400 flex items-center gap-1.5">
                      <ShieldIcon className="w-3.5 h-3.5" />
                      MOD HISTORY AUDIT LOG ({activeChat.adminActionsHistory.length})
                    </span>
                    <div className="max-h-[120px] overflow-y-auto space-y-1.5 font-mono text-[9px] text-slate-400 pr-1 divide-y divide-white/5">
                      {[...activeChat.adminActionsHistory].reverse().map((log: AdminAction) => {
                        const timeStr = new Date(log.timestamp).toLocaleTimeString();
                        return (
                          <div key={log.id} className="pt-1.5 leading-tight">
                            <span className="text-slate-500">[{timeStr}]</span> <span className="text-cyan-400">{log.adminName}</span> <span className="text-amber-500 uppercase">{log.action}</span> <span className="text-slate-200">{log.targetName}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
