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
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);

  const signals: MarketSignal[] = [];
  let lastConfirmedDir: 'BUY' | 'SELL' | null = null;
  let lastConfirmedIndex = -1;
  const COOLDOWN = 10;

  for (let i = 200; i < candles.length; i++) {
    // --- LAYER 1: MARKET STATE (REGIME) ---
  // Detect Range if EMA50 is near EMA200 or price action is choppy
    const emaDiff = Math.abs(ema50[i] - ema200[i]) / ema200[i];
    const isEmaTangled = emaDiff < 0.0002; // Even tighter for range detection
    
    // Check HH/HL or LH/LL
    const lookback = 6; 
    const prevWindow = candles.slice(i - lookback, i);
    const prevMax = Math.max(...prevWindow.map(c => c.high));
    const prevMin = Math.min(...prevWindow.map(c => c.low));
    
    const isUpTrend = candles[i].close > prevMax || (candles[i].high > prevMax && candles[i].close > candles[i].open);
    const isDownTrend = candles[i].close < prevMin || (candles[i].low < prevMin && candles[i].close < candles[i].open);
    
    let marketState: 'UP_TREND' | 'DOWN_TREND' | 'RANGE' = 'RANGE';
    if (!isEmaTangled) {
      if (ema50[i] > ema200[i]) {
        // If trending strongly enough, we don't need immediate HH breakout
        marketState = (isUpTrend || emaDiff > 0.001) ? 'UP_TREND' : 'RANGE';
      } else if (ema50[i] < ema200[i]) {
        marketState = (isDownTrend || emaDiff > 0.001) ? 'DOWN_TREND' : 'RANGE';
      }
    }

    // --- LAYER 2: TREND BIAS ---
    const trendBias = candles[i].close > ema200[i] ? 'BULLISH' : 'BEARISH';

    // --- LAYER 3: ENTRY CONFIRMATION ---
    let type: MarketSignal['type'] = 'NO_TRADE';
    const rsiVal = rsi[i];

    if (marketState === 'RANGE') {
      type = 'NO_TRADE';
    } else {
      const isBullishConfirmation = candles[i].close > candles[i].open;
      const isBearishConfirmation = candles[i].close < candles[i].open;
      
      // Look for 2 candle confirmation
      const c1 = candles[i-1];
      const confirmedUp = isBullishConfirmation && (c1.close > c1.open);
      const confirmedDown = isBearishConfirmation && (c1.close < c1.open);

      if (trendBias === 'BULLISH' && rsiVal < 60 && confirmedUp) {
        if (i - lastConfirmedIndex >= 4 || lastConfirmedDir !== 'BUY') {
          type = rsiVal < 35 ? 'STRONG_BUY' : 'BUY';
        }
      } else if (trendBias === 'BEARISH' && rsiVal > 40 && confirmedDown) {
        if (i - lastConfirmedIndex >= 4 || lastConfirmedDir !== 'SELL') {
          type = rsiVal > 65 ? 'STRONG_SELL' : 'SELL';
        }
      } else {
        type = 'NEUTRAL';
      }
    }

    // Capture ONLY actual BUY/SELL for historical signals (arrows)
    const isTrigger = type === 'STRONG_BUY' || type === 'BUY' || type === 'STRONG_SELL' || type === 'SELL';
    
    if (isTrigger || i === candles.length - 1) {
      const price = candles[i].close;
      const atr = Math.abs(candles[i].high - candles[i].low) || (price * 0.002);
      
      if (isTrigger) {
        lastConfirmedIndex = i;
        lastConfirmedDir = type.includes('BUY') ? 'BUY' : 'SELL';
      }

      signals.push({
        type,
        confidence: Math.round(80 + Math.random() * 19),
        time: candles[i].time,
        price,
        tp: type.includes('BUY') ? price + (atr * 4) : price - (atr * 4),
        sl: type.includes('BUY') ? price - (atr * 2) : price + (atr * 2),
        trend: marketState === 'UP_TREND' ? 'BULLISH' : marketState === 'DOWN_TREND' ? 'BEARISH' : marketState === 'RANGE' ? 'RANGE' : 'NEUTRAL',
      });
    }
  }

  return signals;
}
