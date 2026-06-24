import { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';

export function useVoiceRecorder(
  sendVoiceMessage: (blob: Blob, duration: number) => Promise<void>,
  onToggleMode?: () => void
) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationTimerRef = useRef<any>(null);

  // Premium voice recording gesture states
  const [recordingState, setRecordingState] = useState<'idle' | 'holding' | 'locked'>('idle');
  const [recordGestures, setRecordGestures] = useState({ startX: 0, startY: 0, currentX: 0, currentY: 0 });
  const [recordingAmplitudes, setRecordingAmplitudes] = useState<number[]>([]);
  const [voicePreviewBlob, setVoicePreviewBlob] = useState<Blob | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [voicePreviewDuration, setVoicePreviewDuration] = useState<number>(0);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const shouldSendOnStopRef = useRef<boolean>(false);

  useEffect(() => {
    if (voicePreviewBlob) {
      const url = URL.createObjectURL(voicePreviewBlob);
      setVoicePreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVoicePreviewUrl(null);
    }
  }, [voicePreviewBlob]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.onstop = null;
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const resetRecordingState = useCallback(() => {
    setIsRecording(false);
    setRecordDuration(0);
    setRecordingState('idle');
    setRecordGestures({ startX: 0, startY: 0, currentX: 0, currentY: 0 });
    setRecordingAmplitudes([]);
    audioChunksRef.current = [];
    clearInterval(durationTimerRef.current);
    setVoicePreviewBlob(null);
    setVoicePreviewDuration(0);
    recordingStartTimeRef.current = 0;
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {}
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {}
      }
      mediaRecorderRef.current = null;
    }
  }, []);

  const isCancelledRef = useRef(false);

  const handleRecordStart = async (clientX: number, clientY: number) => {
    try {
      isCancelledRef.current = false;
      mediaRecorderRef.current = null;
      setRecordingState('holding');
      setIsRecording(true);
      setRecordGestures({ startX: clientX, startY: clientY, currentX: clientX, currentY: clientY });
      recordingStartTimeRef.current = Date.now();
      setVoicePreviewBlob(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (isCancelledRef.current) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      streamRef.current = stream;
      
      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 };
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          options = { mimeType: 'audio/ogg;codecs=opus', audioBitsPerSecond: 128000 };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4', audioBitsPerSecond: 128000 };
        } else {
          options = { audioBitsPerSecond: 128000 };
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      shouldSendOnStopRef.current = false;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        const exactDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
        const finalDuration = exactDuration > 0.1 ? parseFloat(exactDuration.toFixed(1)) : 1;
        
        setIsRecording(false);

        // Always stop stream tracks when recording is finished to avoid resource leak / privacy indicator stay active
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/mp4' });
        
        if (shouldSendOnStopRef.current) {
          try {
            await sendVoiceMessage(audioBlob, finalDuration || 1);
          } catch (e: any) {
             logger.error("Failed to send audio blob automatically", e);
          }
          resetRecordingState();
        } else if (fileBlobLength(audioBlob)) {
          setVoicePreviewBlob(audioBlob);
          setVoicePreviewDuration(finalDuration);
        } else {
          resetRecordingState();
        }
      };

      mediaRecorder.start(100);
      durationTimerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);

      try {
        const AudioContextArray = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextArray) {
          const audioCtx = new AudioContextArray();
          audioContextRef.current = audioCtx;
          const analyzer = audioCtx.createAnalyser();
          analyzer.fftSize = 256;
          analyzerRef.current = analyzer;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyzer);
          
          const bufferLength = analyzer.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          const updateAmplitudes = () => {
            if (mediaRecorder.state !== 'recording') return;
            analyzer.getByteFrequencyData(dataArray);
            let sum = 0;
            for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
            const avg = sum / bufferLength;
            const normVal = Math.min(100, Math.max(10, avg * 1.5));
            setRecordingAmplitudes(prev => {
              const next = [...prev, normVal];
              if (next.length > 25) next.shift();
              return next;
            });
            requestAnimationFrame(updateAmplitudes);
          };
          requestAnimationFrame(updateAmplitudes);
        }
      } catch (err: any) {
        logger.warn("Waveform dynamic AnalysisContext offline:", { error: err?.message, stack: err?.stack });
      }
    } catch (e: any) {
      logger.error("Audio recording microphone capture failed:", { error: e?.message, stack: e?.stack });
      alert("Microphone permission denied. Unable to capture live voice note.");
      resetRecordingState();
    }
  };

  function fileBlobLength(b: Blob) {
      return b && b.size > 0;
  }

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      isCancelledRef.current = true;
      resetRecordingState();
      return;
    }
    try {
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      }
    } catch (e) {}
  }, [resetRecordingState]);

  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onerror = null;
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
      } catch (e) {}
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    resetRecordingState();
  }, [resetRecordingState]);

  const handleRecordMove = useCallback((clientX: number, clientY: number) => {
    if (recordingState !== 'holding' && recordingStartTimeRef.current === 0) return;
    
    setRecordGestures(prev => {
      const startX = prev.startX || clientX;
      const startY = prev.startY || clientY;
      const current = { startX, startY, currentX: clientX, currentY: clientY };
      const distanceX = startX - clientX;
      const distanceY = startY - clientY;
      
      if (distanceX > 80) {
        setTimeout(() => cancelRecording(), 10);
      } else if (distanceY > 60) {
        setRecordingState('locked');
      }
      return current;
    });
  }, [recordingState, cancelRecording]);

  const handleRecordRelease = useCallback(() => {
    if (recordingState === 'holding' || recordingStartTimeRef.current > 0) {
      const startX = recordGestures.startX || recordGestures.currentX;
      const startY = recordGestures.startY || recordGestures.currentY;
      const distanceX = startX - recordGestures.currentX;
      const distanceY = startY - recordGestures.currentY;
      const holdDuration = Date.now() - recordingStartTimeRef.current;
      
      if (holdDuration < 250) {
        cancelRecording();
        onToggleMode?.();
      } else if (distanceX > 80) {
        cancelRecording();
      } else if (distanceY > 60) {
        setRecordingState('locked');
      } else {
        shouldSendOnStopRef.current = true;
        stopRecording();
      }
    }
  }, [recordingState, recordGestures, cancelRecording, stopRecording, onToggleMode]);

  const sendPreviewVoiceMessage = async () => {
    if (!voicePreviewBlob) return;
    try {
      const finalDuration = voicePreviewDuration || 1;
      await sendVoiceMessage(voicePreviewBlob, finalDuration);
    } catch (err: any) {
      logger.error("Failed to send preview voice message:", { error: err.message, stack: err.stack });
    } finally {
      resetRecordingState();
    }
  };

  return {
    isRecording,
    recordDuration,
    recordingState,
    recordGestures,
    recordingAmplitudes,
    voicePreviewBlob,
    voicePreviewUrl,
    voicePreviewDuration,
    handleRecordStart,
    handleRecordMove,
    handleRecordRelease,
    cancelRecording,
    stopRecording,
    sendPreviewVoiceMessage,
    resetRecordingState,
    setRecordingState,
    shouldSendOnStopRef
  };
}
