// services/binance.js
const Binance = require('node-binance-api');
require('dotenv').config();

const binance = new Binance().options({
  APIKEY: process.env.BINANCE_API_KEY,
  APISECRET: process.env.BINANCE_API_SECRET
});

async function getCandleData(symbol, interval = '30m', limit = 100) {
  return new Promise((resolve, reject) => {
     console.log('Requesting candlesticks:', symbol, interval, limit);
    binance.candlesticks(symbol, interval, (error, ticks) => {
      if (error) return reject(error);
      const candles = ticks.map(t => ({
        openTime: t[0],
        open: parseFloat(t[1]),
        high: parseFloat(t[2]),
        low: parseFloat(t[3]),
        close: parseFloat(t[4]),
        volume: parseFloat(t[5])
      }));
      resolve(candles);
    }, { limit });
  });
}

module.exports = { getCandleData };
