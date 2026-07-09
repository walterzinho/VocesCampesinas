'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, LogIn, LogOut, Radio, MessageSquare, Settings, Clock, Shield, Plus, Trash2, Save, ChevronDown, ChevronUp, X, Copy, Check, ArrowLeft, Music, Send, Heart, Bell, Eye, EyeOff, ImageIcon, Play, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAY_FULL_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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
  imageUrl: string | null;
}

interface Message {
  id: string;
  content: string;
  type: string;
  imageUrl: string | null;
  isActive: boolean;
  priority: number;
}

interface SongRequest {
  id: string;
  listenerName: string | null;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface AppSettings {
  streamUrl: string;
  stationName: string;
  stationSlogan: string;
  facebookUrl: string;
  instagramUrl: string;
  whatsappUrl: string;
  youtubeUrl: string;
  tiktokUrl: string;
  xUrl: string;
  primaryColor: string;
  darkColor: string;
  blogUrl: string;
  offAirSlogan: string;
  offAirName: string;
  offAirImageUrl: string;
}

interface Video {
  id: string;
  title: string;
  youtubeUrl: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface Log {
  id: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

interface DeviceInfo {
  id: string;
  deviceId: string;
  platform: string | null;
  userAgent: string | null;
  lastSeenAt: string;
  installedAt: string;
}

interface AdminPanelProps {
  onBack: () => void;
}

export default function AdminPanel({ onBack }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Data states
  const [programs, setPrograms] = useState<Program[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [songRequests, setSongRequests] = useState<SongRequest[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    streamUrl: '', stationName: '', stationSlogan: '',
    facebookUrl: '', instagramUrl: '', whatsappUrl: '',
    youtubeUrl: '', tiktokUrl: '', xUrl: '',
    primaryColor: '#e48d2a', darkColor: '#17202A',
    blogUrl: '', offAirSlogan: '', offAirName: '', offAirImageUrl: '',
  });
  const [offAirImage, setOffAirImage] = useState('');
  const [uploadingOffAir, setUploadingOffAir] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [deviceStats, setDeviceStats] = useState<{ total: number; platformCounts: Record<string, number> }>({ total: 0, platformCounts: {} });
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushSending, setPushSending] = useState(false);
  const [pushSubscribers, setPushSubscribers] = useState(0);
  const [vapidConfigured, setVapidConfigured] = useState(false);

  // Dialog states
  const [programDialog, setProgramDialog] = useState(false);
  const [messageDialog, setMessageDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Partial<Program>>({});
  const [selectedDays, setSelectedDays] = useState<number[]>([new Date().getDay()]);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Partial<Message>>({});
  const [expandedLogs, setExpandedLogs] = useState(false);
  const [videoDialog, setVideoDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Partial<Video>>({});
  const [videoForm, setVideoForm] = useState({ title: '', youtubeUrl: '', description: '' });

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
      const [progRes, msgRes, setRes, logRes, reqRes, vidRes, devRes] = await Promise.all([
        fetch('/api/programs/all', authHeader()),
        fetch('/api/messages/all', authHeader()),
        fetch('/api/settings', authHeader()),
        fetch('/api/admin', authHeader()),
        fetch('/api/requests', authHeader()),
        fetch('/api/videos', authHeader()),
        fetch('/api/devices', authHeader()),
      ]);

      if (progRes.ok) setPrograms(await progRes.json());
      if (msgRes.ok) setMessages(await msgRes.json());
      if (setRes.ok) {
        const setData = await setRes.json();
        setSettings(prev => ({ ...prev, ...setData }));
        if (setData.offAirImageUrl) setOffAirImage(setData.offAirImageUrl);
      }
      if (logRes.ok) setLogs(await logRes.json());
      if (reqRes.ok) setSongRequests(await reqRes.json());
      if (vidRes.ok) setVideos(await vidRes.json());
      if (devRes.ok) {
        const devData = await devRes.json();
        setDevices(devData.devices || []);
        setDeviceStats({ total: devData.total || 0, platformCounts: devData.platformCounts || {} });
      }

      // Check VAPID + subscriber count
      const vapidRes = await fetch('/api/push/vapid-key');
      if (vapidRes.ok) {
        const vapidData = await vapidRes.json();
        setVapidConfigured(vapidData.configured);
      }
      const subCountRes = await fetch('/api/push/subscribe', authHeader());
      if (subCountRes.ok) {
        const subData = await subCountRes.json();
        setPushSubscribers(subData.count || 0);
      }
    } catch { /* ignore */ }
  }, [authHeader]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchAllData]);

  // Quick day selection helpers
  const setWeekdays = () => setSelectedDays([1, 2, 3, 4, 5]);
  const setWeekend = () => setSelectedDays([0, 6]);
  const toggleAllDays = () => {
    if (selectedDays.length === 7) setSelectedDays([]);
    else setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  };
  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const isQuickActive = (days: number[]) => {
    if (selectedDays.length !== days.length) return false;
    return days.every(d => selectedDays.includes(d));
  };

  // Image upload handler
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingMsgImage, setUploadingMsgImage] = useState(false);
  const uploadFile = async (file: File, field: string): Promise<string | null> => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es muy grande (máximo 5MB)');
      return null;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return null;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('field', field);
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${password}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Error al subir imagen');
        return null;
      }
    } catch (err) {
      toast.error('Error de conexión al subir');
      return null;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const url = await uploadFile(file, 'program');
    if (url) {
      setEditingProgram(prev => ({ ...prev, imageUrl: url }));
      toast.success('Imagen subida');
    }
    setUploadingImage(false);
    e.target.value = '';
  };

  const handleMessageImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMsgImage(true);
    const url = await uploadFile(file, 'message');
    if (url) {
      setEditingMessage(prev => ({ ...prev, imageUrl: url }));
      toast.success('Imagen subida');
    }
    setUploadingMsgImage(false);
    e.target.value = '';
  };

  const handleOffAirImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingOffAir(true);
    const url = await uploadFile(file, 'offair');
    if (url) {
      setOffAirImage(url);
      setSettings(prev => ({ ...prev, offAirImageUrl: url }));
      await saveSettingDirect('offAirImageUrl', url);
      toast.success('Imagen de fuera de aire actualizada');
    }
    setUploadingOffAir(false);
    e.target.value = '';
  };

  const saveSettingDirect = async (key: string, value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader().headers },
        body: JSON.stringify({ key, value }),
      });
    } catch { /* */ }
  };

  // Program CRUD
  const saveProgram = async () => {
    if (!editingProgram.name || !editingProgram.startTime || !editingProgram.endTime) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    if (selectedDays.length === 0) {
      toast.error('Selecciona al menos un día');
      return;
    }

    const basePayload = {
      name: editingProgram.name,
      host: editingProgram.host || '',
      description: editingProgram.description || '',
      startTime: editingProgram.startTime,
      endTime: editingProgram.endTime,
      genre: editingProgram.genre || '',
      isActive: editingProgram.isActive ?? true,
      sortOrder: editingProgram.sortOrder ?? 0,
      imageUrl: editingProgram.imageUrl || '',
    };

    try {
      let res;
      if (isEditingExisting && editingProgram.id && selectedDays.length === 1) {
        res = await fetch('/api/programs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
          body: JSON.stringify({ id: editingProgram.id, ...basePayload, dayOfWeek: selectedDays[0] }),
        });
      } else if (isEditingExisting) {
        const oldName = editingProgram.name;
        res = await fetch('/api/programs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
          body: JSON.stringify({
            batchUpdateName: oldName,
            days: selectedDays,
            ...basePayload,
          }),
        });
      } else {
        res = await fetch('/api/programs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
          body: JSON.stringify({ ...basePayload, days: selectedDays }),
        });
      }

      if (res.ok) {
        const dayLabel = selectedDays.length === 7 ? 'todos los días' : `${selectedDays.length} día(s)`;
        toast.success(`${isEditingExisting ? 'Programa actualizado' : 'Programa creado'} para ${dayLabel}`);
        setProgramDialog(false);
        setEditingProgram({});
        setSelectedDays([new Date().getDay()]);
        setIsEditingExisting(false);
        fetchAllData();
      }
    } catch {
      toast.error('Error al guardar');
    }
  };

  const deleteProgram = async (id: string, name?: string) => {
    try {
      const params = name ? `?name=${encodeURIComponent(name)}` : `?id=${id}`;
      const res = await fetch(`/api/programs${params}`, {
        method: 'DELETE',
        ...authHeader(),
      });
      if (res.ok) {
        toast.success(name ? `"${name}" eliminado de todos los días` : 'Programa eliminado');
        fetchAllData();
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // Group programs by name for display
  const groupedPrograms = programs.reduce((acc, prog) => {
    const key = prog.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(prog);
    return acc;
  }, {} as Record<string, Program[]>);

  const openEditProgram = (prog: Program) => {
    setIsEditingExisting(true);
    setEditingProgram(prog);
    const sameNamePrograms = programs.filter(p => p.name === prog.name);
    setSelectedDays(sameNamePrograms.map(p => p.dayOfWeek));
    setProgramDialog(true);
  };

  const openNewProgram = () => {
    setIsEditingExisting(false);
    setEditingProgram({ isActive: true, sortOrder: 0 });
    setSelectedDays([new Date().getDay()]);
    setProgramDialog(true);
  };

  const toggleProgramActive = async (prog: Program) => {
    try {
      const sameName = programs.filter(p => p.name === prog.name);
      const newActive = !prog.isActive;
      for (const p of sameName) {
        await fetch('/api/programs', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
          body: JSON.stringify({ id: p.id, isActive: newActive }),
        });
      }
      fetchAllData();
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
      imageUrl: editingMessage.imageUrl || null,
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
        toast.success(editingMessage.id ? 'Información actualizada' : 'Información creada');
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
        toast.success('Eliminado');
        fetchAllData();
      }
    } catch {
      toast.error('Error al eliminar');
    }
  };

  // Mark request as read
  const markRequestRead = async (id: string, read: boolean) => {
    try {
      await fetch('/api/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader().headers },
        body: JSON.stringify({ id, isRead: read }),
      });
      fetchAllData();
    } catch { /* ignore */ }
  };

  // Delete request
  const deleteRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/requests?id=${id}`, {
        method: 'DELETE',
        ...authHeader(),
      });
      if (res.ok) {
        toast.success('Petición eliminada');
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
          <button
            onClick={onBack}
            className="absolute top-4 left-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>

          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#e48d2a]/10 flex items-center justify-center mb-3">
              <Shield className="w-8 h-8 text-[#e48d2a]" />
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
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#e48d2a]/50"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading || !password}
              className="w-full bg-[#e48d2a] text-[#17202A] hover:bg-[#c87820] font-semibold"
            >
              {loading ? 'Verificando...' : (
                <span className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" /> Ingresar
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const unreadRequests = songRequests.filter(r => !r.isRead).length;

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-[#17202A] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#17202A]/95 backdrop-blur-lg border-b border-white/5 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              title="Volver al reproductor"
            >
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-[#e48d2a] flex items-center justify-center">
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
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-2xl font-bold text-[#e48d2a]">{Object.keys(groupedPrograms).length}</p>
            <p className="text-[10px] text-white/40">Programas</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-2xl font-bold text-[#e48d2a]">{messages.filter(m => m.isActive).length}</p>
            <p className="text-[10px] text-white/40">Info Activos</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5 relative">
            <p className="text-2xl font-bold text-[#e48d2a]">{songRequests.length}</p>
            <p className="text-[10px] text-white/40">Peticiones</p>
            {unreadRequests > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">{unreadRequests}</span>
            )}
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <p className="text-2xl font-bold text-[#e48d2a]">{logs.length}</p>
            <p className="text-[10px] text-white/40">Actividad</p>
          </div>
        </div>

        <Tabs defaultValue="programs" className="w-full">
          <TabsList className="w-full bg-white/5 border border-white/10 rounded-xl h-auto p-1">
            <TabsTrigger value="programs" className="flex-1 data-[state=active]:bg-[#e48d2a] data-[state=active]:text-[#17202A] text-white/50 text-xs py-2 rounded-lg">
              <Clock className="w-3.5 h-3.5 mr-1" /> Programación
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-1 data-[state=active]:bg-[#e48d2a] data-[state=active]:text-[#17202A] text-white/50 text-xs py-2 rounded-lg">
              <Bell className="w-3.5 h-3.5 mr-1" /> Información
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex-1 data-[state=active]:bg-[#e48d2a] data-[state=active]:text-[#17202A] text-white/50 text-xs py-2 rounded-lg relative">
              <Send className="w-3.5 h-3.5 mr-1" /> Peticiones
              {unreadRequests > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full">{unreadRequests}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 data-[state=active]:bg-[#e48d2a] data-[state=active]:text-[#17202A] text-white/50 text-xs py-2 rounded-lg">
              <Settings className="w-3.5 h-3.5 mr-1" /> Config
            </TabsTrigger>
            <TabsTrigger value="videos" className="flex-1 data-[state=active]:bg-[#e48d2a] data-[state=active]:text-[#17202A] text-white/50 text-xs py-2 rounded-lg">
              <Play className="w-3.5 h-3.5 mr-1" /> Videos
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
                    onClick={openNewProgram}
                    className="bg-[#e48d2a] text-[#17202A] hover:bg-[#c87820] text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2332] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {isEditingExisting ? 'Editar Programa' : 'Nuevo Programa'}
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

                    {/* Day Selection with Quick Selects */}
                    <div className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
                      <label className="text-xs text-white/60 font-medium mb-2 block">Días de emisión *</label>

                      {/* Quick select buttons */}
                      <div className="flex gap-1.5 mb-3">
                        <button
                          type="button"
                          onClick={toggleAllDays}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                            isQuickActive([0, 1, 2, 3, 4, 5, 6])
                              ? 'bg-[#e48d2a] border-[#e48d2a] text-[#17202A]'
                              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          onClick={setWeekdays}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                            isQuickActive([1, 2, 3, 4, 5])
                              ? 'bg-[#e48d2a] border-[#e48d2a] text-[#17202A]'
                              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          Lun - Vie
                        </button>
                        <button
                          type="button"
                          onClick={setWeekend}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all border ${
                            isQuickActive([0, 6])
                              ? 'bg-[#e48d2a] border-[#e48d2a] text-[#17202A]'
                              : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          Fin de Semana
                        </button>
                      </div>

                      {/* Individual day buttons */}
                      <div className="grid grid-cols-7 gap-1">
                        {DAY_NAMES.map((day, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => toggleDay(idx)}
                            className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-[11px] font-medium transition-all border ${
                              selectedDays.includes(idx)
                                ? 'bg-[#e48d2a]/15 border-[#e48d2a]/40 text-[#e48d2a]'
                                : 'bg-white/[0.02] border-white/5 text-white/30 hover:border-white/15 hover:text-white/60'
                            }`}
                          >
                            {selectedDays.includes(idx) && <Check className="w-3 h-3" />}
                            <span>{day}</span>
                          </button>
                        ))}
                      </div>

                      {selectedDays.length > 0 && (
                        <p className="text-[10px] text-white/25 mt-2 text-center">
                          Se creará {selectedDays.length === 1 ? '1 entrada' : `${selectedDays.length} entradas`} — {selectedDays.map(d => DAY_FULL_NAMES[d]).join(', ')}
                        </p>
                      )}
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
                    {/* Image Upload */}
                    <div>
                      <label className="text-[10px] text-white/40 mb-1 block">Imagen de fondo</label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                          <span className="text-xs text-white/50 truncate">
                            {editingProgram.imageUrl || 'Seleccionar imagen...'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        {uploadingImage && (
                          <span className="text-[10px] text-[#e48d2a] animate-pulse">Subiendo...</span>
                        )}
                        {editingProgram.imageUrl && (
                          <button
                            onClick={() => setEditingProgram(prev => ({ ...prev, imageUrl: '' }))}
                            className="text-white/30 hover:text-red-400 transition-colors p-1"
                            title="Quitar imagen"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {editingProgram.imageUrl && (
                        <div className="mt-1.5 rounded-lg overflow-hidden h-16 bg-white/5">
                          <img src={editingProgram.imageUrl?.startsWith('/uploads/') ? `/api/uploads${editingProgram.imageUrl.slice('/uploads'.length)}` : editingProgram.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
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
                    <Button onClick={saveProgram} className="w-full bg-[#e48d2a] text-[#17202A] hover:bg-[#c87820]">
                      <Save className="w-4 h-4 mr-1" /> Guardar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto hide-scrollbar">
              {Object.keys(groupedPrograms).length === 0 ? (
                <p className="text-center text-white/30 text-sm py-8">No hay programas creados</p>
              ) : (
                Object.entries(groupedPrograms).map(([name, progs]) => {
                  const firstProg = progs[0];
                  const dayCount = progs.length;
                  const allDays = progs.every(p => p.isActive);
                  const dayLabels = progs
                    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                    .map(p => DAY_NAMES[p.dayOfWeek]);

                  return (
                    <div key={name} className={`p-3 rounded-xl border transition-all ${allDays ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-white truncate">{name}</h4>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              dayCount === 7
                                ? 'bg-[#e48d2a]/20 text-[#e48d2a]'
                                : 'bg-white/10 text-white/40'
                            }`}>
                              {dayCount === 7 ? 'Todos los días' : dayLabels.join(' · ')}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/40 mt-0.5">
                            {firstProg.startTime} - {firstProg.endTime}
                            {firstProg.host && ` | ${firstProg.host}`}
                            {firstProg.genre && ` | ${firstProg.genre}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={allDays}
                            onCheckedChange={() => toggleProgramActive(firstProg)}
                            className="scale-75"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditProgram(firstProg)}
                            className="h-7 w-7 p-0 text-white/40 hover:text-white"
                            title="Editar"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteProgram(firstProg.id, name)}
                            className="h-7 w-7 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* MESSAGES TAB (renamed to Información) */}
          <TabsContent value="messages" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70">Información y Anuncios</h3>
              <Dialog open={messageDialog} onOpenChange={setMessageDialog}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    onClick={() => setEditingMessage({ type: 'info', priority: 0, isActive: true })}
                    className="bg-[#e48d2a] text-[#17202A] hover:bg-[#c87820] text-xs h-8"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a2332] border-white/10 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      {editingMessage.id ? 'Editar Información' : 'Nueva Información'}
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
                    {/* Image Upload for message */}
                    <div>
                      <label className="text-[10px] text-white/40 mb-1 block">Imagen (1:1 recomendado)</label>
                      <div className="flex items-center gap-2">
                        <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                          <ImageIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                          <span className="text-xs text-white/50 truncate">
                            {editingMessage.imageUrl
                              ? editingMessage.imageUrl.replace(/^\/api\/uploads\//, '').replace('/uploads/', '')
                              : 'Seleccionar imagen...'}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMessageImageUpload}
                            className="hidden"
                          />
                        </label>
                        {uploadingMsgImage && (
                          <span className="text-[10px] text-[#e48d2a] animate-pulse">Subiendo...</span>
                        )}
                        {editingMessage.imageUrl && (
                          <button
                            onClick={() => setEditingMessage(prev => ({ ...prev, imageUrl: '' }))}
                            className="text-white/30 hover:text-red-400 transition-colors p-1"
                            title="Quitar imagen"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {editingMessage.imageUrl && (
                        <div className="mt-2 w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                          <img src={editingMessage.imageUrl?.startsWith('/uploads/') ? `/api/uploads${editingMessage.imageUrl.slice('/uploads'.length)}` : editingMessage.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingMessage.isActive ?? true}
                        onCheckedChange={v => setEditingMessage(prev => ({ ...prev, isActive: v }))}
                      />
                      <span className="text-xs text-white/60">Activo</span>
                    </div>
                    <Button onClick={saveMessage} className="w-full bg-[#e48d2a] text-[#17202A] hover:bg-[#c87820]">
                      <Save className="w-4 h-4 mr-1" /> Guardar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto hide-scrollbar">
              {messages.length === 0 ? (
                <p className="text-center text-white/30 text-sm py-8">No hay mensajes de información</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`p-3 rounded-xl border ${msg.isActive ? 'bg-white/5 border-white/10' : 'bg-white/[0.02] border-white/5 opacity-50'}`}>
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10">
                        {msg.imageUrl ? (
                          <img src={msg.imageUrl?.startsWith('/uploads/') ? `/api/uploads${msg.imageUrl.slice('/uploads'.length)}` : msg.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-white/15" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white line-clamp-2">{msg.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            msg.type === 'info' ? 'bg-sky-500/10 text-sky-400' :
                            msg.type === 'alert' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-[#e48d2a]/10 text-[#e48d2a]'
                          }`}>
                            {msg.type === 'info' ? 'Info' : msg.type === 'alert' ? 'Alerta' : 'Promo'}
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

          {/* SONG REQUESTS TAB */}
          <TabsContent value="requests" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70">
                Peticiones y Mensajes de Oyentes
              </h3>
              {unreadRequests > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    for (const r of songRequests.filter(r => !r.isRead)) {
                      await markRequestRead(r.id, true);
                    }
                  }}
                  className="text-xs text-[#e48d2a] hover:bg-[#e48d2a]/10"
                >
                  <Check className="w-3 h-3 mr-1" /> Marcar todo leído
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto hide-scrollbar">
              {songRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="w-10 h-10 mx-auto mb-2 text-white/20" />
                  <p className="text-white/30 text-sm">No hay peticiones aún</p>
                  <p className="text-white/20 text-xs mt-1">Los oyentes pueden enviar peticiones desde la app</p>
                </div>
              ) : (
                songRequests.map(req => {
                  const typeIcon = req.type === 'greeting' ? Heart : req.type === 'message' ? MessageSquare : Music;
                  const TypeIcon = typeIcon;
                  const typeLabel = req.type === 'greeting' ? 'Saludo' : req.type === 'message' ? 'Mensaje' : 'Petición';
                  const typeColor = req.type === 'greeting' ? 'text-pink-400 bg-pink-500/10' : req.type === 'message' ? 'text-sky-400 bg-sky-500/10' : 'text-[#e48d2a] bg-[#e48d2a]/10';

                  return (
                    <div key={req.id} className={`p-3 rounded-xl border transition-all ${!req.isRead ? 'bg-white/5 border-[#e48d2a]/20' : 'bg-white/[0.02] border-white/5'}`}>
                      <div className="flex items-start gap-2">
                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${typeColor}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${typeColor}`}>{typeLabel}</span>
                            {req.listenerName && (
                              <span className="text-[11px] text-white/60">{req.listenerName}</span>
                            )}
                            <span className="text-[10px] text-white/20 ml-auto">
                              {new Date(req.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={`text-sm ${!req.isRead ? 'text-white' : 'text-white/60'}`}>{req.message}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markRequestRead(req.id, !req.isRead)}
                            className="h-6 w-6 p-0 text-white/30 hover:text-white"
                            title={req.isRead ? 'Marcar no leído' : 'Marcar leído'}
                          >
                            {req.isRead ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRequest(req.id)}
                            className="h-6 w-6 p-0 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
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
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">URL del Blog</label>
                  <Input
                    value={settings.blogUrl || ''}
                    onChange={e => setSettings(prev => ({ ...prev, blogUrl: e.target.value }))}
                    onBlur={() => saveSetting('blogUrl', settings.blogUrl || '')}
                    placeholder="http://161.97.154.157:8099"
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Nombre fuera de aire</label>
                  <Input
                    value={settings.offAirName || ''}
                    onChange={e => setSettings(prev => ({ ...prev, offAirName: e.target.value }))}
                    onBlur={() => saveSetting('offAirName', settings.offAirName || 'Música de la Tierrita')}
                    placeholder="Música de la Tierrita"
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                  <p className="text-[9px] text-white/25 mt-0.5">Se muestra cuando no hay programa al aire</p>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Eslogan fuera de aire</label>
                  <Input
                    value={settings.offAirSlogan || ''}
                    onChange={e => setSettings(prev => ({ ...prev, offAirSlogan: e.target.value }))}
                    onBlur={() => saveSetting('offAirSlogan', settings.offAirSlogan || '')}
                    placeholder="La mejor selección musical campesina"
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                  <p className="text-[9px] text-white/25 mt-0.5">Descripción que aparece bajo el nombre</p>
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Imagen de fondo (fuera de aire)</label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-white/20 transition-colors">
                      <ImageIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <span className="text-xs text-white/50 truncate">
                        {offAirImage
                          ? offAirImage.replace(/^\/api\/uploads\//, '').replace('/uploads/', '')
                          : 'Seleccionar imagen...'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleOffAirImageUpload}
                        className="hidden"
                      />
                    </label>
                    {uploadingOffAir && (
                      <span className="text-[10px] text-[#e48d2a] animate-pulse">Subiendo...</span>
                    )}
                    {offAirImage && (
                      <button
                        onClick={async () => {
                          setOffAirImage('');
                          setSettings(prev => ({ ...prev, offAirImageUrl: '' }));
                          await saveSettingDirect('offAirImageUrl', '');
                          toast.success('Imagen removida');
                        }}
                        className="text-white/30 hover:text-red-400 transition-colors p-1"
                        title="Quitar imagen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {offAirImage && (
                    <div className="mt-2 w-20 h-14 rounded-lg overflow-hidden border border-white/10">
                      <img src={offAirImage.startsWith('/uploads/') ? `/api/uploads${offAirImage.slice('/uploads'.length)}` : offAirImage} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <p className="text-[9px] text-white/25 mt-0.5">Fondo que se muestra cuando no hay programa en vivo</p>
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
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">YouTube</label>
                  <Input
                    value={settings.youtubeUrl}
                    onChange={e => setSettings(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                    onBlur={() => saveSetting('youtubeUrl', settings.youtubeUrl)}
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">TikTok</label>
                  <Input
                    value={settings.tiktokUrl}
                    onChange={e => setSettings(prev => ({ ...prev, tiktokUrl: e.target.value }))}
                    onBlur={() => saveSetting('tiktokUrl', settings.tiktokUrl)}
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">X (Twitter)</label>
                  <Input
                    value={settings.xUrl}
                    onChange={e => setSettings(prev => ({ ...prev, xUrl: e.target.value }))}
                    onBlur={() => saveSetting('xUrl', settings.xUrl)}
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3">Notificaciones Telegram</h3>
              <p className="text-[10px] text-white/30 mb-2">Recibe alertas de peticiones, saludos y dedicaciones en tu Telegram.</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Token del Bot</label>
                  <Input
                    value={(settings as any).telegramBotToken || ''}
                    onChange={e => setSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                    onBlur={() => saveSetting('telegramBotToken', (settings as any).telegramBotToken || '')}
                    placeholder="123456:ABC-DEF..."
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/40 mb-1 block">Chat ID</label>
                  <Input
                    value={(settings as any).telegramChatId || ''}
                    onChange={e => setSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                    onBlur={() => saveSetting('telegramChatId', (settings as any).telegramChatId || '')}
                    placeholder="-1001234567890"
                    className="bg-white/5 border-white/10 text-white text-xs"
                  />
                </div>
                <button
                  onClick={async () => {
                    const res = await fetch('/api/requests/test-telegram', {
                      headers: { 'Authorization': `Bearer ${password}` },
                    });
                    if (res.ok) toast.success('Notificación de prueba enviada');
                    else toast.error('Error al enviar prueba. Verifica token y chat ID.');
                  }}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                >
                  Enviar notificación de prueba
                </button>
              </div>
            </div>

            {/* Notificaciones Push */}
            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notificaciones Push
              </h3>
              <p className="text-[10px] text-white/30 mb-3">Envía notificaciones directas al celular de los oyentes que tengan la app instalada.</p>

              {!vapidConfigured ? (
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-3">
                  <p className="text-[11px] text-yellow-300/80 mb-2">Primero debes generar las llaves de seguridad para activar las notificaciones push.</p>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/push/generate-vapid', { method: 'POST', headers: authHeader().headers });
                        if (res.ok) {
                          toast.success('Llaves VAPID generadas');
                          fetchAllData();
                        } else toast.error('Error al generar llaves');
                      } catch { toast.error('Error de conexión'); }
                    }}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors font-medium"
                  >
                    Generar llaves VAPID
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[9px] font-bold rounded-full">VAPID configurado</span>
                    <span className="text-[10px] text-white/30">{pushSubscribers} suscriptor{pushSubscribers !== 1 ? 'es' : ''}</span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <label className="text-[10px] text-white/40 mb-1 block">Título de la notificación</label>
                      <Input
                        value={pushTitle}
                        onChange={e => setPushTitle(e.target.value)}
                        placeholder="Ej: ¡Nuevo programa esta semana!"
                        className="bg-white/5 border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 mb-1 block">Mensaje</label>
                      <Textarea
                        value={pushBody}
                        onChange={e => setPushBody(e.target.value)}
                        placeholder="Ej: No te pierdas 'El Campo Habla' este viernes a las 7pm"
                        className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] resize-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!pushTitle.trim() || !pushBody.trim()) {
                        toast.error('Título y mensaje son requeridos');
                        return;
                      }
                      setPushSending(true);
                      try {
                        const res = await fetch('/api/push/send', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...authHeader().headers },
                          body: JSON.stringify({ title: pushTitle, body: pushBody }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          toast.success(`Enviada: ${data.sent} exitosas, ${data.failed} fallidas${data.cleaned ? ` (${data.cleaned} limpiadas)` : ''}`);
                          setPushTitle('');
                          setPushBody('');
                          fetchAllData();
                        } else {
                          toast.error(data.error || 'Error al enviar');
                        }
                      } catch { toast.error('Error de conexión'); }
                      finally { setPushSending(false); }
                    }}
                    disabled={pushSending || pushSubscribers === 0}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-[#e48d2a]/20 text-[#e48d2a] hover:bg-[#e48d2a]/30 transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {pushSending ? 'Enviando...' : `Enviar a ${pushSubscribers} suscriptor${pushSubscribers !== 1 ? 'es' : ''}`}
                  </button>
                </>
              )}
            </div>

            {/* App Instalaciones */}
            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> App Instalada
              </h3>
              <p className="text-[10px] text-white/30 mb-3">Dispositivos que tienen la app instalada y activa.</p>
              
              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-lg font-bold text-[#e48d2a]">{deviceStats.total}</p>
                  <p className="text-[9px] text-white/40">Total</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-lg font-bold text-green-400">{deviceStats.platformCounts?.android || 0}</p>
                  <p className="text-[9px] text-white/40">Android</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                  <p className="text-lg font-bold text-blue-400">{deviceStats.platformCounts?.ios || 0}</p>
                  <p className="text-[9px] text-white/40">iOS</p>
                </div>
              </div>

              {/* Device list */}
              {devices.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto hide-scrollbar">
                  {devices.slice(0, 20).map(device => {
                    const platformIcon = device.platform === 'android' ? '🤖' : device.platform === 'ios' ? '🍎' : '💻';
                    const lastSeen = new Date(device.lastSeenAt);
                    const now = new Date();
                    const diffMs = now.getTime() - lastSeen.getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    const lastSeenText = diffMins < 1 ? 'Ahora' : diffMins < 60 ? `Hace ${diffMins}m` : diffMins < 1440 ? `Hace ${Math.floor(diffMins / 60)}h` : `Hace ${Math.floor(diffMins / 1440)}d`;
                    const isActive = diffMins < 30;

                    return (
                      <div key={device.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                        <span className="text-base">{platformIcon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-medium text-white/70">{device.platform || 'Desconocido'}</span>
                            {isActive && (
                              <span className="px-1 py-0.5 bg-green-500/20 text-green-400 text-[7px] font-bold rounded-full">ACTIVO</span>
                            )}
                          </div>
                          <p className="text-[9px] text-white/25 truncate">{device.userAgent?.substring(0, 50) || 'N/A'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-white/30">{lastSeenText}</p>
                          <p className="text-[8px] text-white/15">{new Date(device.installedAt).toLocaleDateString('es-CO')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-white/20 text-[10px]">
                  <Smartphone className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                  Aún no hay dispositivos registrados
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white/70 mb-3">Seguridad</h3>
              <div>
                <label className="text-[10px] text-white/40 mb-1 block">Cambiar Contraseña de Admin</label>
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
                      <span className="text-[#e48d2a]/60 font-mono shrink-0">{log.action}</span>
                      {log.detail && <span className="text-white/30 truncate">{log.detail}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* VIDEOS TAB */}
          <TabsContent value="videos" className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/70">Videos de YouTube</h3>
              <Dialog open={videoDialog} onOpenChange={(open) => {
                setVideoDialog(open);
                if (!open) { setEditingVideo({}); setVideoForm({ title: '', youtubeUrl: '', description: '' }); }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white text-xs h-7 gap-1">
                    <Plus className="w-3 h-3" /> Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md mx-4">
                  <DialogHeader>
                    <DialogTitle className="text-sm">{editingVideo.id ? 'Editar Video' : 'Agregar Video'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div>
                      <label className="text-[10px] text-white/40 font-medium mb-1 block">Título del video *</label>
                      <Input
                        value={videoForm.title}
                        onChange={e => setVideoForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Título del video"
                        className="bg-white/5 border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 font-medium mb-1 block">Enlace de YouTube *</label>
                      <Input
                        value={videoForm.youtubeUrl}
                        onChange={e => setVideoForm(f => ({ ...f, youtubeUrl: e.target.value }))}
                        placeholder="https://youtube.com/watch?v=... o solo el ID"
                        className="bg-white/5 border-white/10 text-white text-xs"
                      />
                      <p className="text-[9px] text-white/30 mt-1">Pega el enlace completo de YouTube o solo el ID del video</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-white/40 font-medium mb-1 block">Descripción (opcional)</label>
                      <Textarea
                        value={videoForm.description}
                        onChange={e => setVideoForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Breve descripción del video"
                        className="bg-white/5 border-white/10 text-white text-xs min-h-[60px] resize-none"
                      />
                    </div>
                    <Button
                      onClick={async () => {
                        if (!videoForm.title.trim() || !videoForm.youtubeUrl.trim()) {
                          toast.error('Título y enlace son requeridos');
                          return;
                        }
                        try {
                          const isEdit = !!editingVideo.id;
                          const res = await fetch('/api/videos', {
                            method: isEdit ? 'PUT' : 'POST',
                            headers: { 'Content-Type': 'application/json', ...authHeader().headers },
                            body: JSON.stringify({
                              ...(isEdit ? { id: editingVideo.id } : {}),
                              title: videoForm.title,
                              youtubeUrl: videoForm.youtubeUrl,
                              description: videoForm.description,
                            }),
                          });
                          if (res.ok) {
                            toast.success(isEdit ? 'Video actualizado' : 'Video agregado');
                            setVideoDialog(false);
                            setEditingVideo({});
                            setVideoForm({ title: '', youtubeUrl: '', description: '' });
                            fetchAllData();
                          } else {
                            const err = await res.json();
                            toast.error(err.error || 'Error al guardar');
                          }
                        } catch { toast.error('Error de conexión'); }
                      }}
                      className="w-full bg-[#e48d2a] text-[#17202A] hover:bg-[#c87820] text-xs font-semibold h-9"
                    >
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {editingVideo.id ? 'Actualizar' : 'Guardar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {videos.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-xs">
                <Play className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay videos agregados</p>
                <p className="text-[10px] mt-1">Agrega videos de YouTube que se mostrarán en la sección Noticias</p>
              </div>
            ) : (
              <div className="space-y-2">
                {videos.map(video => (
                  <div key={video.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-start gap-3">
                      {/* Thumbnail */}
                      <div className="shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-white/5 relative">
                        <img
                          src={`https://img.youtube.com/vi/${video.youtubeUrl}/mqdefault.jpg`}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-4 h-4 text-white/70" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate">{video.title}</h4>
                        <p className="text-[10px] text-white/30 mt-0.5 truncate">{video.description || 'Sin descripción'}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Switch
                            checked={video.isActive}
                            onCheckedChange={async (checked) => {
                              await fetch('/api/videos', { method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeader().headers }, body: JSON.stringify({ id: video.id, isActive: checked }) });
                              setVideos(vs => vs.map(v => v.id === video.id ? { ...v, isActive: checked } : v));
                            }}
                            className="scale-75"
                          />
                          <span className="text-[9px] text-white/40">{video.isActive ? 'Activo' : 'Inactivo'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingVideo(video);
                            setVideoForm({ title: video.title, youtubeUrl: video.youtubeUrl, description: video.description || '' });
                            setVideoDialog(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white"
                          title="Editar"
                        >
                          <Save className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('¿Eliminar este video?')) return;
                            await fetch(`/api/videos?id=${video.id}`, { method: 'DELETE', ...authHeader() });
                            setVideos(vs => vs.filter(v => v.id !== video.id));
                            toast.success('Video eliminado');
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors text-white/40 hover:text-red-400"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
