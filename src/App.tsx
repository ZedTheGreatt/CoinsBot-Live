import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import TradingChart from './components/TradingChart';
import SignalCard from './components/SignalCard';
import { OHLCCandle, MarketSignal, SUPPORTED_COINS, Timeframe, PriceAlert } from './types';
import { generateSignals, calculateRSI } from './lib/engine';
import { fetchKlines } from './services/marketService';
import { LayoutGrid, TrendingUp, Zap, Clock, Smartphone, Info, Bell, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from './lib/utils';
import PriceAlertsPanel from './components/PriceAlertsPanel';

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [data, setData] = useState<OHLCCandle[]>([]);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [lastRsi, setLastRsi] = useState(50);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSignalsOpen, setIsSignalsOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    const saved = localStorage.getItem('coinsbot_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeNotification, setActiveNotification] = useState<string | null>(null);
  
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
    setIsLoading(false);
  };

  useEffect(() => {
    loadMarketData();
  }, [selectedSymbol, timeframe]);

  // Polling for updates
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(async () => {
      const klines = await fetchKlines(selectedSymbol + 'PHP', timeframe, 10);
      if (klines.length > 0) {
        setData(prev => {
          if (prev.length === 0) return klines;
          
          const newCandles = [...prev];
          const lastFetched = klines[klines.length - 1];
          
          // If the last candle in our data has the same timestamp as the latest fetched, update it
          // Otherwise, if it's new, append (or slide)
          const lastExisting = newCandles[newCandles.length - 1];
          
          if (lastExisting.time === lastFetched.time) {
            newCandles[newCandles.length - 1] = lastFetched;
          } else if (lastFetched.time > lastExisting.time) {
            newCandles.push(lastFetched);
            if (newCandles.length > 500) newCandles.shift();
          }
          
          return [...newCandles];
        });
      }
    }, 10000); // 10s polling

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedSymbol, timeframe]);

  // Derive Signals and RSI
  useEffect(() => {
    if (data.length < 200) return;
    const s = generateSignals(data);
    setSignals(s);
    
    const closes = data.map(d => d.close);
    const rsiValues = calculateRSI(closes, 14);
    setLastRsi(rsiValues[rsiValues.length - 1] || 50);
  }, [data]);

  const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const currentSignal = signals.length > 0 ? signals[signals.length - 1] : null;

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

      // Price Crossing Alerts
      if (alert.condition === 'ABOVE' && alert.targetPrice && latestPrice >= alert.targetPrice) {
        triggeredAlerts.push(alert);
      } else if (alert.condition === 'BELOW' && alert.targetPrice && latestPrice <= alert.targetPrice) {
        triggeredAlerts.push(alert);
      } 
      // Signal Intelligence Alerts
      else if (alert.condition === 'SIGNAL' && latestSignal) {
        const currentCandleTime = data[data.length - 1].time;
        if (latestSignal.time === currentCandleTime) {
          // Check if we haven't already notified for this exact signal time to avoid spam
          triggeredAlerts.push(alert);
        }
      }
    });

    if (triggeredAlerts.length > 0) {
      // Play Notification Sound safely
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
        if (alert.condition === 'SIGNAL' && latestSignal) {
           msg = `${alert.symbol} ${latestSignal.type.replace('_', ' ')} detected!`;
        } else {
           msg = `${alert.symbol} reached ₱${alert.targetPrice?.toLocaleString()}`;
        }

        // Trigger UI Notification
        setActiveNotification(msg);
        
        // Browser Notification (Safe Guard)
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

      // Update state: Disable one-shot price alerts, but keep Signal alerts active 
      // to avoid infinite loops, we only update if we actually have one-shot alerts
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

      // Clear toast after 5s
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
    
    // Request notification permission
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

  return (
    <div className="h-screen-fix bg-brand-bg text-brand-text font-sans overflow-hidden flex flex-col selection:bg-brand-green/30">
      <Topbar 
        onMenuClick={() => setIsSidebarOpen(true)} 
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
      />

      <main className="flex-1 flex overflow-hidden relative">
        {/* Responsive Sidebar (Coin Selector) */}
        <div className={cn(
          "fixed inset-0 z-50 lg:static lg:block transition-all duration-300 transform lg:transform-none",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* Overlay for mobile */}
          {isSidebarOpen && (
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          <div className="relative w-72 h-full shadow-2xl lg:shadow-none bg-brand-bg">
            <Sidebar 
              selectedSymbol={selectedSymbol} 
              onSymbolSelect={(s) => {
                setSelectedSymbol(s);
                setIsSidebarOpen(false);
              }}
              currentPrice={currentPrice}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Center Section: Chart and Market Stats */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-brand-bg relative">
          
          {/* Chart Toolbar */}
          <div className="h-10 border-b border-brand-border flex items-center px-4 gap-4 shrink-0 bg-brand-surface overflow-x-auto no-scrollbar">
            <div className="flex items-center space-x-1 shrink-0">
              {(['1m', '5m', '15m', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-3 py-1.5 sm:px-2.5 sm:py-1 text-[10px] font-black uppercase tracking-tight transition-all rounded outline-none whitespace-nowrap",
                    timeframe === tf ? "text-brand-green bg-gray-800" : "text-gray-400 hover:text-white"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-gray-700 shrink-0 hidden sm:block"></div>
            <div className="hidden sm:flex items-center space-x-6 shrink-0">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none">
                EMA(50): <span className="text-brand-blue tabular-nums ml-1">₱{(currentPrice * 0.99).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </span>
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none">
                EMA(200): <span className="text-brand-yellow tabular-nums ml-1">₱{(currentPrice * 0.975).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </span>
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
                  {/* Backdrop for mobile */}
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
                  
                  {/* The Panel */}
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

                          {/* Technical Levels */}
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

            {/* Price Alert Toast */}
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
