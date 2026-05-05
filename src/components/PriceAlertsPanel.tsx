import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Trash2, Plus, X, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { PriceAlert, SUPPORTED_COINS } from '../types';
import { cn } from '../lib/utils';

interface PriceAlertsPanelProps {
  alerts: PriceAlert[];
  onAddAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>) => void;
  onRemoveAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
  currentPrice: number;
  symbol: string;
}

export default function PriceAlertsPanel({ 
  alerts, 
  onAddAlert, 
  onRemoveAlert, 
  onToggleAlert,
  currentPrice,
  symbol
}: PriceAlertsPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [targetPrice, setTargetPrice] = useState(currentPrice.toString());
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW' | 'SIGNAL'>('ABOVE');
  const [selectedSignal, setSelectedSignal] = useState<PriceAlert['targetSignal']>('STRONG_BUY');

  const handleAdd = () => {
    const price = condition === 'SIGNAL' ? undefined : parseFloat(targetPrice);
    if (condition !== 'SIGNAL' && isNaN(price!)) return;
    
    onAddAlert({
      symbol,
      targetPrice: price,
      condition,
      targetSignal: condition === 'SIGNAL' ? selectedSignal : undefined,
    });
    setIsAdding(false);
  };

  const filteredAlerts = alerts.filter(a => a.symbol === symbol);
  const hasAutoSignal = filteredAlerts.some(a => a.condition === 'SIGNAL');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  const toggleAutoSignal = () => {
    if (hasAutoSignal) {
      const signalAlert = filteredAlerts.find(a => a.condition === 'SIGNAL');
      if (signalAlert) onRemoveAlert(signalAlert.id);
    } else {
      onAddAlert({
        symbol,
        condition: 'SIGNAL',
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-bg">
      <div className="p-4 border-b border-brand-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-yellow" />
          <h3 className="text-sm font-black uppercase italic tracking-tighter">Price Alerts</h3>
        </div>
        {!isAdding && (
          <div className="flex gap-2">
            <button 
              onClick={toggleAutoSignal}
              className={cn(
                "p-1 px-2 flex items-center gap-1 rounded text-[10px] font-black uppercase tracking-tighter transition-colors",
                hasAutoSignal ? "bg-brand-green/20 text-brand-green border border-brand-green/30" : "bg-gray-800 text-gray-400 border border-gray-700 hover:text-white"
              )}
            >
              <Zap className="w-3 h-3" />
              Auto-Signal
            </button>
            <button 
              onClick={() => setIsAdding(true)}
              className="p-1 px-2 flex items-center gap-1 bg-brand-yellow text-black rounded text-[10px] font-black uppercase tracking-tighter hover:bg-yellow-500 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Custom
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        <AnimatePresence mode="wait">
          {isAdding ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-xl bg-brand-surface border border-brand-yellow/30 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-brand-yellow uppercase">New {symbol} Alert</span>
                <button onClick={() => setIsAdding(false)} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setCondition('ABOVE')}
                    className={cn(
                      "flex-1 min-w-[100px] py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                      condition === 'ABOVE' ? "bg-brand-green text-black" : "bg-gray-800 text-gray-400"
                    )}
                  >
                    Price Crosses Over
                  </button>
                  <button 
                    onClick={() => setCondition('BELOW')}
                    className={cn(
                      "flex-1 min-w-[100px] py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                      condition === 'BELOW' ? "bg-brand-red text-black" : "bg-gray-800 text-gray-400"
                    )}
                  >
                    Price Crosses Under
                  </button>
                  <button 
                    onClick={() => setCondition('SIGNAL')}
                    className={cn(
                      "flex-1 min-w-[100px] py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                      condition === 'SIGNAL' ? "bg-brand-blue text-white" : "bg-gray-800 text-gray-400"
                    )}
                  >
                    AI Signal Trigger
                  </button>
                </div>

                {condition === 'SIGNAL' ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(['STRONG_BUY', 'BUY', 'SELL', 'STRONG_SELL'] as const).map((sig) => (
                      <button
                        key={sig}
                        onClick={() => setSelectedSignal(sig)}
                        className={cn(
                          "py-2 rounded-lg text-[9px] font-black uppercase border transition-all",
                          selectedSignal === sig 
                            ? "bg-brand-surface border-brand-yellow text-brand-yellow" 
                            : "bg-black border-brand-border text-gray-600 hover:text-gray-400"
                        )}
                      >
                        {sig.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="number"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      className="w-full bg-black border border-brand-border rounded-xl px-4 py-3 text-lg font-black font-mono focus:border-brand-yellow outline-none"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500">PHP</span>
                  </div>
                )}

                <button 
                  onClick={handleAdd}
                  disabled={condition !== 'SIGNAL' && (!targetPrice || parseFloat(targetPrice) <= 0)}
                  className="w-full bg-brand-yellow hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl text-xs uppercase tracking-tighter transition-all"
                >
                  Create {symbol} Alert
                </button>
              </div>
            </motion.div>
          ) : filteredAlerts.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-gray-600">
              <Bell className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between group transition-all",
                    alert.isActive ? "bg-brand-surface border-brand-border" : "bg-black border-red-900/20 opacity-50 grayscale"
                  )}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {alert.condition === 'SIGNAL' ? (
                        <Zap className="w-3 h-3 text-brand-green fill-current" />
                      ) : alert.condition === 'ABOVE' ? (
                        <CheckCircle2 className="w-3 h-3 text-brand-green" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-brand-red" />
                      )}
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                        {alert.symbol} {alert.condition === 'SIGNAL' ? 'AI Market Intelligence' : alert.condition === 'ABOVE' ? 'Threshold High' : 'Threshold Low'}
                      </span>
                    </div>
                    <span className="text-sm font-mono font-bold text-white italic">
                      {alert.condition === 'SIGNAL' 
                        ? (alert.targetSignal ? `WAITING FOR ${alert.targetSignal.replace('_', ' ')}` : 'WAITING FOR ENTRY') 
                        : `₱${alert.targetPrice?.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onToggleAlert(alert.id)}
                      className={cn(
                        "text-[9px] font-black uppercase px-2 py-1 rounded transition-colors",
                        alert.isActive ? "text-brand-green hover:bg-brand-green/10" : "text-gray-500 hover:bg-gray-800"
                      )}
                    >
                      {alert.isActive ? 'Active' : 'Disabled'}
                    </button>
                    <button 
                      onClick={() => onRemoveAlert(alert.id)}
                      className="p-2 text-gray-600 hover:text-brand-red transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-gray-900/30 border-t border-brand-border space-y-3">
        {notifPermission !== 'granted' && (
          <button 
            onClick={requestPermission}
            className="w-full py-2 bg-brand-blue/10 border border-brand-blue/30 rounded-lg text-brand-blue text-[9px] font-black uppercase tracking-widest hover:bg-brand-blue/20 transition-all flex items-center justify-center gap-2"
          >
            <Bell className="w-3 h-3" />
            Enable Browser Notifications
          </button>
        )}
        <p className="text-[9px] text-gray-600 text-center font-medium leading-relaxed uppercase tracking-tight">
          Alerts use browser notifications and persistent state. Ensure permissions are granted.
        </p>
      </div>
    </div>
  );
}
