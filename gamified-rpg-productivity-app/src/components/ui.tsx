import type { ReactNode } from "react";

export function Panel({
  title,
  icon,
  right,
  children,
  className = "",
}: {
  title?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`sys-panel p-4 sm:p-5 ${className}`}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h2 className="sys-title flex items-center gap-2">
            {icon && <span className="text-sm">{icon}</span>}
            {title}
          </h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Bar({ pct, className = "", color }: { pct: number; className?: string; color?: string }) {
  return (
    <div className={`bar-track ${className}`}>
      <div
        className="bar-fill"
        style={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          ...(color
            ? { background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 14px ${color}` }
            : {}),
        }}
      />
    </div>
  );
}

export function Chip({ color, children, title }: { color: string; children: ReactNode; title?: string }) {
  return (
    <span className="chip" style={{ color }} title={title}>
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[rgba(94,129,255,0.25)] px-4 py-5 text-center text-sm text-mute">
      {children}
    </p>
  );
}

export function SegButtons<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  return (
    <div className="inline-flex rounded-xl border border-[rgba(94,129,255,0.3)] bg-[rgba(5,7,22,0.7)] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`display rounded-lg px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] transition ${
            value === o.value
              ? "bg-[rgba(56,189,248,0.2)] text-sky-200 shadow-[0_0_12px_rgba(56,189,248,0.45)]"
              : "text-mute hover:text-indigo-200"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NavButton({
  onClick,
  children,
  label,
}: {
  onClick: () => void;
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-[rgba(94,129,255,0.35)] bg-[rgba(10,13,31,0.7)] text-indigo-200 transition hover:border-sky-400 hover:shadow-[0_0_14px_rgba(56,189,248,0.5)]"
    >
      {children}
    </button>
  );
}
