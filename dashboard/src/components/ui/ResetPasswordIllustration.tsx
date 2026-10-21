export default function ResetPasswordIllustration() {
  return (
    <div className="relative w-full max-w-[340px] h-[220px] flex items-center justify-center select-none">
      <svg
        viewBox="0 0 340 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        <defs>
          <linearGradient id="envelopeBg" x1="50" y1="90" x2="230" y2="210" gradientUnits="userSpaceOnUse">
            <stop stopColor="#DBEAFE" />
            <stop offset="1" stopColor="#BFDBFE" />
          </linearGradient>
          <linearGradient id="envelopeFlap" x1="70" y1="80" x2="210" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#93C5FD" />
            <stop offset="1" stopColor="#60A5FA" />
          </linearGradient>
          <linearGradient id="docShadow" x1="120" y1="40" x2="210" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#F1F5F9" />
          </linearGradient>
          <linearGradient id="badgeGlow" x1="180" y1="130" x2="240" y2="190" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
          <filter id="softShadow" x="80" y="20" width="160" height="180" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#1e3a8a" floodOpacity="0.12" />
          </filter>
        </defs>

        {/* Ambient background glow */}
        <circle cx="160" cy="120" r="90" fill="#EFF6FF" />

        {/* Dotted motion trail swooping up to the top right */}
        <path
          d="M 170 120 C 210 115, 260 95, 275 60"
          stroke="#93C5FD"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* Small floating paper plane / arrow at the end of the trail */}
        <path
          d="M 285 52 L 268 56 L 274 65 Z"
          fill="#3B82F6"
        />

        {/* Subtle decorative stars / sparkle dots */}
        <circle cx="95" cy="55" r="2.5" fill="#93C5FD" />
        <circle cx="280" cy="100" r="2" fill="#60A5FA" />
        <circle cx="80" cy="130" r="2" fill="#BFDBFE" />
        <path d="M 68 85 L 72 87 L 70 91 L 68 87 Z" fill="#93C5FD" opacity="0.8" />

        {/* Open Envelope Back Shell */}
        <path
          d="M 60 115 L 140 68 L 220 115 L 220 190 C 220 196 215 200 209 200 L 71 200 C 65 200 60 196 60 190 Z"
          fill="url(#envelopeBg)"
        />

        {/* Floating Paper Document (Inside Envelope emerging upwards) */}
        <g filter="url(#softShadow)">
          <rect
            x="95"
            y="42"
            width="90"
            height="115"
            rx="8"
            fill="url(#docShadow)"
            stroke="#DBEAFE"
            strokeWidth="1.5"
            transform="rotate(-5 140 100)"
          />
          {/* Document mock text lines */}
          <rect x="110" y="58" width="46" height="4.5" rx="2" fill="#93C5FD" transform="rotate(-5 140 100)" />
          <rect x="110" y="70" width="58" height="4" rx="2" fill="#CBD5E1" transform="rotate(-5 140 100)" />
          <rect x="110" y="80" width="52" height="4" rx="2" fill="#CBD5E1" transform="rotate(-5 140 100)" />
          <rect x="110" y="90" width="38" height="4" rx="2" fill="#CBD5E1" transform="rotate(-5 140 100)" />
        </g>

        {/* Envelope Front Left & Right flaps */}
        <path
          d="M 60 198 L 140 142 L 60 115 Z"
          fill="#BFDBFE"
          opacity="0.95"
        />
        <path
          d="M 220 198 L 140 142 L 220 115 Z"
          fill="#93C5FD"
          opacity="0.9"
        />

        {/* Envelope Bottom Front Fold */}
        <path
          d="M 60 200 L 140 138 L 220 200 C 220 200 216 200 210 200 L 70 200 C 64 200 60 200 60 200 Z"
          fill="url(#envelopeFlap)"
        />

        {/* Blue Lock Badge in foreground */}
        <g transform="translate(185, 140)">
          {/* Badge circular background with soft shadow */}
          <circle cx="20" cy="20" r="22" fill="#FFFFFF" />
          <circle cx="20" cy="20" r="19" fill="url(#badgeGlow)" />
          
          {/* Shackle */}
          <path
            d="M 15 15 V 12 C 15 9.24 17.24 7 20 7 C 22.76 7 25 9.24 25 12 V 15"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Lock Body */}
          <rect
            x="12"
            y="14"
            width="16"
            height="13"
            rx="3"
            fill="#FFFFFF"
          />
          {/* Keyhole */}
          <circle cx="20" cy="19.5" r="1.6" fill="#1D4ED8" />
          <path d="M 20 21 V 23.5" stroke="#1D4ED8" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}
