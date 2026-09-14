/* Shared small components: CopyButton, StatusDot, EmptyState, Sparkline, Toast */

const CopyButton = ({ text, label = "Copy", size = 14, className = "" }) => {
  const [copied, setCopied] = React.useState(false);
  const onClick = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  return (
    <button
      type="button"
      className={"input__icon-btn " + className}
      onClick={onClick}
      aria-label={copied ? "Copied to clipboard" : label}
      title={copied ? "Copied" : label}
    >
      <Icon name={copied ? "check" : "copy"} size={size} />
    </button>
  );
};

const StatusDot = ({ tone = "safe", size = 8 }) => {
  const map = {
    safe: "var(--safe)", warn: "var(--warn)", elev: "var(--elev)",
    danger: "var(--danger)", neutral: "var(--neutral-dot)", low: "var(--low)",
  };
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block", width: size, height: size, borderRadius: "50%",
        background: map[tone] || map.neutral,
      }}
    />
  );
};

const EmptyState = ({ title, description, action }) => (
  <div className="empty">
    <h3>{title}</h3>
    {description && <p>{description}</p>}
    {action}
  </div>
);

/* Simple SVG sparkline for latency series */
const Sparkline = ({ data, height = 32, width = 200 }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1 || 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y];
  });
  const line = points.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + " L" + width + " " + height + " L0 " + height + " Z";
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <path className="area" d={area} />
      <path className="line" d={line} />
    </svg>
  );
};

const Toast = ({ message }) => (
  message ? <div className="toast" role="status">{message}</div> : null
);

/* Central portal for hiding-showing toasts */
function useToast() {
  const [msg, setMsg] = React.useState("");
  const show = React.useCallback((m) => {
    setMsg(m);
    setTimeout(() => setMsg(""), 1600);
  }, []);
  return [msg, show];
}

Object.assign(window, { CopyButton, StatusDot, EmptyState, Sparkline, Toast, useToast });
