/* ============================================================
   Service layer — analyzeUrl(url, {signal, onStage})
   Contract:
     Request:  POST {API_BASE}/api/analyze   { url }
     Response: {
       url, riskScore, riskLevel, classification, explanation[],
       features{...}, model{name,version}, timing{featureExtractionMs,inferenceMs,totalMs}
     }
   Behaviour:
     - Real fetch first if API_BASE configured; falls back to mock on
       network failure, 404, or explicit ?mock=1
     - Reports pipeline stages via onStage callback
     - AbortSignal cancellation
     - 8s timeout
   ============================================================ */

(function () {
  const API_BASE =
    (typeof window !== "undefined" && window.__API_BASE__) ||
    (typeof document !== "undefined" &&
      document.documentElement.getAttribute("data-api-base")) ||
    "";

  const FORCE_MOCK =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mock") === "1";

  const DEFAULT_TIMEOUT = 8000;

  /* ---------- URL validation ---------- */
  function validateUrl(raw) {
    if (raw == null) return { ok: false, reason: "empty" };
    const trimmed = String(raw).trim();
    if (!trimmed) return { ok: false, reason: "empty" };
    let candidate = trimmed;
    if (!/^https?:\/\//i.test(candidate) && !/^ftp:\/\//i.test(candidate)) {
      candidate = "http://" + candidate;
    }
    try {
      const u = new URL(candidate);
      if (!u.hostname || u.hostname.length < 3) return { ok: false, reason: "invalid" };
      if (!/\./.test(u.hostname) && !/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)) {
        return { ok: false, reason: "invalid" };
      }
      if (!/^https?:$/i.test(u.protocol)) return { ok: false, reason: "unsupported" };
      return { ok: true, url: u, normalized: u.toString() };
    } catch (e) {
      return { ok: false, reason: "invalid" };
    }
  }

  /* ---------- Mock feature extraction ---------- */
  const SUSPICIOUS_KEYWORDS = [
    "login", "verify", "secure", "account", "update", "confirm",
    "signin", "wallet", "bank", "authenticate", "unlock", "recover",
    "password", "webscr", "billing", "invoice", "gift", "bonus",
  ];
  const SHORTENERS = new Set([
    "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd",
    "buff.ly", "cutt.ly", "rebrand.ly", "shorturl.at",
  ]);
  const TRUSTED_HINTS = new Set([
    "google.com", "github.com", "microsoft.com", "apple.com",
    "cloudflare.com", "amazon.com", "wikipedia.org", "stripe.com",
    "notion.so", "figma.com", "linear.app",
  ]);

  function extractFeatures(u) {
    const href = u.href;
    const host = u.hostname;
    const path = u.pathname + u.search;
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    const parts = host.split(".");
    const subdomainCount = Math.max(0, parts.length - 2);
    const specialChars = (href.match(/[@!$&'()*+,;=%?]/g) || []).length;
    const hyphens = (host.match(/-/g) || []).length;
    const digits = (host.match(/\d/g) || []).length;
    const dots = (host.match(/\./g) || []).length;
    const usesHttps = u.protocol === "https:";
    const shortener = SHORTENERS.has(host.toLowerCase());
    const lowered = href.toLowerCase();
    const suspiciousKeywords = SUSPICIOUS_KEYWORDS.filter(k => lowered.includes(k));
    const queryParamCount = [...u.searchParams].length;
    const hasAt = href.includes("@");
    const hasPunycode = /xn--/i.test(host);

    return {
      urlLength: href.length,
      domainLength: host.length,
      pathLength: path.length,
      subdomainCount,
      dotCount: dots,
      hyphenCount: hyphens,
      digitCount: digits,
      specialCharacterCount: specialChars,
      usesHttps,
      usesIpAddress: isIp,
      isShortener: shortener,
      suspiciousKeywordCount: suspiciousKeywords.length,
      suspiciousKeywords,
      queryParamCount,
      hasAtSymbol: hasAt,
      hasPunycode,
    };
  }

  /* ---------- Mock classifier ---------- */
  function mockClassify(u, features) {
    const host = u.hostname.toLowerCase();
    const rootDomain = host.split(".").slice(-2).join(".");
    let score = 0;
    const contribs = [];

    if (features.urlLength > 75) { score += 12; contribs.push({ k: "long_url", w: 12, text: "Unusually long URL" }); }
    else if (features.urlLength > 55) { score += 6; contribs.push({ k: "long_url", w: 6, text: "URL longer than typical" }); }

    if (features.subdomainCount >= 3) { score += 14; contribs.push({ k: "many_sub", w: 14, text: "Multiple subdomains detected" }); }
    else if (features.subdomainCount === 2) { score += 5; contribs.push({ k: "sub2", w: 5, text: "Two subdomain levels" }); }

    if (features.hyphenCount >= 3) { score += 10; contribs.push({ k: "hyphens", w: 10, text: "Frequent hyphen usage in domain" }); }
    else if (features.hyphenCount === 2) { score += 4; contribs.push({ k: "hyphens", w: 4, text: "Hyphens present in domain" }); }

    if (features.usesIpAddress) { score += 22; contribs.push({ k: "ip", w: 22, text: "IP address used instead of a conventional domain" }); }
    if (!features.usesHttps) { score += 10; contribs.push({ k: "http", w: 10, text: "HTTPS not detected" }); }
    if (features.isShortener) { score += 18; contribs.push({ k: "shortener", w: 18, text: "URL shortener domain" }); }
    if (features.hasAtSymbol) { score += 15; contribs.push({ k: "at", w: 15, text: "\u201C@\u201D symbol embedded in URL" }); }
    if (features.hasPunycode) { score += 12; contribs.push({ k: "puny", w: 12, text: "Internationalized (punycode) domain" }); }

    if (features.suspiciousKeywordCount >= 2) {
      score += 16;
      contribs.push({ k: "kw", w: 16, text: "Suspicious keyword pattern (\u201C" +
        features.suspiciousKeywords.slice(0, 3).join("\u201D, \u201C") + "\u201D)" });
    } else if (features.suspiciousKeywordCount === 1) {
      score += 7;
      contribs.push({ k: "kw", w: 7, text: "Suspicious keyword: \u201C" + features.suspiciousKeywords[0] + "\u201D" });
    }

    if (features.specialCharacterCount >= 10) { score += 8; contribs.push({ k: "special", w: 8, text: "High number of special characters" }); }
    if (features.digitCount >= 5 && !features.usesIpAddress) { score += 6; contribs.push({ k: "digits", w: 6, text: "Numeric-heavy domain" }); }
    if (features.queryParamCount >= 5) { score += 4; contribs.push({ k: "query", w: 4, text: "Many query parameters" }); }

    if (TRUSTED_HINTS.has(rootDomain)) {
      score = Math.max(2, score - 30);
      if (contribs.length === 0) contribs.push({ k: "clean", w: 0, text: "No suspicious URL patterns detected" });
    }

    // small deterministic jitter from URL string
    let hash = 0;
    for (let i = 0; i < u.href.length; i++) hash = (hash * 31 + u.href.charCodeAt(i)) | 0;
    score += Math.abs(hash) % 5;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let level = "safe";
    if (score >= 80) level = "phishing";
    else if (score >= 60) level = "high";
    else if (score >= 40) level = "suspicious";
    else if (score >= 20) level = "low";

    const classification =
      level === "phishing" ? "phishing" :
      level === "high" ? "likely-phishing" :
      level === "suspicious" ? "suspicious" :
      level === "low" ? "likely-legitimate" : "legitimate";

    const explanation = contribs.length
      ? contribs.sort((a, b) => b.w - a.w).slice(0, 6).map(c => c.text)
      : ["No individual URL characteristic exceeded caution thresholds"];

    return { score, level, classification, explanation, contribs: contribs.map(c => c.k) };
  }

  /* ---------- Timing helpers ---------- */
  const now = () => (performance && performance.now ? performance.now() : Date.now());
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  /* ---------- Public API ---------- */

  async function analyzeUrl(rawUrl, opts = {}) {
    const { signal, onStage } = opts;
    const validation = validateUrl(rawUrl);
    if (!validation.ok) {
      return { ok: false, kind: "validation", reason: validation.reason };
    }

    const t0 = now();
    onStage && onStage("validating");

    // Try real backend
    if (API_BASE && !FORCE_MOCK) {
      try {
        onStage && onStage("extracting");
        const ac = new AbortController();
        const linked = signal ? mergeSignals([signal, ac.signal]) : ac.signal;
        const timer = setTimeout(() => ac.abort("timeout"), DEFAULT_TIMEOUT);
        const res = await fetch(API_BASE.replace(/\/$/, "") + "/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ url: validation.normalized }),
          signal: linked,
        });
        clearTimeout(timer);
        if (!res.ok) throw new Error("HTTP " + res.status);
        onStage && onStage("inferring");
        const data = await res.json();
        onStage && onStage("success");
        return {
          ok: true,
          kind: "success",
          source: "cloud",
          result: normalizeResponse(data, validation.normalized, t0),
        };
      } catch (err) {
        if (err && (err.name === "AbortError" || String(err).includes("timeout"))) {
          return { ok: false, kind: "timeout" };
        }
        // Fall through to mock
      }
    }

    // Mock path — realistic staged timing
    try {
      const stageBudget = 240 + Math.random() * 320;
      onStage && onStage("extracting");
      await sleep(stageBudget);
      if (signal && signal.aborted) return { ok: false, kind: "cancelled" };

      const features = extractFeatures(validation.url);
      const featureExtractionMs = Math.round(8 + Math.random() * 22);

      const infBudget = 260 + Math.random() * 480;
      onStage && onStage("inferring");
      await sleep(infBudget);
      if (signal && signal.aborted) return { ok: false, kind: "cancelled" };

      const classified = mockClassify(validation.url, features);
      const inferenceMs = Math.round(14 + Math.random() * 42);
      const totalMs = Math.round(now() - t0);

      onStage && onStage("success");
      const payload = {
        url: validation.normalized,
        riskScore: classified.score,
        riskLevel: classified.level,
        classification: classified.classification,
        explanation: classified.explanation,
        contributingFeatures: classified.contribs,
        features,
        model: { name: "random-forest", version: "1.4.2" },
        timing: { featureExtractionMs, inferenceMs, totalMs },
        requestId: makeRequestId(),
        analyzedAt: new Date().toISOString(),
        source: "mock",
      };
      return { ok: true, kind: "success", source: "mock", result: payload };
    } catch (err) {
      return { ok: false, kind: "error", message: String(err && err.message || err) };
    }
  }

  function normalizeResponse(data, normalizedUrl, t0) {
    const totalMs = Math.round(now() - t0);
    return {
      url: data.url || normalizedUrl,
      riskScore: typeof data.riskScore === "number" ? data.riskScore : 0,
      riskLevel: data.riskLevel || null,
      classification: data.classification || null,
      explanation: Array.isArray(data.explanation) ? data.explanation : [],
      contributingFeatures: data.contributingFeatures || [],
      features: data.features || null,
      model: data.model || null,
      timing: data.timing || { totalMs },
      requestId: data.requestId || makeRequestId(),
      analyzedAt: data.analyzedAt || new Date().toISOString(),
      source: "cloud",
    };
  }

  function makeRequestId() {
    const chars = "0123456789abcdef";
    let out = "req_";
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * 16)];
    return out;
  }

  function mergeSignals(signals) {
    const ac = new AbortController();
    signals.forEach(s => {
      if (!s) return;
      if (s.aborted) ac.abort(s.reason);
      else s.addEventListener("abort", () => ac.abort(s.reason));
    });
    return ac.signal;
  }

  window.analyzerService = {
    analyzeUrl,
    validateUrl,
    API_BASE,
    FORCE_MOCK,
    isConnected: Boolean(API_BASE) && !FORCE_MOCK,
  };
})();
