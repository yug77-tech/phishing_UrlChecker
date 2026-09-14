/* Supporting pages: Overview, History, Model, System, Docs */

/* ---------- Overview ---------- */

const OverviewPage = ({ history, onNavigate, onSelectFromHistory }) => {
  const total = history.length;
  const phishing = history.filter(h => h.riskLevel === "phishing" || h.riskLevel === "high").length;
  const suspicious = history.filter(h => h.riskLevel === "suspicious").length;
  const safe = history.filter(h => h.riskLevel === "safe" || h.riskLevel === "low").length;
  const avgInf = history.length
    ? Math.round(history.reduce((a, b) => a + (b.timing?.inferenceMs || 0), 0) / history.length)
    : null;
  const latencySeries = history.slice(0, 30).map(h => h.timing?.inferenceMs || 0).reverse();
  const recent = history.slice(0, 8);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Overview</h1>
          <p className="page__desc">Operational summary of the classification service and recent activity.</p>
        </div>
        <div className="page__meta">
          <span className="mono">last 7d</span>
          <button className="btn btn--ghost" style={{ height: 32 }} onClick={() => onNavigate("analyzer")}>
            Analyze URL <Icon name="arrow-right" size={12} />
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="metric">
          <div className="metric__label">URLs Analyzed</div>
          <div className="metric__value">{total}</div>
          <div className="metric__delta">across all sources</div>
        </div>
        <div className="metric">
          <div className="metric__label">High Risk / Phishing</div>
          <div className={"metric__value " + (phishing > 0 ? "metric__value--danger" : "")}>{phishing}</div>
          <div className="metric__delta">{total ? Math.round((phishing / total) * 100) : 0}% of total</div>
        </div>
        <div className="metric">
          <div className="metric__label">Suspicious</div>
          <div className={"metric__value " + (suspicious > 0 ? "metric__value--warn" : "")}>{suspicious}</div>
          <div className="metric__delta">{total ? Math.round((suspicious / total) * 100) : 0}% of total</div>
        </div>
        <div className="metric">
          <div className="metric__label">Avg. Inference</div>
          <div className="metric__value">
            {avgInf == null ? <span style={{ color: "var(--fg-faint)", fontStyle: "italic", fontSize: 14 }}>Unavailable</span>
              : <>{avgInf}<span className="stat__unit">ms</span></>}
          </div>
          <Sparkline data={latencySeries.length ? latencySeries : [1]} />
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel__head">
            <h3 className="panel__title"><Icon name="history" size={12} /> Recent Analyses</h3>
            <button className="chip" onClick={() => onNavigate("history")}>View all</button>
          </div>
          <div className="panel__body panel__body--flush">
            {recent.length === 0 ? (
              <div style={{ padding: 24 }}>
                <EmptyState
                  title="No analyses yet"
                  description="Submit a URL to run your first phishing risk assessment."
                  action={<button className="btn btn--primary" onClick={() => onNavigate("analyzer")}>Analyze a URL</button>}
                />
              </div>
            ) : (
              <div className="tbl-wrap" style={{ border: 0, borderRadius: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>URL</th>
                      <th>Risk</th>
                      <th style={{ textAlign: "right" }}>Score</th>
                      <th style={{ textAlign: "right" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(h => (
                      <tr key={h.requestId} onClick={() => onSelectFromHistory(h)}>
                        <td className="url" title={h.url}>{h.url}</td>
                        <td><RiskBadge level={window.levelById(h.riskLevel) || window.RISK_LEVELS[0]} /></td>
                        <td className="num">{h.riskScore}</td>
                        <td className="num dim">{relTime(h.analyzedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div className="panel">
            <div className="panel__head">
              <h3 className="panel__title"><Icon name="cpu" size={12} /> Model</h3>
              <span className="panel__sub mono" style={{ color: "var(--safe)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <StatusDot tone="safe" size={6} /> operational
              </span>
            </div>
            <div className="panel__body panel__body--flush" style={{ padding: "8px 0" }}>
              <KVList items={[
                ["Model", "Random Forest"],
                ["Version", "1.4.2"],
                ["Feature Set", "URL Features"],
                ["Inference", window.analyzerService.isConnected ? "Cloud" : "Local"],
              ]} />
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3 className="panel__title"><Icon name="server" size={12} /> Service Health</h3>
              <span className="panel__sub">all green</span>
            </div>
            <div className="panel__body panel__body--flush">
              <MiniStatusList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MiniStatusList = () => {
  const services = [
    ["Client API", "safe", "Operational"],
    ["Feature Extraction", "safe", "Operational"],
    ["Model Inference", "safe", "Operational"],
    ["Model", "safe", "Loaded"],
  ];
  return (
    <div>
      {services.map(([name, tone, status], i) => (
        <div key={name} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 16px", borderBottom: i === services.length - 1 ? 0 : "1px solid var(--border-subtle)",
          fontSize: 13,
        }}>
          <span>{name}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--safe)", fontSize: 12 }}>
            <StatusDot tone={tone} size={6} /> {status}
          </span>
        </div>
      ))}
    </div>
  );
};

function relTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.round(diff / 60) + "m ago";
  if (diff < 86400) return Math.round(diff / 3600) + "h ago";
  return Math.round(diff / 86400) + "d ago";
}

/* ---------- History ---------- */

const HistoryPage = ({ history, onNavigate, onSelectFromHistory, onClearHistory }) => {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [sort, setSort] = React.useState("recent"); // recent | score

  const filtered = React.useMemo(() => {
    let out = history;
    if (filter !== "all") out = out.filter(h => h.riskLevel === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      out = out.filter(h => h.url.toLowerCase().includes(q));
    }
    if (sort === "score") out = [...out].sort((a, b) => b.riskScore - a.riskScore);
    else out = [...out].sort((a, b) => new Date(b.analyzedAt) - new Date(a.analyzedAt));
    return out;
  }, [history, query, filter, sort]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Analysis History</h1>
          <p className="page__desc">Previously analyzed URLs and their classifications.</p>
        </div>
        <div className="page__meta">
          <span className="mono">{filtered.length} of {history.length}</span>
          {history.length > 0 && (
            <button className="chip" onClick={onClearHistory}>Clear</button>
          )}
        </div>
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="No analyses yet"
          description="Submit a URL to run your first phishing risk assessment."
          action={<button className="btn btn--primary" onClick={() => onNavigate("analyzer")}>Analyze a URL</button>}
        />
      ) : (
        <>
          <div className="filterbar">
            <div className="search">
              <Icon name="search" size={13} />
              <input
                placeholder="Search URLs"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {[
              ["all", "All"],
              ["safe", "Safe"],
              ["low", "Low"],
              ["suspicious", "Suspicious"],
              ["high", "High"],
              ["phishing", "Phishing"],
            ].map(([k, l]) => (
              <button
                key={k}
                className="chip"
                data-active={filter === k}
                onClick={() => setFilter(k)}
              >{l}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "inline-flex", gap: 4 }}>
              <button className="chip" data-active={sort === "recent"} onClick={() => setSort("recent")}>Recent</button>
              <button className="chip" data-active={sort === "score"} onClick={() => setSort("score")}>Highest score</button>
            </div>
          </div>

          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Risk</th>
                  <th style={{ textAlign: "right" }}>Score</th>
                  <th>Classification</th>
                  <th style={{ textAlign: "right" }}>Inference</th>
                  <th style={{ textAlign: "right" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => (
                  <tr key={h.requestId} onClick={() => onSelectFromHistory(h)}>
                    <td className="url" title={h.url}>{h.url}</td>
                    <td><RiskBadge level={window.levelById(h.riskLevel) || window.RISK_LEVELS[0]} /></td>
                    <td className="num">{h.riskScore}</td>
                    <td className="mono dim">{h.classification || "—"}</td>
                    <td className="num dim">{h.timing?.inferenceMs ?? "—"} ms</td>
                    <td className="num dim">{relTime(h.analyzedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

/* ---------- Model ---------- */

const ModelPage = ({ history }) => {
  const inferences = history.map(h => h.timing?.inferenceMs || 0);
  const avg = inferences.length ? Math.round(inferences.reduce((a, b) => a + b) / inferences.length) : null;
  const p95 = inferences.length ? percentile(inferences, 95) : null;
  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Model</h1>
          <p className="page__desc">Random Forest phishing classifier operating on URL-derived numerical features.</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="metric">
          <div className="metric__label">Model</div>
          <div className="metric__value" style={{ fontSize: 18 }}>Random Forest</div>
          <div className="metric__delta mono">v1.4.2</div>
        </div>
        <div className="metric">
          <div className="metric__label">Avg. Inference</div>
          <div className="metric__value">
            {avg == null ? <span style={{ color: "var(--fg-faint)", fontSize: 14, fontStyle: "italic" }}>Unavailable</span>
              : <>{avg}<span className="stat__unit">ms</span></>}
          </div>
          <div className="metric__delta mono">p95 · {p95 == null ? "—" : p95 + " ms"}</div>
        </div>
        <div className="metric">
          <div className="metric__label">Requests Served</div>
          <div className="metric__value">{history.length}</div>
          <div className="metric__delta mono">since first analysis</div>
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel__head">
            <h3 className="panel__title"><Icon name="cpu" size={12} /> Configuration</h3>
          </div>
          <div className="panel__body panel__body--flush" style={{ padding: "8px 0" }}>
            <KVList items={[
              ["Algorithm", "Random Forest"],
              ["Version", "1.4.2"],
              ["Feature Set", "URL Features"],
              ["Feature Count", "15"],
              ["Inference", window.analyzerService.isConnected ? "Cloud" : "Local"],
              ["Status", <span style={{ color: "var(--safe)", display: "inline-flex", alignItems: "center", gap: 6 }}><StatusDot tone="safe" size={6}/> Operational</span>],
            ]} />
          </div>
        </div>

        <div className="panel">
          <div className="panel__head">
            <h3 className="panel__title"><Icon name="filter" size={12} /> Feature Vector</h3>
            <span className="panel__sub">extracted per request</span>
          </div>
          <div className="panel__body panel__body--flush">
            <ul style={{ margin: 0, padding: "8px 0", listStyle: "none", fontSize: 13 }}>
              {Object.entries(window.FEATURE_LABELS).map(([k, v]) => (
                <li key={k} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "6px 16px",
                }}>
                  <span>{v}</span>
                  <span className="mono" style={{ color: "var(--fg-subtle)", fontSize: 12 }}>{k}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

/* ---------- System ---------- */

const SystemPage = () => {
  const services = [
    { name: "Client API", desc: "URL submission endpoint", tone: "safe", status: "Operational", latency: "24 ms" },
    { name: "Feature Extraction Service", desc: "URL → numerical feature vector", tone: "safe", status: "Operational", latency: "18 ms" },
    { name: "Model Inference Service", desc: "Random Forest classifier evaluation", tone: "safe", status: "Operational", latency: "31 ms" },
    { name: "Random Forest Model", desc: "Loaded in memory · v1.4.2", tone: "safe", status: "Loaded", latency: "—" },
    { name: "Analysis Store", desc: "Recent analyses & history", tone: "safe", status: "Operational", latency: "9 ms" },
  ];
  const checked = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">System Status</h1>
          <p className="page__desc">Health and latency of services that make up the phishing classification pipeline.</p>
        </div>
        <div className="page__meta">
          <span className="mono">checked · {checked}</span>
        </div>
      </div>

      <div className="status-list">
        {services.map(s => (
          <div className="status-row" key={s.name}>
            <div>
              <div className="status-row__name">{s.name}</div>
              <div className="status-row__desc">{s.desc}</div>
            </div>
            <div className="status-row__latency">{s.latency}</div>
            <div className="status-row__checked">just now</div>
            <div className={"status-row__pill" + (s.tone === "warn" ? " status-row__pill--degraded" : s.tone === "danger" ? " status-row__pill--down" : "")}>
              <span className="status-dot" /> {s.status}
            </div>
          </div>
        ))}
      </div>

      <div className="divider-label">Architecture</div>

      <div className="arch-page">
        {[
          {
            no: "01", name: "Client Layer",
            desc: "Users submit URLs through desktop browser, mobile browser, or a mobile application. Submissions are treated as untrusted data and never rendered as active resources.",
            status: "Operational",
          },
          {
            no: "02", name: "Feature Extraction Layer",
            desc: "The submitted URL is converted into a numerical feature vector — length, subdomain counts, character composition, protocol usage, and other URL-derived signals.",
            status: "Operational",
          },
          {
            no: "03", name: "Model Inference Layer",
            desc: "The feature vector is evaluated by a cloud-hosted Random Forest classifier. Returns a risk score and confidence.",
            status: "Operational",
          },
          {
            no: "04", name: "Response Layer",
            desc: "The classifier's output — score, risk level, and explanation — is returned to the client for presentation.",
            status: "Operational",
          },
        ].map((s, i, all) => (
          <React.Fragment key={s.no}>
            <div className="arch-stage">
              <div className="arch-stage__no">{s.no}</div>
              <div className="arch-stage__body">
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
              </div>
              <div className="arch-stage__status">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--safe)" }}>
                  <StatusDot tone="safe" size={6} /> {s.status}
                </span>
              </div>
            </div>
            {i < all.length - 1 && <div className="arch-connector" aria-hidden="true" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

/* ---------- Docs ---------- */

const DocsPage = () => (
  <div className="page">
    <div className="page__head">
      <div>
        <h1 className="page__title">Documentation</h1>
        <p className="page__desc">Integration reference for the classification API.</p>
      </div>
    </div>
    <div className="prose">
      <h2>Overview</h2>
      <p>
        The classification service accepts a URL and returns a risk score
        (0–100), a risk level, an optional classification label, and a set
        of contributing characteristics extracted from the URL.
      </p>

      <h2>Endpoint</h2>
      <pre>{`POST /api/analyze
Content-Type: application/json`}</pre>

      <h2>Request</h2>
      <pre>{`{
  "url": "https://example.com/login"
}`}</pre>

      <h2>Response</h2>
      <pre>{`{
  "url": "https://example.com/login",
  "riskScore": 12,
  "riskLevel": "low",
  "classification": "likely-legitimate",
  "explanation": [
    "No individual URL characteristic exceeded caution thresholds"
  ],
  "features": {
    "urlLength": 25,
    "domainLength": 11,
    "subdomainCount": 0,
    "usesHttps": true
  },
  "model":  { "name": "random-forest", "version": "1.4.2" },
  "timing": { "featureExtractionMs": 14, "inferenceMs": 23, "totalMs": 48 }
}`}</pre>

      <h2>Risk Levels</h2>
      <ul>
        <li><code>safe</code> — 0–19</li>
        <li><code>low</code> — 20–39</li>
        <li><code>suspicious</code> — 40–59</li>
        <li><code>high</code> — 60–79</li>
        <li><code>phishing</code> — 80–100</li>
      </ul>

      <h2>Notes</h2>
      <ul>
        <li>Backend <code>riskLevel</code> is authoritative when present. The
          numeric score is used only for visualization.</li>
        <li>Submitted URLs are treated as untrusted input. The client never
          navigates to, embeds, or fetches submitted URLs.</li>
        <li>When the backend does not return a field, the UI clearly
          displays <em>Unavailable</em> rather than substituting a value.</li>
      </ul>
    </div>
  </div>
);

Object.assign(window, {
  OverviewPage, HistoryPage, ModelPage, SystemPage, DocsPage, relTime,
});
