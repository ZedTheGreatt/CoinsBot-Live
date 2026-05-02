import { OHLCCandle, MarketSignal } from '../types';

export function calculateEMA(data: number[], period: number): number[] {
  const emas: number[] = [];
  const k = 2 / (period + 1);
  let ema = data[0];
  emas.push(ema);

  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
    emas.push(ema);
  }
  return emas;
}

export function calculateRSI(data: number[], period: number = 14): number[] {
  const rsis: number[] = [];
  let gains: number[] = [];
  let losses: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(Math.max(0, diff));
    losses.push(Math.max(0, -diff));
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // Padding
  for(let i=0; i < period; i++) rsis.push(50);

  for (let i = period; i < data.length - 1; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rsis.push(100 - 100 / (1 + avgGain / (avgLoss || 1)));
  }

  return rsis;
}

export function generateSignals(candles: OHLCCandle[]): MarketSignal[] {
  if (candles.length < 200) return [];

  const closes = candles.map(c => c.close);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);

  const signals: MarketSignal[] = [];
  let lastSignalTime = 0;
  const signalCooldown = 10 * 60; // 10 minutes in seconds for markers

  for (let i = 200; i < candles.length; i++) {
    const currentPrice = candles[i].close;
    const isBullishTrend = ema50[i] > ema200[i];
    const isBearishTrend = ema50[i] < ema200[i];
    const rsiVal = rsi[i] || 50;
    const prevRsiVal = rsi[i - 1] || 50;

    let type: MarketSignal['type'] | null = null;
    let confidence = 70 + Math.random() * 25;

    // Strong Buy: Bullish trend + RSI oversold recovery
    if (isBullishTrend && prevRsiVal < 30 && rsiVal >= 30 && (candles[i].time - lastSignalTime > signalCooldown)) {
      type = 'STRONG_BUY';
    } 
    // Strong Sell: Bearish trend + RSI overbought rejection
    else if (isBearishTrend && prevRsiVal > 70 && rsiVal <= 70 && (candles[i].time - lastSignalTime > signalCooldown)) {
      type = 'STRONG_SELL';
    }
    // Standard Buy: Bullish trend + Bounce off EMA50
    else if (isBullishTrend && candles[i].low <= ema50[i] && currentPrice > ema50[i] && (candles[i].time - lastSignalTime > signalCooldown)) {
      type = 'BUY';
    }
    // Standard Sell: Bearish trend + Rejection off EMA50
    else if (isBearishTrend && candles[i].high >= ema50[i] && currentPrice < ema50[i] && (candles[i].time - lastSignalTime > signalCooldown)) {
      type = 'SELL';
    }

    if (type) {
      const volatility = currentPrice * 0.01;
      signals.push({
        type,
        confidence: Math.round(confidence),
        time: candles[i].time,
        price: currentPrice,
        tp: type.includes('BUY') ? currentPrice + volatility * 2 : currentPrice - volatility * 2,
        sl: type.includes('BUY') ? currentPrice - volatility : currentPrice + volatility,
        trend: isBullishTrend ? 'BULLISH' : isBearishTrend ? 'BEARISH' : 'NEUTRAL',
      });
      lastSignalTime = candles[i].time;
    }
  }

  return signals;
}
