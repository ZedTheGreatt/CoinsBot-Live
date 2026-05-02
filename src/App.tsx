import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Topbar from './components/Topbar';
import Sidebar from './components/Sidebar';
import TradingChart from './components/TradingChart';
import SignalCard from './components/SignalCard';
import { OHLCCandle, MarketSignal, SUPPORTED_COINS, Timeframe } from './types';
import { generateSignals, calculateRSI } from './lib/engine';
import { fetchKlines } from './services/marketService';
import { LayoutGrid, TrendingUp, Zap, Clock, Smartphone, Info } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const [timeframe, setTimeframe] = useState<Timeframe>('1H');
  const [data, setData] = useState<OHLCCandle[]>([]);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [lastRsi, setLastRsi] = useState(50);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSignalsOpen, setIsSignalsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans overflow-hidden flex flex-col selection:bg-brand-green/30">
      <Topbar 
        onMenuClick={() => setIsSidebarOpen(true)} 
        onSignalsClick={() => setIsSignalsOpen(!isSignalsOpen)}
        isSignalsOpen={isSignalsOpen}
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
          <div className="relative w-72 h-full shadow-2xl lg:shadow-none">
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
        <div className="flex-1 flex flex-col overflow-hidden bg-brand-bg relative">
          
          {/* Chart Toolbar */}
          <div className="h-10 border-b border-brand-border flex items-center px-4 space-x-6 shrink-0 bg-brand-surface">
            <div className="flex space-x-1">
              {(['1m', '5m', '15m', '1H', '4H', '1D'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-black uppercase tracking-tight transition-all rounded outline-none",
                    timeframe === tf ? "text-brand-green bg-gray-800" : "text-gray-400 hover:text-white"
                  )}
                >
                  {tf}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-gray-700 hidden sm:block"></div>
            <div className="hidden lg:flex items-center space-x-6">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none">
                EMA(50): <span className="text-brand-blue tabular-nums ml-1">{(currentPrice * 0.99).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </span>
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none">
                EMA(200): <span className="text-brand-yellow tabular-nums ml-1">{(currentPrice * 0.975).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </span>
            </div>
          </div>

          {/* Main Chart Area */}
          <div className="flex-1 relative flex overflow-hidden">
            <div className="flex-1 relative h-full">
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none z-0">
                <span className="text-[8vw] font-black uppercase tracking-tighter">CoinsBot</span>
              </div>
              <div className="absolute inset-0 z-10 h-full">
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
              {isSignalsOpen && (
                <>
                  {/* Backdrop for mobile */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSignalsOpen(false)}
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
                          <Info className="w-3 h-3 text-gray-600" />
                        </div>
                        <div className="space-y-2">
                          <div className="group flex justify-between items-center p-3.5 rounded-xl bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-all">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-red-400/60 font-black uppercase tracking-widest mb-0.5">Resistance R1</span>
                              <span className="text-sm font-mono font-bold text-slate-100 italic">{(currentPrice * 1.02).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500/40 group-hover:bg-red-500"></div>
                          </div>
                          <div className="group flex justify-between items-center p-3.5 rounded-xl bg-brand-green/5 border border-brand-green/10 hover:border-brand-green/30 transition-all">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-brand-green/60 font-black uppercase tracking-widest mb-0.5">Support S1</span>
                              <span className="text-sm font-mono font-bold text-slate-100 italic">{(currentPrice * 0.98).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-green/40 group-hover:bg-brand-green"></div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center gap-2 mb-1">
                            <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Connect Trade</span>
                         </div>
                         <button className="w-full bg-brand-green hover:bg-emerald-600 active:scale-[0.98] text-black font-black py-4 rounded-xl text-xs uppercase tracking-tighter shadow-[0_10px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2">
                            <Zap className="w-4 h-4 fill-current" />
                            Connect Hot Wallet
                         </button>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-900/50 border-t border-brand-border">
                       <p className="text-[9px] text-gray-600 text-center font-medium leading-relaxed uppercase tracking-tight">
                         Algo-derived signals are for informational purposes only. Trading involves significant risk.
                       </p>
                    </div>
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <style>{`
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

function StatCard({ label, value, icon: Icon, trend }: { label: string, value: string, icon: any, trend?: number }) {
  return (
    <div className="group bg-slate-950/40 backdrop-blur-sm border border-slate-800/50 p-4 rounded-2xl hover:bg-slate-900/40 transition-all hover:border-slate-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-slate-900 rounded-xl group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all text-slate-500">
          <Icon className="w-4 h-4" />
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-black italic",
            trend > 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">{label}</div>
      <div className="text-lg font-black text-slate-100 tabular-nums truncate">{value}</div>
    </div>
  );
}

function IndicatorRow({ label, value, intensity, color }: { label: string, value: string, intensity: number, color: 'emerald' | 'indigo' | 'red' }) {
  const colorMap = {
    emerald: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
    indigo: 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]',
    red: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[10px] font-bold uppercase">
        <span className="text-slate-400">{label}</span>
        <span className={cn(
          color === 'emerald' ? 'text-emerald-400' : color === 'red' ? 'text-red-400' : 'text-indigo-400'
        )}>{value}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${intensity}%` }}
          className={cn("h-full rounded-full transition-all duration-1000", colorMap[color])}
        />
      </div>
    </div>
  );
}
