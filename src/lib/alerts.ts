// Tells the site owner when something breaks in the background (a sync, a Rex job, the AI budget), so nobody has to
// watch the logs. Sent to Telegram when ALERT_TELEGRAM_BOT_TOKEN and ALERT_TELEGRAM_CHAT_ID are set; always logged.

export async function sendAlert(message: string): Promise<void> {
  console.error(`[alert] ${message}`);
  const token = process.env.ALERT_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.ALERT_TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `⚠️ Sembang Bola\n\n${message}`.slice(0, 4000) }),
      cache: "no-store",
    });
    if (!res.ok) console.error(`[alert] Telegram ${res.status}: ${await res.text()}`);
  } catch (err) {
    // An alert must never break the job that raised it.
    console.error("[alert] Telegram unreachable", err);
  }
}
