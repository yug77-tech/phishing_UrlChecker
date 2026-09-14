/* Result view: hero (URL + meter + score + badge), callout,
   two-column grid (features + explanation), timing stats,
   inline architecture pipeline, model info, raw response drawer. */

const FEATURE_LABELS = {
  urlLength: "URL Length",
  domainLength: "Domain Length",
  pathLength: "Path + Query Length",
  subdomainCount: "Subdomains",
  dotCount: "Dot Count",
  hyphenCount: "Hyphens",
  digitCount: "Digits in Domain",
  specialCharacterCount: "Special Characters",
  usesHttps: "HTTPS",
  usesIpAddress: "IP Address as Host",
  isShortener: "URL Shortener",
  suspiciousKeywordCount: "Suspicious Keywords",
  queryParamCount: "Query Parameters",
  hasAtSymbol: "\u201C@\u201D Symbol",
  hasPunycode: "Punycode (xn--)",
};

const FEATURE_ORDER = [
  "urlLength", "domainLength", "pathLength",
  "subdomainCount", "dotCount", "hyphenCount", "digitCount",
  "specialCharacterCount", "queryParamCount",
  "usesHttps", "usesIpAddress", "isShortener", "hasAtSymbol", "hasPunycode",
  "suspiciousKeywordCount",
];

/* Which features "contributed" (matched heuristic keys) — for progressive
   disclosure only. Not presented as causal to the model. */
const CONTRIB_MAP = {
  long_url: ["urlLength"],
  many_sub: ["subdomainCount"],
  sub2: ["subdomainCount"],
  hyphens: ["hyphenCount"],
  ip: ["usesIpAddress"],
  http: ["usesHttps"],
  shortener: ["isShortener"],
  at: ["hasAtSymbol"],
  puny: ["hasPunycode"],
  kw: ["suspiciousKeywordCount"],
  special: ["specialCharacterCount"],
  digits: ["digitCount"],
  query: ["queryParamCount"],
};

function formatFeature(key, val) {
  if (val === true) return <span className="yes">Yes</span>;
  if (val === false) return <span className="no">No</span>;
  if (val == null) return <span className="neutral">—</span>;
  if (typeof val === "number") return val.toString();
  return String(val);
}

const RiskBadge = ({ level }) => {
  const iconMap = {
    safe: "shield-check",
    low: "shield-check",
    suspicious: "shield-alert",
    high: "shield-alert",
    phishing: "x-circle",
  };
  return (
    <span className="risk-badge" data-level={level.id} role="status">
      <Icon name={iconMap[level.id] || "shield"} size={12} className="risk-badge__icon" />
      {level.label}
    </span>
  );
};

const Meter = ({ level }) => {
  const zones = window.RISK_LEVELS;
  return (
    <div className="meter" aria-hidden="true">
      <div className="meter__zones">
        {zones.map(z => (
          <div
            key={z.id}
            className={"meter__zone" + (z.id === level.id ? " meter__zone--active" : "")}
            data-level={z.id}
          />
        ))}
      </div>
      <div className="meter__labels">
        {zones.map(z => (
          <span key={z.id} data-active={z.id === level.id}>{z.short}</span>
        ))}
      </div>
    </div>
  );
};

const ScoreDisplay = ({ score }) => (
  <div>
    <div className="result__score-label">Risk Score</div>
    <div className="result__score-value">
      {score}
      <span className="result__score-max"> / 100</span>
    </div>
  </div>
);

const Callout = ({ level }) => (
  <div className="callout" data-level={level.id} role="status">
    <Icon
      name={
        level.id === "phishing" || level.id === "high" ? "shield-alert" :
        level.id === "suspicious" ? "alert" :
        "shield-check"
      }
      size={16}
      className="callout__icon"
    />
    <div>
      <strong>{level.headline}.</strong> {level.guidance}
    </div>
  </div>
);

const InlinePipeline = ({ result }) => {
  const timing = result.timing || {};
  const features = result.features || {};
  const { level, score } = window.resolveRisk(result);
  const total = timing.totalMs;

  // Derive per-layer outcomes from the actual response
  let host = "";
  try { host = new URL(result.url).hostname; } catch {}

  const featureCount = features ? Object.keys(features).filter(k => k !== "suspiciousKeywords").length : 0;
  const contribCount = (result.contributingFeatures || []).length;
  const explCount = (result.explanation || []).length;

  const toneForLevel = {
    safe: "safe", low: "low", suspicious: "warn", high: "elev", phishing: "danger",
  }[level.id] || "safe";

  const stages = [
    {
      no: "01",
      name: "Client",
      desc: "URL received from client; validated as syntactically well-formed.",
      timingLabel: "—",
      outcomeLabel: "Submitted",
      rows: [
        ["Host", host || <span style={{ color: "var(--fg-faint)" }}>—</span>],
        ["Scheme", (result.url.startsWith("https://") ? "HTTPS" : "HTTP")],
        ["Length", (result.url.length) + " chars"],
      ],
    },
    {
      no: "02",
      name: "Feature Extraction",
      desc: "URL converted into a numerical feature vector.",
      timingLabel: fmtMs(timing.featureExtractionMs),
      outcomeLabel: "Vector produced",
      rows: [
        ["Features", featureCount ? featureCount + " values" : <span style={{ color: "var(--fg-faint)" }}>Unavailable</span>],
        ["Contributing", contribCount ? contribCount : "none"],
        ["Suspicious kws", features.suspiciousKeywordCount ?? 0],
      ],
    },
    {
      no: "03",
      name: "Model Inference",
      desc: "Random Forest classifier evaluated the vector.",
      timingLabel: fmtMs(timing.inferenceMs),
      outcomeLabel: "Predicted",
      rows: [
        ["Model", result.model?.name || <span style={{ color: "var(--fg-faint)" }}>Unavailable</span>],
        ["Score", { text: score + " / 100", tone: toneForLevel }],
        ["Level", { text: level.label, tone: toneForLevel, tag: true }],
      ],
    },
    {
      no: "04",
      name: "Response",
      desc: "Result returned to client with risk score, level, and explanation.",
      timingLabel: fmtMs(total),
      outcomeLabel: "Returned",
      rows: [
        ["Classification", result.classification || level.id],
        ["Explanation", explCount + " item" + (explCount === 1 ? "" : "s")],
        ["Source", result.source === "cloud" ? "cloud" : "local"],
      ],
    },
  ];

  return (
    <div className="pipeline">
      {stages.map(s => (
        <div key={s.no} className="pipeline__stage">
          <div className="pipeline__head">
            <span className="pipeline__no">{s.no}</span>
            <span className="pipeline__timing">
              <StatusDot tone="safe" size={5} />
              {s.timingLabel}
            </span>
          </div>
          <div className="pipeline__name">{s.name}</div>
          <div className="pipeline__desc">{s.desc}</div>

          <dl className="pipeline__outcome">
            <div className="pipeline__outcome-label">{s.outcomeLabel}</div>
            {s.rows.map(([k, v], i) => {
              const isObj = v && typeof v === "object" && !React.isValidElement(v);
              const val = isObj ? v.text : v;
              const tone = isObj ? v.tone : null;
              const isTag = isObj && v.tag;
              return (
                <div className="pipeline__outcome-row" key={i}>
                  <dt>{k}</dt>
                  <dd
                    className={isTag ? "tag" : ""}
                    data-tone={tone || undefined}
                    title={typeof val === "string" ? val : undefined}
                  >
                    {val}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
};

function fmtMs(v) {
  if (v == null || Number.isNaN(v)) return "Unavailable";
  return v + " ms";
}

const FeatureTable = ({ features, contribs }) => {
  if (!features) {
    return (
      <div className="panel__body">
        <div className="empty" style={{ margin: 0 }}>
          <h3>Feature data unavailable</h3>
          <p>The classifier response did not include extracted feature values.</p>
        </div>
      </div>
    );
  }
  const contribKeys = new Set();
  (contribs || []).forEach(k => (CONTRIB_MAP[k] || []).forEach(f => contribKeys.add(f)));

  return (
    <table className="feat-table" aria-label="Extracted URL features">
      <thead>
        <tr>
          <th style={{ width: "60%" }}>Feature</th>
          <th style={{ textAlign: "right" }}>Value</th>
        </tr>
      </thead>
      <tbody>
        {FEATURE_ORDER.filter(k => k in features).map(k => {
          const isContrib = contribKeys.has(k);
          return (
            <tr key={k} className={isContrib ? "row--contrib" : ""}>
              <td className={isContrib ? "" : "dim"}>
                {isContrib && <span className="contrib" title="Contributing characteristic" />}
                {FEATURE_LABELS[k] || k}
              </td>
              <td>{formatFeature(k, features[k])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const ExplanationPanel = ({ items }) => {
  if (!items || items.length === 0) {
    return (
      <div className="panel__body">
        <p style={{ margin: 0, color: "var(--fg-subtle)", fontSize: 13 }}>
          No explanation returned by the classifier.
        </p>
      </div>
    );
  }
  return (
    <ol className="expl">
      {items.map((t, i) => (
        <li key={i}>
          <span className="expl__marker">{String(i + 1).padStart(2, "0")}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
};

const KVList = ({ items }) => (
  <dl className="kv">
    {items.map(([k, v, unavailable]) => (
      <React.Fragment key={k}>
        <dt>{k}</dt>
        <dd className={unavailable ? "unavailable" : ""}>{v}</dd>
      </React.Fragment>
    ))}
  </dl>
);

const TimingStats = ({ timing }) => {
  const cells = [
    { label: "Feature Extraction", v: timing?.featureExtractionMs },
    { label: "Model Inference",    v: timing?.inferenceMs },
    { label: "Total Processing",   v: timing?.totalMs },
  ];
  return (
    <div className="stats">
      {cells.map(c => (
        <div className="stat" key={c.label}>
          <div className="stat__label">{c.label}</div>
          <div className="stat__value">
            {c.v == null ? <span style={{ color: "var(--fg-faint)", fontStyle: "italic" }}>Unavailable</span>
              : <>{c.v}<span className="stat__unit">ms</span></>}
          </div>
        </div>
      ))}
    </div>
  );
};

const RawResponse = ({ result }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="panel">
      <button
        className="panel__head"
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", cursor: "pointer", background: "transparent" }}
        aria-expanded={open}
      >
        <h3 className="panel__title">
          <Icon name={open ? "chevron-down" : "chevron-right"} size={12} />
          Raw response
        </h3>
        <span className="panel__sub mono">{result.requestId}</span>
      </button>
      {open && (
        <div className="panel__body" style={{ padding: 0 }}>
          <pre style={{
            margin: 0, padding: "14px 16px", fontFamily: "var(--font-mono)",
            fontSize: 12, color: "var(--fg-muted)", background: "var(--bg-inset)",
            borderTop: "1px solid var(--border)", overflowX: "auto",
            maxHeight: 320,
          }}>
{JSON.stringify(sanitizeForDisplay(result), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

function sanitizeForDisplay(r) {
  const { source, contributingFeatures, ...rest } = r;
  return rest;
}

const RiskResult = ({ result, onCopyUrl }) => {
  const { level, score } = window.resolveRisk(result);
  const analyzedAt = new Date(result.analyzedAt);
  const timeLabel = analyzedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateLabel = analyzedAt.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="result">
      <div className="result__hero">
        <div className="result__hero-top">
          <div className="result__url-wrap">
            <div className="result__url-label">Analyzed URL</div>
            <div className="result__url">
              <span className="result__url-text" title={result.url}>{result.url}</span>
              <CopyButton text={result.url} label="Copy URL" />
            </div>
            <div className="result__meta">
              <span><strong>Classification:</strong> {result.classification || level.id}</span>
              <span><strong>Analyzed:</strong> {dateLabel} · {timeLabel}</span>
              <span><strong>Request:</strong> {result.requestId}</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <StatusDot tone={result.source === "cloud" ? "safe" : "neutral"} size={6} />
                {result.source === "cloud" ? "cloud" : "local"}
              </span>
            </div>
          </div>

          <div className="result__score-block">
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <RiskBadge level={level} />
            </div>
            <ScoreDisplay score={score} />
          </div>
        </div>

        <Meter level={level} />
        <Callout level={level} />
      </div>

      <div className="result__grid">
        <div className="panel">
          <div className="panel__head">
            <h3 className="panel__title">
              <Icon name="filter" size={12} />
              URL Features
            </h3>
            <span className="panel__sub">
              <span className="contrib" style={{ marginRight: 6 }} />
              contributing characteristic
            </span>
          </div>
          <div className="panel__body panel__body--flush">
            <FeatureTable features={result.features} contribs={result.contributingFeatures} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div className="panel">
            <div className="panel__head">
              <h3 className="panel__title">
                <Icon name="info" size={12} /> Contributing Characteristics
              </h3>
              <span className="panel__sub">{(result.explanation || []).length} noted</span>
            </div>
            <div className="panel__body panel__body--flush">
              <ExplanationPanel items={result.explanation} />
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <h3 className="panel__title">
                <Icon name="cpu" size={12} /> Classification Engine
              </h3>
              <span className="panel__sub mono" style={{ color: "var(--safe)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <StatusDot tone="safe" size={6} /> operational
              </span>
            </div>
            <div className="panel__body panel__body--flush" style={{ padding: "10px 0" }}>
              <KVList items={[
                ["Model", result.model?.name || <span className="unavailable">Unavailable</span>, !result.model?.name],
                ["Version", result.model?.version || <span className="unavailable">Unavailable</span>, !result.model?.version],
                ["Feature Set", "URL Features"],
                ["Inference", result.source === "cloud" ? "Cloud" : "Local"],
              ]} />
            </div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3 className="panel__title">
            <Icon name="activity" size={12} /> Request Timing
          </h3>
          <span className="panel__sub">stages the request passed through</span>
        </div>
        <div className="panel__body panel__body--flush">
          <TimingStats timing={result.timing} />
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <h3 className="panel__title">
            <Icon name="server" size={12} /> Pipeline — what happened at each layer
          </h3>
          <span className="panel__sub">per-request outcomes across the four architectural layers</span>
        </div>
        <div className="panel__body panel__body--flush">
          <InlinePipeline result={result} />
        </div>
      </div>

      <RawResponse result={result} />
    </div>
  );
};

Object.assign(window, {
  RiskResult, RiskBadge, Meter, ScoreDisplay, InlinePipeline,
  FeatureTable, ExplanationPanel, KVList, TimingStats, FEATURE_LABELS, fmtMs,
});
