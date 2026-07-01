import React from 'react';

interface LogoProps {
  iconSize?: number;
  showWordmark?: boolean;
  isDark?: boolean;
  className?: string;
}

/**
 * Highly polished modern geometric icon representation of "OpenComm".
 * It features a sleek talk-bubble intersecting with network nodes, in a sharp indigo/purple brand gradient.
 */
export const OpenCommIcon: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 44 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 hover:scale-105 ${className}`}
    >
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

/**
 * High-contrast, typographic SVG wordmark for "OpenComm".
 * Style-neutral and theme-aware through Tailwind CSS fill classes.
 */
export const OpenCommWordmarkSVG: React.FC<{ className?: string; fillClass?: string }> = ({
  className = '',
  fillClass = 'fill-gray-900 dark:fill-white'
}) => {
  return (
    <svg
      height="26"
      viewBox="0 0 150 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-colors duration-300 ${className}`}
    >
      <text
        x="0"
        y="21"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontWeight="800"
        fontSize="21"
        letterSpacing="-0.6px"
        className={`${fillClass} transition-colors duration-300`}
      >
        OpenComm
      </text>
    </svg>
  );
};

export const OpenCommLogo: React.FC<LogoProps & { fillClass?: string }> = ({
  iconSize = 44,
  showWordmark = true,
  className = '',
  fillClass
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <OpenCommIcon size={iconSize} />
      {showWordmark && (
        <OpenCommWordmarkSVG fillClass={fillClass} />
      )}
    </div>
  );
};

export default OpenCommLogo;
