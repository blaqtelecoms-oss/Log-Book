/** Serif page title with the brand eyebrow and an actions slot. */
export default function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <span className="emf-eyebrow emf-eyebrow--dark">{eyebrow}</span> : null}
        <h1 className="emf-serif mt-2 text-[30px] leading-tight text-[var(--ink)]">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </header>
  );
}