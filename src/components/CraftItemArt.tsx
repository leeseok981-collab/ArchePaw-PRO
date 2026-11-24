import React from 'react';

interface CraftItemArtProps {
  itemKey: string;
  accentHex?: string;
  size?: number;
  className?: string;
}

/**
 * Richly shaded 3D-style vector item artwork for the Crafting ("제작") Workbench,
 * Inspector preview, and Required Materials ("필요 사항") rows.
 */
export const CraftItemArt: React.FC<CraftItemArtProps> = ({
  itemKey,
  accentHex = '#f97316',
  size = 48,
  className = '',
}) => {
  const uid = React.useId().replace(/:/g, '');

  // Raw Material Icons (mat:wood, mat:stone, mat:iron, mat:crystal, mat:leather, mat:fang, mat:essence)
  if (itemKey === 'mat:wood') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`w1-${uid}`} x1="8" y1="22" x2="54" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9c6b3f" />
            <stop offset="50%" stopColor="#724826" />
            <stop offset="100%" stopColor="#4a2d15" />
          </linearGradient>
          <linearGradient id={`w2-${uid}`} x1="12" y1="14" x2="50" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#b57d4a" />
            <stop offset="100%" stopColor="#653f20" />
          </linearGradient>
        </defs>
        {/* Back log */}
        <g transform="rotate(-14 32 32)">
          <rect x="10" y="16" width="38" height="14" rx="7" fill={`url(#w2-${uid})`} stroke="#3a2210" strokeWidth="1.5" />
          <ellipse cx="17" cy="23" rx="5.5" ry="6.5" fill="#d9ad7c" stroke="#5b381b" strokeWidth="1.4" />
          <ellipse cx="17" cy="23" rx="2.6" ry="3.2" fill="none" stroke="#8a5a32" strokeWidth="1.2" />
        </g>
        {/* Front log */}
        <g transform="rotate(8 34 40)">
          <rect x="14" y="30" width="40" height="16" rx="8" fill={`url(#w1-${uid})`} stroke="#361f0e" strokeWidth="1.6" />
          <path d="M26 34 L48 34 M28 41 L46 41" stroke="#3c2310" strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />
          <ellipse cx="22" cy="38" rx="6" ry="7.4" fill="#e2ba8c" stroke="#5a361a" strokeWidth="1.5" />
          <ellipse cx="22" cy="38" rx="3" ry="3.8" fill="none" stroke="#8c5a30" strokeWidth="1.3" />
          <circle cx="22" cy="38" r="1.1" fill="#6d4322" />
        </g>
      </svg>
    );
  }

  if (itemKey === 'mat:stone') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`st-${uid}`} x1="12" y1="12" x2="54" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="48%" stopColor="#7b8794" />
            <stop offset="100%" stopColor="#3e4752" />
          </linearGradient>
        </defs>
        <polygon points="18,16 38,11 53,24 50,46 30,54 12,44 10,27" fill={`url(#st-${uid})`} stroke="#252c35" strokeWidth="1.8" />
        <polygon points="18,16 38,11 42,27 25,31" fill="#e2e8f0" opacity="0.42" />
        <polygon points="42,27 53,24 50,46 36,42" fill="#1e242c" opacity="0.35" />
        <path d="M25 31 L30 54 M25 31 L42 27" stroke="#1f2730" strokeWidth="1.3" opacity="0.45" />
      </svg>
    );
  }

  if (itemKey === 'mat:iron') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`ir-${uid}`} x1="10" y1="16" x2="54" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="45%" stopColor="#6482a3" />
            <stop offset="100%" stopColor="#2c3e55" />
          </linearGradient>
        </defs>
        <polygon points="16,24 38,16 54,28 48,46 22,50 10,38" fill="#475569" stroke="#1e293b" strokeWidth="1.8" />
        <polygon points="20,25 38,19 50,29 34,37" fill={`url(#ir-${uid})`} />
        <polygon points="15,36 28,31 35,43 22,47" fill="#93c5fd" opacity="0.7" />
        <polygon points="37,33 48,29 45,42 36,44" fill="#60a5fa" opacity="0.55" />
      </svg>
    );
  }

  if (itemKey === 'mat:crystal') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`cr-${uid}`} x1="20" y1="8" x2="46" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#cffafe" />
            <stop offset="40%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0e7490" />
          </linearGradient>
        </defs>
        <polygon points="32,6 45,24 40,56 24,56 19,24" fill={`url(#cr-${uid})`} stroke="#083344" strokeWidth="1.6" />
        <polygon points="32,6 38,24 32,56 24,24" fill="#ecfeff" opacity="0.45" />
        <polygon points="14,24 22,34 20,54 11,48" fill="#38bdf8" stroke="#083344" strokeWidth="1.4" />
        <polygon points="50,22 54,46 44,54 42,32" fill="#06b6d4" stroke="#083344" strokeWidth="1.4" />
      </svg>
    );
  }

  if (itemKey === 'mat:leather') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`le-${uid}`} x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d99252" />
            <stop offset="55%" stopColor="#9c5828" />
            <stop offset="100%" stopColor="#5e3113" />
          </linearGradient>
        </defs>
        <path
          d="M18 12 C26 16 38 16 46 12 L52 22 C47 28 47 36 52 44 L44 54 C36 49 28 49 20 54 L12 44 C17 36 17 28 12 22 Z"
          fill={`url(#le-${uid})`}
          stroke="#3b1d09"
          strokeWidth="1.8"
        />
        <path d="M22 22 C28 25 36 25 42 22" stroke="#f5c690" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        <path d="M22 42 C28 39 36 39 42 42" stroke="#3b1d09" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
      </svg>
    );
  }

  if (itemKey === 'mat:fang') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`fg-${uid}`} x1="18" y1="10" x2="46" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="65%" stopColor="#e7d7b8" />
            <stop offset="100%" stopColor="#a89069" />
          </linearGradient>
        </defs>
        <path
          d="M22 10 C35 12 48 26 46 54 C35 45 27 34 18 22 C16 17 17 11 22 10 Z"
          fill={`url(#fg-${uid})`}
          stroke="#473a25"
          strokeWidth="1.8"
        />
        <path d="M24 14 C33 19 40 31 43 47" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
      </svg>
    );
  }

  if (itemKey === 'mat:essence') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <radialGradient id={`es-${uid}`} cx="42%" cy="36%" r="58%">
            <stop offset="0%" stopColor="#d1fae5" />
            <stop offset="45%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#065f46" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="20" fill={`url(#es-${uid})`} stroke="#064e3b" strokeWidth="1.8" />
        <ellipse cx="26" cy="24" rx="6" ry="4" transform="rotate(-24 26 24)" fill="#ffffff" opacity="0.6" />
        <path d="M32 10 L35 18 L32 22 L29 18 Z" fill="#a7f3d0" opacity="0.85" />
      </svg>
    );
  }

  // Potion Consumable
  if (itemKey === 'potion') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`pt-${uid}`} x1="18" y1="24" x2="46" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="48%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#14532d" />
          </linearGradient>
        </defs>
        <rect x="26" y="8" width="12" height="7" rx="2" fill="#9a6438" stroke="#452711" strokeWidth="1.5" />
        <rect x="24" y="14" width="16" height="5" rx="2" fill="#cbd5e1" stroke="#334155" strokeWidth="1.4" />
        <path
          d="M26 19 L38 19 L40 27 C47 31 50 38 48 46 C46 53 40 56 32 56 C24 56 18 53 16 46 C14 38 17 31 24 27 Z"
          fill="#1e293b"
          stroke="#94a3b8"
          strokeWidth="1.8"
        />
        <path
          d="M20 38 C26 35 38 41 44 37 C46 43 45 52 32 53 C19 52 18 43 20 38 Z"
          fill={`url(#pt-${uid})`}
        />
        <circle cx="27" cy="44" r="2.2" fill="#dcfce7" opacity="0.8" />
        <circle cx="35" cy="47" r="1.5" fill="#dcfce7" opacity="0.7" />
        <path d="M22 33 C20 38 20 44 22 48" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.45" />
      </svg>
    );
  }

  // Boots Upgrade
  if (itemKey === 'boots') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`bt-${uid}`} x1="16" y1="14" x2="50" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#d99455" />
            <stop offset="55%" stopColor="#8f4d20" />
            <stop offset="100%" stopColor="#4c260d" />
          </linearGradient>
        </defs>
        <path
          d="M20 14 L38 14 L37 36 L49 40 C53 42 54 47 52 51 L18 51 L17 36 Z"
          fill={`url(#bt-${uid})`}
          stroke="#2d1506"
          strokeWidth="1.8"
        />
        <rect x="18" y="14" width="21" height="7" rx="2" fill="#e6b43c" stroke="#5b3b09" strokeWidth="1.4" />
        <rect x="16" y="48" width="38" height="6" rx="2.5" fill="#27272a" stroke="#09090b" strokeWidth="1.4" />
        <path d="M22 28 L35 28 M22 34 L34 34" stroke="#f6c78c" strokeWidth="1.6" strokeLinecap="round" opacity="0.65" />
      </svg>
    );
  }

  // Armor artwork (armor:*)
  if (itemKey.startsWith('armor:')) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`ar-${uid}`} x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={accentHex} />
            <stop offset="58%" stopColor="#334155" />
            <stop offset="100%" stopColor="#141923" />
          </linearGradient>
        </defs>
        {/* Shoulders + Chestplate */}
        <path
          d="M22 12 L32 18 L42 12 L54 20 L48 33 L44 31 L46 53 L32 56 L18 53 L20 31 L16 33 L10 20 Z"
          fill={`url(#ar-${uid})`}
          stroke="#0f172a"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Pauldron trim */}
        <path d="M12 21 L22 14 L25 24 L16 29 Z" fill={accentHex} opacity="0.72" />
        <path d="M52 21 L42 14 L39 24 L48 29 Z" fill={accentHex} opacity="0.55" />
        {/* Center emblem */}
        <polygon points="32,22 38,31 32,42 26,31" fill={accentHex} stroke="#f8fafc" strokeWidth="1.2" opacity="0.92" />
        {/* Waist belt */}
        <rect x="19" y="43" width="26" height="5" rx="1.5" fill="#1e242c" stroke="#e6b43c" strokeWidth="1.1" />
        <rect x="29" y="42.5" width="6" height="6" rx="1" fill="#e6b43c" />
      </svg>
    );
  }

  // Axes
  if (itemKey.includes('axe')) {
    const isEssence = itemKey.includes('essence');
    const isIron = itemKey.includes('iron');
    const bladeA = isEssence ? '#6ee7b7' : isIron ? '#e2e8f0' : '#b5b8be';
    const bladeB = isEssence ? '#059669' : isIron ? '#64748b' : '#575e68';
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`ax-${uid}`} x1="24" y1="12" x2="54" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={bladeA} />
            <stop offset="100%" stopColor={bladeB} />
          </linearGradient>
        </defs>
        {/* Wooden handle */}
        <line x1="14" y1="52" x2="44" y2="18" stroke="#7c4a24" strokeWidth="6" strokeLinecap="round" />
        <line x1="14" y1="52" x2="44" y2="18" stroke="#b0723e" strokeWidth="2.2" strokeLinecap="round" />
        {/* Axe Head */}
        <path
          d="M32 16 C40 12 50 18 54 28 C46 34 38 35 30 29 Z"
          fill={`url(#ax-${uid})`}
          stroke="#1e293b"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M46 17 C50 21 52 25 53 28" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" opacity="0.65" />
        {/* Wrapping */}
        <rect x="33" y="21" width="7" height="7" rx="1.5" transform="rotate(-48 36 24)" fill="#a16207" />
      </svg>
    );
  }

  // Pickaxes
  if (itemKey.includes('pickaxe')) {
    const isIron = itemKey.includes('iron');
    const headA = isIron ? '#dbeafe' : '#cbd5e1';
    const headB = isIron ? '#3b82f6' : '#64748b';
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <defs>
          <linearGradient id={`pk-${uid}`} x1="18" y1="12" x2="54" y2="42" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={headA} />
            <stop offset="100%" stopColor={headB} />
          </linearGradient>
        </defs>
        <line x1="14" y1="52" x2="43" y2="21" stroke="#7c4a24" strokeWidth="5.5" strokeLinecap="round" />
        <line x1="14" y1="52" x2="43" y2="21" stroke="#b0723e" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M22 14 C34 11 46 18 53 32 L46 34 C41 25 34 20 25 21 Z"
          fill={`url(#pk-${uid})`}
          stroke="#1e293b"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <rect x="34" y="18" width="9" height="8" rx="2" transform="rotate(35 38 22)" fill="#475569" stroke="#1e293b" strokeWidth="1.4" />
      </svg>
    );
  }

  // Bows
  if (itemKey.includes('bow')) {
    const glow = itemKey.includes('azure') ? '#38bdf8' : itemKey.includes('wind') ? '#4ade80' : '#d97706';
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <path d="M18 48 C14 26 26 14 48 16" stroke={glow} strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M18 48 C14 26 26 14 48 16" stroke="#fef3c7" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.65" />
        <line x1="18" y1="48" x2="48" y2="16" stroke="#cbd5e1" strokeWidth="1.5" />
        <line x1="18" y1="22" x2="46" y2="48" stroke="#f8fafc" strokeWidth="2.2" strokeLinecap="round" />
        <polygon points="49,51 41,49 46,42" fill={glow} />
      </svg>
    );
  }

  // Staves & Wands
  if (itemKey.includes('staff') || itemKey.includes('wand')) {
    const orb = itemKey.includes('seraph')
      ? '#fde047'
      : itemKey.includes('amethyst') || itemKey.includes('astral')
        ? '#c084fc'
        : itemKey.includes('crystal')
          ? '#38bdf8'
          : '#34d399';
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <line x1="14" y1="52" x2="44" y2="20" stroke="#7c4a24" strokeWidth="5" strokeLinecap="round" />
        <line x1="14" y1="52" x2="44" y2="20" stroke="#d9a05b" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M36 16 C40 10 49 11 52 19 C50 26 42 29 37 25" stroke="#e6b43c" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <circle cx="44" cy="18" r="7.5" fill={orb} stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="42" cy="15.5" r="2.2" fill="#ffffff" opacity="0.8" />
      </svg>
    );
  }

  // Daggers
  if (itemKey.includes('dagger')) {
    const edge = itemKey.includes('viper') ? '#4ade80' : itemKey.includes('eclipse') ? '#38bdf8' : '#cbd5e1';
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
        <polygon points="50,12 42,30 33,24" fill={edge} stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round" />
        <polygon points="50,12 37,27 29,34 25,30" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.5" />
        <line x1="21" y1="26" x2="36" y2="41" stroke="#e6b43c" strokeWidth="4" strokeLinecap="round" />
        <line x1="15" y1="48" x2="27" y2="35" stroke="#475569" strokeWidth="5.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Swords (default weapon fallback)
  const bladeColor = itemKey.includes('hunter')
    ? '#fca5a5'
    : itemKey.includes('rune')
      ? '#a5f3fc'
      : '#67e8f9';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sw-${uid}`} x1="22" y1="10" x2="54" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={bladeColor} />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      <polygon points="53,10 47,26 28,44 21,37 39,17" fill={`url(#sw-${uid})`} stroke="#0f172a" strokeWidth="1.7" strokeLinejoin="round" />
      <line x1="26" y1="39" x2="48" y2="16" stroke="#ffffff" strokeWidth="1.4" opacity="0.7" />
      <line x1="17" y1="31" x2="33" y2="47" stroke="#e6b43c" strokeWidth="4.5" strokeLinecap="round" />
      <line x1="11" y1="53" x2="23" y2="41" stroke="#6b4426" strokeWidth="5.5" strokeLinecap="round" />
      <circle cx="11" cy="53" r="3" fill="#e6b43c" stroke="#1e293b" strokeWidth="1.2" />
    </svg>
  );
};
