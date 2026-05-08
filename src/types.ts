export interface OHLCCandle {
  time: number; // unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketRegime {
  bullishContinuation: number;
  bearishContinuation: number;
  reversalChance: number;
  sideways: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  momentum: 'Weak' | 'Medium' | 'Strong';
  gainzScore: number;
  traps?: {
    bull: boolean;
    bear: boolean;
  };
}

export interface MarketSignal {
  type: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL' | 'NO_TRADE';
  confidence: number;
  time: number;
  price: number;
  tp: number;
  sl: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'RANGE';
  regime?: MarketRegime;
}

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export interface CoinMetadata {
  symbol: string;
  name: string;
  icon: string;
  pair: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice?: number;
  targetSignal?: MarketSignal['type'];
  condition: 'ABOVE' | 'BELOW' | 'SIGNAL';
  isActive: boolean;
  createdAt: number;
}
export const SUPPORTED_COINS: CoinMetadata[] = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', pair: 'BTC/PHP' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', pair: 'ETH/PHP' },
  { symbol: 'XRP', name: 'Ripple', icon: '✕', pair: 'XRP/PHP' },
  { symbol: 'SOL', name: 'Solana', icon: 'S', pair: 'SOL/PHP' },
  { symbol: 'USDC', name: 'USD Coin', icon: 'U', pair: 'USDC/PHP' },
  { symbol: 'USDT', name: 'Tether', icon: 'T', pair: 'USDT/PHP' },
];
