import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Activity } from 'lucide-react';
import { SUPPORTED_COINS } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CoinDropdownProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  currentPrice: number;
  allTickers?: Record<string, { price: number, percent: number, change: number }>;
}

export default function CoinDropdown({ selectedSymbol, onSymbolSelect, currentPrice, allTickers = {} }: CoinDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedCoin = SUPPORTED_COINS.find(c => c.symbol === selectedSymbol) || SUPPORTED_COINS[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCoins = SUPPORTED_COINS.filter(c => 
    c.pair.toLowerCase().includes(search.toLowerCase()) || 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-all group outline-none"
      >
        <div className="w-8 h-8 rounded-lg bg-brand-border flex items-center justify-center text-[14px] font-black group-hover:bg-brand-green/20 group-hover:text-brand-green transition-all">
          {selectedCoin.icon}
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-black text-white leading-none">{selectedCoin.pair}</span>
            <ChevronDown className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500 transition-transform", isOpen && "rotate-180")} />
          </div>
          <p className="text-[9px] sm:text-[10px] text-brand-green font-mono font-black italic tabular-nums leading-none mt-1">
            ₱{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[150]"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] sm:w-[500px] max-w-lg bg-brand-surface border border-brand-border rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[160] overflow-hidden"
            >
              <div className="p-6 border-b border-brand-border bg-brand-bg/50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white italic tracking-tighter uppercase">Select Asset</h3>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mt-1">Trading Pairs / PHP</p>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-all"
                >
                  <Activity className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-brand-surface">
                 <div className="relative">
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Search assets by name or symbol..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-2xl text-sm px-12 py-4 text-gray-200 outline-none focus:border-brand-green/30 transition-all placeholder:text-gray-600 font-medium"
                    />
                    <Search className="w-5 h-5 absolute left-4 top-4 text-gray-500" />
                 </div>
              </div>
              
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-4 pt-0 space-y-1.5">
                {filteredCoins.map(coin => {
                  const isActive = coin.symbol === selectedSymbol;
                  const ticker = allTickers[coin.symbol + 'PHP'];
                  const price = ticker?.price || (isActive ? currentPrice : 0);
                  const changePercent = ticker?.percent || 0;
                  const nominalChange = ticker?.change;
                  const isPositive = changePercent >= 0;

                  return (
                    <button
                      key={coin.symbol}
                      onClick={() => {
                        onSymbolSelect(coin.symbol);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-2xl transition-all outline-none group border border-transparent",
                        isActive 
                          ? "bg-brand-green/10 text-brand-green border-brand-green/20" 
                          : "hover:bg-brand-bg/80 text-gray-400 hover:text-white border-transparent hover:border-white/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center text-[18px] font-black transition-all shadow-sm",
                          isActive ? "bg-brand-green text-black" : "bg-brand-border"
                        )}>
                          {coin.icon}
                        </div>
                        <div className="text-left">
                          <p className={cn("text-base font-black tracking-tight", isActive ? "text-white" : "text-gray-200")}>{coin.pair}</p>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">{coin.name}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "text-sm font-mono font-black",
                          isActive ? "text-brand-green" : "text-gray-200"
                        )}>
                          ₱{price > 0 ? price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '---'}
                        </span>
                        <div className={cn(
                          "flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-black font-mono",
                          isPositive ? "text-brand-green bg-brand-green/10" : "text-brand-red bg-brand-red/10"
                        )}>
                          {isPositive ? '+' : ''}{(changePercent * 100).toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredCoins.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="w-12 h-12 bg-brand-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-border">
                       <Search className="w-6 h-6 text-gray-700" />
                    </div>
                    <p className="text-xs font-black text-gray-600 uppercase tracking-widest">No assets matching "{search}"</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 bg-brand-bg/50 border-t border-brand-border flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Live Exchange Rates</span>
                 </div>
                 <button 
                  onClick={() => setIsOpen(false)}
                  className="text-[10px] font-black uppercase tracking-widest text-brand-green hover:text-white transition-colors"
                 >
                   Close Window
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
