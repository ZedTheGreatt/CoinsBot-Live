import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  
  // Route: /api/coins/klines
  if (req.url?.includes('/api/coins/klines')) {
    const { symbol, interval, limit } = req.query;
    try {
      const response = await fetch(`https://api.pro.coins.ph/openapi/quote/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 500}`);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error("Proxy error klines:", error);
      return res.status(500).json({ error: "Failed to fetch klines from Coins.ph" });
    }
  }

  // Route: /api/coins/ticker
  if (req.url?.includes('/api/coins/ticker')) {
    const { symbol } = req.query;
    try {
      const response = await fetch(`https://api.pro.coins.ph/openapi/quote/v1/ticker/24hr?symbol=${symbol}`);
      const data = await response.json();
      return res.status(200).json(data);
    } catch (error) {
      console.error("Proxy error ticker:", error);
      return res.status(500).json({ error: "Failed to fetch ticker from Coins.ph" });
    }
  }

  return res.status(404).json({ error: "Not found" });
}
