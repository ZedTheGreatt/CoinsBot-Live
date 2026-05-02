import { motion, AnimatePresence } from 'motion/react';
import { Target, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Zap, Clock } from 'lucide-react';
import { MarketSignal } from '../types';
import { cn } from '../lib/utils';

interface SignalCardProps {
  signal: MarketSignal | null;
  rsi: number;
}

export default function SignalCard({ signal, rsi }: SignalCardProps) {
  if (!signal) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center p-8 bg-brand-surface rounded-xl border border-brand-border border-dashed">
        <ActivityIcon className="w-8 h-8 text-gray-700 mb-4 animate-pulse" />
        <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Scanning Market Bias...</p>
      </div>
    );
  }

  const isBuy = signal.type.includes('BUY');

  return (
    <div className="flex flex-col gap-4">
      {/* Main Signal Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/5 rounded-xl border border-white/10 p-5 space-y-5 shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 -rotate-12 translate-x-4 -translate-y-4">
           {isBuy ? <TrendingUp className="w-20 h-20 text-white" /> : <TrendingDown className="w-20 h-20 text-white" />}
        </div>
        
        <div className="space-y-1 relative">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Market Alpha Bias</p>
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "text-3xl font-black italic",
              isBuy ? "text-brand-green" : "text-brand-red"
            )}>
              {signal.type.replace('_', ' ')}
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 relative">
          <div className="bg-black/40 p-3 rounded-lg border border-white/5">
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Confidence</p>
            <p className="text-2xl font-mono font-black text-white">{signal.confidence}%</p>
          </div>
          <div className="bg-black/40 p-3 rounded-lg border border-white/5">
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Volatility</p>
            <p className="text-2xl font-mono font-black text-brand-blue">MED</p>
          </div>
        </div>

        <div className="space-y-4 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase font-bold">Take Profit</span>
            <span className="text-sm font-mono font-black text-brand-green">₱{signal.tp.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase font-bold">Stop Loss</span>
            <span className="text-sm font-mono font-black text-brand-red">₱{signal.sl.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
          </div>
          <div className="h-px bg-white/10"></div>
          <div className="space-y-2">
            <IndicatorItem label="EMA(50/200) Cross" value={isBuy ? "BULLISH" : "BEARISH"} active={true} />
            <IndicatorItem label="Momentum RSI" value={rsi > 50 ? "ASCENDING" : "DESCENDING"} active={true} />
            <IndicatorItem label="Volume Spike" value="DETECTED" active={true} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function IndicatorItem({ label, value, active }: { label: string, value: string, active: boolean }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-gray-500 uppercase font-bold">{label}</span>
      <span className={cn("font-black", active ? "text-brand-green" : "text-gray-400")}>{value}</span>
    </div>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
