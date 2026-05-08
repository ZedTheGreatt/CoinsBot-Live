import React from 'react';
import { Home, Zap, LineChart, Briefcase, Menu } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppView } from '../types';

interface BottomNavProps {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  onMenuClick: () => void;
}

export default function BottomNav({ activeView, onViewChange, onMenuClick }: BottomNavProps) {
  const items = [
    { view: 'home' as AppView, icon: Home, label: 'Home' },
    { view: 'signals' as AppView, icon: Zap, label: 'Signals' },
    { view: 'chart' as AppView, icon: LineChart, label: 'Chart' },
    { view: 'portfolio' as AppView, icon: Briefcase, label: 'Portfolio' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-brand-bg/95 backdrop-blur-xl border-t border-brand-border flex items-center justify-around px-2 z-[100] sm:hidden">
      {items.map((item) => (
        <button
          key={item.view}
          onClick={() => onViewChange(item.view)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all",
            activeView === item.view ? "text-brand-green" : "text-gray-500"
          )}
        >
          <div className={cn(
            "p-2 rounded-xl transition-all relative",
            item.view === 'chart' && activeView !== item.view ? "bg-brand-green/5 border border-brand-green/10" : "",
            activeView === item.view ? "text-brand-green" : "text-gray-500"
          )}>
            <item.icon className={cn("w-5 h-5", activeView === item.view ? "fill-brand-green/20" : "")} />
            {item.view === 'chart' && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-yellow rounded-full border-2 border-brand-bg shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
            )}
          </div>
          <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          {activeView === item.view && (
            <div className="absolute top-0 w-6 h-0.5 bg-brand-green rounded-full shadow-[0_4px_10px_rgba(16,185,129,0.5)]" />
          )}
        </button>
      ))}
      <button
        onClick={onMenuClick}
        className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-gray-500"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[9px] font-black uppercase tracking-tighter">Menu</span>
      </button>
    </nav>
  );
}
