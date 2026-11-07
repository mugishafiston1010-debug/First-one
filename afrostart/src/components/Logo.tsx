export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="afs-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a5ce8" />
          <stop offset="1" stopColor="#121d52" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#afs-g)" />
      <circle cx="27.5" cy="12.5" r="4.5" fill="#ffb02e" />
      <path d="M9 31 L18.5 10 L28 31" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.2 24.5 H24" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className={`font-display text-[17px] font-extrabold leading-none tracking-tight ${light ? "text-white" : "text-ink"}`}>
        AfroStart<span className={light ? "text-sun-300" : "text-brand-600"}> Russia</span>
      </span>
    </span>
  );
}
