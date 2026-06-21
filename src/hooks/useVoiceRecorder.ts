import { useState, useRef, useEffect, useCallback } from 'react';
import { logger } from '../lib/logger';

export function useVoiceRecorder(sendVoiceMessage: (blob: Blob, duration: number) => Promise<void>) {
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

  const resetRecordingState = useCallback(() => {
    setIsRecording(false);
    setRecordDuration(0);
    setRecordingState('idle');
    setRecordGestures({ startX: 0, startY: 0, currentX: 0, currentY: 0 });
    setRecordingAmplitudes([]);
    audioChunksRef.current = [];
    clearInterval(durationTimerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const handleRecordStart = async (clientX: number, clientY: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      shouldSendOnStopRef.current = false;

      setRecordingState('holding');
      setRecordGestures({ startX: clientX, startY: clientY, currentX: clientX, currentY: clientY });
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setVoicePreviewBlob(null);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (durationTimerRef.current) clearInterval(durationTimerRef.current);
        const exactDuration = (Date.now() - recordingStartTimeRef.current) / 1000;
        const finalDuration = exactDuration > 0.1 ? parseFloat(exactDuration.toFixed(1)) : 1;
        
        setIsRecording(false);

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    resetRecordingState();
  }, [resetRecordingState]);

  const handleRecordMove = useCallback((clientX: number, clientY: number) => {
    if (recordingState !== 'holding') return;
    
    setRecordGestures(prev => {
      const current = { ...prev, currentX: clientX, currentY: clientY };
      const distanceX = prev.startX - clientX;
      const distanceY = prev.startY - clientY;
      
      if (distanceX > 80) {
        setTimeout(() => cancelRecording(), 10);
      } else if (distanceY > 60) {
        setRecordingState('locked');
      }
      return current;
    });
  }, [recordingState, cancelRecording]);

  const handleRecordRelease = useCallback(() => {
    if (recordingState === 'holding') {
      const distanceX = recordGestures.startX - recordGestures.currentX;
      const distanceY = recordGestures.startY - recordGestures.currentY;
      const holdDuration = Date.now() - recordingStartTimeRef.current;
      
      if (holdDuration < 350) {
        setRecordingState('locked');
      } else if (distanceX > 80) {
        cancelRecording();
      } else if (distanceY > 60) {
        setRecordingState('locked');
      } else {
        shouldSendOnStopRef.current = true;
        stopRecording();
      }
    }
  }, [recordingState, recordGestures, cancelRecording, stopRecording]);

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
