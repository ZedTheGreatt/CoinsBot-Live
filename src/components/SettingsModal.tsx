import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Key, Shield, Info, ExternalLink, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [groqKey, setGroqKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedGroq = localStorage.getItem('GROQ_API_KEY') || '';
    setGroqKey(savedGroq);
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('GROQ_API_KEY', groqKey.trim());
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
      window.location.reload();
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-brand-surface border border-brand-border rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-blue/10 rounded-lg">
                  <Shield className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter">Neural Pulse Settings</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-60">AI Configuration & Safety</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-xl text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Instructions */}
              <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      Neural Pulse uses <span className="text-brand-green font-bold">Groq (Llama 3)</span> for high-speed market analysis. 
                      Your API key is stored <span className="text-white underline decoration-brand-blue/30 underline-offset-2">locally in your browser</span> and used only for signal generation.
                    </p>
                    <div className="flex flex-wrap gap-4">
                      <a 
                        href="https://console.groq.com/keys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-brand-green hover:underline tracking-widest"
                      >
                        Get Free Groq Key <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Key Inputs */}
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">
                    <Key className="w-3 h-3 text-brand-green" />
                    Groq API Key (Llama 3.3 70B)
                  </label>
                  <div className="relative group">
                    <input 
                      type="password"
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      placeholder="Enter Groq Key..."
                      className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm font-mono text-gray-200 outline-none focus:border-brand-green/50 transition-all placeholder:text-gray-700"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                      {groqKey && <div className="w-2 h-2 rounded-full bg-brand-green shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-400/70 font-medium leading-tight">
                    <span className="text-amber-500 font-black uppercase tracking-tighter block mb-1">Local Encryption Warning</span>
                    This key is stored in your browser's local storage. Groq is preferred for its high rate limits and speed.
                  </p>
                </div>

                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-black uppercase text-red-500 tracking-widest flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    Key Status
                  </h4>
                  <ul className="space-y-1.5">
                    <li className="text-[10px] text-gray-400 leading-tight">
                      <span className="text-white font-bold">Groq Advantage:</span> Llama-3-70B offers significantly higher tokens-per-second and virtually unlimited local use for free-tier users.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-6 border-t border-brand-border bg-white/5 flex flex-col sm:flex-row gap-3">
              <button 
                onClick={handleSave}
                disabled={isSaved}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all",
                  isSaved 
                    ? "bg-brand-green text-black" 
                    : "bg-white text-black hover:bg-gray-200 active:scale-95"
                )}
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Neural Pulse Updated
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </button>
              <button 
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 font-black uppercase text-xs tracking-widest transition-all"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
