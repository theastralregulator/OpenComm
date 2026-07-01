import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import darkWordmark from '@/assets/opencomm-dark-wordmark.png';
import lightWordmark from '@/assets/opencomm-light-wordmark.png';

interface LogoProps {
  iconSize?: number;
  showWordmark?: boolean;
  showIcon?: boolean;
  className?: string;
  fillClass?: string;
}

/**
 * Highly polished modern geometric icon representation of "OpenComm".
 * It features a sleek talk-bubble intersecting with network nodes, in a sharp indigo/purple brand gradient.
 */
export const OpenCommIcon: React.FC<{ className?: string; size?: number; style?: React.CSSProperties }> = ({ 
  className = '', 
  size = 44,
  style
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 hover:scale-105 ${className}`}
      style={style}
      aria-label="OpenComm Logo"
      role="img"
    >
      <title>OpenComm Logo</title>
      <defs>
        <linearGradient id="oc-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" /> {/* Indigo */}
          <stop offset="50%" stopColor="#8B5CF6" /> {/* Violet */}
          <stop offset="100%" stopColor="#EC4899" /> {/* Pink */}
        </linearGradient>
      </defs>
      {/* Sleek Rounded Hexagon / Rounded Shield Container */}
      <rect x="5" y="5" width="90" height="90" rx="24" fill="url(#oc-gradient)" />
      
      {/* Communication Wave & Speech Loop */}
      <path
        d="M50 28C36.7 28 26 36.5 26 47C26 51.5 28.2 55.6 32 58.7V72L45 66.5C46.6 66.8 48.3 67 50 67C63.3 67 74 58.5 74 47C74 35.5 63.3 28 50 28ZM50 61C40.6 61 33 54.7 33 47C33 39.3 40.6 33 50 33C59.4 33 67 39.3 67 47C67 54.7 59.4 61 50 61Z"
        fill="#FFFFFF"
      />
      {/* Verified Core Dot */}
      <circle cx="50" cy="47" r="6" fill="#FFFFFF" />
    </svg>
  );
};

export const OpenCommLogo: React.FC<LogoProps> = ({
  iconSize,
  showWordmark = true,
  showIcon = true,
  className = '',
}) => {
  let theme = 'light';
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch (e) {
    if (typeof document !== 'undefined') {
      theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
  }

  // Determine the wordmark source based on the active theme
  const wordmarkSrc = theme === 'dark' ? lightWordmark : darkWordmark;

  // Sizing details:
  // Desktop: 44px to 48px
  // Tablet: slightly reduced (approx 40px)
  // Mobile: 36px to 40px
  const sizeStyles = iconSize ? { width: `${iconSize}px`, height: `${iconSize}px` } : undefined;
  const iconSizeClass = iconSize ? '' : 'w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 lg:w-12 lg:h-12';

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 ${className}`}>
      {showIcon && (
        <OpenCommIcon className={iconSizeClass} size={iconSize || 44} style={sizeStyles} />
      )}
      {showWordmark && (
        <img
          src={wordmarkSrc}
          alt="OpenComm Wordmark"
          className="block h-7 sm:h-9 md:h-10 lg:h-[44px] w-auto object-contain select-none transition-opacity duration-300"
          loading="eager"
        />
      )}
    </div>
  );
};

export default OpenCommLogo;

