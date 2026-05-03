import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Activity } from 'lucide-react';
import { SUPPORTED_COINS } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface CoinDropdownProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  currentPrice: number;
}

export default function CoinDropdown({ selectedSymbol, onSymbolSelect, currentPrice }: CoinDropdownProps) {
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
            ₱{currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] sm:hidden"
            />
            
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="absolute sm:absolute fixed top-20 sm:top-full left-4 right-4 sm:left-0 sm:right-auto sm:mt-2 sm:w-64 bg-brand-surface border border-brand-border rounded-2xl shadow-2xl z-[100] overflow-hidden"
            >
            <div className="p-3 border-b border-brand-border bg-brand-bg/50">
               <div className="relative">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search asset..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-brand-border border-none rounded-lg text-xs px-8 py-2 text-gray-200 outline-none ring-1 ring-transparent focus:ring-brand-green/30 transition-all placeholder:text-gray-600"
                  />
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
               </div>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
              {filteredCoins.map(coin => {
                const isActive = coin.symbol === selectedSymbol;
                return (
                  <button
                    key={coin.symbol}
                    onClick={() => {
                      onSymbolSelect(coin.symbol);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 rounded-lg transition-all outline-none group",
                      isActive ? "bg-brand-green/10 text-brand-green" : "hover:bg-brand-bg/80 text-gray-400 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-black transition-all",
                        isActive ? "bg-brand-green text-black" : "bg-brand-border"
                      )}>
                        {coin.icon}
                      </div>
                      <div className="text-left">
                        <p className={cn("text-xs font-black", isActive ? "text-white" : "text-gray-300")}>{coin.pair}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{coin.name}</p>
                      </div>
                    </div>
                    {isActive && <Activity className="w-3.5 h-3.5 animate-pulse" />}
                  </button>
                );
              })}
              {filteredCoins.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-xs font-black text-gray-600 uppercase tracking-widest">No assets found</p>
                </div>
              )}
            </div>
            
            <div className="p-3 bg-brand-bg/80 border-t border-brand-border">
               <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                  <span>Exchange Sync</span>
                  <span className="text-brand-green">Connected</span>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </div>
  );
}
