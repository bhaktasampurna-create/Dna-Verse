import React from 'react';

interface EcoTraceLogoProps {
  size?: number;
  variant?: 'dark' | 'light';
  showWordmark?: boolean;
}

export const EcoTraceLogo: React.FC<EcoTraceLogoProps> = ({
  size = 34,
  variant = 'dark',
  showWordmark = true,
}) => {
  const wordmarkColor = variant === 'light' ? 'text-white' : 'text-[#123B2A]';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Circular biodiversity ecosystem ring */}
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke="#16A6A1"
          strokeWidth="2"
          strokeDasharray="82 14"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="14.5" fill={variant === 'light' ? '#123B2A' : '#EAF4EF'} />

        {/* Botanical leaf silhouette */}
        <path
          d="M27.5 11.5C21 11.8 15.8 15.6 13.8 21.8C13.2 23.6 13.3 25.5 13.9 27.2C16.2 27.7 18.7 27.2 20.9 25.8C25.6 22.8 27.9 17.5 27.5 11.5Z"
          fill="#21865B"
          fillOpacity="0.22"
          stroke="#21865B"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />

        {/* Intertwined DNA double helix */}
        <path
          d="M14.5 13.5C14.5 16.5 25.5 17.5 25.5 20.5C25.5 23.5 14.5 24.5 14.5 27.5"
          stroke={variant === 'light' ? '#FFFFFF' : '#123B2A'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M25.5 13.5C25.5 16.5 14.5 17.5 14.5 20.5C14.5 23.5 25.5 24.5 25.5 27.5"
          stroke="#16A6A1"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line x1="16.5" y1="15.5" x2="23.5" y2="15.5" stroke="#21865B" strokeWidth="1.4" strokeLinecap="round" />
        <line x1="16.5" y1="25.5" x2="23.5" y2="25.5" stroke="#21865B" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {showWordmark && (
        <span className={`font-display text-lg font-bold tracking-tight ${wordmarkColor}`}>
          EcoTrace
        </span>
      )}
    </span>
  );
};
