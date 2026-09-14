/* AppShell — sidebar + topbar + routing wrapper */

const NAV = [
  { id: "analyzer", label: "URL Analyzer", icon: "shield", primary: true },
  { id: "overview", label: "Overview", icon: "activity" },
  { id: "history",  label: "Analysis History", icon: "history" },
  { id: "model",    label: "Model", icon: "cpu" },
  { id: "system",   label: "System Status", icon: "server" },
  { id: "docs",     label: "Documentation", icon: "book" },
];

const BRAND_TITLE = "Aperture";
const BRAND_SUB = "Phishing Classification";

const CRUMBS = {
  analyzer: ["URL Analyzer"],
  overview: ["Overview"],
  history:  ["Analysis History"],
  model:    ["Model"],
  system:   ["System Status"],
  docs:     ["Documentation"],
};

const Sidebar = ({ current, onNavigate, open, onClose }) => (
  <>
    {open && <div className="sidebar-scrim" onClick={onClose} />}
    <aside className="sidebar" data-open={open ? "true" : "false"} aria-label="Primary">
      <div className="sidebar__brand">
        <div className="sidebar__mark" aria-hidden="true" />
        <div>
          <div className="sidebar__brand-title">{BRAND_TITLE}</div>
          <div className="sidebar__brand-sub">{BRAND_SUB}</div>
        </div>
      </div>

      <div className="sidebar__section">Analyze</div>
      <nav className="sidebar__nav" aria-label="Sections">
        {NAV.filter(n => n.primary).map(n => (
          <button
            key={n.id}
            className={"nav-item" + (current === n.id ? " nav-item--active" : "")}
            onClick={() => { onNavigate(n.id); onClose && onClose(); }}
          >
            <Icon name={n.icon} className="nav-item__icon" />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__section">Operations</div>
      <nav className="sidebar__nav" aria-label="Operations">
        {NAV.filter(n => !n.primary).map(n => (
          <button
            key={n.id}
            className={"nav-item" + (current === n.id ? " nav-item--active" : "")}
            onClick={() => { onNavigate(n.id); onClose && onClose(); }}
          >
            <Icon name={n.icon} className="nav-item__icon" />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__footer-row">
          <span>Model</span>
          <span className="mono" style={{ color: "var(--fg-muted)" }}>random-forest · 1.4.2</span>
        </div>
        <div className="sidebar__footer-row">
          <span>Inference</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--safe)" }}>
            <StatusDot tone="safe" /> Operational
          </span>
        </div>
      </div>
    </aside>
  </>
);

const TopBar = ({ crumbs, theme, onToggleTheme, onOpenSidebar }) => (
  <header className="topbar">
    <div className="topbar__crumbs">
      <button className="icon-btn menu-btn" onClick={onOpenSidebar} aria-label="Open menu">
        <Icon name="menu" size={14} />
      </button>
      <span style={{ color: "var(--fg-subtle)" }}>{BRAND_TITLE}</span>
      <Icon name="chevron-right" size={12} className="topbar__crumb-sep" />
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <Icon name="chevron-right" size={12} className="topbar__crumb-sep" />}
          <span>{c}</span>
        </React.Fragment>
      ))}
    </div>

    <div className="topbar__actions">
      <span style={{ fontSize: 11.5, color: "var(--fg-subtle)", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <StatusDot tone="safe" size={6} />
        All systems operational
      </span>
      <button
        className="icon-btn"
        onClick={onToggleTheme}
        aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        title={theme === "dark" ? "Light" : "Dark"}
      >
        <Icon name={theme === "dark" ? "sun" : "moon"} size={13} />
      </button>
    </div>
  </header>
);

const AppShell = ({ current, onNavigate, theme, onToggleTheme, children }) => {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  return (
    <div className="app">
      <Sidebar
        current={current}
        onNavigate={onNavigate}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="main">
        <TopBar
          crumbs={CRUMBS[current] || [current]}
          theme={theme}
          onToggleTheme={onToggleTheme}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        {children}
      </main>
    </div>
  );
};

Object.assign(window, { AppShell, NAV, BRAND_TITLE, BRAND_SUB });
