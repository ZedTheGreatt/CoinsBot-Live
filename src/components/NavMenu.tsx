import { motion, AnimatePresence } from 'motion/react';
import { X, LayoutGrid, Briefcase, BarChart3, Settings, Shield, HelpCircle, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MENU_ITEMS = [
  { icon: LayoutGrid, label: 'Market Dashboard', active: true },
  { icon: Briefcase, label: 'My Portfolio', active: false },
  { icon: BarChart3, label: 'Trade History', active: false },
  { icon: Settings, label: 'Bot Settings', active: false },
];

const SECONDARY_ITEMS = [
  { icon: Shield, label: 'Security' },
  { icon: HelpCircle, label: 'Help & Support' },
  { icon: LogOut, label: 'Logout' },
];

export default function NavMenu({ isOpen, onClose }: NavMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110]"
          />
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-72 sm:w-80 bg-brand-bg border-r border-brand-border z-[120] flex flex-col shadow-2xl"
          >
            <div className="p-6 border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-black" />
                 </div>
                 <span className="text-lg font-black italic tracking-tighter text-white">Menu</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">Navigation</p>
                {MENU_ITEMS.map((item) => (
                  <button
                    key={item.label}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group outline-none",
                      item.active 
                        ? "bg-brand-green/10 text-brand-green border border-brand-green/20" 
                        : "hover:bg-brand-surface text-gray-400 hover:text-white"
                    )}
                  >
                    <item.icon className={cn("w-5 h-5", item.active ? "text-brand-green" : "text-gray-500 group-hover:text-white")} />
                    <span className="font-black text-sm uppercase tracking-tight">{item.label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <p className="px-3 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em] mb-4">Account</p>
                {SECONDARY_ITEMS.map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-brand-surface text-gray-500 hover:text-white transition-all group outline-none"
                  >
                    <item.icon className="w-4 h-4 text-gray-600 group-hover:text-white" />
                    <span className="font-bold text-xs uppercase tracking-wide">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-brand-surface/30 border-t border-brand-border">
               <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/40 border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-black text-white">
                     GZ
                  </div>
                  <div className="flex flex-col">
                     <span className="text-xs font-black text-white leading-none">Zedrick Garcia</span>
                     <span className="text-[10px] text-brand-green font-bold uppercase mt-1">Pro Account</span>
                  </div>
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
