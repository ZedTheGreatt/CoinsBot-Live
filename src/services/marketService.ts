
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
    const url = `/api/coins/klines?symbol=${formattedSymbol}&interval=${apiInterval}&limit=${limit}`;
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${text.substring(0, 100)}`);
    }
    
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.warn('Coins.ph API returned unexpected format:', data);
      return [];
    }
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
    const url = `/api/coins/ticker?symbol=${formattedSymbol}`;
    console.log(`[MarketService] Fetching ticker from ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      console.error(`[MarketService] Ticker API error: ${response.status} - ${errorText}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    return {
      price: parseFloat(data.lastPrice || '0'),
      priceChange: parseFloat(data.priceChange || '0'),
      priceChangePercent: parseFloat(data.priceChangePercent || '0'),
      high: parseFloat(data.highPrice || '0'),
      low: parseFloat(data.lowPrice || '0'),
      volume: parseFloat(data.volume || '0'),
      quoteVolume: parseFloat(data.quoteVolume || '0'),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error fetching Coins.ph ticker:', error.message, error.stack);
    } else {
      console.error('Error fetching Coins.ph ticker:', error);
    }
    return null;
  }
}

export async function fetchAllTickers() {
  try {
    const url = `/api/coins/ticker`; // No symbol should return all
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    
    if (!Array.isArray(data)) return [];
    
    return data.map((item: any) => ({
      symbol: item.symbol,
      price: parseFloat(item.lastPrice || '0'),
      priceChange: parseFloat(item.priceChange || '0'),
      priceChangePercent: parseFloat(item.priceChangePercent || '0'),
    }));
  } catch (error) {
    console.error('Error fetching all tickers:', error);
    return [];
  }
}
