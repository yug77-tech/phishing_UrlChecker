/* Top-level app — routing (hash), theme, history persistence, error boundary. */

const HISTORY_KEY = "aperture.history.v1";
const CURRENT_KEY = "aperture.current.v1";
const THEME_KEY = "aperture.theme";
const ROUTE_KEY = "aperture.route";
const SEEDED_KEY = "aperture.seeded.v1";

const VALID_ROUTES = new Set(["analyzer", "overview", "history", "model", "system", "docs"]);

function getInitialRoute() {
  const h = (window.location.hash || "").replace("#", "");
  if (VALID_ROUTES.has(h)) return h;
  const stored = localStorage.getItem(ROUTE_KEY);
  if (stored && VALID_ROUTES.has(stored)) return stored;
  return "analyzer";
}

function getInitialTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark" : "light";
}

class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (this.state.err) {
      return (
        <div style={{
          padding: 40, maxWidth: 640, margin: "80px auto", fontFamily: "var(--font-sans)",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>Something went wrong</h2>
          <p style={{ color: "var(--fg-muted)", fontSize: 13.5 }}>
            The dashboard encountered an unexpected error. Reloading the page usually resolves this.
          </p>
          <button className="btn btn--primary" onClick={() => window.location.reload()} style={{ marginTop: 12 }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [route, setRoute] = React.useState(getInitialRoute);
  const [theme, setTheme] = React.useState(getInitialTheme);
  const [history, setHistory] = React.useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "null");
      if (Array.isArray(stored)) return stored;
    } catch {}
    return null; // sentinel: not loaded yet
  });
  const [currentResult, setCurrentResult] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_KEY) || "null");
    } catch { return null; }
  });
  const inputRef = React.useRef(null);
  const [toastMsg, showToast] = useToast();

  // Seed history silently on first load
  React.useEffect(() => {
    if (history !== null) return;
    const seeded = localStorage.getItem(SEEDED_KEY);
    if (!seeded) {
      const items = window.seedHistory();
      setHistory(items);
      localStorage.setItem(SEEDED_KEY, "1");
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } else {
      setHistory([]);
    }
  }, [history]);

  // Theme sync
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Route sync (hash + storage)
  React.useEffect(() => {
    if (window.location.hash.replace("#", "") !== route) {
      history !== null && window.history.replaceState(null, "", "#" + route);
    }
    localStorage.setItem(ROUTE_KEY, route);
  }, [route]);

  // Hashchange listener
  React.useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#", "");
      if (VALID_ROUTES.has(h) && h !== route) setRoute(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [route]);

  // Keyboard: "/" focuses URL input on analyzer
  React.useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "/") {
        e.preventDefault();
        setRoute("analyzer");
        setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const persistHistory = React.useCallback((next) => {
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const onResult = (result) => {
    setCurrentResult(result);
    try { localStorage.setItem(CURRENT_KEY, JSON.stringify(result)); } catch {}
    const next = [result, ...(history || []).filter(h => h.requestId !== result.requestId)].slice(0, 200);
    persistHistory(next);
  };

  const onSelectFromHistory = (h) => {
    setCurrentResult(h);
    try { localStorage.setItem(CURRENT_KEY, JSON.stringify(h)); } catch {}
    setRoute("analyzer");
  };

  const onClearHistory = () => {
    if (!confirm("Clear all analysis history? This cannot be undone.")) return;
    persistHistory([]);
    setCurrentResult(null);
    try { localStorage.removeItem(CURRENT_KEY); } catch {}
    showToast("History cleared");
  };

  const onToggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");
  const onNavigate = (id) => {
    if (VALID_ROUTES.has(id)) setRoute(id);
  };

  const hist = history || [];

  return (
    <ErrorBoundary>
      <AppShell current={route} onNavigate={onNavigate} theme={theme} onToggleTheme={onToggleTheme}>
        {route === "analyzer" && (
          <div className="page">
            <div className="page__head">
              <div>
                <h1 className="page__title">URL Analyzer</h1>
                <p className="page__desc">Enter a URL to evaluate its phishing risk using the cloud-hosted Random Forest classifier.</p>
              </div>
              <div className="page__meta">
                <span className="mono">random-forest · 1.4.2</span>
              </div>
            </div>

            <URLAnalyzer
              onResult={onResult}
              inputRef={inputRef}
              initialUrl=""
            />

            {currentResult ? (
              <div style={{ marginTop: 24 }}>
                <div className="divider-label">Latest result</div>
                <RiskResult result={currentResult} />
              </div>
            ) : (
              <div style={{ marginTop: 24 }}>
                <EmptyState
                  title="No analysis yet"
                  description="Submit a URL above to see the classifier's risk assessment, extracted features, and pipeline timings."
                />
              </div>
            )}
          </div>
        )}

        {route === "overview" && (
          <OverviewPage
            history={hist}
            onNavigate={onNavigate}
            onSelectFromHistory={onSelectFromHistory}
          />
        )}

        {route === "history" && (
          <HistoryPage
            history={hist}
            onNavigate={onNavigate}
            onSelectFromHistory={onSelectFromHistory}
            onClearHistory={onClearHistory}
          />
        )}

        {route === "model" && <ModelPage history={hist} />}
        {route === "system" && <SystemPage />}
        {route === "docs" && <DocsPage />}
      </AppShell>
      <Toast message={toastMsg} />
    </ErrorBoundary>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
