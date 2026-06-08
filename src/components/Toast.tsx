import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>>;
}

export default function Toast({ toasts, setToasts }: ToastProps) {
  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const iconMap = {
            success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
            error: <XCircle className="w-5 h-5 text-rose-500" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
            info: <Info className="w-5 h-5 text-indigo-400" />
          };

          const bgMap = {
            success: 'bg-zinc-900/95 border border-emerald-500/30 text-emerald-100 shadow-lg shadow-emerald-500/5',
            error: 'bg-zinc-900/95 border border-rose-500/30 text-rose-100 shadow-lg shadow-rose-500/5',
            warning: 'bg-zinc-900/95 border border-amber-500/30 text-amber-100 shadow-lg shadow-amber-500/5',
            info: 'bg-zinc-900/95 border border-indigo-500/30 text-indigo-100 shadow-lg shadow-indigo-500/5'
          };

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`p-4 rounded-xl backdrop-blur-md flex items-start gap-3 pointer-events-auto ${bgMap[toast.type]}`}
            >
              <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>
              <p className="text-sm font-medium flex-grow">{toast.text}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded-lg hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
