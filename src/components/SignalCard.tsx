import { motion, AnimatePresence } from 'motion/react';
import { Target, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Zap, Clock, Activity, BarChart3, RotateCw, UnfoldVertical, ShieldAlert } from 'lucide-react';
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

  const { regime } = signal;
  const isBuy = signal.type.includes('BUY');
  const isSell = signal.type.includes('SELL');
  const isNeutral = signal.type === 'NEUTRAL';
  // const isNoTrade = signal.type === 'NO_TRADE';

  return (
    <div className="flex flex-col gap-4">
      {/* Market Regime Section */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-black/40 rounded-xl border border-white/5 p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-blue" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Market Regime (v1)</h4>
          </div>
          <span className={cn(
            "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
            regime?.bias === 'BULLISH' ? "bg-brand-green/20 text-brand-green" : regime?.bias === 'BEARISH' ? "bg-brand-red/20 text-brand-red" : "bg-gray-800 text-gray-400"
          )}>
            Bias: {regime?.bias || 'NEUTRAL'}
          </span>
        </div>

        <div className="space-y-2">
          <RegimeBar label="Bullish Continuation" value={regime?.bullishContinuation || 0} color="green" icon={<TrendingUp className="w-3 h-3" />} />
          <RegimeBar label="Bearish Continuation" value={regime?.bearishContinuation || 0} color="red" icon={<TrendingDown className="w-3 h-3" />} />
          <RegimeBar label="Reversal Chance" value={regime?.reversalChance || 0} color="yellow" icon={<RotateCw className="w-3 h-3" />} />
          <RegimeBar label="Sideways / Chop" value={regime?.sideways || 0} color="gray" icon={<Activity className="w-3 h-3" />} />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-2 bg-white/5 rounded-lg">
             <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Momentum</p>
             <p className={cn(
               "text-xs font-black uppercase tracking-tighter",
               regime?.momentum === 'Strong' ? "text-brand-green" : "text-gray-300"
             )}>{regime?.momentum || 'Weak'}</p>
          </div>
          <div className="p-2 bg-white/5 rounded-lg">
             <p className="text-[8px] text-gray-500 uppercase font-black mb-1">Confidence</p>
             <p className={cn(
               "text-xs font-black uppercase tracking-tighter",
               regime?.confidence === 'HIGH' ? "text-brand-green" : regime?.confidence === 'MEDIUM' ? "text-brand-yellow" : "text-brand-red"
             )}>{regime?.confidence || 'LOW'}</p>
          </div>
        </div>
      </motion.div>

      {/* Trap Alerts */}
      {(regime?.traps?.bull || regime?.traps?.bear) && (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "p-3 rounded-xl border flex items-center gap-3 animate-pulse",
            regime.traps.bull ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-brand-green/10 border-brand-green/30 text-brand-green"
          )}
        >
          <ShieldAlert className="w-4 h-4" />
          <p className="text-[10px] font-black uppercase tracking-widest">
            {regime.traps.bull ? "⚠️ Liquidity Trap: BULL TRAP DETECTED" : "⚠️ Liquidity Trap: BEAR TRAP DETECTED"}
          </p>
        </motion.div>
      )}

      {/* Main Signal Card */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white/5 rounded-xl border border-white/10 p-4 sm:p-5 space-y-4 sm:space-y-5 shadow-2xl relative overflow-hidden group"
      >
        <div className="absolute top-0 right-0 p-2 opacity-5 scale-150 -rotate-12 translate-x-4 -translate-y-4">
           {isBuy ? <TrendingUp className="w-20 h-20 text-white" /> : isSell ? <TrendingDown className="w-20 h-20 text-white" /> : <Activity className="w-20 h-20 text-white" />}
        </div>
        
        <div className="space-y-1 relative">
          <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-2">
            Signal Analysis <Zap className="w-2.5 h-2.5 text-brand-yellow fill-current" />
          </p>
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "text-3xl font-black italic",
              isBuy ? "text-brand-green" : isSell ? "text-brand-red" : "text-gray-400"
            )}>
              {signal.type.replace('_', ' ')}
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 relative">
          <div className="bg-black/60 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center group-hover:border-white/20 transition-colors">
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1.5 leading-none opacity-60">Gainz Score</p>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-2xl font-mono font-black italic tracking-tighter",
                (regime?.gainzScore || 0) >= 70 ? "text-brand-green" : (regime?.gainzScore || 0) >= 50 ? "text-brand-yellow" : "text-brand-red"
              )}>{regime?.gainzScore || signal.confidence}</span>
              <span className="text-[10px] font-black text-gray-500 uppercase">/100</span>
            </div>
          </div>
          <div className="bg-black/60 p-4 rounded-xl border border-white/5 flex flex-col items-center justify-center group-hover:border-white/20 transition-colors relative overflow-hidden">
            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1.5 leading-none opacity-60">RSI 14</p>
            <p className={cn(
              "text-2xl font-mono font-black italic tracking-tighter z-10",
              rsi < 30 ? "text-brand-green" : rsi > 70 ? "text-brand-red" : "text-gray-400"
            )}>{Math.round(rsi)}</p>
            <div className="absolute bottom-0 left-0 h-1 bg-white/5 w-full">
              <motion.div 
                className={cn(
                  "h-full",
                  rsi < 30 ? "bg-brand-green" : rsi > 70 ? "bg-brand-red" : "bg-brand-blue"
                )}
                initial={{ width: 0 }}
                animate={{ width: `${rsi}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 relative">
          <div className={cn(
            "space-y-4 transition-opacity",
            (isNeutral || signal.type === 'NO_TRADE') ? "opacity-30 pointer-events-none" : "opacity-100"
          )}>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Target Alpha</span>
              <span className="text-sm font-mono font-black text-brand-green">₱{signal.tp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-gray-500 uppercase font-bold">Max Protection</span>
              <span className="text-sm font-mono font-black text-brand-red">₱{signal.sl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          <div className="h-px bg-white/10"></div>
          <div className="space-y-2">
            <IndicatorItem label="Trend State" value={regime?.bias || 'NEUTRAL'} color={regime?.bias === 'BULLISH' ? 'green' : regime?.bias === 'BEARISH' ? 'red' : 'gray'} />
            <IndicatorItem label="Momentum" value={regime?.momentum || 'WEAK'} color={regime?.momentum === 'Strong' ? 'green' : 'gray'} />
            <IndicatorItem label="Trap Shield" value={signal.confidence > 70 ? "ACTIVE" : "COMPROMISED"} color={signal.confidence > 70 ? 'green' : 'red'} />
          </div>
        </div>
      </motion.div>
      <div className="text-[8px] text-gray-600 uppercase font-bold text-center tracking-widest mt-2 px-4 italic">
        ⚠️ Powered by Market Regime Engine v1 • Experimental Alpha
      </div>
    </div>
  );
}

function RegimeBar({ label, value, color, icon }: { label: string, value: number, color: 'green' | 'red' | 'yellow' | 'gray', icon: React.ReactNode }) {
  const colorMap = {
    green: 'bg-brand-green',
    red: 'bg-brand-red',
    yellow: 'bg-brand-yellow',
    gray: 'bg-gray-600'
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-tighter">
        <div className="flex items-center gap-1.5 text-gray-400">
          {icon}
          {label}
        </div>
        <span className={cn(
          color === 'green' ? "text-brand-green" : color === 'red' ? "text-brand-red" : color === 'yellow' ? "text-brand-yellow" : "text-gray-400"
        )}>{value}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          className={cn("h-full", colorMap[color])}
        />
      </div>
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
