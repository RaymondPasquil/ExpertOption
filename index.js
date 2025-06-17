// binance-30min-strategy-bot/index.js
require('dotenv').config();
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { getCandleData } = require('./services/binance');
const { sendTelegramMessage } = require('./services/telegram');
const {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBollingerBands,
  calculateStochastic
} = require('./indicators');

// === CONFIG ===
const SYMBOL = 'BTCUSDT';
const INTERVAL = '30m';
const STRATEGIES = {
  rsi_macd: true,
  ema_crossover: true,
  bollinger_rsi: true,
  stochastic_rsi: true
};

const logFile = path.join(__dirname, 'trade-log.csv');
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, 'Time,Strategy,Price,Details\n');
}

function logSignal(strategy, price, details) {
  const time = new Date().toISOString();
  const entry = `${time},${strategy},${price},"${details.replace(/\n/g, ' | ')}"\n`;
  fs.appendFileSync(logFile, entry);
}

function logNoSignal(message) {
  const time = new Date().toISOString();
  const entry = `${time},No Signal,,"${message}"\n`;
  fs.appendFileSync(logFile, entry);
}

async function runStrategies() {
  try {
    const candles = await getCandleData(SYMBOL, INTERVAL, 100);
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const latestRSI = rsi.at(-1);
    const latestMACD = macd.at(-1);

    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const crossoverBuy = ema9.at(-2) < ema21.at(-2) && ema9.at(-1) > ema21.at(-1);

    const boll = calculateBollingerBands(closes);
    const lastClose = closes.at(-1);
    const latestBoll = boll.at(-1);

    const stochastic = calculateStochastic(highs, lows, closes);
    const latestStoch = stochastic.at(-1);

    let signalDetected = false;

    if (STRATEGIES.rsi_macd && latestRSI < 30 && latestMACD.histogram > 0) {
      const msg = `📉 RSI + MACD signal detected - BUY\nRSI: ${latestRSI.toFixed(2)}\nMACD Histogram: ${latestMACD.histogram.toFixed(4)}\nPrice: ${lastClose}`;
      console.log(msg);
      await sendTelegramMessage(msg);
      logSignal('RSI+MACD', lastClose, msg);
      signalDetected = true;
    }

    if (STRATEGIES.ema_crossover && crossoverBuy) {
      const msg = `📈 EMA crossover signal detected - BUY\nEMA9: ${ema9.at(-1).toFixed(2)}\nEMA21: ${ema21.at(-1).toFixed(2)}\nPrice: ${lastClose}`;
      console.log(msg);
      await sendTelegramMessage(msg);
      logSignal('EMA Crossover', lastClose, msg);
      signalDetected = true;
    }

    if (STRATEGIES.bollinger_rsi && lastClose < latestBoll.lower && latestRSI < 30) {
      const msg = `🔻 Bollinger + RSI signal detected - BUY\nRSI: ${latestRSI.toFixed(2)}\nClose: ${lastClose}\nLower Band: ${latestBoll.lower.toFixed(2)}`;
      console.log(msg);
      await sendTelegramMessage(msg);
      logSignal('Bollinger + RSI', lastClose, msg);
      signalDetected = true;
    }

    if (STRATEGIES.stochastic_rsi && latestStoch.k < 20 && latestStoch.k > latestStoch.d && latestRSI < 30) {
      const msg = `📊 Stochastic + RSI signal detected - BUY\nRSI: ${latestRSI.toFixed(2)}\nStoch K: ${latestStoch.k.toFixed(2)}\nStoch D: ${latestStoch.d.toFixed(2)}\nPrice: ${lastClose}`;
      console.log(msg);
      await sendTelegramMessage(msg);
      logSignal('Stochastic + RSI', lastClose, msg);
      signalDetected = true;
    }

    if (!signalDetected) {
      const msg = `🚫 No strategy triggered at ${new Date().toLocaleString()}. Price: ${lastClose}`;
      console.log(msg);
      logNoSignal(msg);
    }
  } catch (error) {
    console.error('Error in strategy execution:', error.message);
    await sendTelegramMessage(`❌ Strategy error: ${error.message}`);
  }
}

cron.schedule('*/30 * * * *', async () => {
  const msg = `⏱️ Running 30-min strategies at ${new Date().toLocaleString()}`;
  console.log(msg);
  await sendTelegramMessage(msg);
  await runStrategies();
});
