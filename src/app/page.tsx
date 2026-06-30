'use client';

import { useEffect, useState } from 'react';
import RadioPlayer from '@/components/radio/radio-player';
import ScheduleView from '@/components/radio/schedule-view';
import MessageBanner from '@/components/radio/message-banner';
import AdminPanel from '@/components/radio/admin-panel';
import { Radio, CalendarDays, Shield, Share2, Download, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

interface StationSettings {
  streamUrl: string;
  stationName: string;
  stationSlogan: string;
  facebookUrl: string;
  instagramUrl: string;
  whatsappUrl: string;
  primaryColor: string;
  darkColor: string;
}

interface Program {
  id: string;
  name: string;
  host: string | null;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
}

type View = 'player' | 'schedule' | 'admin';

export default function HomePage() {
  const [settings, setSettings] = useState<StationSettings>({
    streamUrl: 'https://emisora.vocescampesinas.co/listen/vocescampesinas/radio.mp3',
    stationName: 'Voces Campesinas',
    stationSlogan: 'El Campo Nos Une',
    facebookUrl: '', instagramUrl: '', whatsappUrl: '',
    primaryColor: '#F4D03F', darkColor: '#17202A',
  });
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [view, setView] = useState<View>('player');
  const [isOnline, setIsOnline] = useState(true);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/programs');
        if (res.ok && !cancelled) {
          const programs: Program[] = await res.json();
          const now = new Date();
          const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          const today = now.getDay();
          const current = programs.find(
            p => p.dayOfWeek === today && currentTime >= p.startTime && currentTime < p.endTime
          );
          setCurrentProgram(current || null);
        }
      } catch { /* ignore */ }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok && !cancelled) setSettings(await res.json());
      } catch { /* use defaults */ }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: settings.stationName,
          text: `Escucha ${settings.stationName} - ${settings.stationSlogan}`,
          url: window.location.href,
        });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  // Admin view
  if (view === 'admin') {
    return <AdminPanel />;
  }

  return (
    <div className="relative w-full h-dvh bg-[#17202A] overflow-hidden flex flex-col" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-red-600 text-white text-center text-xs py-1.5 flex items-center justify-center gap-1.5">
          <WifiOff className="w-3 h-3" />
          Sin conexión a internet
        </div>
      )}

      {/* Install banner */}
      {showInstallBanner && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-r from-[#F4D03F]/90 to-[#D4AC0D]/90 text-[#17202A] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span className="text-xs font-semibold">Instalar la app</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleInstall} className="text-xs font-bold underline">Instalar</button>
            <button onClick={() => setShowInstallBanner(false)} className="text-xs font-bold">Después</button>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden hide-scrollbar">
        {/* Header */}
        <header className="text-center pt-8 pb-4 px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo / Station Icon */}
            <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#F4D03F] to-[#D4AC0D] flex items-center justify-center shadow-[0_8px_32px_rgba(244,208,63,0.25)]">
              <Radio className="w-10 h-10 text-[#17202A]" />
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              {settings.stationName}
            </h1>
            <p className="text-sm text-[#F4D03F]/80 font-medium mt-0.5">
              {settings.stationSlogan}
            </p>
          </motion.div>
        </header>

        {/* Messages banner */}
        <div className="px-4 mb-2">
          <MessageBanner />
        </div>

        {/* Player section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-4 py-6"
        >
          <RadioPlayer
            streamUrl={settings.streamUrl}
            stationName={settings.stationName}
            currentProgram={currentProgram?.name}
          />
        </motion.div>

        {/* Current program highlight */}
        {currentProgram && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-4 mb-4 p-4 rounded-2xl bg-gradient-to-r from-[#F4D03F]/10 to-transparent border border-[#F4D03F]/20"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Ahora al Aire</span>
            </div>
            <h3 className="text-lg font-bold text-white">{currentProgram.name}</h3>
            {currentProgram.host && (
              <p className="text-sm text-white/50 mt-0.5">
                Con {currentProgram.host} | {currentProgram.startTime} - {currentProgram.endTime}
              </p>
            )}
          </motion.div>
        )}

        {/* Social links */}
        <div className="flex justify-center gap-3 px-4 mb-4">
          {settings.facebookUrl && (
            <a
              href={settings.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#1877F2]/20 hover:border-[#1877F2]/30 transition-all"
              aria-label="Facebook"
            >
              <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          )}
          {settings.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E4405F]/20 hover:border-[#E4405F]/30 transition-all"
              aria-label="Instagram"
            >
              <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
          )}
          {settings.whatsappUrl && (
            <a
              href={settings.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#25D366]/20 hover:border-[#25D366]/30 transition-all"
              aria-label="WhatsApp"
            >
              <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </a>
          )}
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
            aria-label="Compartir"
          >
            <Share2 className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Schedule section (in player view, collapsible) */}
        <div className="px-4 pb-6">
          <ScheduleView />
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-[#17202A]/95 backdrop-blur-lg border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2 px-4">
          <button
            onClick={() => setView('player')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
              view === 'player' ? 'text-[#F4D03F]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Radio className="w-5 h-5" />
            <span className="text-[10px] font-medium">En Vivo</span>
          </button>

          <button
            onClick={() => setView('schedule')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
              view === 'schedule' ? 'text-[#F4D03F]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] font-medium">Programación</span>
          </button>

          <button
            onClick={() => setView('admin')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-all ${
              view === 'admin' ? 'text-[#F4D03F]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-medium">Admin</span>
          </button>
        </div>
      </nav>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}