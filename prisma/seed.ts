import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

async function seed() {
  // Default settings
  const defaultSettings = [
    { key: 'streamUrl', value: 'https://emisora.vocescampesinas.co/listen/vocescampesinas/radio.mp3' },
    { key: 'stationName', value: 'Voces Campesinas' },
    { key: 'stationSlogan', value: 'El Campo Nos Une' },
    { key: 'adminPassword', value: 'voces2024' },
    { key: 'facebookUrl', value: 'https://facebook.com/vocescampesinas' },
    { key: 'instagramUrl', value: 'https://instagram.com/vocescampesinas' },
    { key: 'whatsappUrl', value: 'https://wa.me/573000000000' },
    { key: 'primaryColor', value: '#F4D03F' },
    { key: 'darkColor', value: '#17202A' },
  ];

  for (const s of defaultSettings) {
    await db.settings.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // Sample programs
  const programs = [
    { name: 'Despertar Campesino', host: 'Carlos Martínez', description: 'Mañanas campesinas con música folclórica y noticias del campo', dayOfWeek: 1, startTime: '06:00', endTime: '08:00', genre: 'Folclor', sortOrder: 0 },
    { name: 'Noticias del Agro', host: 'Ana Rodríguez', description: 'Información agrícola, precios del mercado y clima', dayOfWeek: 1, startTime: '08:00', endTime: '09:00', genre: 'Informativo', sortOrder: 1 },
    { name: 'Música del Recuerdo', host: 'María López', description: 'Los mejores éxitos de la música campesina', dayOfWeek: 1, startTime: '09:00', endTime: '11:00', genre: 'Música', sortOrder: 2 },
    { name: 'Despertar Campesino', host: 'Carlos Martínez', description: 'Mañanas campesinas con música folclórica y noticias del campo', dayOfWeek: 2, startTime: '06:00', endTime: '08:00', genre: 'Folclor', sortOrder: 0 },
    { name: 'Charla Agrícola', host: 'Pedro Gómez', description: 'Consejos para el cultivo y la siembra', dayOfWeek: 2, startTime: '08:00', endTime: '10:00', genre: 'Educativo', sortOrder: 1 },
    { name: 'Tardes de Vallenato', host: 'Luis Fernández', description: 'Lo mejor del vallenato tradicional', dayOfWeek: 2, startTime: '14:00', endTime: '16:00', genre: 'Vallenato', sortOrder: 2 },
    { name: 'Despertar Campesino', host: 'Carlos Martínez', description: 'Mañanas campesinas con música folclólica y noticias del campo', dayOfWeek: 3, startTime: '06:00', endTime: '08:00', genre: 'Folclor', sortOrder: 0 },
    { name: 'Foro Campesino', host: 'Varios', description: 'Espacio de participación comunitaria', dayOfWeek: 3, startTime: '10:00', endTime: '12:00', genre: 'Opinión', sortOrder: 1 },
    { name: 'Despertar Campesino', host: 'Carlos Martínez', description: 'Mañanas campesinas con música folclólica y noticias del campo', dayOfWeek: 4, startTime: '06:00', endTime: '08:00', genre: 'Folclor', sortOrder: 0 },
    { name: 'Música Campesina', host: 'Jorge Ramírez', description: 'Hora de música tradicional colombiana', dayOfWeek: 4, startTime: '12:00', endTime: '14:00', genre: 'Campesina', sortOrder: 1 },
    { name: 'Despertar Campesino', host: 'Carlos Martínez', description: 'Mañanas campesinas con música folclólica y noticias del campo', dayOfWeek: 5, startTime: '06:00', endTime: '08:00', genre: 'Folclor', sortOrder: 0 },
    { name: 'Noches de Fuego', host: 'DJ Campo', description: 'Música para el fin de semana', dayOfWeek: 5, startTime: '20:00', endTime: '23:00', genre: 'Variada', sortOrder: 1 },
    { name: 'Sabados Musicales', host: 'Varios', description: 'Programación especial de fin de semana', dayOfWeek: 6, startTime: '08:00', endTime: '12:00', genre: 'Variada', sortOrder: 0 },
    { name: 'Domingo Familiar', host: 'Familia VC', description: 'Música y entretenimiento para toda la familia', dayOfWeek: 0, startTime: '10:00', endTime: '14:00', genre: 'Familiar', sortOrder: 0 },
  ];

  for (const p of programs) {
    await db.program.create({ data: p });
  }

  // Sample messages
  const messages = [
    { content: '¡Bienvenidos a Voces Campesinas! Tu emisora digital del campo.', type: 'info', priority: 10 },
    { content: 'Síguenos en Facebook: facebook.com/vocescampesinas', type: 'promotion', priority: 5 },
    { content: 'Próximamente: Festival de la Música Campesina 2024', type: 'promotion', priority: 8 },
  ];

  for (const m of messages) {
    await db.message.create({ data: m });
  }

  console.log('✅ Seed completed');
}

seed()
  .catch(console.error)
  .finally(() => process.exit(0));