/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX, 
  Camera, 
  RefreshCw,
  ShieldAlert,
  Radio,
  UserCheck
} from 'lucide-react';
import { useMessenger } from '../context/MessengerContext';
import { doc, updateDoc, onSnapshot, arrayUnion } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { logger } from '../lib/logger';

export const CallScreen: React.FC = () => {
  const { 
    currentUser, 
    activeCall, 
    dialerCall, 
    acceptCall, 
    rejectCall, 
    endCall 
  } = useMessenger();

  // Active call targets
  const ongoingCall = activeCall || dialerCall;

  // WebRTC Ref objects
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(ongoingCall?.type === 'voice');
  const [callDuration, setCallDuration] = useState(0);

  // Call duration calculator hook
  useEffect(() => {
    if (!ongoingCall || ongoingCall.status !== 'connected') {
      setCallDuration(0);
      return;
    }
    const interval = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [ongoingCall?.status]);

  // WebRTC Signaling and Capture orchestration effect
  useEffect(() => {
    if (!ongoingCall) return;

    let pc: RTCPeerConnection;
    let localMediaStream: MediaStream;

    const setupRTC = async () => {
      try {
        // 1. Get User Media Tracks
        const videoConstraint = ongoingCall.type === 'video' ? { width: 640, height: 480 } : false;
        localMediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: true
        });
        
        localStreamRef.current = localMediaStream;
        setLocalStream(localMediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localMediaStream;
        }

        // 2. Initialize Peer Connection
        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });
        peerConnectionRef.current = pc;

        // 3. Attach local media tracks
        localMediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, localMediaStream);
        });

        // 4. Remote track received callback
        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // 5. Gather ICE Candidates list
        pc.onicecandidate = async (event) => {
          if (event.candidate && ongoingCall.id) {
            const candidateKey = ongoingCall.callerId === currentUser?.uid ? 'callerCandidates' : 'receiverCandidates';
            await updateDoc(doc(db, 'calls', ongoingCall.id), {
              [candidateKey]: arrayUnion(JSON.stringify(event.candidate.toJSON()))
            }).catch(e => logger.warn("Candidate sync write fail", { error: e.message }));
          }
        };

        const addedCandidates = new Set<string>();
        const pendingCandidates: string[] = [];

        const processPendingCandidates = async () => {
          if (!pc.remoteDescription) return;
          for (const candStr of pendingCandidates) {
            if (addedCandidates.has(candStr)) continue;
            try {
              const candidateObj = JSON.parse(candStr);
              await pc.addIceCandidate(new RTCIceCandidate(candidateObj));
              addedCandidates.add(candStr);
            } catch (err) {
              logger.warn("Failed resolving pending candidate", err);
            }
          }
          pendingCandidates.length = 0;
        };

        // 6. Caller SDP offer generation & Exchange setup
        if (ongoingCall.callerId === currentUser?.uid) {
          // Listen to call acceptor status changes
          const unsub = onSnapshot(doc(db, 'calls', ongoingCall.id), async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              
              // If receiver accepted, initiate Peer Connection sequence
              if (data.status === 'connected' && !pc.localDescription) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await updateDoc(doc(db, 'calls', ongoingCall.id), {
                  signal_offer: JSON.stringify(offer)
                });
              }

              // Set receiver Answer SDP once available
              if (data.signal_answer && !pc.remoteDescription) {
                const answer = new RTCSessionDescription(JSON.parse(data.signal_answer));
                await pc.setRemoteDescription(answer);
                await processPendingCandidates();
              }

              // Consume and add remote ICE candidates
              if (data.receiverCandidates) {
                data.receiverCandidates.forEach((candidateStr: string) => {
                  if (addedCandidates.has(candidateStr)) return;
                  if (pc.remoteDescription) {
                    try {
                      const candidateObj = JSON.parse(candidateStr);
                      pc.addIceCandidate(new RTCIceCandidate(candidateObj));
                      addedCandidates.add(candidateStr);
                    } catch (err) {}
                  } else {
                    if (!pendingCandidates.includes(candidateStr)) {
                      pendingCandidates.push(candidateStr);
                    }
                  }
                });
              }
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'calls/' + ongoingCall.id);
          });

          return () => unsub();
        } else {
          // Receiver logic (Accepting and Setting caller Offer SDK)
          const unsub = onSnapshot(doc(db, 'calls', ongoingCall.id), async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();

              // When connected status and offer becomes available
              if (data.status === 'connected' && data.signal_offer && !pc.remoteDescription) {
                const offerDesc = new RTCSessionDescription(JSON.parse(data.signal_offer));
                await pc.setRemoteDescription(offerDesc);
                await processPendingCandidates();

                // Build local SDP Answer
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await updateDoc(doc(db, 'calls', ongoingCall.id), {
                  signal_answer: JSON.stringify(answer)
                });
              }

              // Consume and add remote caller ICE candidates
              if (data.callerCandidates) {
                data.callerCandidates.forEach((candidateStr: string) => {
                  if (addedCandidates.has(candidateStr)) return;
                  if (pc.remoteDescription) {
                    try {
                      const candidateObj = JSON.parse(candidateStr);
                      pc.addIceCandidate(new RTCIceCandidate(candidateObj));
                      addedCandidates.add(candidateStr);
                    } catch (err) {}
                  } else {
                    if (!pendingCandidates.includes(candidateStr)) {
                      pendingCandidates.push(candidateStr);
                    }
                  }
                });
              }
            }
          }, (error) => {
            handleFirestoreError(error, OperationType.GET, 'calls/' + ongoingCall.id);
          });

          return () => unsub();
        }
      } catch (err: any) {
        logger.error("WebRTC Initializing Error:", { error: err.message });
      }
    };

    // Only configure RTC stream exchanges if accepted and connected
    if (ongoingCall.status === 'connected') {
      setupRTC();
    }

    return () => {
      // Cleanup streams and RTCPeerConnection tracks on teardown
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          logger.info(`Stopped audio/video track on teardown: ${track.kind}`);
        });
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [ongoingCall?.status, ongoingCall?.id]);

  if (!ongoingCall) return null;

  // Toggle local Audio
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle local Video
  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  };

  const isRemoteRinging = ongoingCall.callerId === currentUser?.uid && ongoingCall.status === 'ringing';
  const isIncomingCalling = ongoingCall.receiverId === currentUser?.uid && ongoingCall.status === 'ringing';

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 select-none font-sans overflow-hidden">
      {/* Dynamic Blurred Background */}
      <div 
        className="absolute inset-0 z-0 bg-slate-900 bg-cover bg-center transition-all duration-1000"
        style={{ 
          backgroundImage: `url(${(ongoingCall.callerId === currentUser?.uid ? ongoingCall.receiverPhotoURL : ongoingCall.callerPhotoURL) || ''})`,
          filter: 'blur(80px) brightness(0.4)',
          transform: 'scale(1.2)'
        }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-[#080808]" />

      {/* Encryption security banner */}
      <div className="relative z-10 flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-full text-[11px] font-mono text-cyan-400 mt-4 shadow-2xl">
        <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
        SECURE END-TO-END PEER SIGNAL
      </div>

      {/* Ringing / Profile View */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 w-full">
        {ongoingCall.status !== 'connected' ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center gap-6"
          >
            <div className="relative group">
              <img 
                src={(ongoingCall.callerId === currentUser?.uid ? ongoingCall.receiverPhotoURL : ongoingCall.callerPhotoURL) || undefined} 
                alt="" 
                className="w-32 h-32 rounded-full border-2 border-white/20 object-cover shadow-[0_0_40px_rgba(42,171,238,0.3)] z-10 relative" 
              />
              <div className="absolute inset-0 rounded-full border-[3px] border-cyan-400 animate-ping opacity-40 scale-150" />
              <div className="absolute inset-0 rounded-full border border-cyan-400 animate-ping opacity-20 scale-[2]" style={{ animationDelay: '0.4s' }} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">
                {ongoingCall.callerId === currentUser?.uid ? ongoingCall.receiverName : ongoingCall.callerName}
              </h2>
              <p className="text-sm font-medium text-cyan-300 uppercase tracking-widest text-[11px] drop-shadow">
                {isRemoteRinging ? 'Ringing and signaling...' : 'Incoming WebRTC call request...'}
              </p>
            </div>
          </motion.div>
        ) : (
          /* Active Streams View Layout */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-4xl h-[70vh] rounded-3xl overflow-hidden glass-panel border border-white/10 shadow-2xl ring-1 ring-white/5"
          >
            {/* Remote video element */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover bg-black/50" 
            />

            {/* Local thumbnail video element */}
            {ongoingCall.type === 'video' && !isCameraOff && (
              <motion.div 
                initial={{ opacity: 0, x: 20, y: -20 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                drag
                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                dragElastic={0.1}
                className="absolute top-6 right-6 w-32 h-44 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl z-20 cursor-grab active:cursor-grabbing bg-black/80 backdrop-blur-md"
              >
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform scale-x-[-1]" 
                />
              </motion.div>
            )}

            {/* Video-off fallback portrait card */}
            {(ongoingCall.type === 'voice' || isCameraOff) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-3xl z-10 gap-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-2xl animate-pulse" />
                  <img 
                    src={(ongoingCall.callerId === currentUser?.uid ? ongoingCall.receiverPhotoURL : ongoingCall.callerPhotoURL) || undefined} 
                    alt="" 
                    className="w-28 h-28 rounded-full object-cover border-4 border-white/10 relative z-10 shadow-2xl" 
                  />
                </div>
                <span className="text-sm text-cyan-300/80 font-mono tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-white/5">
                  {formatTimer(callDuration)}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Trigger control bar interfaces */}
      <div className="flex flex-col items-center gap-6 w-full relative z-10 mb-6">
        {ongoingCall.status === 'connected' && (
          <span className="text-[13px] font-mono tracking-widest text-emerald-400 animate-pulse font-medium bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/20 backdrop-blur-md">
            LIVE {formatTimer(callDuration)}
          </span>
        )}

        <div className="flex items-center gap-6 glass-panel rounded-full p-3 px-6 shadow-2xl border border-white/10">
          {isIncomingCalling ? (
            /* Incoming call answer options */
            <>
              <button 
                onClick={rejectCall}
                className="w-14 h-14 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-500/25 cursor-pointer transform active:scale-90 transition-all font-bold"
                title="Decline Invitation"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button 
                onClick={acceptCall}
                className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 cursor-pointer transform active:scale-90 transition-all font-bold animate-bounce"
                title="Accept and Bridge Connection"
              >
                <Phone className="w-6 h-6" />
              </button>
            </>
          ) : (
            /* Active / Caller dials control bar options */
            <>
              {ongoingCall.status === 'connected' && (
                <>
                  <button 
                    onClick={handleToggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isMuted ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  {ongoingCall.type === 'video' && (
                    <button 
                      onClick={handleToggleCamera}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isCameraOff ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500/30' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'}`}
                    >
                      {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  )}
                </>
              )}
              <button 
                onClick={endCall}
                className="w-12 h-12 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-500/25 cursor-pointer transform active:scale-90 transition-all"
                title="Terminate call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
