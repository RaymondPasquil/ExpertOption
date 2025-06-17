const ti = require('technicalindicators');

function calculateRSI(closes, period = 14) {
  return ti.RSI.calculate({ values: closes, period });
}

function calculateMACD(closes) {
  return ti.MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
}

function calculateEMA(closes, period) {
  return ti.EMA.calculate({ values: closes, period });
}

function calculateBollingerBands(closes) {
  return ti.BollingerBands.calculate({
    period: 20,
    values: closes,
    stdDev: 2
  });
}

function calculateStochastic(highs, lows, closes) {
  return ti.Stochastic.calculate({
    high: highs,
    low: lows,
    close: closes,
    period: 14,
    signalPeriod: 3
  });
}

module.exports = {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateBollingerBands,
  calculateStochastic
};
