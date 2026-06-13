/** Small steampunk cat for the masthead — sits on the C of “Cat Bot”. */
export function SteampunkMastheadCat({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 72 80"
      aria-hidden
      focusable="false"
    >
      {/* Tail */}
      <path
        d="M54 58 C62 48 68 36 64 24 C63 20 58 22 56 28 C54 38 50 48 46 54 Z"
        fill="#1a1a1a"
      />
      {/* Body + haunches */}
      <ellipse cx="36" cy="54" rx="18" ry="14" fill="#1a1a1a" />
      <ellipse cx="36" cy="48" rx="14" ry="11" fill="#2a2a2a" />
      {/* Vest */}
      <path
        d="M24 44 L48 44 L46 58 L26 58 Z"
        fill="#5c4a32"
        stroke="#1a1a1a"
        strokeWidth="1"
      />
      <circle cx="36" cy="50" r="3.5" fill="#c9a227" stroke="#1a1a1a" strokeWidth="0.8" />
      <circle cx="36" cy="50" r="1.2" fill="#1a1a1a" />
      {/* Brass gear on vest */}
      <circle cx="30" cy="52" r="2.2" fill="none" stroke="#c9a227" strokeWidth="0.9" />
      {/* Head */}
      <circle cx="36" cy="28" r="15" fill="#1a1a1a" />
      {/* Ears */}
      <path d="M22 18 L26 6 L32 16 Z" fill="#1a1a1a" />
      <path d="M50 18 L46 6 L40 16 Z" fill="#1a1a1a" />
      <path d="M24 16 L27 9 L30 15 Z" fill="#ffc400" opacity="0.85" />
      <path d="M48 16 L45 9 L42 15 Z" fill="#ffc400" opacity="0.85" />
      {/* Goggles strap */}
      <path
        d="M20 27 Q36 22 52 27"
        fill="none"
        stroke="#5c4a32"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Goggle lenses */}
      <circle cx="28" cy="28" r="7" fill="#8b7355" stroke="#1a1a1a" strokeWidth="1.2" />
      <circle cx="44" cy="28" r="7" fill="#8b7355" stroke="#1a1a1a" strokeWidth="1.2" />
      <circle cx="28" cy="28" r="4.5" fill="#6ec8e8" opacity="0.55" />
      <circle cx="44" cy="28" r="4.5" fill="#6ec8e8" opacity="0.55" />
      <circle cx="26.5" cy="26.5" r="1.2" fill="#fff" opacity="0.7" />
      <circle cx="42.5" cy="26.5" r="1.2" fill="#fff" opacity="0.7" />
      {/* Bridge */}
      <rect x="34" y="26" width="4" height="3" rx="1" fill="#c9a227" />
      {/* Mini top hat */}
      <rect x="30" y="8" width="12" height="7" rx="1" fill="#1a1a1a" />
      <rect x="27" y="14" width="18" height="2.5" rx="0.5" fill="#1a1a1a" />
      <rect x="31" y="9" width="10" height="1.5" fill="#c9a227" opacity="0.9" />
      {/* Nose + whiskers */}
      <path d="M36 32 L34 35 L38 35 Z" fill="#ffc400" />
      <path d="M22 31 H30" stroke="#1a1a1a" strokeWidth="0.8" strokeLinecap="round" />
      <path d="M42 31 H50" stroke="#1a1a1a" strokeWidth="0.8" strokeLinecap="round" />
      {/* Paws on the C */}
      <ellipse cx="28" cy="62" rx="4" ry="3" fill="#1a1a1a" />
      <ellipse cx="44" cy="62" rx="4" ry="3" fill="#1a1a1a" />
    </svg>
  )
}
