'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Radio, Volume2, VolumeX, Pause, Play, Loader2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface RadioPlayerProps {
  streamUrl: string;
  stationName: string;
  currentProgram?: string;
}

export default function RadioPlayer({ streamUrl, stationName, currentProgram }: RadioPlayerProps) {
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
      try {
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch { /* ignore */ }
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

  useEffect(() => {
    updateMediaSession();
  }, [updateMediaSession]);

  const tryPlay = useCallback(async () => {
    if (!audioRef.current) return;
    setIsLoading(true);
    setError(null);

    // Reset src to force reconnect
    audioRef.current.src = streamUrl;
    audioRef.current.load();

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      reconnectAttemptsRef.current = 0;
    } catch (err) {
      console.warn('Autoplay blocked, waiting for interaction:', err);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [streamUrl]);

  // Autoplay on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    // Try autoplay
    tryPlay();

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);

      // Auto-reconnect with backoff
      if (reconnectAttemptsRef.current < 10) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          tryPlay();
        }, delay);
      } else {
        setError('Sin conexión. Toca para reconectar.');
      }
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

  // Keep screen awake while playing
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    if (isPlaying && 'wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').then((lock: WakeLockSentinel) => {
        wakeLock = lock;
      }).catch(() => { /* not supported */ });
    }

    return () => {
      wakeLock?.release();
    };
  }, [isPlaying]);

  const togglePlay = async () => {
    hasInteractedRef.current = true;
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      try {
        if (!audio.src || audio.src === window.location.href) {
          audio.src = streamUrl;
          audio.load();
        }
        await audio.play();
        setIsPlaying(true);
        reconnectAttemptsRef.current = 0;
      } catch {
        setError('No se pudo reproducir. Intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVolumeChange = (val: number[]) => {
    const newVol = val[0];
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      const prevVol = volume || 0.8;
      setVolume(prevVol);
      if (audioRef.current) audioRef.current.volume = prevVol;
      setIsMuted(false);
    } else {
      setVolume(0);
      if (audioRef.current) audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <audio ref={audioRef} preload="none" />

      {/* Main Play Button */}
      <button
        onClick={togglePlay}
        className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#F4D03F] to-[#D4AC0D] flex items-center justify-center shadow-[0_0_40px_rgba(244,208,63,0.3)] hover:shadow-[0_0_60px_rgba(244,208,63,0.5)] transition-all duration-300 active:scale-95 group"
        aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
      >
        {isLoading ? (
          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-[#17202A] animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-10 h-10 sm:w-12 sm:h-12 text-[#17202A] group-hover:scale-110 transition-transform" fill="#17202A" />
        ) : (
          <Play className="w-10 h-10 sm:w-12 sm:h-12 text-[#17202A] ml-1 group-hover:scale-110 transition-transform" fill="#17202A" />
        )}

        {/* Animated ring when playing */}
        {isPlaying && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-[#F4D03F]/30 animate-ping" />
            <span className="absolute -inset-2 rounded-full border border-[#F4D03F]/10 animate-pulse" />
          </>
        )}
      </button>

      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          {isPlaying ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-600" />
          )}
        </span>
        <span className={`text-sm font-medium ${isPlaying ? 'text-red-400' : 'text-gray-500'}`}>
          {isPlaying ? 'EN VIVO' : 'APAGADO'}
        </span>
      </div>

      {/* Error message */}
      {error && (
        <button
          onClick={tryPlay}
          className="text-xs text-red-400 underline underline-offset-2 hover:text-red-300 transition-colors"
        >
          {error}
        </button>
      )}

      {/* Volume Control */}
      <div className="flex items-center gap-3 w-full max-w-[200px]">
        <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors" aria-label="Silenciar">
          {isMuted || volume === 0 ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
        <Slider
          value={[isMuted ? 0 : volume]}
          onValueChange={handleVolumeChange}
          max={1}
          step={0.01}
          className="flex-1 [&_[role=slider]]:bg-[#F4D03F] [&_[role=slider]]:border-0 [&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:rounded-full [&>span:first-child]:h-1 [&>span:first-child]:bg-white/20 [&>span>span]:bg-[#F4D03F]"
          aria-label="Volumen"
        />
      </div>

      {/* Now playing info for Media Session fallback display */}
      {(currentProgram || stationName) && (
        <p className="text-center text-xs text-white/40 mt-1">
          {currentProgram ? `Ahora: ${currentProgram}` : stationName}
        </p>
      )}
    </div>
  );
}