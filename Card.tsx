
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', hover = false, glow = false }) => {
  const baseClasses = 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl transition-all duration-300';

  const hoverClasses = hover
    ? 'hover:scale-[1.01] hover:border-white/20 hover:shadow-2xl hover:shadow-primary-500/10 cursor-pointer'
    : '';

  const glowClasses = glow
    ? 'shadow-2xl shadow-primary-500/20 ring-1 ring-primary-500/20'
    : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${glowClasses} ${className} relative overflow-hidden group`}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Top-right glow effect */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
    </div>
  );
};

export default Card;
