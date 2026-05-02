import { Bell, Search, Settings, User, Activity, Menu, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

interface TopbarProps {
  onMenuClick?: () => void;
  onSignalsClick?: () => void;
  onAlertsClick?: () => void;
  isSignalsOpen?: boolean;
  isAlertsOpen?: boolean;
}

export default function Topbar({ onMenuClick, onSignalsClick, onAlertsClick, isSignalsOpen, isAlertsOpen }: TopbarProps) {
  return (
    <header className="h-14 border-b border-brand-border flex items-center justify-between px-4 shrink-0 bg-brand-bg">
      <div className="flex items-center space-x-6">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-brand-surface rounded-lg text-gray-400 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-green to-brand-blue rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col -space-y-1">
            <span className="text-lg font-black italic tracking-tighter text-white">
              CoinsBot <span className="text-brand-green">Pro</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">GainzAlgo Alpha</span>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse"></div>
            </div>
          </div>
        </div>
        <nav className="hidden md:flex items-center space-x-4 text-sm font-medium text-gray-400">
          <span className="px-2 py-1 bg-gray-800 text-white rounded cursor-default">Market</span>
          <span className="px-2 py-1 hover:text-white cursor-pointer transition-colors">Portfolio</span>
          <button 
            onClick={onSignalsClick}
            className={cn(
              "px-2 py-1 hover:text-brand-green cursor-pointer transition-colors flex items-center gap-1.5",
              isSignalsOpen ? "text-brand-green font-bold" : ""
            )}
          >
            Signals
            <Zap className={cn("w-3 h-3", isSignalsOpen ? "fill-brand-green" : "")} />
          </button>
          <button 
            onClick={onAlertsClick}
            className={cn(
              "px-2 py-1 hover:text-brand-yellow cursor-pointer transition-colors flex items-center gap-1.5",
              isAlertsOpen ? "text-brand-yellow font-bold" : ""
            )}
          >
            Alerts
            <Bell className={cn("w-3 h-3", isAlertsOpen ? "fill-brand-yellow" : "")} />
          </button>
        </nav>
      </div>
      
      <div className="flex items-center space-x-3 sm:space-x-6">
        <div className="flex items-center md:hidden gap-2">
          <button 
            onClick={onSignalsClick}
            className={cn(
              "p-2 rounded-lg transition-all flex items-center justify-center",
              isSignalsOpen 
                ? "bg-brand-green text-black" 
                : "bg-brand-surface text-gray-400 hover:text-white border border-brand-border"
            )}
          >
            <Zap className="w-4 h-4 fill-current" />
          </button>
          <button 
            onClick={onAlertsClick}
            className={cn(
              "p-2 rounded-lg transition-all flex items-center justify-center",
              isAlertsOpen 
                ? "bg-brand-yellow text-black" 
                : "bg-brand-surface text-gray-400 hover:text-white border border-brand-border"
            )}
          >
            <Bell className="w-4 h-4 fill-current" />
          </button>
        </div>

        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Market Status</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-brand-green rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] text-brand-green font-mono font-bold">LIVE CONNECTED</span>
          </div>
        </div>
        <div className="h-8 w-px bg-brand-border hidden sm:block"></div>
        <div className="flex items-center space-x-2">
           <button className="p-2 text-gray-400 hover:text-white transition-colors relative">
             <Bell className="w-4 h-4" />
             <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-green rounded-full"></span>
           </button>
           <div className="w-8 h-8 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors">
             <User className="w-4 h-4 text-white" />
           </div>
        </div>
      </div>
    </header>
  );
}
