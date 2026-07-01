'use client';

import { useState } from 'react';
import { Send, Music, MessageSquare, Heart, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const REQUEST_TYPES = [
  { value: 'request', label: 'Petición', icon: Music, color: 'text-[#F4D03F] bg-[#F4D03F]/15 border-[#F4D03F]/30' },
  { value: 'greeting', label: 'Saludo', icon: Heart, color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' },
  { value: 'message', label: 'Mensaje', icon: MessageSquare, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
];

export default function SongRequestForm() {
  const [type, setType] = useState('request');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Request fields
  const [songName, setSongName] = useState('');
  const [artist, setArtist] = useState('');
  const [isDedication, setIsDedication] = useState(false);
  const [dedicationMessage, setDedicationMessage] = useState('');

  // Greeting fields
  const [greetMessage, setGreetMessage] = useState('');
  const [greetPerson, setGreetPerson] = useState('');
  const [greetFrom, setGreetFrom] = useState('');
  const [greetLocation, setGreetLocation] = useState('');

  // Message fields
  const [msgName, setMsgName] = useState('');
  const [msgText, setMsgText] = useState('');

  const resetFields = () => {
    setSongName(''); setArtist(''); setIsDedication(false); setDedicationMessage('');
    setGreetMessage(''); setGreetPerson(''); setGreetFrom(''); setGreetLocation('');
    setMsgName(''); setMsgText('');
  };

  const buildMessage = (): { listenerName: string | null; message: string } => {
    if (type === 'request') {
      if (!songName.trim()) return { listenerName: null, message: '' };
      let msg = `Canción: ${songName.trim()}`;
      if (artist.trim()) msg += ` | Artista: ${artist.trim()}`;
      if (isDedication && dedicationMessage.trim()) {
        msg += ` | Dedicación: ${dedicationMessage.trim()}`;
      }
      return { listenerName: null, message: msg };
    }
    if (type === 'greeting') {
      if (!greetMessage.trim()) return { listenerName: null, message: '' };
      let msg = greetMessage.trim();
      if (greetPerson.trim()) msg = `Para ${greetPerson.trim()}: ${msg}`;
      const from = [greetFrom.trim(), greetLocation.trim()].filter(Boolean).join(' desde ');
      if (from) msg += ` | De: ${from}`;
      return { listenerName: greetFrom.trim() || null, message: msg };
    }
    // message
    if (!msgText.trim()) return { listenerName: null, message: '' };
    return { listenerName: msgName.trim() || null, message: msgText.trim() };
  };

  const handleSubmit = async () => {
    const { listenerName, message } = buildMessage();
    if (!message) {
      toast.error(type === 'request' ? 'Escribe el nombre de la canción' : type === 'greeting' ? 'Escribe tu saludo' : 'Escribe tu mensaje');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listenerName, message, type }),
      });
      if (res.ok) {
        setSent(true);
        toast.success('¡Enviado! Gracias por escribirnos');
        setTimeout(() => { setSent(false); resetFields(); }, 3000);
      } else {
        toast.error('No se pudo enviar. Intenta de nuevo.');
      }
    } catch { toast.error('Error de conexión'); }
    setSending(false);
  };

  const typeLabel = type === 'request' ? 'petición musical' : type === 'greeting' ? 'saludo' : 'mensaje';

  if (sent) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 rounded-2xl bg-[#F4D03F]/10 border border-[#F4D03F]/20 text-center">
        <CheckCircle className="w-10 h-10 mx-auto mb-2 text-[#F4D03F]" />
        <h4 className="text-sm font-bold text-app-text mb-1">¡Recibido!</h4>
        <p className="text-xs text-app-t3">Tu {typeLabel} fue enviado con éxito</p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl bg-app-surface backdrop-blur-sm border border-app-bdr overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-app-bdr-l">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-[#F4D03F]" />
          <h3 className="text-sm font-bold text-app-text">Escríbenos</h3>
        </div>
        <p className="text-[10px] text-app-t3 mt-0.5">Envía tu petición, saludo o mensaje al aire</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Type selector */}
        <div className="grid grid-cols-3 gap-1.5">
          {REQUEST_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.value} onClick={() => setType(t.value)} className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-medium border transition-all ${type === t.value ? t.color : 'bg-app-surface border-app-bdr-l text-app-tdim hover:border-app-bdr'}`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {/* ===== PETICIÓN MUSICAL ===== */}
          {type === 'request' && (
            <motion.div key="req" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-2.5">
              <Input placeholder="Nombre de la canción *" value={songName} onChange={e => setSongName(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim" />
              <Input placeholder="Autor o cantante" value={artist} onChange={e => setArtist(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim" />
              <div className="flex items-center gap-2 py-1">
                <Switch checked={isDedication} onCheckedChange={setIsDedication} />
                <span className="text-xs text-app-t2">Es una dedicación</span>
              </div>
              {isDedication && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Textarea placeholder="Mensaje de la dedicación (a quién va, qué le dices...)" value={dedicationMessage} onChange={e => setDedicationMessage(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim min-h-[60px] resize-none" />
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ===== SALUDO ===== */}
          {type === 'greeting' && (
            <motion.div key="greet" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-2.5">
              <Textarea placeholder="Mensaje de saludo *" value={greetMessage} onChange={e => setGreetMessage(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim min-h-[60px] resize-none" />
              <Input placeholder="Nombre de quien se saluda" value={greetPerson} onChange={e => setGreetPerson(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim" />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Quien saluda" value={greetFrom} onChange={e => setGreetFrom(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim" />
                <Input placeholder="Desde dónde" value={greetLocation} onChange={e => setGreetLocation(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim" />
              </div>
            </motion.div>
          )}

          {/* ===== MENSAJE ===== */}
          {type === 'message' && (
            <motion.div key="msg" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-2.5">
              <Input placeholder="Tu nombre" value={msgName} onChange={e => setMsgName(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim" />
              <Textarea placeholder="Tu mensaje *" value={msgText} onChange={e => setMsgText(e.target.value)} className="bg-app-surface border-app-bdr text-app-text text-xs placeholder:text-app-tdim min-h-[60px] resize-none" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={sending} className="w-full bg-[#F4D03F] text-[#17202A] hover:bg-[#D4AC0D] font-semibold text-xs h-10">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1.5" />Enviar {type === 'request' ? 'Petición' : type === 'greeting' ? 'Saludo' : 'Mensaje'}</>}
        </Button>
      </div>
    </div>
  );
}