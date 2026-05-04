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

export function calculateADX(candles: OHLCCandle[], period: number = 14): number[] {
  const adxs: number[] = [];
  const trs: number[] = [];
  const plusDIs: number[] = [];
  const minusDIs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i-1].close;
    const prevHigh = candles[i-1].high;
    const prevLow = candles[i-1].low;

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);

    const upMove = high - prevHigh;
    const downMove = prevLow - low;

    plusDIs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDIs.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  // Padding for initial period
  for (let i = 0; i < period; i++) adxs.push(0);

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let plusSDI = plusDIs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let minusSDI = minusDIs.slice(0, period).reduce((a, b) => a + b, 0) / period;

  const dxValues: number[] = [];

  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    plusSDI = (plusSDI * (period - 1) + plusDIs[i]) / period;
    minusSDI = (minusSDI * (period - 1) + minusDIs[i]) / period;

    const diPlus = (plusSDI / (atr || 1)) * 100;
    const diMinus = (minusSDI / (atr || 1)) * 100;
    const dx = Math.abs(diPlus - diMinus) / (Math.abs(diPlus + diMinus) || 1) * 100;
    dxValues.push(dx);

    if (dxValues.length >= period) {
      const adx = dxValues.slice(-period).reduce((a, b) => a + b, 0) / period;
      adxs.push(adx);
    } else {
      adxs.push(dx);
    }
  }

  return adxs;
}

export function generateSignals(candles: OHLCCandle[]): MarketSignal[] {
  if (candles.length < 200) return [];

  const closes = candles.map(c => c.close);
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  const ema9 = calculateEMA(closes, 9);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const adx = calculateADX(candles, 14);

  // Volume Profile simulation
  const volumes = candles.map(c => c.volume);
  const volEMA20 = calculateEMA(volumes, 20);

  const signals: MarketSignal[] = [];
  let lastConfirmedDir: 'BUY' | 'SELL' | null = null;
  let lastConfirmedIndex = -1;
  const COOLDOWN = 10;

  for (let i = 200; i < candles.length; i++) {
    // --- LAYER 1: MARKET STATE (REGIME) ---
    const emaDiff = Math.abs(ema50[i] - ema200[i]) / ema200[i];
    const adxVal = adx[i] || 0;
    const isTrending = adxVal > 15; // Lowered further for early detection
    const isEmaTangled = emaDiff < 0.0001;
    
    // Check momentum alignment (Fast > Med > Slow)
    const bullishAlignment = ema9[i] > ema20[i] && ema20[i] > ema50[i];
    const bearishAlignment = ema9[i] < ema20[i] && ema20[i] < ema50[i];

    // Check Price Action Momentum
    const lookback = 4; // Reactive window
    const prevWindow = candles.slice(i - lookback, i);
    const prevMax = Math.max(...prevWindow.map(c => c.high));
    const prevMin = Math.min(...prevWindow.map(c => c.low));
    
    const isUpTrendAction = candles[i].close > prevMax || (candles[i].high > prevMax && candles[i].close > candles[i].open) || (bullishAlignment && adxVal > 20);
    const isDownTrendAction = candles[i].close < prevMin || (candles[i].low < prevMin && candles[i].close < candles[i].open) || (bearishAlignment && adxVal > 20);
    
    let marketState: 'UP_TREND' | 'DOWN_TREND' | 'RANGE' = 'RANGE';
    if (!isEmaTangled && isTrending) {
      if (ema50[i] > ema200[i]) {
        marketState = (isUpTrendAction || emaDiff > 0.0003) ? 'UP_TREND' : 'RANGE';
      } else if (ema50[i] < ema200[i]) {
        marketState = (isDownTrendAction || emaDiff > 0.0003) ? 'DOWN_TREND' : 'RANGE';
      }
    }

    // --- LAYER 2: TREND BIAS ---
    const trendBias = candles[i].close > ema200[i] ? 'BULLISH' : 'BEARISH';

    // --- LAYER 3: ENTRY CONFIRMATION ---
    let type: MarketSignal['type'] = 'NO_TRADE';
    const rsiVal = rsi[i];
    const volSurge = candles[i].volume > volEMA20[i] * 1.02; // ultra-sensitive volume surge

    if (marketState === 'RANGE' && adxVal < 20) {
      type = 'NO_TRADE';
    } else {
      const isBullishConfirmation = candles[i].close > candles[i].open;
      const isBearishConfirmation = candles[i].close < candles[i].open;
      
      const c1 = candles[i-1];
      const confirmedUp = isBullishConfirmation && (c1.close > c1.open || volSurge || bullishAlignment);
      const confirmedDown = isBearishConfirmation && (c1.close < c1.open || volSurge || bearishAlignment);

      // Adaptive RSI: If trending strongly (ADX > 30), don't wait for extreme oversold
      const buyRsiLimit = adxVal > 30 ? 68 : 62;
      const sellRsiLimit = adxVal > 30 ? 32 : 38;

      if (trendBias === 'BULLISH' && rsiVal < buyRsiLimit && confirmedUp) {
        if (i - lastConfirmedIndex >= 2 || lastConfirmedDir !== 'BUY') {
          type = rsiVal < 42 ? 'STRONG_BUY' : 'BUY';
        }
      } else if (trendBias === 'BEARISH' && rsiVal > sellRsiLimit && confirmedDown) {
        if (i - lastConfirmedIndex >= 2 || lastConfirmedDir !== 'SELL') {
          type = rsiVal > 58 ? 'STRONG_SELL' : 'SELL';
        }
      } else {
        type = 'NEUTRAL';
      }
    }

    // Capture ONLY actual BUY/SELL for historical signals (arrows)
    const isTrigger = type === 'STRONG_BUY' || type === 'BUY' || type === 'STRONG_SELL' || type === 'SELL';
    
    if (isTrigger || i === candles.length - 1) {
      const price = candles[i].close;
      const h_l = candles[i].high - candles[i].low;
      const h_pc = Math.abs(candles[i].high - candles[i-1].close);
      const l_pc = Math.abs(candles[i].low - candles[i-1].close);
      const atrValue = Math.max(h_l, h_pc, l_pc) || (price * 0.001);
      
      if (isTrigger) {
        lastConfirmedIndex = i;
        lastConfirmedDir = type.includes('BUY') ? 'BUY' : 'SELL';
      }

      // Smarter confidence calculation
      let confidence = 70;
      if (adxVal > 25) confidence += 10;
      if (volSurge) confidence += 5;
      if (bullishAlignment || bearishAlignment) confidence += 10;
      confidence = Math.min(98, confidence + (Math.random() * 5));

      signals.push({
        type,
        confidence: Math.round(confidence),
        time: candles[i].time,
        price,
        tp: type.includes('BUY') ? price + (atrValue * 4.236) : price - (atrValue * 4.236),
        sl: type.includes('BUY') ? price - (atrValue * 1.618) : price + (atrValue * 1.618),
        trend: marketState === 'UP_TREND' ? 'BULLISH' : marketState === 'DOWN_TREND' ? 'BEARISH' : marketState === 'RANGE' ? 'RANGE' : 'NEUTRAL',
      });
    }
  }

  return signals;
}
