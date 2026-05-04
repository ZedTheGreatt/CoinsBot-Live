import { Bell, Search, Settings, User, Activity, Menu, Zap, Rocket } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopbarProps {
  onMenuClick?: () => void;
  onSignalsClick?: () => void;
  onAlertsClick?: () => void;
  onRoadmapClick?: () => void;
  isSignalsOpen?: boolean;
  isAlertsOpen?: boolean;
  isRoadmapOpen?: boolean;
  trend?: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  symbol?: string;
  connectivity?: 'HEALTHY' | 'SLUGGISH' | 'OFFLINE';
}

export default function Topbar({ onMenuClick, onSignalsClick, onAlertsClick, onRoadmapClick, isSignalsOpen, isAlertsOpen, isRoadmapOpen, trend, symbol, connectivity }: TopbarProps) {
  return (
    <header className="h-12 sm:h-14 border-b border-brand-border flex items-center justify-between px-3 sm:px-4 shrink-0 bg-brand-bg transition-all">
      <div className="flex items-center space-x-3 sm:space-x-6">
        <button 
          onClick={onMenuClick}
          className="group p-2 hover:bg-brand-surface rounded-xl text-gray-400 transition-all border border-transparent hover:border-brand-border active:scale-95"
        >
          <Menu className="w-5 h-5 group-hover:text-white" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-brand-green to-brand-blue rounded-lg flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-base sm:text-lg font-black italic tracking-tighter text-white whitespace-nowrap">
              CoinsBot <span className="text-brand-green">Pro</span>
            </span>
            <div className="flex items-center gap-1.5 opacity-60">
              <span className="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none shrink-0">V2 ALPHA</span>
              <div className={cn(
                "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full animate-pulse",
                connectivity === 'HEALTHY' ? "bg-brand-green" : connectivity === 'SLUGGISH' ? "bg-brand-yellow" : "bg-brand-red"
              )}></div>
            </div>
          </div>
        </div>
        
        {/* Trend Indicator */}
        <div className="hidden lg:flex items-center gap-4 border-l border-brand-border pl-6 ml-2">
           <div className="flex flex-col">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">{symbol}/PHP</span>
              <div className="flex items-center gap-2">
                 <div className={cn(
                    "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 border transition-all",
                    trend === 'BULLISH' ? "bg-brand-green/10 text-brand-green border-brand-green/20" : 
                    trend === 'BEARISH' ? "bg-brand-red/10 text-brand-red border-brand-red/20" : "bg-gray-800/50 text-gray-400 border-white/5"
                 )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      trend === 'BULLISH' ? "bg-brand-green animate-pulse" : trend === 'BEARISH' ? "bg-brand-red animate-pulse" : "bg-gray-600"
                    )} />
                    {trend || 'NEUTRAL'}
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-3 sm:space-x-6">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest leading-none mb-1 opacity-60">Connectivity</span>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              connectivity === 'HEALTHY' ? "bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
              connectivity === 'SLUGGISH' ? "bg-brand-yellow shadow-[0_0_8px_rgba(250,204,21,0.5)]" : 
              "bg-brand-red shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            )}></div>
            <span className={cn(
              "text-[10px] font-mono font-black italic uppercase tracking-tighter transition-colors",
              connectivity === 'HEALTHY' ? "text-brand-green" : connectivity === 'SLUGGISH' ? "text-brand-yellow" : "text-brand-red"
            )}>
              {connectivity === 'HEALTHY' ? 'PH-01 Live' : connectivity === 'SLUGGISH' ? 'Degraded' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="h-8 w-px bg-brand-border hidden sm:block"></div>

        <div className="flex items-center gap-1.5 sm:gap-2">
           <button 
             onClick={onRoadmapClick}
             title="Roadmap"
             className={cn(
               "hidden lg:flex p-2 sm:p-2.5 rounded-xl transition-all relative group active:scale-95",
               isRoadmapOpen 
                ? "bg-brand-blue text-black" 
                : "bg-brand-surface text-gray-400 hover:text-brand-blue border border-brand-border hover:border-brand-blue/30"
             )}
           >
             <Rocket className={cn("w-4 h-4", isRoadmapOpen ? "fill-current" : "")} />
           </button>

           <button 
             onClick={onSignalsClick}
             title="Signals"
             className={cn(
               "p-2 sm:p-2.5 rounded-xl transition-all relative group active:scale-95",
               isSignalsOpen 
                ? "bg-brand-green text-black" 
                : "bg-brand-surface text-gray-400 hover:text-brand-green border border-brand-border hover:border-brand-green/30"
             )}
           >
             <Zap className={cn("w-4 h-4", isSignalsOpen ? "fill-current" : "")} />
           </button>

           <button 
             onClick={onAlertsClick}
             title="Alerts"
             className={cn(
               "p-2 sm:p-2.5 rounded-xl transition-all relative group active:scale-95",
               isAlertsOpen 
                ? "bg-brand-yellow text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]" 
                : "bg-brand-surface text-gray-400 hover:text-brand-yellow border border-brand-border hover:border-brand-yellow/30"
             )}
           >
             <Bell className={cn("w-4 h-4", isAlertsOpen ? "fill-current" : "")} />
             {isAlertsOpen && (
               <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full border-2 border-brand-yellow animate-pulse"></span>
             )}
             {!isAlertsOpen && (
               <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-brand-yellow rounded-full"></span>
             )}
           </button>
        </div>
      </div>
    </header>
  );
}
