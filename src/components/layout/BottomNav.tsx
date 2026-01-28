import React from 'react';
import { Layout, Brain, Clock, Zap } from 'lucide-react';

type View = 'dashboard' | 'ai' | 'focus' | 'checkin';

interface BottomNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const navItems: { id: View; icon: React.ElementType; label: string }[] = [
  { id: 'dashboard', icon: Layout, label: 'Dashboard' },
  { id: 'ai', icon: Brain, label: 'AI' },
  { id: 'focus', icon: Clock, label: 'Focus' },
  { id: 'checkin', icon: Zap, label: 'Check-in' },
];

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange }) => {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 glass-dark px-4 py-3 rounded-pill flex gap-2 shadow-elevated z-50">
      {navItems.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onViewChange(id)}
          aria-label={label}
          className={`p-4 rounded-pill transition-all duration-300 ${
            currentView === id
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/20'
          }`}
        >
          <Icon size={22} />
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
