
import { OHLCCandle } from '../types';

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

export function calculateMACD(data: number[], fast: number = 12, slow: number = 26, signal: number = 9) {
  const fastEMA = calculateEMA(data, fast);
  const slowEMA = calculateEMA(data, slow);
  
  const macdLine = fastEMA.map((f, i) => f - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signal);
  const histogram = macdLine.map((m, i) => m - signalLine[i]);
  
  return { macdLine, signalLine, histogram };
}

export type TrendStructure = 'HH' | 'HL' | 'LH' | 'LL' | 'N/A';

export function detectStructure(candles: OHLCCandle[], index: number, window: number = 5): TrendStructure {
  if (index < window * 2) return 'N/A';
  
  const currentHigh = candles[index].high;
  const currentLow = candles[index].low;
  
  // Find local peaks in the previous window
  const prevWindow = candles.slice(index - window * 2, index - window);
  const prevHigh = Math.max(...prevWindow.map(c => c.high));
  const prevLow = Math.min(...prevWindow.map(c => c.low));

  if (currentHigh > prevHigh && currentLow > prevLow) return 'HH'; // Higher High (and Higher Low technically)
  if (currentHigh > prevHigh) return 'HH';
  if (currentLow > prevLow) return 'HL';
  if (currentHigh < prevHigh && currentLow < prevLow) return 'LL';
  if (currentHigh < prevHigh) return 'LH';
  if (currentLow < prevLow) return 'LL';

  return 'N/A';
}

export function detectDivergence(prices: number[], rsi: number[], index: number, lookback: number = 10): 'BULLISH' | 'BEARISH' | 'NONE' {
  if (index < lookback) return 'NONE';

  const currentPrice = prices[index];
  const currentRSI = rsi[index];
  
  // Find local minimum in price and RSI within lookback
  const prevPrices = prices.slice(index - lookback, index);
  const prevRSIs = rsi.slice(index - lookback, index);
  
  const minPriceIdx = prevPrices.indexOf(Math.min(...prevPrices));
  const maxPriceIdx = prevPrices.indexOf(Math.max(...prevPrices));
  
  // Bullish Divergence: Price lower low, RSI higher low
  if (currentPrice < prevPrices[minPriceIdx] && currentRSI > prevRSIs[minPriceIdx]) {
    return 'BULLISH';
  }
  
  // Bearish Divergence: Price higher high, RSI lower high
  if (currentPrice > prevPrices[maxPriceIdx] && currentRSI < prevRSIs[maxPriceIdx]) {
    return 'BEARISH';
  }

  return 'NONE';
}

export function detectCandlePattern(candles: OHLCCandle[], index: number): 'HAMMER' | 'SHOOTING_STAR' | 'BULLISH_ENGULFING' | 'BEARISH_ENGULFING' | 'NONE' {
  if (index < 1) return 'NONE';
  
  const c = candles[index];
  const p = candles[index - 1];
  
  const body = Math.abs(c.close - c.open);
  const totalRange = c.high - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  
  // Hammer: Small body, long lower wick, little to no upper wick
  if (lowerWick > body * 2 && upperWick < body * 0.5 && body < totalRange * 0.4) {
    return 'HAMMER';
  }
  
  // Shooting Star: Small body, long upper wick, little to no lower wick
  if (upperWick > body * 2 && lowerWick < body * 0.5 && body < totalRange * 0.4) {
    return 'SHOOTING_STAR';
  }
  
  // Bullish Engulfing
  if (c.close > c.open && p.close < p.open && c.close > p.open && c.open < p.close) {
    return 'BULLISH_ENGULFING';
  }
  
  // Bearish Engulfing
  if (c.close < c.open && p.close > p.open && c.close < p.open && c.open > p.close) {
    return 'BEARISH_ENGULFING';
  }
  
  return 'NONE';
}

export function findSRZones(candles: OHLCCandle[], index: number, window: number = 20) {
  if (index < window) return { support: 0, resistance: 0 };
  
  const slice = candles.slice(index - window, index);
  const resistance = Math.max(...slice.map(c => c.high));
  const support = Math.min(...slice.map(c => c.low));
  
  return { support, resistance };
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
