import { motion, AnimatePresence } from 'motion/react';
import { Target, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Zap, Clock, Activity } from 'lucide-react';
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
        <Activity className="w-8 h-8 text-gray-700 mb-4 animate-pulse" />
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

        <div className="grid grid-cols-2 gap-3 relative">
          <div className="bg-black/60 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center group-hover:border-brand-green/30 transition-colors">
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1.5 leading-none opacity-60">Confidence</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-mono font-black text-white italic tracking-tighter">{signal.confidence}</span>
              <span className="text-[10px] font-black text-gray-500 uppercase">%</span>
            </div>
          </div>
          <div className="bg-black/60 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center group-hover:border-white/20 transition-colors">
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1.5 leading-none opacity-60">RSI 14</p>
            <p className={cn(
              "text-2xl font-mono font-black italic tracking-tighter",
              rsi < 40 ? "text-brand-green" : rsi > 60 ? "text-brand-red" : "text-gray-400"
            )}>{Math.round(rsi)}</p>
          </div>
        </div>

        <div className="space-y-4 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase font-bold">Target Alpha</span>
            <span className="text-sm font-mono font-black text-brand-green">₱{signal.tp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 uppercase font-bold">Max Protection</span>
            <span className="text-sm font-mono font-black text-brand-red">₱{signal.sl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="h-px bg-white/10"></div>
          <div className="space-y-2">
            <IndicatorItem label="Alpha Cross (EMA)" value={isBuy ? "BULL SHIFT" : "BEAR SHIFT"} color={isBuy ? 'green' : 'red'} />
            <IndicatorItem label="Momentum Gate" value={rsi < 40 ? "RECOVERY" : rsi > 60 ? "OVEREXTENDED" : "NEUTRAL"} color={rsi < 40 ? 'green' : rsi > 60 ? 'red' : 'gray'} />
            <IndicatorItem label="Volume Matrix" value="SPIKE CONFIRMED" color='green' />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function IndicatorItem({ label, value, color }: { label: string, value: string, color: 'green' | 'red' | 'gray' }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-gray-500 uppercase font-bold">{label}</span>
      <span className={cn(
        "font-black tracking-tighter",
        color === 'green' ? "text-brand-green" : color === 'red' ? "text-brand-red" : "text-gray-400"
      )}>{value}</span>
    </div>
  );
}
