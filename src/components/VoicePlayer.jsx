import { useRef, useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { api } from '../services/api';

// Compact play/pause button for a voice note stored in S3.
// Lazily fetches the pre-signed URL on first play.
export default function VoicePlayer({ audioKey, style = {} }) {
  const audioRef         = useRef(null);
  const [url, setUrl]    = useState(null);
  const [isPlaying, setPlaying] = useState(false);
  const [loading,   setLoading] = useState(false);
  const [error,     setError]   = useState(null);

  // Reset state if the audioKey changes (new recording replaces old one)
  useEffect(() => {
    setUrl(null);
    setPlaying(false);
    setError(null);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }, [audioKey]);

  const togglePlay = async () => {
    setError(null);

    // Pause if currently playing
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    // Fetch pre-signed URL on first play
    let playUrl = url;
    if (!playUrl) {
      setLoading(true);
      try {
        playUrl = await api.getAudioUrl(audioKey);
        setUrl(playUrl);
      } catch (err) {
        setError('Could not load audio');
        setLoading(false);
        console.error('[VoicePlayer] getAudioUrl error:', err.message);
        return;
      } finally {
        setLoading(false);
      }
    }

    // Create audio element if we don't have one yet
    if (!audioRef.current) {
      const audio = new Audio(playUrl);
      audio.onended = () => setPlaying(false);
      audio.onerror = () => { setError('Playback failed'); setPlaying(false); };
      audioRef.current = audio;
    }

    try {
      await audioRef.current.play();
      setPlaying(true);
    } catch (err) {
      setError('Playback failed');
      console.error('[VoicePlayer] play error:', err.message);
    }
  };

  if (!audioKey) return null;

  return (
    <>
      <button
        type="button"
        onClick={togglePlay}
        disabled={loading}
        title={isPlaying ? 'Pause voice note' : 'Play voice note'}
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '7px 12px', borderRadius: '8px',
          border: '1px solid var(--border)', background: 'var(--surface-raised)',
          color: isPlaying ? '#A100FF' : 'var(--text-primary)',
          fontSize: '12px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', flexShrink: 0, opacity: loading ? 0.6 : 1,
          ...style,
        }}
      >
        {isPlaying ? <Pause size={12} /> : <Play size={12} />}
        {loading ? 'Loading…' : isPlaying ? 'Pause' : 'Play'}
      </button>
      {error && (
        <span style={{ fontSize: '11px', color: '#EF4444', marginLeft: '6px' }}>{error}</span>
      )}
    </>
  );
}
