import { useRef, useState, useCallback } from 'react';
import { api } from '../services/api';

// Picks the best supported audio format for the current browser/OS.
// iOS Safari records as audio/mp4; Android Chrome as audio/webm;codecs=opus.
function getSupportedMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? '';
}

export function useVoiceRecorder({ onTranscript, onAudioStored, visitId, folder = 'dealer' }) {
  const recorderRef = useRef(null);
  const chunksRef   = useRef([]);
  const mimeTypeRef = useRef('');

  const [isRecording,    setIsRecording]    = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error,          setError]          = useState(null);

  const start = useCallback(async () => {
    setError(null);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access and try again.'
          : 'Could not access microphone. Please try again.'
      );
      return;
    }

    const mimeType = getSupportedMimeType();
    mimeTypeRef.current = mimeType;
    chunksRef.current   = [];

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current || 'audio/webm' });
      await transcribeAndStore(blob);
    };

    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  }, [visitId, folder]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    setIsRecording(false);
  }, []);

  async function transcribeAndStore(blob) {
    setIsTranscribing(true);
    setError(null);
    try {
      const { transcript, audioKey } = await api.transcribeAudio(blob, { visitId, folder });

      if (transcript?.trim()) {
        onTranscript(transcript.trim());
      }
      if (audioKey && onAudioStored) {
        onAudioStored(audioKey);
      }
    } catch (err) {
      // OFFLINE PLACEHOLDER: if offline STT is ever needed, queue `blob` to
      // IndexedDB here and retry on the `online` event. For now the app
      // requires internet, so we just surface the error.
      setError('Transcription failed. Please check your connection and try again.');
      console.error('[useVoiceRecorder] transcribeAndStore error:', err.message);
    } finally {
      setIsTranscribing(false);
    }
  }

  return { isRecording, isTranscribing, error, start, stop };
}
