import React, { useState } from 'react';
import { 
  Home, 
  Zap, 
  LineChart, 
  Briefcase, 
  Settings, 
  Bell, 
  Database, 
  Palette, 
  FileText, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldCheck, 
  Clock, 
  History, 
  ChevronRight,
  Filter,
  Wallet,
  ArrowUpRight,
  Target,
  FlaskConical,
  Wifi,
  BarChart3,
  AlertCircle,
  Cpu,
  ShieldAlert,
  Sliders,
  Smartphone,
  ChevronLeft,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { AppView, MarketSignal, MarketRegime } from '../types';

interface SidebarProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onClose?: () => void;
  marketData: Record<string, { price: number; percent: number; change?: number }>;
  recentSignals: MarketSignal[];
  portfolio: {
    balance: number;
    pnl: number;
    pnlPercent: number;
  };
  botStatus: {
    apiStatus: 'ONLINE' | 'OFFLINE';
    uptime: string;
    syncTime: string;
    errors: number;
  };
  strategy: {
    rsi: number;
    ema: string;
    atr: string;
    gainzScore: number;
  };
}

export default function Sidebar({ 
  activeView, 
  onViewChange, 
  onClose,
  marketData, 
  recentSignals, 
  portfolio,
  botStatus,
  strategy
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const NavItem = ({ view, icon: Icon, label, star, activeViewPrefix }: { view: AppView; icon: any; label: string; star?: boolean; activeViewPrefix?: string[] }) => {
    const isActive = activeView === view || (activeViewPrefix && activeViewPrefix.includes(activeView));
    
    return (
      <button
        onClick={() => onViewChange(view)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all group",
          isActive
            ? "bg-brand-green/10 text-brand-green border border-brand-green/20" 
            : "text-gray-500 hover:text-white hover:bg-white/5"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("w-4 h-4", isActive ? "text-brand-green" : "text-gray-500 group-hover:text-white")} />
          {!collapsed && <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>}
        </div>
        {!collapsed && star && <div className="w-1 h-1 rounded-full bg-brand-yellow shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
      </button>
    );
  };

  const SectionLabel = ({ children }: { children: string }) => (
    !collapsed ? (
      <p className="px-3 text-[8px] font-black text-gray-700 uppercase tracking-[0.2em] mb-1.5 mt-4 first:mt-1">
        {children}
      </p>
    ) : (
      <div className="h-px bg-white/5 my-4 mx-2" />
    )
  );

  return (
    <aside className={cn(
      "h-full bg-brand-bg/80 backdrop-blur-3xl border-r border-brand-border flex flex-col transition-all duration-300 relative",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Collapse Toggle */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-brand-surface border border-brand-border rounded-full flex items-center justify-center text-gray-400 hover:text-white z-50 shadow-xl"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Brand */}
      <div className={cn(
        "flex items-center gap-3 shrink-0 transition-all relative",
        collapsed ? "p-4 justify-center" : "p-5"
      )}>
        <div className="w-8 h-8 bg-gradient-to-br from-brand-green to-brand-blue rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-brand-green/10">
          <Activity className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col -space-y-1">
            <span className="text-lg font-black italic tracking-tighter text-white uppercase">CoinsBot</span>
            <div className="flex items-center gap-1.5">
               <div className="w-1 h-1 rounded-full bg-brand-green animate-pulse" />
               <span className="text-[8px] font-black text-brand-green tracking-widest uppercase opacity-80">Live Engine v2</span>
            </div>
          </div>
        )}
        
        {/* Mobile Close Button */}
        {onClose && (
           <button 
             onClick={onClose}
             className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-white/5 rounded-full text-gray-500 hover:text-white sm:hidden"
           >
             <X className="w-5 h-5" />
           </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-0.5 pb-24">
        {/* CORE */}
        <SectionLabel>🧭 Core</SectionLabel>
        <NavItem view="home" icon={Home} label="Home" />
        <NavItem view="chart" icon={LineChart} label="Chart" star />
        <NavItem view="signals" icon={Zap} label="Signals" />
        <NavItem view="portfolio" icon={Briefcase} label="Porffolio" />

        {/* MARKET */}
        <SectionLabel>📊 Market</SectionLabel>
        {!collapsed ? (
          <div className="space-y-1.5 px-3 mb-4">
            <div className="flex flex-col gap-2 mb-3">
              {['BTC', 'ETH', 'SOL', 'XRP'].map((symbol) => {
                const data = marketData[symbol + 'PHP'] || { price: 0, percent: 0 };
                const isPositive = data.percent > 0;
                const isNegative = data.percent < 0;
                return (
                  <div key={symbol} className="flex items-center justify-between group">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-gray-500 group-hover:text-white transition-colors">{symbol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold text-gray-400">₱{data.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      <span className={cn(
                        "text-[8px] font-black font-mono w-10 text-right px-1 rounded",
                        data.percent >= 0 ? "text-brand-green bg-brand-green/5" : "text-brand-red bg-brand-red/5"
                      )}>{data.percent >= 0 ? '+' : ''}{data.percent.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 space-y-1.5">
               <div className="flex items-center justify-between">
                  <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Market Trend</span>
                  <div className="flex items-center gap-1">
                     <div className={cn("w-1 h-1 rounded-full", strategy.ema === 'BULLISH' ? "bg-brand-green shadow-[0_0_5px_rgba(16,185,129,0.5)]" : "bg-brand-red shadow-[0_0_5px_rgba(239,68,68,0.5)]")} />
                     <span className={cn("text-[8px] font-black uppercase", strategy.ema === 'BULLISH' ? "text-brand-green" : "text-brand-red")}>{strategy.ema}</span>
                  </div>
               </div>
               <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${strategy.gainzScore}%` }}
                    className="h-full bg-brand-green"
                  />
               </div>
               <div className="flex justify-between items-center text-[7px] font-bold text-gray-600 uppercase tracking-tighter">
                  <span>Sentiment</span>
                  <span>{strategy.gainzScore}%</span>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            {['BTC', 'ETH', 'SOL', 'XRP'].map((symbol) => (
              <div key={symbol} className="text-[9px] font-black text-gray-600 uppercase transition-all hover:text-white cursor-pointer">{symbol[0]}</div>
            ))}
          </div>
        )}

        {/* STRATEGY */}
        <SectionLabel>🧠 Strategy</SectionLabel>
        <NavItem view="strategy" icon={Cpu} label="Algo Engine" />
        <NavItem view="risk" icon={Target} label="Risk Control" />
        <NavItem view="sensitivity" icon={Sliders} label="Sensitivity" />
        <NavItem view="backtest" icon={FlaskConical} label="Backtest" />

        {/* ALERTS */}
        <SectionLabel>🔔 Alerts</SectionLabel>
        <NavItem view="signals" icon={Bell} label="Notifications" />
        <NavItem view="alerts" icon={History} label="Price Alerts" />
        <NavItem view="telegram" icon={Smartphone} label="Telegram Setup" />
        <NavItem view="filters" icon={Filter} label="Alert Filters" />

        {/* SETTINGS */}
        <SectionLabel>⚙️ Settings</SectionLabel>
        <NavItem view="settings" icon={Settings} label="Bot Config" />
        <NavItem view="api" icon={Database} label="API Source" />
        <NavItem view="appearance" icon={Palette} label="Appearance" />
        <NavItem view="logs" icon={FileText} label="System Logs" />
        <NavItem view="about" icon={Info} label="About Engine" />
      </div>

      {/* FOOTER: Bot Status */}
      <div className="p-3 bg-black/40 border-t border-brand-border shrink-0">
        {!collapsed && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col">
               <span className="text-[7px] text-gray-600 font-black uppercase mb-0.5 tracking-widest">Uptime</span>
               <span className="text-[9px] font-mono font-black text-gray-400">{botStatus.uptime}</span>
            </div>
            <div className="p-2 rounded-lg bg-white/5 border border-white/5 flex flex-col">
               <span className="text-[7px] text-gray-600 font-black uppercase mb-0.5 tracking-widest">Last Sync</span>
               <span className="text-[9px] font-mono font-black text-gray-400">{botStatus.syncTime}</span>
            </div>
          </div>
        )}
        
        <div className={cn(
          "flex items-center justify-between px-1",
          collapsed && "justify-center"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              botStatus.apiStatus === 'ONLINE' ? "bg-brand-green" : "bg-brand-red"
            )} />
            {!collapsed && (
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                botStatus.apiStatus === 'ONLINE' ? "text-brand-green" : "text-brand-red"
              )}>API {botStatus.apiStatus}</span>
            )}
          </div>
          {!collapsed && (
            <div className="flex items-center gap-2">
               <Wifi className="w-3 h-3 text-gray-600" />
               <ShieldCheck className="w-3 h-3 text-brand-green opacity-50" />
            </div>
          )}
          {collapsed && (
            <Wifi className={cn("w-3 h-3", botStatus.apiStatus === 'ONLINE' ? "text-brand-green" : "text-brand-red")} />
          )}
        </div>
      </div>
    </aside>
  );
}
