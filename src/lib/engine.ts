
import { OHLCCandle, MarketSignal, MarketRegime } from '../types';
import { 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateADX, 
  detectStructure, 
  detectDivergence, 
  detectCandlePattern, 
  findSRZones 
} from './indicators';

export { calculateEMA, calculateRSI, calculateMACD, calculateADX, detectStructure, detectDivergence, detectCandlePattern, findSRZones };

export function judgeMarketRegime(candles: OHLCCandle[], index: number): MarketRegime {
  const window = 200;
  if (index < window) {
    return {
      bullishContinuation: 25,
      bearishContinuation: 25,
      reversalChance: 25,
      sideways: 25,
      bias: 'NEUTRAL',
      confidence: 'LOW',
      momentum: 'Weak',
      gainzScore: 0
    };
  }

  const closes = candles.map(c => c.close);
  const volumes = candles.map(c => c.volume);
  
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const { histogram } = calculateMACD(closes);
  const adx = calculateADX(candles, 14);
  
  const price = closes[index];
  const e50 = ema50[index];
  const e200 = ema200[index];
  const rVal = rsi[index];
  const macdHist = histogram[index];
  const adxVal = adx[index];
  const vol = volumes[index];
  const volEMA20 = calculateEMA(volumes, 20)[index];

  // 1. Trend Detection
  const isEMAUP = e50 > e200;
  const isPriceAboveEMA50 = price > e50;
  const structure = detectStructure(candles, index);
  
  let trendScore = 0;
  if (isEMAUP && isPriceAboveEMA50) trendScore += 15;
  if (structure === 'HH' || structure === 'HL') trendScore += 10;
  if (!isEMAUP && !isPriceAboveEMA50) trendScore -= 15;
  if (structure === 'LL' || structure === 'LH') trendScore -= 10;

  // 2. Momentum
  let momentumScore = 0;
  const rsiRising = rVal > rsi[index - 1];
  const macdRising = macdHist > histogram[index - 1];
  const volRising = vol > volEMA20;

  if (rVal > 50 && rsiRising) momentumScore += 10;
  if (macdHist > 0 && macdRising) momentumScore += 5;
  if (volRising && closes[index] > candles[index-1].close) momentumScore += 5;

  if (rVal < 50 && !rsiRising) momentumScore -= 10;
  if (macdHist < 0 && !macdRising) momentumScore -= 5;
  if (volRising && closes[index] < candles[index-1].close) momentumScore -= 5;

  // 3. Reversal Detection
  const divergence = detectDivergence(closes, rsi, index);
  const pattern = detectCandlePattern(candles, index);
  const { support, resistance } = findSRZones(candles, index, 50);
  
  let reversalSignals = 0;
  // Bullish Reversal
  if (price <= support * 1.01 && rVal < 35) reversalSignals += 1;
  if (divergence === 'BULLISH') reversalSignals += 1;
  if (pattern === 'HAMMER' || pattern === 'BULLISH_ENGULFING') reversalSignals += 1;
  const volSpike = vol > volEMA20 * 1.5;
  if (volSpike && (pattern === 'HAMMER' || pattern === 'BULLISH_ENGULFING')) reversalSignals += 1;

  // Bearish Reversal
  if (price >= resistance * 0.99 && rVal > 65) reversalSignals += 1;
  if (divergence === 'BEARISH') reversalSignals += 1;
  if (pattern === 'SHOOTING_STAR' || pattern === 'BEARISH_ENGULFING') reversalSignals += 1;
  if (volSpike && (pattern === 'SHOOTING_STAR' || pattern === 'BEARISH_ENGULFING')) reversalSignals += 1;

  // 4. Trap Detection
  let trapBull = false;
  let trapBear = false;
  // Bull trap: Breaks resistance briefly, quickly closes below
  if (candles[index-1].high > resistance && price < resistance && vol < volEMA20) trapBull = true;
  // Bear trap: Breaks support briefly, sharp recovery
  if (candles[index-1].low < support && price > support && vol > volEMA20) trapBear = true;

  // 5. Calculate Probabilities
  let bullishCont = 0;
  let bearishCont = 0;
  let reversalChance = 0;
  let sideways = 0;

  // Simple Logic for Probabilities
  if (trendScore > 0) {
    bullishCont = 40 + trendScore + (momentumScore > 0 ? momentumScore : 0);
    bearishCont = 10 - trendScore / 5;
    reversalChance = reversalSignals * 15;
  } else if (trendScore < 0) {
    bearishCont = 40 + Math.abs(trendScore) + (momentumScore < 0 ? Math.abs(momentumScore) : 0);
    bullishCont = 10 - Math.abs(trendScore) / 5;
    reversalChance = reversalSignals * 15;
  } else {
    sideways = 60;
    bullishCont = 20;
    bearishCont = 20;
    reversalChance = reversalSignals * 10;
  }

  // Normalize
  const total = bullishCont + bearishCont + reversalChance + sideways;
  bullishCont = Math.round((bullishCont / total) * 100);
  bearishCont = Math.round((bearishCont / total) * 100);
  reversalChance = Math.round((reversalChance / total) * 100);
  sideways = Math.round((sideways / total) * 100);

  // 6. Gainz Score Upgrade
  // Trend (25) + Momentum (20) + Volume (15) + Pattern (15) + S/R (15) + Reversal (+- 10)
  let gainzScore = 0;
  
  // Trend (0-25)
  if (trendScore > 15) gainzScore += 25;
  else if (trendScore > 0) gainzScore += 15;
  else if (trendScore < -15) gainzScore += 10; // Still scores some for bearish opportunity? No, usually bots score "buy" strength.
  
  // Actually, Gainz Score 0-100 where high is good for the CURRENT bias.
  // Let's redefine: gainzScore is "Opportunity Strength"
  
  let opportunityStrength = 0;
  // Trend alignment
  if (isEMAUP && isPriceAboveEMA50) opportunityStrength += 25;
  else if (!isEMAUP && !isPriceAboveEMA50) opportunityStrength += 25; // Trend alignment for shorting too?
  
  // Let's stick to the prompt's components
  let scoreTrend = (Math.abs(trendScore) / 25) * 25;
  let scoreMomentum = (Math.abs(momentumScore) / 20) * 20;
  let scoreVolume = volRising ? 15 : 0;
  let scorePattern = pattern !== 'NONE' ? 15 : 0;
  let scoreSR = (price <= support * 1.02 || price >= resistance * 0.98) ? 15 : 5;
  let scoreReversal = reversalSignals * 5; // Adjustment
  
  gainzScore = Math.min(100, scoreTrend + scoreMomentum + scoreVolume + scorePattern + scoreSR + scoreReversal);

  return {
    bullishContinuation: bullishCont,
    bearishContinuation: bearishCont,
    reversalChance: reversalChance,
    sideways: sideways,
    bias: trendScore > 10 ? 'BULLISH' : trendScore < -10 ? 'BEARISH' : 'NEUTRAL',
    confidence: gainzScore > 75 ? 'HIGH' : gainzScore > 50 ? 'MEDIUM' : 'LOW',
    momentum: Math.abs(momentumScore) > 15 ? 'Strong' : Math.abs(momentumScore) > 5 ? 'Medium' : 'Weak',
    gainzScore: Math.round(gainzScore),
    traps: {
      bull: trapBull,
      bear: trapBear
    }
  };
}

export function generateSignals(candles: OHLCCandle[]): MarketSignal[] {
  if (candles.length < 200) return [];

  const signals: MarketSignal[] = [];
  let lastConfirmedDir: 'BUY' | 'SELL' | null = null;
  let lastConfirmedIndex = -1;

  for (let i = 200; i < candles.length; i++) {
    const regime = judgeMarketRegime(candles, i);
    const price = candles[i].close;
    
    // --- Signal Rules ---
    // Only generate signals when:
    // Confidence ≥ 65% (mapped from gainzScore for simplicity or use gainzScore)
    // No conflicting trend signals
    // Volume supports direction
    // Not in low volatility chop zone
    
    let type: MarketSignal['type'] = 'NEUTRAL';
    const canTrade = regime.gainzScore >= 65 && regime.sideways < 20;
    
    if (canTrade) {
       if (regime.bias === 'BULLISH' && (regime.bullishContinuation > 50 || (regime.reversalChance > 30 && regime.bearishContinuation < 20))) {
         if (i - lastConfirmedIndex >= 10 || lastConfirmedDir !== 'BUY') {
           type = regime.gainzScore >= 80 ? 'STRONG_BUY' : 'BUY';
         }
       } else if (regime.bias === 'BEARISH' && (regime.bearishContinuation > 50 || (regime.reversalChance > 30 && regime.bullishContinuation < 20))) {
         if (i - lastConfirmedIndex >= 10 || lastConfirmedDir !== 'SELL') {
           type = regime.gainzScore >= 80 ? 'STRONG_SELL' : 'SELL';
         }
       }
    }

    const isTrigger = type !== 'NEUTRAL';
    
    if (isTrigger || i === candles.length - 1) {
      const h_l = candles[i].high - candles[i].low;
      const h_pc = Math.abs(candles[i].high - candles[i-1].close);
      const l_pc = Math.abs(candles[i].low - candles[i-1].close);
      const atrValue = Math.max(h_l, h_pc, l_pc) || (price * 0.001);

      if (isTrigger) {
        lastConfirmedIndex = i;
        lastConfirmedDir = type.includes('BUY') ? 'BUY' : 'SELL';
      }

      signals.push({
        type,
        confidence: regime.gainzScore,
        time: candles[i].time,
        price,
        tp: type.includes('BUY') ? price + (atrValue * 4) : price - (atrValue * 4),
        sl: type.includes('BUY') ? price - (atrValue * 2) : price + (atrValue * 2),
        trend: regime.bias === 'BULLISH' ? 'BULLISH' : regime.bias === 'BEARISH' ? 'BEARISH' : 'RANGE',
        regime: regime
      });
    }
  }

  return signals;
}
