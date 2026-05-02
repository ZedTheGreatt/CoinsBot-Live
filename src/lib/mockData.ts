import { OHLCCandle } from '../types';

export function generateInitialData(symbol: string, count: number = 500): OHLCCandle[] {
  let price = 0;
  switch (symbol) {
    case 'BTC': price = 5300000; break;
    case 'ETH': price = 140000; break;
    case 'XRP': price = 35; break;
    case 'SOL': price = 8500; break;
    case 'USDC': price = 58; break;
    case 'USDT': price = 58; break;
    default: price = 100;
  }

  const data: OHLCCandle[] = [];
  let time = Math.floor(Date.now() / 1000) - count * 60;

  for (let i = 0; i < count; i++) {
    const volatility = price * 0.005;
    const change = (Math.random() - 0.5) * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
    const volume = Math.random() * 500 + 100;

    data.push({ time, open, high, low, close, volume });
    price = close;
    time += 60;
  }
  return data;
}

export function generateNextCandle(lastCandle: OHLCCandle): OHLCCandle {
  const price = lastCandle.close;
  const volatility = price * 0.002;
  const change = (Math.random() - 0.5) * volatility;
  const open = price;
  const close = price + change;
  const high = Math.max(open, close) + Math.random() * (volatility * 0.3);
  const low = Math.min(open, close) - Math.random() * (volatility * 0.3);
  const volume = Math.random() * 200 + 50;

  return {
    time: lastCandle.time + 60,
    open,
    high,
    low,
    close,
    volume
  };
}
