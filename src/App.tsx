import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Topbar from './components/Topbar';
import TradingChart from './components/TradingChart';
import SignalCard from './components/SignalCard';
import CoinDropdown from './components/CoinDropdown';
import NavMenu from './components/NavMenu';
import { OHLCCandle, MarketSignal, SUPPORTED_COINS, Timeframe, PriceAlert } from './types';
import { generateSignals, calculateRSI } from './lib/engine';
import { fetchKlines, fetchTicker, fetchAllTickers } from './services/marketService';
import { LayoutGrid, TrendingUp, TrendingDown, Zap, Clock, Smartphone, Info, Bell, Volume2, VolumeX, X, Menu, Activity } from 'lucide-react';
import { cn, format24hChange } from './lib/utils';
import PriceAlertsPanel from './components/PriceAlertsPanel';

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [data, setData] = useState<OHLCCandle[]>([]);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [lastRsi, setLastRsi] = useState(50);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSignalsOpen, setIsSignalsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectivity, setConnectivity] = useState<'HEALTHY' | 'SLUGGISH' | 'OFFLINE'>('HEALTHY');
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('coinsbot_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  const [allTickers, setAllTickers] = useState<Record<string, { price: number, percent: number, change: number }>>({});
  const [tickerData, setTickerData] = useState<{
    priceChange: number;
    priceChangePercent: number;
    high: number;
    low: number;
    volume: number;
    quoteVolume: number;
  } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateVh = () => {
      document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    };
    updateVh();
    window.addEventListener('resize', updateVh);
    return () => window.removeEventListener('resize', updateVh);
  }, []);

  // Fetch Data from Coins.ph
  const loadMarketData = async () => {
    setIsLoading(true);
    const klines = await fetchKlines(selectedSymbol + 'PHP', timeframe);
    if (klines.length > 0) {
      setData(klines);
    }
    
    // Also fetch ticker whenever symbol changes
    const ticker = await fetchTicker(selectedSymbol + 'PHP');
    if (ticker) {
      setTickerData({
        priceChange: ticker.priceChange,
        priceChangePercent: ticker.priceChangePercent,
        high: ticker.high,
        low: ticker.low,
        volume: ticker.volume,
        quoteVolume: ticker.quoteVolume
      });
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadMarketData();
  }, [selectedSymbol, timeframe]);

  // Polling for updates
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(async () => {
      // Check health
      fetch('/api/health')
        .then(res => {
          if (res.ok) {
            setConnectivity('HEALTHY');
            setLastUpdateTime(Date.now());
          } else {
            setConnectivity('OFFLINE');
          }
        })
        .catch(() => setConnectivity('OFFLINE'));

      // Poll ticker as well
      fetchTicker(selectedSymbol + 'PHP').then(ticker => {
        if (ticker) {
          setTickerData({
            priceChange: ticker.priceChange,
            priceChangePercent: ticker.priceChangePercent,
            high: ticker.high,
            low: ticker.low,
            volume: ticker.volume,
            quoteVolume: ticker.quoteVolume
          });
        }
      });

      // Poll all tickers for the dropdown
      fetchAllTickers().then(tickers => {
        if (tickers && tickers.length > 0) {
          const map: Record<string, { price: number, percent: number, change: number }> = {};
          tickers.forEach((t: any) => {
            map[t.symbol] = { price: t.price, percent: t.priceChangePercent, change: t.priceChange };
          });
          setAllTickers(map);
        }
      });

      const klines = await fetchKlines(selectedSymbol + 'PHP', timeframe, 15);
      if (klines.length > 0) {
        setData(prev => {
          if (prev.length === 0) return klines;
          
          const newCandles = [...prev];
          const lastFetched = klines[klines.length - 1];
          const lastExisting = newCandles[newCandles.length - 1];
          
          if (lastExisting.time === lastFetched.time) {
            newCandles[newCandles.length - 1] = lastFetched;
          } else if (lastFetched.time > lastExisting.time) {
            newCandles.push(lastFetched);
            if (newCandles.length > 1000) newCandles.shift();
          }
          
          // Merge recent klines to fix any gaps
          klines.forEach(k => {
            const idx = newCandles.findIndex(c => c.time === k.time);
            if (idx !== -1) newCandles[idx] = k;
          });
          
          return [...newCandles];
        });
      }
    }, 5000); // 5s polling

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedSymbol, timeframe]);

  // Derive Signals and RSI
  useEffect(() => {
    if (data.length < 50) return;
    const s = generateSignals(data);
    setSignals(s);
    
    const closes = data.map(d => d.close);
    const rsiValues = calculateRSI(closes, 14);
    setLastRsi(rsiValues[rsiValues.length - 1] || 50);
  }, [data]);

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const currentSignal = signals.length > 0 ? signals[signals.length - 1] : null;

  // Calculate 24h Statistics with useMemo
  const stats24h = useMemo(() => {
    // Prefer real-time ticker data if available
    if (tickerData) {
      return {
        change: tickerData.priceChange,
        percent: tickerData.priceChangePercent,
        high: tickerData.high,
        low: tickerData.low,
        volume: tickerData.volume,
        turnover: tickerData.quoteVolume
      };
    }

    if (data.length === 0) return { change: 0, percent: 0, high: 0, low: 0, volume: 0, turnover: 0 };
    const last = data[data.length - 1];
    const dayAgo = last.time - 86400;
    const startIndex = data.findIndex(d => d.time >= dayAgo);
    
    // If we have less than say 4 hours of data, the "24h" calculation is misleading
    // But we'll use what we have and maybe flag it eventually. 
    const range = data.slice(startIndex === -1 ? 0 : startIndex);
    
    if (range.length < 2) return { change: 0, percent: 0, high: last.high, low: last.low, volume: last.volume, turnover: last.volume * last.close };
    
    const initialPrice = range[0].open;
    const change = last.close - initialPrice;
    const percent = initialPrice !== 0 ? (change / initialPrice) : 0;
    const high = Math.max(...range.map(c => c.high));
    const low = Math.min(...range.map(c => c.low));
    const volume = range.reduce((sum, c) => sum + c.volume, 0);
    const turnover = range.reduce((sum, c) => sum + (c.volume * c.close), 0);
    
    return { change, percent, high, low, volume, turnover };
  }, [tickerData, data]);

  // Persist Alerts
  useEffect(() => {
    localStorage.setItem('coinsbot_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Alert Monitoring Logic
  useEffect(() => {
    if (data.length === 0) return;
    const latestPrice = data[data.length - 1].close;
    const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;
    
    const triggeredAlerts: PriceAlert[] = [];

    alerts.forEach(alert => {
      if (!alert.isActive || alert.symbol !== selectedSymbol) return;

      if (alert.condition === 'ABOVE' && alert.targetPrice && latestPrice >= alert.targetPrice) {
        triggeredAlerts.push(alert);
      } else if (alert.condition === 'BELOW' && alert.targetPrice && latestPrice <= alert.targetPrice) {
        triggeredAlerts.push(alert);
      } 
      else if (alert.condition === 'SIGNAL' && latestSignal) {
        const currentCandleTime = data[data.length - 1].time;
        if (latestSignal.time === currentCandleTime) {
          triggeredAlerts.push(alert);
        }
      }
    });

    if (triggeredAlerts.length > 0) {
      try {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
          oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
          
          gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.5);
        }
      } catch (e) {
        console.warn("Sound blocked or failed:", e);
      }

      triggeredAlerts.forEach(alert => {
        let msg = "";
        const changeStr = format24hChange(latestPrice, stats24h.percent);
        
        if (alert.condition === 'SIGNAL' && latestSignal) {
           msg = `${alert.symbol} ${latestSignal.type.replace('_', ' ')} (24H: ${changeStr})`;
        } else {
           msg = `${alert.symbol} hit ₱${alert.targetPrice?.toLocaleString()} (24H: ${changeStr})`;
        }

        setActiveNotification(msg);
        
        try {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`CoinsBot Alert: ${alert.symbol}`, {
              body: msg,
              icon: '/favicon.ico'
            });
          }
        } catch (e) {
          console.warn("Notification failed:", e);
        }
      });

      const hasOneShot = triggeredAlerts.some(ta => ta.condition !== 'SIGNAL');
      if (hasOneShot) {
        setAlerts(prev => prev.map(a => {
          const triggered = triggeredAlerts.find(ta => ta.id === a.id);
          if (triggered && triggered.condition !== 'SIGNAL') {
             return { ...a, isActive: false };
          }
          return a;
        }));
      }

      const toastTimer = setTimeout(() => setActiveNotification(null), 5000);
      return () => clearTimeout(toastTimer);
    }
  }, [data, alerts, selectedSymbol, signals]);

  const addAlert = (newAlert: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>) => {
    const alert: PriceAlert = {
      ...newAlert,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: Date.now(),
      isActive: true,
    };
    setAlerts(prev => [alert, ...prev]);
    
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const toggleAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  // Logic for keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      const shortcuts: Record<string, Timeframe> = {
        '1': '1m',
        '2': '5m',
        '3': '15m',
        '4': '1H',
        '5': '4H',
        '6': '1D'
      };
      if (shortcuts[e.key]) {
        setTimeframe(shortcuts[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen-fix bg-brand-bg text-brand-text font-sans overflow-hidden flex flex-col selection:bg-brand-green/30">
      <NavMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <Topbar 
        onMenuClick={() => setIsMenuOpen(true)} 
        onSignalsClick={() => {
          setIsSignalsOpen(!isSignalsOpen);
          setIsAlertsOpen(false);
        }}
        onAlertsClick={() => {
          setIsAlertsOpen(!isAlertsOpen);
          setIsSignalsOpen(false);
        }}
        isSignalsOpen={isSignalsOpen}
        isAlertsOpen={isAlertsOpen}
        trend={currentSignal?.trend}
        symbol={selectedSymbol}
        connectivity={connectivity}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Center Section: Chart and Market Stats */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-brand-bg relative">
          
          {/* Layer 1: Asset & Important Market Data */}
          <div className="h-16 border-b border-brand-border flex items-center px-4 gap-6 shrink-0 bg-brand-surface overflow-x-auto no-scrollbar scroll-smooth">
            <div className="shrink-0 sticky left-0 z-20 bg-brand-surface pr-4 border-r border-white/5 md:border-none md:static">
              <CoinDropdown 
                selectedSymbol={selectedSymbol}
                onSymbolSelect={setSelectedSymbol}
                currentPrice={currentPrice}
                allTickers={allTickers}
              />
            </div>
            
            <div className="flex items-center gap-6 sm:gap-10 shrink-0">
              {/* 24h Price & Change */}
              <div className="flex flex-col border-l border-brand-border pl-6 first:border-none first:pl-0">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1.5 opacity-60">
                  24h Change
                </span>
                {(() => {
                  const changeStr = format24hChange(currentPrice, stats24h.percent, stats24h.change);
                  const isPositive = stats24h.percent > 0;
                  const isNegative = stats24h.percent < 0;
                  const isNeutral = !isPositive && !isNegative;

                  return (
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl border shadow-sm transition-all",
                        isNeutral
                          ? "bg-gray-800/50 text-gray-400 border-white/5"
                          : isPositive 
                            ? "bg-brand-green/10 text-brand-green border-brand-green/20" 
                            : "bg-brand-red/10 text-brand-red border-brand-red/20"
                      )}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : isNegative ? <TrendingDown className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                        <span className="text-xs font-mono font-black tracking-tight whitespace-nowrap">
                          {changeStr}
                        </span>
                      </div>
                      <div className="hidden sm:flex flex-col ml-2">
                        <span className="text-[8px] font-mono font-bold text-gray-500 uppercase opacity-60 whitespace-nowrap">Est. USD</span>
                        <span className="text-[10px] font-mono font-black text-gray-400 whitespace-nowrap">
                           ≈ ${(Math.abs(stats24h.change) / 57.5).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 24h High/Low */}
              <div className="hidden sm:flex flex-col">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1.5 opacity-60">
                  24h High / Low
                </span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-brand-green/30 rounded-full"></div>
                    <span className="text-[10px] font-mono font-black text-gray-100">
                      ₱{stats24h.high.toLocaleString(undefined, { minimumFractionDigits: stats24h.high < 10 ? 4 : 2, maximumFractionDigits: stats24h.high < 10 ? 4 : 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-brand-red/30 rounded-full"></div>
                    <span className="text-[10px] font-mono font-black text-gray-400">
                      ₱{stats24h.low.toLocaleString(undefined, { minimumFractionDigits: stats24h.low < 10 ? 4 : 2, maximumFractionDigits: stats24h.low < 10 ? 4 : 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 24h Volume */}
              <div className="hidden lg:flex flex-col border-l border-brand-border pl-8">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-2 opacity-60">
                  24h Volume ({selectedSymbol})
                </span>
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/5 rounded">
                     <Activity className="w-3 h-3 text-brand-blue" />
                  </div>
                  <span className="text-[11px] font-mono font-black text-gray-200">
                    {stats24h.volume >= 1000000 
                      ? `${(stats24h.volume / 1000000).toFixed(2)}M` 
                      : stats24h.volume >= 1000 
                        ? `${(stats24h.volume / 1000).toFixed(1)}K` 
                        : stats24h.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* 24h Turnover */}
              <div className="hidden xl:flex flex-col border-l border-brand-border pl-8">
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-2 opacity-60">
                  24h Turnover (PHP)
                </span>
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white/5 rounded text-brand-yellow">
                     ₱
                  </div>
                  <span className="text-[11px] font-mono font-black text-gray-200">
                    {stats24h.turnover.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Layer 2: Time Interval Menu */}
          <div className="h-10 border-b border-brand-border flex items-center px-4 shrink-0 bg-brand-surface/40 overflow-x-auto no-scrollbar">
            <div className="flex items-center space-x-1 shrink-0">
              {(['1m', '5m', '15m', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-3.5 py-1 text-[10px] sm:text-[11px] font-black uppercase tracking-tight transition-all rounded-lg outline-none whitespace-nowrap",
                    timeframe === tf 
                      ? "text-brand-green bg-brand-green/10 shadow-[inset_0_0_8px_rgba(16,185,129,0.1)] border border-brand-green/20" 
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 relative flex flex-col lg:flex-row overflow-hidden">
            <div className="flex-1 relative min-h-0">
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] select-none pointer-events-none z-0">
                <span className="text-[12vw] lg:text-[8vw] font-black uppercase tracking-tighter">CoinsBot</span>
              </div>
              <div className="absolute inset-0 z-10">
                {data.length > 0 ? (
                  <TradingChart data={data} symbol={selectedSymbol} />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-brand-green/20 border-t-brand-green rounded-full animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-black uppercase text-gray-400">Synchronizing Market Data</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
                        {isLoading ? "Fetching Coins.ph klines..." : "No data received. check API proxy."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Floating Signal Details Panel (Side Sheet) */}
            <AnimatePresence>
              {(isSignalsOpen || isAlertsOpen) && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setIsSignalsOpen(false);
                      setIsAlertsOpen(false);
                    }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
                  />
                  
                  <motion.aside 
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed right-4 top-20 bottom-4 w-[calc(100%-32px)] sm:w-80 lg:w-[360px] bg-brand-bg/95 backdrop-blur-xl border border-brand-border rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 flex flex-col overflow-hidden"
                  >
                    {isSignalsOpen ? (
                      <>
                        <div className="p-4 border-b border-brand-border flex items-center justify-between bg-brand-surface/50">
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-brand-green fill-current" />
                            <h3 className="text-sm font-black uppercase italic tracking-tighter">Signal Analysis</h3>
                          </div>
                          <button 
                            onClick={() => setIsSignalsOpen(false)}
                            className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 transition-colors"
                          >
                            <LayoutGrid className="w-4 h-4 rotate-45" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                          <SignalCard signal={currentSignal} rsi={lastRsi} />

                          <div className="space-y-4 shrink-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Technical Thresholds</h4>
                              <span className="text-[9px] text-gray-700 font-bold">LIVE ESTIMATES</span>
                            </div>
                            <div className="space-y-2">
                              <div className="group flex justify-between items-center p-3.5 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all cursor-crosshair" onClick={() => {
                                setIsAlertsOpen(true);
                                setIsSignalsOpen(false);
                              }}>
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-red-400/60 font-black uppercase tracking-widest mb-0.5">High Sensitivity R1</span>
                                  <span className="text-sm font-mono font-bold text-slate-100 italic">₱{(currentPrice * 1.02).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-red-500/40 group-hover:bg-red-500 animate-pulse"></div>
                              </div>
                              <div className="group flex justify-between items-center p-3.5 rounded-xl bg-brand-green/5 border border-brand-green/10 hover:border-brand-green/30 transition-all cursor-crosshair" onClick={() => {
                                setIsAlertsOpen(true);
                                setIsSignalsOpen(false);
                              }}>
                                <div className="flex flex-col">
                                  <span className="text-[9px] text-brand-green/60 font-black uppercase tracking-widest mb-0.5">Low Sensitivity S1</span>
                                  <span className="text-sm font-mono font-bold text-slate-100 italic">₱{(currentPrice * 0.98).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-brand-green/40 group-hover:bg-brand-green animate-pulse"></div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 shrink-0">
                             <div className="flex items-center gap-2 mb-1">
                                <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Connect Trade</span>
                             </div>
                             <button className="w-full bg-brand-green hover:bg-emerald-600 active:scale-[0.98] text-black font-black py-3 sm:py-4 rounded-xl text-xs uppercase tracking-tighter shadow-[0_10px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2">
                                <Zap className="w-4 h-4 fill-current" />
                                Launch Coins.ph
                             </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <PriceAlertsPanel 
                        alerts={alerts}
                        onAddAlert={addAlert}
                        onRemoveAlert={removeAlert}
                        onToggleAlert={toggleAlert}
                        currentPrice={currentPrice}
                        symbol={selectedSymbol}
                      />
                    )}
                  </motion.aside>
                </>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeNotification && (
                <motion.div
                  initial={{ y: 100, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 100, opacity: 0, scale: 0.9 }}
                  className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-brand-yellow text-black px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(250,204,21,0.3)] border border-brand-yellow/50 flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
                    <Bell className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Threshold Breach</div>
                    <div className="text-sm font-black uppercase italic">{activeNotification}</div>
                  </div>
                  <button 
                    onClick={() => setActiveNotification(null)}
                    className="ml-4 p-1 hover:bg-black/10 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0B0E11;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1E2329;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
