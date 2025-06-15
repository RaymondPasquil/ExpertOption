// expert-option-bot/index.js
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

// === CONFIGURATION ===
const TELEGRAM_TOKEN = '7840446185:AAEDjXg34-b8mo5-vMBdpWhI0sJ2gDOSU5Y';
const TAAPI_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbHVlIjoiNjg0ZWYxM2E4MDZmZjE2NTFlOGFmZmQ2IiwiaWF0IjoxNzUwMDA0MjExLCJleHAiOjMzMjU0NDY4MjExfQ.4xcL2WmEO74_6MzCqGSQkb_Vb0zpkAJubSZhxy5l0_U'; // Register at taapi.io for free API
const USER_CHAT_ID = '@Mondc30'; // Replace with your actual Telegram user/chat ID
const SYMBOL = 'EURUSD';
const INTERVAL = '30m';

// === INIT BOT ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// === INDICATOR FETCH ===
async function fetchIndicators(symbol) {
  try {
    const [ema20, ema50, rsi] = await Promise.all([
      axios.get(`https://api.taapi.io/ema?secret=${TAAPI_KEY}&exchange=binance&symbol=${symbol}/USDT&interval=${INTERVAL}&optInTimePeriod=20`),
      axios.get(`https://api.taapi.io/ema?secret=${TAAPI_KEY}&exchange=binance&symbol=${symbol}/USDT&interval=${INTERVAL}&optInTimePeriod=50`),
      axios.get(`https://api.taapi.io/rsi?secret=${TAAPI_KEY}&exchange=binance&symbol=${symbol}/USDT&interval=${INTERVAL}`)
    ]);

    return {
      ema20: ema20.data.value,
      ema50: ema50.data.value,
      rsi: rsi.data.value
    };
  } catch (error) {
    console.error('Error fetching indicators:', error);
    return null;
  }
}

// === STRATEGY LOGIC ===
function checkSignal({ ema20, ema50, rsi }) {
  if (ema20 > ema50 && rsi > 50 && rsi < 70) {
    return '📈 BUY Signal (CALL) - Uptrend confirmed with strong momentum.';
  } else if (ema20 < ema50 && rsi < 50 && rsi > 30) {
    return '📉 SELL Signal (PUT) - Downtrend confirmed with bearish momentum.';
  } else {
    return null;
  }
}

// === ALERT FUNCTION ===
async function sendSignal() {
  const data = await fetchIndicators(SYMBOL);
  if (!data) return;

  const signal = checkSignal(data);
  if (signal) {
    const msg = `⚡️ Expert Option 30-Min Signal\nAsset: ${SYMBOL}\n${signal}\n\nEMA20: ${data.ema20.toFixed(4)}\nEMA50: ${data.ema50.toFixed(4)}\nRSI: ${data.rsi.toFixed(2)}`;
    bot.sendMessage(USER_CHAT_ID, msg);
  } else {
    console.log('No valid signal this interval.');
  }
}

// === SCHEDULE EVERY 30 MIN ===
cron.schedule('*/30 * * * *', () => {
  console.log('Checking 30-min strategy...');
  sendSignal();
});

// === BOT COMMANDS ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '✅ Expert Option Bot is running. You will receive alerts every 30 minutes when conditions match.');
});

bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, `📊 Monitoring ${SYMBOL} every 30 minutes for strategy conditions.`);
});
