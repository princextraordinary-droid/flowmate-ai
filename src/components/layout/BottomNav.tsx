import React from 'react';
import { useState } from 'react';
import { Layout, Brain, Clock, Zap, FileText, Menu, X } from 'lucide-react';

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
  const [isOpen, setIsOpen] = useState(false);

  const handleNavClick = (view: View) => {
    onViewChange(view);
    setIsOpen(false);
  };

  return (
    <nav className="fixed bottom-4 right-4 z-50">
      {/* Expanded menu */}
      <div 
        className={`absolute bottom-16 right-0 flex flex-col gap-2 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => handleNavClick(id)}
            aria-label={label}
            className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 min-h-[48px] shadow-elevated ${
              currentView === id
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'glass-dark text-foreground hover:bg-secondary/40'
            }`}
          >
            <Icon size={20} />
            <span className="text-sm font-medium whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>

      {/* FAB toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-elevated transition-all duration-300 ${
          isOpen 
            ? 'bg-secondary text-secondary-foreground rotate-180' 
            : 'bg-primary text-primary-foreground shadow-glow'
        }`}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
    </nav>
  );
};

export default BottomNav;
