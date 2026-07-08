'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Pause, Play, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface RadioPlayerProps {
  streamUrl: string;
  stationName: string;
  currentProgram?: string;
  variant?: 'full' | 'compact';
}

export default function RadioPlayer({ streamUrl, stationName, currentProgram, variant = 'full' }: RadioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const hasInteractedRef = useRef(false);

  const updateMediaSession = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentProgram || `${stationName} - En Vivo`,
      artist: stationName,
      album: 'Emisora Digital',
      artwork: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
    navigator.mediaSession.setActionHandler('play', async () => {
      hasInteractedRef.current = true;
      try { await audioRef.current?.play(); setIsPlaying(true); } catch { /* */ }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
      setIsPlaying(false);
    });
    navigator.mediaSession.setActionHandler('stop', () => {
      audioRef.current?.pause();
      audioRef.current!.src = '';
      setIsPlaying(false);
    });
  }, [currentProgram, stationName]);

  useEffect(() => { updateMediaSession(); }, [updateMediaSession]);

  const tryPlay = useCallback(async () => {
    if (!audioRef.current) return;
    setIsLoading(true);
    setError(null);
    audioRef.current.src = streamUrl;
    audioRef.current.load();
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      reconnectAttemptsRef.current = 0;
    } catch (err) {
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    tryPlay();
    const handlePlaying = () => { setIsPlaying(true); setIsLoading(false); setError(null); reconnectAttemptsRef.current = 0; };
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = () => {
      setIsPlaying(false); setIsLoading(false);
      // Reconnect indefinitely with capped backoff
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current % 8), 30000);
      reconnectAttemptsRef.current++;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => tryPlay(), delay);
    };
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    return () => {
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [streamUrl, tryPlay]);

  // Background keep-alive: prevents OS from killing the app while playing
  useEffect(() => {
    if (!isPlaying) return;
    const keepalive = setInterval(() => {
      // Silent fetch to signal the OS that this tab is still active
      fetch('/api/settings', { method: 'HEAD', cache: 'no-store' }).catch(() => {});
    }, 25000);
    return () => clearInterval(keepalive);
  }, [isPlaying]);

  // Reconnect audio when page becomes visible again (in case OS suspended it)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const audio = audioRef.current;
        if (audio && isPlaying && audio.paused) {
          tryPlay();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPlaying, tryPlay]);

  const togglePlay = async () => {
    hasInteractedRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause(); setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        if (!audio.src || audio.src === window.location.href) { audio.src = streamUrl; audio.load(); }
        await audio.play(); setIsPlaying(true); reconnectAttemptsRef.current = 0;
      } catch { setError('No se pudo reproducir.'); } finally { setIsLoading(false); }
    }
  };

  const handleVolumeChange = (val: number[]) => {
    const v = val[0]; setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
    setIsMuted(v === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      const prev = volume || 0.8; setVolume(prev);
      if (audioRef.current) audioRef.current.volume = prev; setIsMuted(false);
    } else {
      setVolume(0); if (audioRef.current) audioRef.current.volume = 0; setIsMuted(true);
    }
  };

  /* ===== COMPACT MODE (integrated into Ahora Suena) ===== */
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2.5">
        <audio ref={audioRef} preload="none" />
        <button
          onClick={togglePlay}
          className="shrink-0 w-9 h-9 rounded-full bg-app-accent flex items-center justify-center shadow-lg hover:bg-app-accent-dk transition-all active:scale-95"
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-app-bg animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4 text-app-bg" fill="currentColor" />
          ) : (
            <Play className="w-4 h-4 text-app-bg ml-0.5" fill="currentColor" />
          )}
        </button>

        <div className="flex items-center gap-1.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            {isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-red-500' : 'bg-gray-500'}`} />
          </span>
          <span className={`text-[10px] font-bold tracking-wider ${isPlaying ? 'text-red-400' : 'text-white/40'}`}>
            {isPlaying ? 'EN VIVO' : 'APAGADO'}
          </span>
        </div>

        {error && (
          <button onClick={tryPlay} className="text-[9px] text-red-400 underline underline-offset-2 truncate max-w-[80px]">
            Reconectar
          </button>
        )}

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <button onClick={toggleMute} className="text-white/50 hover:text-white transition-colors" aria-label="Silenciar">
            {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <Slider
            value={[isMuted ? 0 : volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.01}
            className="w-16 [&_[role=slider]]:bg-app-accent [&_[role=slider]]:border-0 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3 [&_[role=slider]]:rounded-full [&>span:first-child]:h-0.5 [&>span:first-child]:bg-app-tdim [&>span>span]:bg-app-accent"
          />
        </div>
      </div>
    );
  }

  /* ===== FULL MODE (original, kept for backwards compat) ===== */
  return (
    <div className="flex flex-col items-center gap-4">
      <audio ref={audioRef} preload="none" />
      <button
        onClick={togglePlay}
        className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-app-accent to-app-accent-dk flex items-center justify-center shadow-[0_0_40px_rgba(244,208,63,0.2)] hover:shadow-[0_0_60px_rgba(244,208,63,0.3)] transition-all duration-300 active:scale-95 group"
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isLoading ? (
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-app-bg animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-10 h-10 sm:w-12 sm:h-12 text-app-bg group-hover:scale-110 transition-transform" fill="currentColor" />
        ) : (
          <Play className="w-10 h-10 sm:w-12 sm:h-12 text-app-bg ml-1 group-hover:scale-110 transition-transform" fill="currentColor" />
        )}
        {isPlaying && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-app-accent/30 animate-ping" />
            <span className="absolute -inset-2 rounded-full border border-app-accent/10 animate-pulse" />
          </>
        )}
      </button>
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          {isPlaying ? (
            <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" /><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" /></>
          ) : (
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-600" />
          )}
        </span>
        <span className={`text-sm font-medium ${isPlaying ? 'text-red-400' : 'text-gray-500'}`}>
          {isPlaying ? 'EN VIVO' : 'APAGADO'}
        </span>
      </div>
      {error && (
        <button onClick={tryPlay} className="text-xs text-red-400 underline underline-offset-2 hover:text-red-300 transition-colors">{error}</button>
      )}
      <div className="flex items-center gap-3 w-full max-w-[200px]">
        <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors" aria-label="Silenciar">
          {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <Slider
          value={[isMuted ? 0 : volume]}
          onValueChange={handleVolumeChange}
          max={1}
          step={0.01}
          className="flex-1 [&_[role=slider]]:bg-app-accent [&_[role=slider]]:border-0 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:rounded-full [&>span:first-child]:h-1 [&>span:first-child]:bg-app-tdim [&>span>span]:bg-app-accent"
        />
      </div>
    </div>
  );
}