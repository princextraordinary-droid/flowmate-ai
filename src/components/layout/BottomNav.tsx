import React from 'react';
import { Layout, Brain, Clock, Zap, FileText } from 'lucide-react';

type View = 'dashboard' | 'ai' | 'focus' | 'checkin' | 'notes';

interface BottomNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const navItems: { id: View; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: Layout, label: 'Dashboard' },
  { id: 'ai', icon: Brain, label: 'AI' },
  { id: 'notes', icon: FileText, label: 'Notes' },
  { id: 'focus', icon: Clock, label: 'Focus' },
  { id: 'checkin', icon: Zap, label: 'Check-in' },
];

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange }) => {
  return (
    <nav className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 glass-dark px-2 sm:px-4 py-2 sm:py-3 rounded-full flex gap-1 sm:gap-2 shadow-elevated z-50 max-w-[calc(100vw-24px)]">
      {navItems.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onViewChange(id)}
          aria-label={label}
          className={`p-3 sm:p-4 rounded-full transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center ${
            currentView === id
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20 active:bg-secondary/40'
          }`}
        >
          <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
