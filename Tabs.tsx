
import React, { useState, ReactNode } from 'react';

interface TabsProps {
  tabs: { name: string; content: ReactNode }[];
}

const Tabs: React.FC<TabsProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="relative border-b border-white/10 backdrop-blur-sm">
        <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab, index) => (
            <button
              key={tab.name}
              onClick={() => setActiveTab(index)}
              className={`
                relative whitespace-nowrap py-3 px-5 font-semibold text-sm rounded-t-xl
                transition-all duration-300 group
                ${activeTab === index
                  ? 'text-white bg-gradient-to-b from-primary-600/20 to-transparent border-b-2 border-primary-500'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              {/* Active glow */}
              {activeTab === index && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/20 to-primary-500/0 rounded-t-xl"></div>
              )}

              {/* Text */}
              <span className="relative z-10">{tab.name}</span>

              {/* Hover indicator */}
              {activeTab !== index && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-primary-500 to-accent-500 group-hover:w-full transition-all duration-300"></div>
              )}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-8 animate-fade-in">
        {tabs[activeTab].content}
      </div>
    </div>
  );
};

export default Tabs;
