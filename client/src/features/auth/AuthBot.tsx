export type BotMode = 'idle' | 'peek' | 'cover';

const AuthBot = ({ mode }: { mode: BotMode }) => {
  const cover = mode === 'cover';
  const peek = mode === 'peek';
  return (
    <svg className="bot-svg" width="116" height="120" viewBox="0 0 120 124" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {}
      <line x1="60" y1="30" x2="60" y2="16" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="13" r="4" fill="#a5b4fc" />
      {}
      <rect x="28" y="30" width="64" height="56" rx="18" fill="url(#botG)" stroke="#312e81" strokeWidth="1.5" />
      {}
      <rect x="37" y="40" width="46" height="36" rx="12" fill="#0b0b14" />
      {}
      <g className="bot-eyes">
        <circle cx="51" cy="57" r="6.5" fill="#e0e7ff" />
        <circle cx="69" cy="57" r="6.5" fill="#e0e7ff" />
        <g className={`bot-pupils ${peek ? 'is-peek' : ''}`}>
          <circle cx="51" cy="57" r="3" fill="#1e1b4b" />
          <circle cx="69" cy="57" r="3" fill="#1e1b4b" />
        </g>
      </g>
      {}
      <path d="M52 69 q8 6 16 0" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {}
      <rect x="45" y="88" width="30" height="13" rx="6.5" fill="#1e1b4b" />
      {}
      <g className={`bot-hand bot-hand-l ${cover ? 'is-cover' : ''}`}>
        <circle cx="34" cy="92" r="9" fill="url(#botG)" stroke="#312e81" strokeWidth="1.5" />
      </g>
      <g className={`bot-hand bot-hand-r ${cover ? 'is-cover' : ''}`}>
        <circle cx="86" cy="92" r="9" fill="url(#botG)" stroke="#312e81" strokeWidth="1.5" />
      </g>
      <defs>
        <linearGradient id="botG" x1="28" y1="30" x2="92" y2="86" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default AuthBot;
