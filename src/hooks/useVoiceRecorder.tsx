import { useState, useRef, useCallback } from 'react';

export type RecorderState = 'idle' | 'recording' | 'preview';

export function useVoiceRecorder(maxSeconds = 300) {
  const [state, setState] = useState<RecorderState>('idle');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>(new Array(40).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const stopAnimation = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Waveform
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const draw = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const bars = Array.from({ length: 40 }, (_, i) => {
          const val = data[Math.floor(i * data.length / 40)] / 255;
          return Math.max(0.05, val);
        });
        setLevels(bars);
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        setState('preview');
        stopAnimation();
        streamRef.current?.getTracks().forEach(t => t.stop());
      };

      mr.start(100);
      setState('recording');
      setElapsed(0);

      let secs = 0;
      timerRef.current = setInterval(() => {
        secs++;
        setElapsed(secs);
        if (secs >= maxSeconds) stopRecording();
      }, 1000);
    } catch {
      alert('Could not access microphone. Please allow microphone access and try again.');
    }
  }, [maxSeconds]);

  const stopRecording = useCallback(() => {
    stopTimer();
    stopAnimation();
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
  }, []);

  const reset = useCallback(() => {
    stopTimer();
    stopAnimation();
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setElapsed(0);
    setLevels(new Array(40).fill(0));
    setState('idle');
  }, [audioUrl]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return { state, audioUrl, audioBlob, elapsed, levels, startRecording, stopRecording, reset, formatTime };
}
