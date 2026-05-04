import { motion } from 'motion/react';
import { Rocket, CheckCircle2, Circle, ArrowUpRight, Github, Info, Zap, Shield, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

interface RoadmapPanelProps {
  onClose: () => void;
}

const ROADMAP = [
  {
    version: 'v2',
    title: 'Alpha Regime Engine',
    status: 'LIVE',
    date: 'Current',
    features: [
      '3-Layer Decision Architecture',
      'Regime Detection (Range/Trend)',
      'Dual EMA Alpha Cross System',
      'Candle Confirmation Guard'
    ],
    highlight: true
  },
  {
    version: 'v3',
    title: 'Momentum & Flow',
    status: 'UP NEXT',
    date: 'Q2 2026',
    features: [
      'Volume Profile Integration',
      'ADX Trend Strength Filtering',
      'Dynamic ATR Stop Losses',
      'Multi-Timeframe Sync'
    ],
    highlight: false
  },
  {
    version: 'v4',
    title: 'Neural Pulse Integration',
    status: 'PLANNED',
    date: 'H2 2026',
    features: [
      'Gemini AI Sentiment Overlay',
      'Liquidity Heatmap Mapping',
      'Custom Bot Scripting (JS)',
      'Automated Coins.ph Execution'
    ],
    highlight: false
  }
];

export default function RoadmapPanel({ onClose }: RoadmapPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-brand-blue" />
          <h3 className="text-sm font-black uppercase italic tracking-tighter">Engine Roadmap</h3>
        </div>
        <div className="px-2 py-0.5 rounded bg-brand-green/20 text-brand-green text-[9px] font-black uppercase">
          Stable v2
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        <div className="space-y-4">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
            CoinsBot is continuously evolving. Our goal is to provide the most precise technical analysis for the Philippines' digital asset market.
          </p>

          <div className="relative space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-white/5">
            {ROADMAP.map((phase, i) => (
              <div key={phase.version} className="relative pl-8 group">
                <div className={cn(
                  "absolute left-0 top-1.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all z-10",
                  phase.status === 'LIVE' 
                    ? "bg-brand-green border-brand-green shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                    : phase.status === 'UP NEXT'
                      ? "bg-brand-bg border-brand-blue"
                      : "bg-brand-bg border-white/10"
                )}>
                  {phase.status === 'LIVE' ? (
                    <CheckCircle2 className="w-4 h-4 text-black" />
                  ) : (
                    <Circle className={cn("w-2 h-2", phase.status === 'UP NEXT' ? "text-brand-blue fill-brand-blue" : "text-gray-700")} />
                  )}
                </div>

                <div className={cn(
                  "p-4 rounded-2xl border transition-all duration-300",
                  phase.highlight 
                    ? "bg-white/[0.03] border-white/10 shadow-xl" 
                    : "bg-transparent border-transparent hover:bg-white/[0.01] hover:border-white/5"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                      phase.status === 'LIVE' ? "bg-brand-green/10 text-brand-green" : "bg-white/5 text-gray-500"
                    )}>
                      {phase.version}
                    </span>
                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">
                      {phase.date}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white mb-3 tracking-tight">
                    {phase.title}
                  </h4>
                  <ul className="space-y-2">
                    {phase.features.map(feature => (
                      <li key={feature} className="flex items-center gap-2 text-[11px] text-gray-400 group-hover:text-gray-300 transition-colors">
                        <ArrowUpRight className="w-3 h-3 text-brand-blue/40" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-2xl space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-blue" />
            <span className="text-xs font-black text-brand-blue uppercase tracking-tighter">Join the Alpha</span>
          </div>
          <p className="text-[10px] text-gray-400 leading-normal">
            We're building the future of Pinoy Crypto Trading. Help us shape the engine by reporting bugs or suggesting technical features.
          </p>
          <button className="w-full py-2 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue text-[10px] font-black uppercase tracking-widest rounded-lg border border-brand-blue/20 transition-all flex items-center justify-center gap-2">
            <Github className="w-3 h-3" />
            Source Contributors
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity">
          <Info className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Bot ID: CB-ALPHA-2026-PH</span>
        </div>
      </div>
    </div>
  );
}
