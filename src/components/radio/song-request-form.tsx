'use client';

import { useState } from 'react';
import { Send, Music, MessageSquare, Heart, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const REQUEST_TYPES = [
  { value: 'request', label: 'Petición Musical', icon: Music, color: 'text-[#F4D03F] bg-[#F4D03F]/15 border-[#F4D03F]/30' },
  { value: 'greeting', label: 'Saludo', icon: Heart, color: 'text-pink-400 bg-pink-500/15 border-pink-500/30' },
  { value: 'message', label: 'Mensaje', icon: MessageSquare, color: 'text-sky-400 bg-sky-500/15 border-sky-500/30' },
];

export default function SongRequestForm() {
  const [type, setType] = useState('request');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Escribe tu mensaje o petición');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listenerName: name.trim() || null,
          message: message.trim(),
          type,
        }),
      });

      if (res.ok) {
        setSent(true);
        toast.success('¡Enviado! Gracias por escribirnos');
        setTimeout(() => {
          setSent(false);
          setName('');
          setMessage('');
        }, 3000);
      } else {
        toast.error('No se pudo enviar. Intenta de nuevo.');
      }
    } catch {
      toast.error('Error de conexión');
    }
    setSending(false);
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-2xl bg-gradient-to-br from-[#F4D03F]/10 to-transparent border border-[#F4D03F]/20 text-center"
      >
        <CheckCircle className="w-12 h-12 mx-auto mb-2 text-[#F4D03F]" />
        <h4 className="text-sm font-bold text-white mb-1">¡Recibido!</h4>
        <p className="text-xs text-white/50">Tu {type === 'request' ? 'petición musical' : type === 'greeting' ? 'saludo' : 'mensaje'} fue enviado con éxito</p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-[#F4D03F]" />
          <h3 className="text-sm font-bold text-white">Escríbenos</h3>
        </div>
        <p className="text-[11px] text-white/40 mt-0.5">Envía tu petición, saludo o mensaje al aire</p>
      </div>

      <div className="p-4 space-y-3">
        {/* Type selector */}
        <div className="grid grid-cols-3 gap-1.5">
          {REQUEST_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-[11px] font-medium border transition-all ${
                  type === t.value
                    ? t.color
                    : 'bg-white/[0.03] border-white/5 text-white/40 hover:border-white/15'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Name (optional) */}
        <Input
          placeholder="Tu nombre (opcional)"
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25"
        />

        {/* Message */}
        <Textarea
          placeholder={
            type === 'request'
              ? '¿Qué canción quieres escuchar?'
              : type === 'greeting'
              ? '¿A quién quieres saludar y qué le dices?'
              : 'Escribe tu mensaje...'
          }
          value={message}
          onChange={e => setMessage(e.target.value)}
          className="bg-white/5 border-white/10 text-white text-xs placeholder:text-white/25 min-h-[70px] resize-none"
        />

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={sending || !message.trim()}
          className="w-full bg-[#F4D03F] text-[#17202A] hover:bg-[#D4AC0D] font-semibold text-xs h-10"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-1.5" />
              Enviar {type === 'request' ? 'Petición' : type === 'greeting' ? 'Saludo' : 'Mensaje'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
