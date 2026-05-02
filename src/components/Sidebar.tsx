import { motion } from 'motion/react';
import { LayoutGrid, TrendingUp, Zap, Clock, ShieldCheck, Target, TrendingDown } from 'lucide-react';
import { MarketSignal, CoinMetadata, SUPPORTED_COINS } from '../types';
import { cn } from '../lib/utils';

interface SidebarProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  currentPrice: number;
  isLoading: boolean;
}

import { Search } from 'lucide-react';

export default function Sidebar({ selectedSymbol, onSymbolSelect, currentPrice, isLoading }: SidebarProps) {
  return (
    <aside className="w-full h-full border-r border-brand-border flex flex-col shrink-0 bg-brand-bg">
      <div className="p-3">
        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1 mb-2 block">Markets</label>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search coin..." 
            className="w-full bg-brand-border border-none rounded text-xs px-8 py-2 text-gray-300 outline-none ring-1 ring-transparent focus:ring-brand-green/50 transition-all placeholder:text-gray-600"
          />
          <Search className="w-3 h-3 absolute left-3 top-2.5 text-gray-500" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-2 space-y-1">
          {SUPPORTED_COINS.map((coin) => {
            const isActive = selectedSymbol === coin.symbol;
            return (
              <button
                key={coin.symbol}
                onClick={() => onSymbolSelect(coin.symbol)}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all border outline-none group/btn",
                  isActive 
                    ? "bg-brand-surface border-brand-green shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]" 
                    : "hover:bg-brand-surface/70 border-transparent hover:border-brand-border"
                )}
              >
                <div className="flex items-center space-x-3 text-left">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black transition-all",
                    isActive ? "bg-brand-green text-black scale-110" : "bg-brand-border text-gray-500 group-hover/btn:text-gray-300"
                  )}>
                    {coin.icon}
                  </div>
                  <div>
                    <p className={cn("text-[11px] font-black uppercase tracking-tight", isActive ? "text-white" : "text-gray-400 group-hover/btn:text-white")}>{coin.pair}</p>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{coin.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("text-xs font-mono font-black italic", isActive ? "text-brand-green" : "text-gray-500 group-hover/btn:text-gray-300")}>
                    {isActive ? `₱${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '---'}
                  </p>
                  <p className="text-[9px] text-brand-green font-black">+2.45%</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 mt-auto">
        <div className="bg-gradient-to-br from-brand-surface to-brand-bg p-3 rounded-lg border border-brand-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Exchange Sync</span>
            <div className="flex items-center gap-1.5">
               <div className={cn(
                 "w-1.5 h-1.5 rounded-full animate-pulse",
                 isLoading ? "bg-brand-yellow" : "bg-brand-green"
               )}></div>
               <span className={cn(
                 "text-[9px] font-bold",
                 isLoading ? "text-brand-yellow" : "text-brand-green"
               )}>{isLoading ? 'SYNCING' : 'CONNECTED'}</span>
            </div>
          </div>
          <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
             <div className={cn(
               "h-full transition-all duration-500",
               isLoading ? "bg-brand-yellow w-1/2" : "bg-brand-green w-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
             )}></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
