
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
    let response = await fetch(url);
    
    // Simple retry logic
    if (!response.ok && response.status >= 500) {
      console.warn(`[MarketService] Retrying klines for ${symbol}...`);
      await new Promise(r => setTimeout(r, 1000));
      response = await fetch(url);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => 'No error body');
      console.warn(`[MarketService] Klines failure: ${response.status} ${text.substring(0, 50)}`);
      return [];
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
    let response = await fetch(url);
    
    if (!response.ok && response.status >= 500) {
      await new Promise(r => setTimeout(r, 1000));
      response = await fetch(url);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error body');
      console.warn(`[MarketService] Ticker failure: ${response.status} - ${errorText.substring(0, 50)}`);
      return null;
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
    const url = `/api/coins/ticker`; 
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`[MarketService] AllTickers failure: ${response.status}`);
      return [];
    }
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
