'use client';

import { useEffect, useState, useMemo } from 'react';
import RadioPlayer from '@/components/radio/radio-player';
import ScheduleView from '@/components/radio/schedule-view';
import MessageBanner from '@/components/radio/message-banner';
import SongRequestForm from '@/components/radio/song-request-form';
import BlogSection from '@/components/radio/blog-section';
import AdminPanel from '@/components/radio/admin-panel';
import { Radio, CalendarDays, Shield, Share2, Download, WifiOff, Music, Newspaper, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StationSettings {
  streamUrl: string;
  stationName: string;
  stationSlogan: string;
  facebookUrl: string;
  instagramUrl: string;
  whatsappUrl: string;
  primaryColor: string;
  darkColor: string;
  blogUrl: string;
}

interface Program {
  id: string;
  name: string;
  host: string | null;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  imageUrl?: string | null;
}

type View = 'player' | 'schedule' | 'news' | 'admin';

export default function HomePage() {
  const [settings, setSettings] = useState<StationSettings>({
    streamUrl: 'https://emisora.vocescampesinas.co/listen/vocescampesinas/radio.mp3',
    stationName: 'Voces Campesinas',
    stationSlogan: 'El Campo Nos Une',
    facebookUrl: '', instagramUrl: '', whatsappUrl: '',
    primaryColor: '#F4D03F', darkColor: '#17202A', blogUrl: '',
  });
  const [currentProgram, setCurrentProgram] = useState<Program | null>(null);
  const [nextProgram, setNextProgram] = useState<Program | null>(null);
  const [view, setView] = useState<View>('player');
  const [isOnline, setIsOnline] = useState(true);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Load programs and determine current/next
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

          // Find next program today
          const upcoming = programs
            .filter(p => p.dayOfWeek === today && p.startTime > currentTime)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          setNextProgram(upcoming[0] || null);
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

  // Background image URL based on current program
  const backgroundImageUrl = useMemo(() => {
    if (currentProgram?.imageUrl) return currentProgram.imageUrl;
    return '/uploads/musicatierrita.png'; // Default
  }, [currentProgram]);

  // Admin view
  if (view === 'admin') {
    return <AdminPanel onBack={() => setView('player')} />;
  }

  return (
    <div className="relative w-full h-dvh overflow-hidden flex flex-col bg-[#17202A]">
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

      {/* Shared header - shows on all non-admin views */}
      <header className="shrink-0 text-center pt-6 pb-3 px-4 relative z-10">
        <div className="flex items-center justify-center gap-3">
          {/* Logo */}
          <img
            src="/logo.png"
            alt={settings.stationName}
            className="w-10 h-10 rounded-lg object-contain"
          />
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-tight">
              {settings.stationName}
            </h1>
            <p className="text-[11px] text-[#F4D03F]/70 font-medium">
              {settings.stationSlogan}
            </p>
          </div>
        </div>
      </header>

      {/* Content area */}
      <AnimatePresence mode="wait">
        {view === 'player' && (
          <motion.main
            key="player"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar relative z-10"
          >
            {/* "Ahora Suena" with background image */}
            <div className="px-4 mb-4">
              <div className="relative rounded-2xl overflow-hidden h-44">
                {/* Background image */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
                  style={{ backgroundImage: `url(${backgroundImageUrl})` }}
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#17202A] via-[#17202A]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#17202A]/40 to-transparent h-1/3" />

                {/* Content */}
                <div className="relative h-full flex flex-col justify-end p-4">
                  {currentProgram ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                        </span>
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Ahora al Aire</span>
                      </div>
                      <h3 className="text-xl font-bold text-white leading-tight">{currentProgram.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {currentProgram.host && (
                          <span className="text-xs text-white/60">Con {currentProgram.host}</span>
                        )}
                        <span className="text-xs text-white/40">{currentProgram.startTime} - {currentProgram.endTime}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <Music className="w-3.5 h-3.5 text-[#F4D03F]/70" />
                        <span className="text-[10px] font-bold text-[#F4D03F]/70 uppercase tracking-wider">Ahora suena</span>
                      </div>
                      <h3 className="text-xl font-bold text-[#F4D03F]/90 leading-tight">Música de la Tierrita</h3>
                      <p className="text-xs text-white/40 mt-1">La mejor selección musical campesina</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* "A continuación" section */}
            <div className="px-4 mb-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5 text-white/40" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">A continuación</span>
                </div>
                {nextProgram ? (
                  <div>
                    <h4 className="text-sm font-semibold text-white">{nextProgram.name}</h4>
                    <p className="text-xs text-white/40 mt-0.5">
                      {nextProgram.startTime} - {nextProgram.endTime}
                      {nextProgram.host && ` | ${nextProgram.host}`}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-sm font-semibold text-white/50">Música de la Tierrita</h4>
                    <p className="text-xs text-white/30 mt-0.5">Programación del día finalizada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Player */}
            <div className="px-4 py-4">
              <RadioPlayer
                streamUrl={settings.streamUrl}
                stationName={settings.stationName}
                currentProgram={currentProgram?.name}
              />
            </div>

            {/* Información (below player) */}
            <div className="px-4 mb-4">
              <MessageBanner />
            </div>

            {/* Song requests */}
            <div className="px-4 mb-4">
              <SongRequestForm />
            </div>

            {/* Social links */}
            <div className="flex justify-center gap-3 px-4 mb-6">
              {settings.facebookUrl && (
                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#1877F2]/20 hover:border-[#1877F2]/30 transition-all"
                  aria-label="Facebook">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
              {settings.instagramUrl && (
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#E4405F]/20 hover:border-[#E4405F]/30 transition-all"
                  aria-label="Instagram">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {settings.whatsappUrl && (
                <a href={settings.whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-[#25D366]/20 hover:border-[#25D366]/30 transition-all"
                  aria-label="WhatsApp">
                  <svg className="w-4 h-4 text-white/60" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                aria-label="Compartir">
                <Share2 className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </motion.main>
        )}

        {view === 'news' && (
          <motion.main
            key="news"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar relative z-10 px-4 pb-6"
          >
            <div className="pt-2">
              <BlogSection />
            </div>
          </motion.main>
        )}

        {view === 'schedule' && (
          <motion.main
            key="schedule"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar relative z-10 px-4 pb-6"
          >
            <div className="pt-2">
              <ScheduleView />
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-[#17202A]/95 backdrop-blur-lg border-t border-white/5 pb-[env(safe-area-inset-bottom)] relative z-10">
        <div className="flex items-center justify-around py-2 px-2">
          <button
            onClick={() => setView('player')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              view === 'player' ? 'text-[#F4D03F]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Radio className="w-5 h-5" />
            <span className="text-[10px] font-medium">En Vivo</span>
          </button>

          <button
            onClick={() => setView('news')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              view === 'news' ? 'text-[#F4D03F]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Newspaper className="w-5 h-5" />
            <span className="text-[10px] font-medium">Noticias</span>
          </button>

          <button
            onClick={() => setView('schedule')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
              view === 'schedule' ? 'text-[#F4D03F]' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="text-[10px] font-medium">Programación</span>
          </button>

          <button
            onClick={() => setView('admin')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
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
