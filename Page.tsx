
import React from 'react';

interface PageProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const Page: React.FC<PageProps> = ({ title, description, children }) => {
  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <header className="mb-10">
        <h1 className="text-5xl font-black bg-gradient-to-r from-white via-primary-200 to-accent-300 bg-clip-text text-transparent tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-lg text-gray-300 leading-relaxed">{description}</p>
        {/* Decorative line */}
        <div className="mt-4 h-1 w-20 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"></div>
      </header>
      <div className="space-y-8">
        {children}
      </div>
    </div>
  );
};

export default Page;
