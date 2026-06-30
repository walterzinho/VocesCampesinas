'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, LogIn, LogOut, Radio, MessageSquare, Settings, Clock, Shield, Plus, Trash2, Save, ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Program {
  id: string;
  name: string;
  host: string | null;
  description: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  genre: string | null;
  sortOrder: number;
}

interface Message {
  id: string;
  content: string;
  type: string;
  isActive: boolean;
  priority: number;
}

interface AppSettings {
  streamUrl: string;
  stationName: string;
  stationSlogan: string;
  facebookUrl: string;
  instagramUrl: string;
  whatsappUrl: string;
  primaryColor: string;
  darkColor: string;
}

interface Log {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [programs, setPrograms] = useState<Program[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    streamUrl: '', stationName: '', stationSlogan: '',
    facebookUrl: '', instagramUrl: '', whatsappUrl: '',
    primaryColor: '#F4D03F', darkColor: '#17202A',
  });
  const [logs, setLogs] = useState<Log[]>([]);

  // Dialog states
  const [programDialog, setProgramDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Partial<Program>>({});
  const [editingMessage, setEditingMessage] = useState<Partial<Message>>({});
  const [expandedLogs, setExpandedLogs] = useState(false);

  const authHeader = useCallback(() => ({
    headers: { 'Authorization': `Bearer ${password}` },
  }), [password]);

  // Login
  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthenticated(true);
        toast.success('Sesión iniciada');
        fetchAllData();
      } else {
        toast.error('Contraseña incorrecta');
      }
    } catch {
      toast.error('Error de conexión');
    }
    setLoading(false);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [progRes, msgRes, setRes, logRes] = await Promise.all([
        fetch('/api/programs/all', authHeader()),
        fetch('/api/messages/all', authHeader()),
        fetch('/api/settings', authHeader()),
        fetch('/api/admin', authHeader()),
      ]);

      if (progRes.ok) setPrograms(await progRes.json());
      if (msgRes.ok) setMessages(await msgRes.json());
      if (setRes.ok) {
        const setData = await setRes.json();
        setSettings(prev => ({ ...prev, ...setData }));
      }
      if (logRes.ok) setLogs(await logRes.json());
    } catch { /* ignore */ }
  }, [authHeader]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchAllData]);

  // Program CRUD
  const saveProgram = async () => {
    if (!editingProgram.name || !editingProgram.startTime || !editingProgram.endTime) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const payload = {
      name: editingProgram.name,
      host: editingProgram.host || '',
      description: editingProgram.description || '',
      dayOfWeek: editingProgram.dayOfWeek ?? new Date().getDay(),
      startTime: editingProgram.startTime,
      endTime: editingProgram.endTime,
      genre: editingProgram.genre || '',
      isActive: editingProgram.isActive ?? true,
      sortOrder: editingProgram.sortOrder ?? 0,
    };

    try {
      let res;
      if (editingProgram.id) {
        res = await fetch('/api/programs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
          body: JSON.stringify({ id: editingProgram.id, ...payload }),
        });
      } else {
        res = await fetch('/api/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(editingProgram.id ? 'Programa actualizado' : 'Programa creado');
        setProgramDialog(false);
        setEditingProgram({});
        fetchAllData();
      }
    } catch {
      toast.error('Error al guardar');
    }
  };

  const deleteProgram = async (id: string) => {
    try {
      const res = await fetch(`/api/programs?id=${id}`, {
        method: 'DELETE',
        ...authHeader(),
      });
      if (res.ok) {
        toast.success('Programa eliminado');
        fetchAllData();
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const toggleProgramActive = async (prog: Program) => {
    try {
      const res = await fetch('/api/programs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader().headers },
        body: JSON.stringify({ id: prog.id, isActive: !prog.isActive }),
      });
      if (res.ok) fetchAllData();
    } catch { /* ignore */ }
  };

  // Message CRUD
  const saveMessage = async () => {
    if (!editingMessage.content) {
      toast.error('Escribe un mensaje');
      return;
    }

    const payload = {
      content: editingMessage.content,
      type: editingMessage.type || 'info',
      priority: editingMessage.priority ?? 0,
      isActive: editingMessage.isActive ?? true,
    };

    try {
      let res;
      if (editingMessage.id) {
        res = await fetch('/api/messages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
          body: JSON.stringify({ id: editingMessage.id, ...payload }),
        });
      } else {
        res = await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(editingMessage.id ? 'Mensaje actualizado' : 'Mensaje creado');
        setMessageDialog(false);
        setEditingMessage({});
        fetchAllData();
      }
    } catch {
      toast.error('Error al guardar');
    }
  };

  const deleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/messages?id=${id}`, {
        method: 'DELETE',
        ...authHeader(),
      });
      if (res.ok) {
        toast.success('Mensaje eliminado');
        fetchAllData();
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // Settings
  const saveSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader().headers },
        body: JSON.stringify({ key, value }),
      });
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    }
  };

  // Change password
  const changePassword = async (newPass: string) => {
    await saveSetting('adminPassword', newPass);
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#17202A] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#F4D03F]/10 flex items-center justify-center mb-3">
              <Shield className="w-8 h-8 text-[#F4D03F]" />
            </div>
            <h2 className="text-xl font-bold text-white">Panel Admin</h2>
            <p className="text-sm text-white/40 mt-1">Voces Campesinas</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                type="password"
                placeholder="Contraseña de administrador"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#F4D03F]/50"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading || !password}
              className="w-full bg-[#F4D03F] text-[#17202A] hover:bg-[#D4AC0D] font-semibold"
            >
              {loading ? 'Verificando...' : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Ingresar
                </span>
              )}
            </Button>
          </div>

          <p className="text-center text-[10px] text-white/20 mt-6">
            Contraseña por defecto: voces2024
          </p>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-[#17202A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#17202A]/95 backdrop-blur-lg border-b border-white/5 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F4D03F] flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#17202A]" />
            </div>
            <div>
              <h1 className="text-sm font-bold">Panel de Administración</h1>
              <p className="text-[10px] text-white/40">Voces Campesinas</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setIsAuthenticated(false); setPassword(''); }}
            className="text-white/50 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-4 h-4 mr-1" /> Salir
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 pb-20">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-2xl font-bold text-[#F4D03F]">{programs.length}</p>
            <p className="text-[10px] text-white/40">Programas</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-2xl font-bold text-[#F4D03F]">{messages.filter(m => m.isActive).length}</p>
            <p className="text-[10px] text-white/40">Mensajes Activos</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-2xl font-bold text-[#F4D03F]">{logs.length}</p>
            <p className="text-[10px] text-white/40">Actividad</p>
          </div>
        </div>

        <Tabs defaultValue="programs" className="w-full">
          <TabsList className="w-full bg-white/5 border border-white/10 rounded-xl h-auto p-1">
            <TabsTrigger value="programs" className="flex-1 data-[state=active]:bg-[#F4D03F] data-[state=active]:text-[#17202A] text-white/50 text-xs py-2 rounded-lg">
              <Clock className="w-3.5 h-3.5 mr-1" /> Programación
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-1 data-[state=active]:bg-[#F4D03F] data-[state=active]:text-[#17202A] text-white/50 text-xs py-2 rounded-lg">
              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Mensajes
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 data-[state=active]:bg-[#F4D03F] data-[state=active]:text-[#17202A] text-white/50 text-xs py-2 rounded-lg">
              <Settings className="w-3.5 h-3.5 mr-1" /> Config
            </TabsTrigger>
          </TabsList>

          {/* PROGRAMS TAB */}
          <TabsContent value="programs" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70">Todos los Programas</h3>
              <Dialog open={programDialog} onOpenChange={setProgramDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => setEditingProgram({ dayOfWeek: new Date().getDay(), isActive: true, sortOrder: 0 })}
                    className="bg-[#F4D03F] text-[#17202A] hover:bg-[#D4AC0D] text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2332] border-white/10 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingProgram.id ? 'Editar Programa' : 'Nuevo Programa'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Input
                      placeholder="Nombre del programa *"
                      value={editingProgram.name || ''}
                      onChange={e => setEditingProgram(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Input
                      placeholder="Conductor"
                      value={editingProgram.host || ''}
                      onChange={e => setEditingProgram(prev => ({ ...prev, host: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Textarea
                      placeholder="Descripción"
                      value={editingProgram.description || ''}
                      onChange={e => setEditingProgram(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white min-h-[60px]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-white/40 mb-1 block">Día</label>
                        <Select
                          value={String(editingProgram.dayOfWeek ?? 0)}
                          onValueChange={v => setEditingProgram(prev => ({ ...prev, dayOfWeek: parseInt(v) }))}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a2332] border-white/10">
                            {DAY_NAMES.map((d, i) => (
                              <SelectItem key={i} value={String(i)} className="text-white text-xs">{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 mb-1 block">Género</label>
                        <Input
                          placeholder="Ej: Folclor"
                          value={editingProgram.genre || ''}
                          onChange={e => setEditingProgram(prev => ({ ...prev, genre: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-white/40 mb-1 block">Hora inicio *</label>
                        <Input
                          type="time"
                          value={editingProgram.startTime || ''}
                          onChange={e => setEditingProgram(prev => ({ ...prev, startTime: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 mb-1 block">Hora fin *</label>
                        <Input
                          type="time"
                          value={editingProgram.endTime || ''}
                          onChange={e => setEditingProgram(prev => ({ ...prev, endTime: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingProgram.isActive ?? true}
                        onCheckedChange={v => setEditingProgram(prev => ({ ...prev, isActive: v }))}
                      />
                      <span className="text-xs text-white/60">Programa activo</span>
                    </div>
                    <Button onClick={saveProgram} className="w-full bg-[#F4D03F] text-[#17202A] hover:bg-[#D4AC0D]">
                      <Save className="w-4 h-4 mr-1" /> Guardar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto hide-scrollbar">
              {programs.length === 0 ? (
                <p className="text-center text-white/30 text-sm py-8">No hay programas creados</p>
              ) : (
                programs.map(prog => (
                  <div key={prog.id} className={`p-3 rounded-xl border transition-all ${prog.isActive ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white truncate">{prog.name}</h4>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/40">
                            {DAY_NAMES[prog.dayOfWeek]?.substring(0, 3)}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          {prog.startTime} - {prog.endTime}
                          {prog.host && ` | ${prog.host}`}
                          {prog.genre && ` | ${prog.genre}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={prog.isActive}
                          onCheckedChange={() => toggleProgramActive(prog)}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingProgram(prog); setProgramDialog(true); }}
                          className="h-7 w-7 p-0 text-white/40 hover:text-white"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProgram(prog.id)}
                          className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* MESSAGES TAB */}
          <TabsContent value="messages" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70">Mensajes y Anuncios</h3>
              <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => setEditingMessage({ type: 'info', priority: 0, isActive: true })}
                    className="bg-[#F4D03F] text-[#17202A] hover:bg-[#D4AC0D] text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2332] border-white/10 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingMessage.id ? 'Editar Mensaje' : 'Nuevo Mensaje'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Textarea
                      placeholder="Contenido del mensaje *"
                      value={editingMessage.content || ''}
                      onChange={e => setEditingMessage(prev => ({ ...prev, content: e.target.value }))}
                      className="bg-white/5 border-white/10 text-white min-h-[80px]"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-white/40 mb-1 block">Tipo</label>
                        <Select
                          value={editingMessage.type || 'info'}
                          onValueChange={v => setEditingMessage(prev => ({ ...prev, type: v }))}
                        >
                          <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a2332] border-white/10">
                            <SelectItem value="info" className="text-white text-xs">Información</SelectItem>
                            <SelectItem value="alert" className="text-white text-xs">Alerta</SelectItem>
                            <SelectItem value="promotion" className="text-white text-xs">Promoción</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-white/40 mb-1 block">Prioridad (0-10)</label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={editingMessage.priority ?? 0}
                          onChange={e => setEditingMessage(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                          className="bg-white/5 border-white/10 text-white text-xs"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingMessage.isActive ?? true}
                        onCheckedChange={v => setEditingMessage(prev => ({ ...prev, isActive: v }))}
                      />
                      <span className="text-xs text-white/60">Mensaje activo</span>
                    </div>
                    <Button onClick={saveMessage} className="w-full bg-[#F4D03F] text-[#17202A] hover:bg-[#D4AC0D]">
                      <Save className="w-4 h-4 mr-1" /> Guardar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto hide-scrollbar">
              {messages.length === 0 ? (
                <p className="text-center text-white/30 text-sm py-8">No hay mensajes</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`p-3 rounded-xl border ${msg.isActive ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">{msg.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            msg.type === 'info' ? 'bg-sky-500/10 text-sky-400' :
                            msg.type === 'alert' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-[#F4D03F]/10 text-[#F4D03F]'
                          }`}>
                            {msg.type}
                          </span>
                          <span className="text-[10px] text-white/30">Prioridad: {msg.priority}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={msg.isActive}
                          onCheckedChange={async () => {
                            await fetch('/api/messages', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', ...authHeader().headers },
                              body: JSON.stringify({ id: msg.id, isActive: !msg.isActive }),
                            });
                            fetchAllData();
                          }}
                          className="scale-75"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingMessage(msg); setMessageDialog(true); }}
                          className="h-7 w-7 p-0 text-white/40 hover:text-white"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMessage(msg.id)}
                          className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="mt-4 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3">Emisora</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">URL del Stream</label>
                  <Input
                    value={settings.streamUrl}
                    onChange={e => setSettings(prev => ({ ...prev, streamUrl: e.target.value }))}
                    onBlur={() => saveSetting('streamUrl', settings.streamUrl)}
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Nombre</label>
                    <Input
                      value={settings.stationName}
                      onChange={e => setSettings(prev => ({ ...prev, stationName: e.target.value }))}
                      onBlur={() => saveSetting('stationName', settings.stationName)}
                      className="bg-white/5 border-white/10 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/40 mb-1 block">Eslogan</label>
                    <Input
                      value={settings.stationSlogan}
                      onChange={e => setSettings(prev => ({ ...prev, stationSlogan: e.target.value }))}
                      onBlur={() => saveSetting('stationSlogan', settings.stationSlogan)}
                      className="bg-white/5 border-white/10 text-white text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3">Redes Sociales</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Facebook</label>
                  <Input
                    value={settings.facebookUrl}
                    onChange={e => setSettings(prev => ({ ...prev, facebookUrl: e.target.value }))}
                    onBlur={() => saveSetting('facebookUrl', settings.facebookUrl)}
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Instagram</label>
                  <Input
                    value={settings.instagramUrl}
                    onChange={e => setSettings(prev => ({ ...prev, instagramUrl: e.target.value }))}
                    onBlur={() => saveSetting('instagramUrl', settings.instagramUrl)}
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">WhatsApp</label>
                  <Input
                    value={settings.whatsappUrl}
                    onChange={e => setSettings(prev => ({ ...prev, whatsappUrl: e.target.value }))}
                    onBlur={() => saveSetting('whatsappUrl', settings.whatsappUrl)}
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3">Seguridad</h3>
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Nueva Contraseña de Admin</label>
                <Input
                  type="password"
                  placeholder="Escribe nueva contraseña y presiona Enter"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                      changePassword((e.target as HTMLInputElement).value);
                      (e.target as HTMLInputElement).value = '';
                    }
                  }}
                  className="bg-white/5 border-white/10 text-white text-xs"
                />
              </div>
            </div>

            {/* Activity Logs */}
            <div>
              <button
                onClick={() => setExpandedLogs(!expandedLogs)}
                className="flex items-center gap-2 text-sm font-semibold text-white/70 mb-3 w-full"
              >
                <h3>Registro de Actividad</h3>
                {expandedLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {expandedLogs && (
                <div className="space-y-1 max-h-60 overflow-y-auto hide-scrollbar">
                  {logs.map(log => (
                    <div key={log.id} className="flex items-start gap-2 px-2 py-1.5 text-[11px] rounded bg-white/[0.02]">
                      <span className="text-white/20 font-mono shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[#F4D03F]/60 font-mono shrink-0">{log.action}</span>
                      {log.detail && <span className="text-white/30 truncate">{log.detail}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}