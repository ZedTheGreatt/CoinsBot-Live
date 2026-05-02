
import { OHLCCandle, Timeframe } from '../types';

const BASE_URL = 'https://api.pro.coins.ph';

export const timeframeMap: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d'
};

export async function fetchKlines(symbol: string, interval: Timeframe = '1m', limit: number = 500): Promise<OHLCCandle[]> {
  // Coins.ph expects symbols like BTCPHP
  const formattedSymbol = symbol.replace('/', '');
  const apiInterval = timeframeMap[interval];
  
  try {
    const response = await fetch(`/api/coins/klines?symbol=${formattedSymbol}&interval=${apiInterval}&limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    // Format: [ [startTime, open, high, low, close, volume, closeTime, ...] ]
    return data.map((item: any[]) => ({
      time: Math.floor(item[0] / 1000), // ms to seconds
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5])
    }));
  } catch (error) {
    console.error('Error fetching Coins.ph klines:', error);
    return [];
  }
}

export async function fetchTicker(symbol: string) {
  const formattedSymbol = symbol.replace('/', '');
  try {
    const response = await fetch(`/api/coins/ticker?symbol=${formattedSymbol}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return {
      price: parseFloat(data.lastPrice),
      change: parseFloat(data.priceChangePercent)
    };
  } catch (error) {
    console.error('Error fetching Coins.ph ticker:', error);
    return null;
  }
}
