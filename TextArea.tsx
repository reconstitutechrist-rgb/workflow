import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-gray-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative group">
        <textarea
          className={`
            w-full px-4 py-3
            bg-gray-800/50 backdrop-blur-sm
            border border-white/10
            rounded-xl
            text-white placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
            hover:border-white/20
            transition-all duration-300
            resize-none
            ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''}
            ${className}
          `}
          {...props}
        />
        {/* Decorative gradient border on focus */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/0 via-primary-500/20 to-accent-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-400">
          {helperText}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-400 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextArea;
