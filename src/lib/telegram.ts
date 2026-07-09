import { db } from './db';

const TELEGRAM_API = 'https://api.telegram.org/bot';

interface TelegramNotifyParams {
  text: string;
  parseMode?: 'HTML' | 'Markdown';
}

export async function sendTelegramNotification({ text, parseMode = 'HTML' }: TelegramNotifyParams): Promise<boolean> {
  try {
    const [botToken, chatId] = await Promise.all([
      db.settings.findUnique({ where: { key: 'telegramBotToken' } }),
      db.settings.findUnique({ where: { key: 'telegramChatId' } }),
    ]);

    if (!botToken?.value || !chatId?.value) return false;

    const res = await fetch(`${TELEGRAM_API}${botToken.value}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.value,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}