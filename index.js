require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const cron = require('node-cron');

// === CONFIGURATION ===
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TAAPI_KEY = process.env.TAAPI_KEY;
const USER_CHAT_ID = '@Mondc30';
const SYMBOL = 'ETH/USDT';
const INTERVAL = '30m';
const EXCHANGE = 'binance';

// === INIT BOT ===
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// === TRADE HISTORY ===
let tradeHistory = [];

// === INDICATOR FETCH ===
async function fetchIndicators(symbol) {
  try {
    const [ema20, ema50, rsi] = await Promise.all([
      axios.get(`https://api.taapi.io/ema?secret=${TAAPI_KEY}&exchange=${EXCHANGE}&symbol=${symbol}&interval=${INTERVAL}&optInTimePeriod=20`),
      axios.get(`https://api.taapi.io/ema?secret=${TAAPI_KEY}&exchange=${EXCHANGE}&symbol=${symbol}&interval=${INTERVAL}&optInTimePeriod=50`),
      axios.get(`https://api.taapi.io/rsi?secret=${TAAPI_KEY}&exchange=${EXCHANGE}&symbol=${symbol}&interval=${INTERVAL}`)
    ]);

    return {
      ema20: ema20.data.value,
      ema50: ema50.data.value,
      rsi: rsi.data.value
    };
  } catch (error) {
    if (error.response) {
      console.error('TAAPI Error:', error.response.status, error.response.data);
    } else {
      console.error('Error fetching indicators:', error.message);
    }
    return null;
  }
}

// === GET CURRENT BINANCE PRICE ===
async function getCurrentPrice(symbol) {
  const pair = symbol.replace('/', '').toUpperCase(); // e.g., ETHUSDT
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`;
  try {
    const res = await axios.get(url);
    return parseFloat(res.data.price);
  } catch (error) {
    console.error('Error fetching Binance price:', error.message);
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

// === STORE TRADE ===
function storeTrade(signal, entryPrice) {
  const trade = {
    time: new Date(),
    symbol: SYMBOL,
    signal,
    entryPrice,
    status: "pending"
  };
  tradeHistory.push(trade);
  return trade;
}

// === EVALUATE TRADE ===
async function evaluateTrade(trade) {
  const exitPrice = await getCurrentPrice(trade.symbol);
  if (!exitPrice) {
    bot.sendMessage(USER_CHAT_ID, `⚠️ Could not fetch exit price. Skipping trade evaluation.`);
    return;
  }

  const won =
    (trade.signal === 'buy' && exitPrice > trade.entryPrice) ||
    (trade.signal === 'sell' && exitPrice < trade.entryPrice);

  trade.status = won ? 'win' : 'loss';

  bot.sendMessage(USER_CHAT_ID,
    `📊 Trade Result\nSymbol: ${trade.symbol}\nSignal: ${trade.signal.toUpperCase()}\nEntry: ${trade.entryPrice}\nExit: ${exitPrice}\nResult: ${won ? '✅ WIN' : '❌ LOSS'}`
  );

  calculateWinRate();
}

// === CALCULATE WIN RATE ===
function calculateWinRate() {
  const completed = tradeHistory.filter(t => t.status !== "pending");
  const wins = completed.filter(t => t.status === "win").length;
  const total = completed.length;
  const rate = total ? (wins / total) * 100 : 0;

  bot.sendMessage(USER_CHAT_ID,
    `📈 Win Rate: ${rate.toFixed(2)}% (${wins}/${total} trades)`
  );
}

// === SIGNAL CHECK AND EXECUTION ===
async function sendSignal() {
  const data = await fetchIndicators(SYMBOL);
  if (!data) return;

  const signalText = checkSignal(data);
  if (signalText) {
    const signal = signalText.includes('BUY') ? 'buy' : 'sell';
    const entryPrice = await getCurrentPrice(SYMBOL);
    if (!entryPrice) return;

    const trade = storeTrade(signal, entryPrice);

    const msg = `⚡️ 30-Min ExpertOption Signal\nAsset: ${SYMBOL}\n${signalText}\n\nEMA20: ${data.ema20.toFixed(2)}\nEMA50: ${data.ema50.toFixed(2)}\nRSI: ${data.rsi.toFixed(2)}\nEntry Price: ${entryPrice}`;
    bot.sendMessage(USER_CHAT_ID, msg);

    setTimeout(() => evaluateTrade(trade), 30 * 60 * 1000);
  } else {
    console.log('No valid signal this interval.');
  }
}

// === RUN EVERY 30 MINUTES ===
cron.schedule('*/30 * * * *', () => {
  console.log('⏳ Checking 30-minute strategy...');
  sendSignal();
});

// === BOT COMMANDS ===
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '✅ Expert Option Bot is running.\nYou will receive alerts every 30 minutes when conditions match.');
});

bot.onText(/\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, `📊 Monitoring ${SYMBOL} every 30 minutes for strategy signals.`);
});
