// Shared presentational primitives for the ImgPro admin UI.
//
// These exist so the five feature pages cannot drift apart. The previous build
// repeated its page-header markup, its stat blocks and its progress bars inline
// in every route, which is how it ended up with four different stat treatments
// (a 4-card grid on one page, `heading2xl` blocks on another, a hairline grid on
// a third) all claiming to be the same thing.
//
// Everything here is markup + class names only. The classes live in
// app/styles/imgpro.css; no colours or sizes are declared in this file.

/* -------------------------------------------------------------------------- */
/*  CommandBar — the page header                                              */
/* -------------------------------------------------------------------------- */

// An elevated header card. The app name sits in a small pill eyebrow so the
// page title itself is still the largest thing on the row.
export function CommandBar({ title, subtitle, eyebrow = "ImgPro", children }) {
  return (
    <div className="ip-bar">
      <div className="ip-bar-main">
        <span className="ip-bar-eyebrow">{eyebrow}</span>
        <h2 className="ip-bar-title">{title}</h2>
        {subtitle && <p className="ip-bar-sub">{subtitle}</p>}
      </div>
      {children && <div className="ip-bar-aside">{children}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  KpiStrip — a responsive grid of floating figure tiles                     */
/* -------------------------------------------------------------------------- */

// `items` is [{ label, value, note?, tone?, tag? }].
//   tone: 'ok' | 'bad'          — colours the figure
//   tag:  a Tag tone, or `true` — renders the value as a tag instead of a
//                                 figure, for word values like "Growth" or
//                                 "On" that read as a broken headline at figure
//                                 size. `true` means "tag it, no tone".
export function KpiStrip({ items }) {
  return (
    <div className="ip-kpi">
      {items.map((item) => (
        <div className="ip-kpi-cell" key={item.label}>
          <p className="ip-kpi-label">{item.label}</p>
          {item.tag ? (
            <div className="ip-kpi-tagline">
              <Tag tone={item.tag === true ? undefined : item.tag}>{item.value}</Tag>
            </div>
          ) : (
            <p
              className={
                item.tone ? `ip-kpi-value ip-kpi-value--${item.tone}` : "ip-kpi-value"
              }
              title={String(item.value)}
            >
              {item.value}
            </p>
          )}
          {item.note && <p className="ip-kpi-note">{item.note}</p>}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Segmented — replaces the filter/sort <Select> dropdowns                   */
/* -------------------------------------------------------------------------- */

// `options` is [{ label, value, count? }]. A real button group rather than a
// radio-styled select: the counts are visible without opening anything, which
// is the whole point of showing them.
export function Segmented({ label, options, value, onChange, disabled = false }) {
  const group = (
    <div className="ip-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="ip-seg-btn"
          aria-pressed={value === option.value}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {typeof option.count === "number" && (
            <span className="ip-seg-count">{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );

  if (!label) return group;
  return (
    <div className="ip-field">
      <span className="ip-field-label">{label}</span>
      {group}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Panel — elevated rounded container with a white sentence-case header      */
/* -------------------------------------------------------------------------- */

export function Panel({ title, note, actions, children, footer, padded = false }) {
  return (
    <section className="ip-panel">
      {(title || actions) && (
        <header className="ip-panel-head">
          <div>
            {title && <h3 className="ip-panel-title">{title}</h3>}
            {note && <p className="ip-panel-note">{note}</p>}
          </div>
          {actions}
        </header>
      )}
      {padded ? <div className="ip-panel-body">{children}</div> : children}
      {footer && <div className="ip-panel-foot">{footer}</div>}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Meter — a thin inline bar                                                 */
/* -------------------------------------------------------------------------- */

// Polaris's ProgressBar carries its own block margins and minimum height, which
// is fine in a card and wrong in a 36px-tall table row.
export function Meter({ value, tone, showValue = true, label }) {
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="ip-meter">
      <div
        className="ip-meter-track"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <span
          className={tone ? `ip-meter-fill ip-meter-fill--${tone}` : "ip-meter-fill"}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && <span className="ip-meter-value">{`${pct}%`}</span>}
    </div>
  );
}

// Score → meter tone. Shared so a product at 85% is never green in one place
// and amber in another.
export function scoreTone(score) {
  if (score >= 80) return "ok";
  if (score >= 50) return "warn";
  return "bad";
}

/* -------------------------------------------------------------------------- */
/*  Tag / Dot — pill status markers                                           */
/* -------------------------------------------------------------------------- */

export function Tag({ tone, children, dot = false }) {
  return (
    <span className={tone ? `ip-tag ip-tag--${tone}` : "ip-tag"}>
      {dot && <Dot tone={tone} />}
      {children}
    </span>
  );
}

export function Dot({ tone, className }) {
  const cls = ["ip-dot", tone ? `ip-dot--${tone}` : "", className || ""]
    .filter(Boolean)
    .join(" ");
  return <span className={cls} aria-hidden="true" />;
}

/* -------------------------------------------------------------------------- */
/*  Table scaffolding                                                         */
/* -------------------------------------------------------------------------- */

// `variant` picks the column template class (products | alt | pages | formats |
// vitals), which is declared once in the stylesheet so the header row and the
// body rows can never disagree about the column count.
export function Table({ variant, children }) {
  return <div className={`ip-table ip-table--${variant}`}>{children}</div>;
}

export function Thead({ columns }) {
  return (
    <div className="ip-tr ip-thead">
      {columns.map((col) => (
        <div
          key={col.key || col.label}
          className={["ip-th", col.className, col.align === "right" ? "ip-td--num" : ""]
            .filter(Boolean)
            .join(" ")}
        >
          {col.label}
        </div>
      ))}
    </div>
  );
}

export function Row({ selected, active, children }) {
  const cls = [
    "ip-tr",
    "ip-tbody-row",
    selected ? "ip-tbody-row--selected" : "",
    active ? "ip-tbody-row--active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={cls}>{children}</div>;
}

export function EmptyState({ title, children }) {
  return (
    <div className="ip-empty">
      <p className="ip-empty-title">{title}</p>
      {children && <p className="ip-empty-body">{children}</p>}
    </div>
  );
}

// Skeleton rows that keep the table's shape while the catalog request is in
// flight, instead of collapsing the page to a single centred spinner.
export function SkeletonRows({ variant, columns, rows = 6 }) {
  return (
    <Table variant={variant}>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div className="ip-tr ip-tbody-row" key={rowIndex}>
          {Array.from({ length: columns }, (_, colIndex) => (
            <div
              className="ip-skel"
              key={colIndex}
              style={{ width: colIndex === 2 ? "72%" : "100%" }}
            />
          ))}
        </div>
      ))}
    </Table>
  );
}

/* -------------------------------------------------------------------------- */
/*  ActionBar — sticky bulk-action footer                                     */
/* -------------------------------------------------------------------------- */

export function ActionBar({ text, note, children }) {
  return (
    <div className="ip-actionbar">
      <div>
        <p className="ip-actionbar-text">{text}</p>
        {note && <p className="ip-actionbar-note">{note}</p>}
      </div>
      <div className="ip-actionbar-actions">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Formatters                                                                */
/* -------------------------------------------------------------------------- */

// Megabytes → the largest sensible unit. Defined once and imported, rather than
// redeclared in four routes with three different rounding rules (the old build
// had one that rendered "0 KB" and one that rendered "NaN KB" for the same
// input).
export function formatBytes(mb) {
  const v = Number(mb) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1)} GB`;
  if (v >= 1) return `${v.toFixed(1)} MB`;
  if (v > 0) return `${Math.max(1, Math.round(v * 1024))} KB`;
  return "0 KB";
}

export function formatNumber(n) {
  return Number(n || 0).toLocaleString();
}
