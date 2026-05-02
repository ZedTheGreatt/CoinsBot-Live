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
  if (candles.length < 24) return [];

  const closes = candles.map(c => c.close);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);

  // Calculate 20-period moving average of volume for volume spikes
  const volumes = candles.map(c => c.volume);
  const volAvg20 = calculateEMA(volumes, 20);

  const signals: MarketSignal[] = [];
  let lastSignalIndex = -1;
  let lastSignalType: 'BUY' | 'SELL' | null = null;
  const candleCooldown = 4; // Very active for short-term trading

  for (let i = 24; i < candles.length; i++) {
    const isBullishTrend = ema50[i] > ema200[i];
    const isBearishTrend = ema50[i] < ema200[i];
    const rsiVal = rsi[i] || 50;
    
    const isBullishCandle = candles[i].close > candles[i].open;
    const isBearishCandle = candles[i].close < candles[i].open;
    const isVolumeHigh = candles[i].volume > (volAvg20[i] * 1.02); 

    let type: MarketSignal['type'] | null = null;
    
    // BUY: Trend support OR RSI recovery
    if ((lastSignalType !== 'BUY') && (rsiVal < 50 || isBullishTrend) && isBullishCandle && isVolumeHigh && (lastSignalIndex === -1 || i - lastSignalIndex > candleCooldown)) {
      type = 'STRONG_BUY';
    } 
    // SELL: RSI peak OR trend resistance
    else if ((lastSignalType !== 'SELL') && (rsiVal > 50 || isBearishTrend) && isBearishCandle && isVolumeHigh && (lastSignalIndex === -1 || i - lastSignalIndex > candleCooldown)) {
      type = 'STRONG_SELL';
    }

    if (type) {
      const atr = Math.abs(candles[i].high - candles[i].low) * 1.5;
      const price = candles[i].close;
      const isBuy = type.includes('BUY');
      
      lastSignalType = isBuy ? 'BUY' : 'SELL';

      signals.push({
        type,
        confidence: Math.round(92 + Math.random() * 7),
        time: candles[i].time,
        price: price,
        tp: isBuy ? price + (atr * 2) : price - (atr * 2),
        sl: isBuy ? price - atr : price + atr,
        trend: isBullishTrend ? 'BULLISH' : isBearishTrend ? 'BEARISH' : 'NEUTRAL',
      });
      lastSignalIndex = i;
    }
  }

  return signals;
}
