"use client";

/** Small shared building blocks: icons, buttons, dialog, toasts. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

// ---- Icons ----------------------------------------------------------------

const PATHS = {
  home: "M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z",
  check: "m5 12.5 4.5 4.5L19 7.5",
  list: "M9 6.5h11M9 12h11M9 17.5h11M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01",
  calendar: "M7 3.5v3M17 3.5v3M4.5 9.5h15M6 5.5h12a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18V7A1.5 1.5 0 0 1 6 5.5z",
  shield: "M12 3.5 5 6v5.5c0 4.2 2.9 7.4 7 9 4.1-1.6 7-4.8 7-9V6z",
  upload: "M12 15.5V5m0 0L8 9m4-4 4 4M5 15.5v2A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5v-2",
  doc: "M14 3.5H7.5A1.5 1.5 0 0 0 6 5v14a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V7.5zm0 0v4h4M9 12.5h6M9 16h4",
  arrow: "M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5",
  close: "M6 6l12 12M18 6 6 18",
  trash: "M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 11.6a1 1 0 0 0 1 .9h7.4a1 1 0 0 0 1-.9L17.500 7M10 11v5M14 11v5",
  star: "m12 4 2.4 5 5.4.7-4 3.8 1 5.5-4.800-2.700L7.200 19l1-5.5-4-3.800 5.400-.7z",
  send: "M5 12h13m0 0-5-5m5 5-5 5",
  download: "M12 4.500v10.5m0 0-4-4m4 4 4-4M5 19h14",
  refresh: "M19.500 12a7.500 7.500 0 1 1-2.200-5.300M19.500 4.500v4.200h-4.200",
  quote: "M9.500 7.500C7 8.500 5.500 10.500 5.500 13.500v3h4.500v-4.500H7.800c.2-1.300.9-2.200 2.200-2.800zm8.500 0c-2.500 1-4 3-4 6v3h4.500v-4.500h-2.200c.2-1.300.9-2.200 2.200-2.800z",
  alert: "M12 8.500v4.500m0 3h.01M10.300 4.500 3.400 16.500a2 2 0 0 0 1.700 3h13.800a2 2 0 0 0 1.700-3L13.700 4.500a2 2 0 0 0-3.400 0z",
  device: "M5.500 5.500h13a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6.500a1 1 0 0 1 1-1zM2.500 19h19",
  cloud: "M7.500 18.500a4 4 0 0 1-.6-7.950A5.500 5.500 0 0 1 17.500 9.500a4.500 4.500 0 0 1-.5 9z",
  chevron: "m9 6 6 6-6 6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 2-4-4",
  book: "M12 6.500C10.500 5.300 8.500 5 5 5v13c3.500 0 5.500.3 7 1.500m0-13C13.500 5.300 15.500 5 19 5v13c-3.500 0-5.500.3-7 1.500m0-13v13",
  info: "M12 11v5m0-8.500h.01M12 20.500a8.500 8.500 0 1 0 0-17 8.500 8.500 0 0 0 0 17z",
  menu: "M4 7h16M4 12h16M4 17h16",
  spark: "M12 4v4m0 8v4M4 12h4m8 0h4M6.500 6.500l2.500 2.500m6 6 2.500 2.500m0-11L15 9m-6 6-2.500 2.500",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className = "", filled = false }: { name: IconName; size?: number; className?: string; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

// ---- Buttons --------------------------------------------------------------

type Variant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:opacity-90 disabled:opacity-40",
  secondary: "bg-raised text-ink border border-line-strong hover:border-ink-3 disabled:opacity-50",
  ghost: "text-ink-2 hover:text-ink hover:bg-sunken disabled:opacity-40",
  danger: "bg-accent text-on-accent hover:opacity-90 disabled:opacity-40",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  busy = false,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; icon?: IconName; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[opacity,background-color,border-color,color] duration-150 ${
        size === "sm" ? "h-8 px-3.5 text-[13px]" : "h-10 px-5 text-sm"
      } ${VARIANTS[variant]} ${className}`}
    >
      {busy ? <Spinner size={14} /> : icon ? <Icon name={icon} size={size === "sm" ? 14 : 16} /> : null}
      {children}
    </button>
  );
}

export function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

// ---- Dialog ---------------------------------------------------------------

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className={`m-auto w-[calc(100%-2rem)] ${width} rounded-2xl border border-line bg-raised p-0 shadow-pop open:animate-rise`}
    >
      {open && (
        <div className="p-6">
          <h2 className="font-display text-[22px] leading-tight">{title}</h2>
          <div className="mt-3 text-sm text-ink-2">{children}</div>
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

// ---- Toasts ---------------------------------------------------------------

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
}

const ToastContext = createContext<(message: string, tone?: Toast["tone"]) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(1);
  const push = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const id = next.current++;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6500 : 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex max-w-md animate-rise items-center gap-2.5 rounded-full bg-ink py-2.5 pl-3.5 pr-5 text-[13px] font-medium text-bg shadow-pop"
          >
            <span className={`grid size-5 place-items-center rounded-full ${t.tone === "error" ? "bg-accent text-on-accent" : "bg-bg/15"}`}>
              <Icon name={t.tone === "error" ? "alert" : "check"} size={12} />
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ---- Misc -----------------------------------------------------------------

export function EmptyState({ icon, title, children, action }: { icon: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-sunken text-ink-2">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="mt-4 font-display text-xl">{title}</h3>
      {children && <p className="mt-1.5 max-w-sm text-sm text-ink-2">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</section>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-sunken ${className}`} />;
}
