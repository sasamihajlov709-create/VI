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
              }

              // Consume and add remote ICE candidates
              if (data.receiverCandidates) {
                data.receiverCandidates.forEach((candidateStr: string) => {
                  try {
                    const candidateObj = JSON.parse(candidateStr);
                    pc.addIceCandidate(new RTCIceCandidate(candidateObj));
                  } catch (err) {}
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
                  try {
                    const candidateObj = JSON.parse(candidateStr);
                    pc.addIceCandidate(new RTCIceCandidate(candidateObj));
                  } catch (err) {}
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
    <div className="fixed inset-0 bg-[#080808] z-50 flex flex-col items-center justify-between p-8 select-none">
      {/* Encryption security banner */}
      <div className="absolute top-4 flex items-center gap-2 bg-slate-950/40 border border-slate-800 px-4 py-2 rounded-full text-[11px] font-mono text-cyan-400">
        <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
        SECURE END-TO-END PEER SIGNAL
      </div>

      {/* Ringing / Profile View */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {ongoingCall.status !== 'connected' ? (
          <div className="flex flex-col items-center text-center gap-4 animate-bounce">
            <div className="relative">
              <img 
                src={ongoingCall.callerId === currentUser?.uid ? ongoingCall.receiverPhotoURL : ongoingCall.callerPhotoURL} 
                alt="" 
                className="w-24 h-24 rounded-full border-4 border-cyan-400 object-cover shadow-2xl shadow-cyan-400/10" 
              />
              <div className="w-24 h-24 rounded-full border border-cyan-500 absolute inset-0 animate-ping opacity-30" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">
                {ongoingCall.callerId === currentUser?.uid ? ongoingCall.receiverName : ongoingCall.callerName}
              </h2>
              <p className="text-sm font-medium text-cyan-400 uppercase tracking-widest text-[11px]">
                {isRemoteRinging ? 'Ringing and signaling...' : 'Incoming WebRTC call request...'}
              </p>
            </div>
          </div>
        ) : (
          /* Active Streams View Layout */
          <div className="relative w-full max-w-4xl h-[65vh] rounded-2xl overflow-hidden bg-slate-950/80 border border-slate-800 shadow-2xl">
            {/* Remote video element */}
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />

            {/* Local thumbnail video element */}
            {ongoingCall.type === 'video' && !isCameraOff && (
              <div className="absolute top-4 right-4 w-40 h-28 rounded-xl overflow-hidden border border-slate-700 shadow-2xl z-20">
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover transform scale-x-[-1]" 
                />
              </div>
            )}

            {/* Video-off fallback portrait card */}
            {(ongoingCall.type === 'voice' || isCameraOff) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10 gap-3">
                <img 
                  src={ongoingCall.callerId === currentUser?.uid ? ongoingCall.receiverPhotoURL : ongoingCall.callerPhotoURL} 
                  alt="" 
                  className="w-20 h-20 rounded-full object-cover border-2 border-slate-700" 
                />
                <span className="text-xs text-slate-400 font-mono tracking-widest">{formatTimer(callDuration)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trigger control bar interfaces */}
      <div className="flex flex-col items-center gap-4 w-full">
        {ongoingCall.status === 'connected' && (
          <span className="text-sm font-mono tracking-widest text-emerald-400 animate-pulse font-medium">
            LIVE {formatTimer(callDuration)}
          </span>
        )}

        <div className="flex items-center gap-6">
          {isIncomingCalling ? (
            /* Incoming call answer options */
            <>
              <button 
                onClick={rejectCall}
                className="w-14 h-14 bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transform active:scale-90 transition-all font-bold"
                title="Decline Invitation"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
              <button 
                onClick={acceptCall}
                className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-slate-950 shadow-lg cursor-pointer transform active:scale-95 transition-all font-bold"
                title="Accept and Bridge Connection"
              >
                <Phone className="w-7 h-7" />
              </button>
            </>
          ) : (
            /* Active / Caller dials control bar options */
            <>
              {ongoingCall.status === 'connected' && (
                <>
                  <button 
                    onClick={handleToggleMute}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isMuted ? 'bg-rose-600/20 border-rose-500 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  {ongoingCall.type === 'video' && (
                    <button 
                      onClick={handleToggleCamera}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer border ${isCameraOff ? 'bg-rose-600/20 border-rose-500 text-rose-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                    >
                      {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                    </button>
                  )}
                </>
              )}
              <button 
                onClick={endCall}
                className="w-14 h-14 bg-rose-600 hover:bg-rose-700 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer transform active:scale-90 transition-all"
                title="Terminate call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
