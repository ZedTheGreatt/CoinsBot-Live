import { motion } from 'motion/react';
import { Brain, TrendingUp, TrendingDown, Minus, Info, ShieldAlert, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { AISentiment } from '../services/aiService';

interface AIPulsePanelProps {
  sentiment: AISentiment | null;
  isLoading: boolean;
}

export default function AIPulsePanel({ sentiment, isLoading }: AIPulsePanelProps) {
  if (isLoading) {
    return (
      <div className="p-5 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-brand-blue/10 animate-pulse">
              <Brain className="w-4 h-4 text-brand-blue" />
            </div>
            <span className="text-xs font-black uppercase tracking-tighter text-white animate-pulse">Neural Pulse</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-ping" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-blue">Thinking...</span>
          </div>
        </div>

        <div className="relative h-32 bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden flex flex-col items-center justify-center space-y-3">
          {/* Scanning line animation */}
          <motion.div 
            animate={{ top: ['0%', '100%', '0%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-blue to-transparent shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10"
          />
          
          <div className="space-y-2 w-full px-6">
            <div className="h-2 w-1/2 bg-white/5 rounded animate-pulse" />
            <div className="h-2 w-full bg-white/5 rounded animate-pulse delay-75" />
            <div className="h-2 w-3/4 bg-white/5 rounded animate-pulse delay-150" />
          </div>
          <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest animate-pulse">Analyzing Market Patterns</p>
        </div>
      </div>
    );
  }

  if (!sentiment || sentiment.error) {
    const isCongested = sentiment?.error?.includes("Congested") || sentiment?.error?.includes("429");
    
    return (
      <div className="p-5">
        <div className={cn(
          "border rounded-2xl p-4 flex items-center gap-3",
          isCongested ? "bg-brand-blue/5 border-brand-blue/20" : "bg-amber-500/10 border-amber-500/20"
        )}>
          {isCongested ? (
            <Sparkles className="w-5 h-5 text-brand-blue shrink-0 animate-pulse" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div className="space-y-1">
            <p className={cn(
              "text-xs font-black uppercase tracking-tighter",
              isCongested ? "text-brand-blue" : "text-amber-500"
            )}>
              {isCongested ? "Engine Processing" : "Neural Engine Halted"}
            </p>
            <p className="text-[10px] text-gray-400 leading-tight font-medium">
              {isCongested 
                ? "Neural Engine is currently processing high volume. Displaying latest analysis from high-speed cache..." 
                : (sentiment?.error || "Neural Engine Halted. Please check security configurations.")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isBullish = sentiment.label === 'BULLISH';
  const isBearish = sentiment.label === 'BEARISH';
  const isNeutral = sentiment.label === 'NEUTRAL';

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-brand-blue/10">
            <Brain className="w-4 h-4 text-brand-blue" />
          </div>
          <span className="text-xs font-black uppercase tracking-tighter text-white">Neural Pulse</span>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
          sentiment.riskLevel === 'HIGH' ? "bg-red-500/10 text-red-400" : 
          sentiment.riskLevel === 'MEDIUM' ? "bg-yellow-500/10 text-yellow-400" :
          "bg-green-500/10 text-green-400"
        )}>
          {sentiment.riskLevel === 'HIGH' && <AlertTriangle className="w-2.5 h-2.5" />}
          Risk: {sentiment.riskLevel}
        </div>
      </div>

      <div className="flex items-end gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center">
            <span className={cn(
              "text-2xl font-black italic tracking-tighter",
              isBullish ? "text-brand-green" : isBearish ? "text-brand-red" : "text-gray-400"
            )}>
              {Math.abs(sentiment.score)}%
            </span>
          </div>
          <div className={cn(
              "absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg",
              isBullish ? "bg-brand-green text-black" : isBearish ? "bg-brand-red text-white" : "bg-gray-700 text-gray-300"
            )}>
            {sentiment.label}
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">AI Bias</p>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden flex">
            <div 
              className={cn("h-full transition-all duration-1000", isBullish ? "bg-brand-green" : isBearish ? "bg-brand-red" : "bg-gray-500")}
              style={{ width: `${Math.abs(sentiment.score)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed pt-1">
            {sentiment.summary}
          </p>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
          <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Logic Highlights</span>
        </div>
        <ul className="space-y-2">
          {sentiment.keyFactors?.map((factor, i) => (
            <li key={i} className="flex items-start gap-2 text-[10px] text-gray-400">
              <span className="w-1 h-1 rounded-full bg-brand-blue/30 mt-1.5 shrink-0" />
              {factor}
            </li>
          )) || <li className="text-[10px] text-gray-500 italic">No factors identified.</li>}
        </ul>
      </div>

      <div className="flex items-center gap-2 opacity-40">
        <Info className="w-3 h-3 text-gray-500" />
        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-[0.2em]">Neural Engine v4.0.1 ALPHA (Llama Powered)</span>
      </div>
    </div>
  );
}
