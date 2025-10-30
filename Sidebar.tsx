
import React, { ReactNode } from 'react';

interface SidebarProps {
  children: ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
  return (
    <aside className="fixed top-0 left-0 h-screen w-16 md:w-64 bg-gradient-to-b from-gray-900/95 to-gray-900/90 backdrop-blur-xl border-r border-white/10 flex flex-col z-10 transition-all duration-300 shadow-2xl">
      <ul className="flex-1 mt-6 px-2">{children}</ul>
      {/* Decorative gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-primary-600/10 to-transparent pointer-events-none"></div>
    </aside>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  onClick?: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ icon, text, active, onClick }) => {
  return (
    <li
      onClick={onClick}
      className={`
        relative flex items-center py-3.5 px-4 my-1.5 font-medium rounded-xl cursor-pointer
        transition-all duration-300 group overflow-hidden
        ${active
          ? 'bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white shadow-lg shadow-primary-500/50 scale-[1.02]'
          : 'hover:bg-white/5 text-gray-400 hover:text-white hover:scale-[1.02]'
        }
    `}
    >
      {/* Glow effect on hover */}
      {!active && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/10 to-accent-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      )}

      {/* Icon with animation */}
      <div className={`relative z-10 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        {icon}
      </div>

      {/* Text with slide animation */}
      <span className="relative z-10 w-52 ml-3 hidden md:inline transition-all duration-300">{text}</span>

      {/* Active indicator */}
      {active && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-lg shadow-white/50"></div>
      )}
    </li>
  );
};
