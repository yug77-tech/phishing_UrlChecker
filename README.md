# Handoff: Phishing Classification Console (Aperture)

## Overview

**Aperture** is a cloud-based phishing website classification dashboard. Users submit a URL, the system extracts numerical features from it, a cloud-hosted Random Forest classifier evaluates the feature vector, and the UI returns a risk score (0–100), risk level (Safe / Low / Suspicious / High / Phishing), an explanation of contributing URL characteristics, and per-stage pipeline timings.

The design intentionally reads as a **serious security infrastructure product** — closer in tone to Linear / Datadog / a security engineering console than to a marketing dashboard.

The application is a single-page app organized around **URL Analyzer** (the hero surface) with supporting operations pages: **Overview**, **Analysis History**, **Model**, **System Status**, **Documentation**.

## About the Design Files

The files in this bundle are **design references created in HTML** — a working prototype demonstrating the intended look, hierarchy, interactions, and states. **They are not production code to copy directly.**

Your task is to **recreate these HTML designs in the target codebase's existing environment** (React + TypeScript, Next.js, Vue, SwiftUI, native mobile, etc.) using its established patterns, component library, styling system, routing, and state management. If no environment exists yet, choose the most appropriate framework for the project (a React + TypeScript + Vite or Next.js app is a natural fit for this design) and implement there.

The HTML prototype was written with a clean service-layer split so the shape of the API contract, risk mapping, and state machine can be lifted directly into whatever framework you use — the visual + behavioral spec is what matters.

## Fidelity

**High-fidelity (hifi).** All colors, typography, spacing, radii, borders, and interaction states in the prototype are final. Recreate the UI pixel-close, adapting to the target codebase's component primitives and idioms (e.g. use your existing `Button`, `Table`, `Panel`, `Input` components; use your existing color-token system; use your router; use your query client).

Do not import the prototype's raw CSS. Instead, translate the design tokens listed below into your app's token system.

---

## Screens / Views

The app has a persistent shell (Sidebar + TopBar) with a content region that swaps between six routes. Hash routing is used in the prototype (`#analyzer`, `#overview`, etc.); use whatever routing your app already uses.

### App Shell

- **Layout**: CSS grid, `grid-template-columns: 232px 1fr`. Sidebar is fixed, sticky to the top, full-height. Main region contains a sticky topbar (48px) and a scrollable content area.
- **Sidebar (232px wide, `--bg-subtle` background, 1px `--border` right border)**:
  - Brand block at top (padded 18px 20px, 1px bottom border): 22×22 outlined square mark with an inscribed cross (not a logo image — pure CSS/SVG). Below the mark: `Aperture` (13px / 600) and subtitle `Phishing Classification` (11px / `--fg-subtle`).
  - Section headers: 10.5px uppercase, `letter-spacing: 0.08em`, `--fg-faint`, padded `16px 12px 4px`.
  - Two sections: **ANALYZE** (contains URL Analyzer) and **OPERATIONS** (Overview, Analysis History, Model, System Status, Documentation).
  - Nav item: 13px, `--fg-muted`, 6px 10px padding, `border-radius: 4px`, 14px icon before label. Hover: `--bg-muted` background. Active: `--bg-muted` background + `--fg` color + 500 weight.
  - Footer (bottom of sidebar, 1px top border, padded 14px 16px): two rows — `Model / random-forest · 1.4.2` and `Inference / ● Operational` (green dot + green text).
- **TopBar (48px, sticky, 1px bottom border, `--bg` background)**:
  - Left: menu button (mobile only), brand name muted, breadcrumb separator, current page name (500 weight).
  - Right: `● All systems operational` (11.5px, safe green dot); theme toggle button (moon/sun icon).
- **Mobile (≤820px)**: Sidebar transforms off-canvas, revealed by menu button in topbar, dismissed by scrim overlay.

### 1. URL Analyzer (`#analyzer`) — the hero surface

The entry point and highest-polish surface.

- **Page head**: `URL Analyzer` (22px / 600 / -0.015em) with description `Enter a URL to evaluate its phishing risk using the cloud-hosted Random Forest classifier.` (13.5px, `--fg-muted`). Right side: mono `random-forest · 1.4.2`.

- **Analyzer card** (1px `--border`, 6px radius, 24px padding, `--bg`):
  - Small uppercase label: `⊘ ANALYZE A WEBSITE` (11px / 500 / 0.06em / `--fg-subtle`).
  - Input row: 3-column grid `1fr auto auto`, 8px gap.
    - **Input** (40px height, 1px `--border-strong`, 4px radius): mono `https://` prefix chip in `--fg-faint`, then the actual `<input>` (mono, 13.5px). Focus state: border becomes `--fg`, 3px focus ring. Error state: border becomes `--danger`. Clear (×) button appears at right when the field has a value and isn't busy.
    - **Paste button** (`btn--ghost`): 40px height, 1px `--border-strong`, 18px horizontal padding.
    - **Analyze URL button** (`btn--primary`): `--fg` background, `--fg-inverse` text, 40px height, 18px horizontal padding. Disabled during analysis, label becomes `Analyzing…`.
  - Hints row (below input, 12px, `--fg-subtle`): `[Enter] to analyze  · [/] to focus input` — kbd chips use `--font-mono`, 10.5px, 1px border, 3px radius. Right-aligned tail: connection status — either `Connected to cloud classifier` or `Local classifier · configure API base for cloud inference`.
  - Error row (in place of hints when validation fails): `⚠ Enter a valid URL such as https://example.com.` in `--danger`.

- **Progress pipeline** (appears below the input during analysis, 1px top border, 18px top padding):
  - 4-column grid, 8px gap.
  - Each **stage card** (`--bg-subtle` background, 1px `--border`, 4px radius, `10px 12px` padding, 8px gap):
    - Head row (mono, 11px, `--fg-subtle`): stage number `01`–`04` left, status right (`queued` / `running` / `done` / `failed`).
    - Label: 12.5px / 500 / `--fg` — `Validating URL`, `Extracting features`, `Running classifier`, `Preparing result`.
    - Progress bar: 2px tall, `--border` background, `--fg` fill. Fills to 92% while `active`, snaps to 100% when `done`. Uses a CSS keyframe `stage-fill` over 800ms `cubic-bezier(0.4, 0, 0.2, 1)`.
  - Pending stages have their labels dimmed to `--fg-faint`.

- **Empty state** (when no analysis has been run yet): dashed 1px `--border-strong`, 6px radius, `--bg-subtle` background, 40px vertical padding, centered content. Title `No analysis yet` (14px / 600) + description `Submit a URL above to see the classifier's risk assessment, extracted features, and pipeline timings.` (13px / `--fg-subtle`).

- **Divider label** above results: `LATEST RESULT` (11px uppercase, 0.08em, `--fg-subtle`) with a 1px `--border` rule extending to the right.

### 2. Result View (rendered inline on the Analyzer page after a successful analysis)

The most important surface in the product. Composed of five stacked sections:

#### 2a. Hero panel (1px `--border`, 6px radius, overflow hidden)

- **Top region** (padded 22px 24px, 1px bottom border, 2-column grid `1fr auto`):
  - **Left — URL block**:
    - Label `ANALYZED URL` (10.5px uppercase, 0.08em, `--fg-subtle`).
    - URL box: horizontal flex, mono 13px, `--bg-inset` background, 1px `--border`, 4px radius, `4px 8px` padding. URL text truncates with ellipsis; full URL is in the `title` attribute. **Copy button** on the right (14px copy icon; becomes a check for 1200ms after clicking).
    - Meta row below (11.5px mono, `--fg-subtle`, 14px gap): `Classification:` value · `Analyzed:` date + time · `Request:` `req_...` id · right-tail: source dot (`● cloud` or `○ local`).
  - **Right — score block** (right-aligned, min-width 180px):
    - **Risk badge** (small pill, 26px tall, 10px padding, 3px radius, mono 11.5px / 600 / 0.04em uppercase). Colors set by risk level (see Design Tokens → Semantic Status). Icon: `shield-check` for safe/low, `shield-alert` for suspicious/high, `x-circle` for phishing.
    - Label `RISK SCORE` (10.5px uppercase, 0.08em, `--fg-subtle`).
    - **Score value**: mono 44px / 500 / -0.02em, tabular-nums. Followed by mono 15px `/ 100` in `--fg-faint`.

- **Segmented meter** (5-zone bar, padded 20px 24px, 1px bottom border):
  - 5-column grid with 4px gaps.
  - Each **zone**: 8px tall, 2px radius, `--bg-muted` background, 1px `--border`. The zone matching the current risk level is filled with the semantic color (see tokens) and its border is transparent.
  - Below zones: 5 labels (mono 10.5px, 0.06em uppercase, `--fg-faint`) — `SAFE`, `LOW`, `SUSPICIOUS`, `HIGH`, `PHISHING`. The label for the active zone becomes `--fg`.

- **Callout** (1px top border, 12px 16px padding, 13px text, 1.55 line-height, background matches active risk tone at low opacity):
  - Icon on the left (16px, matches severity). Text on the right.
  - Copy structure: `<strong>[Level headline].</strong> [Guidance sentence.]`
  - Wording is deliberately non-absolutist (see Risk Levels below). E.g. for `phishing`: **"Classified as phishing."** *"This URL has been classified as high risk by the phishing detection model. Do not enter credentials or sensitive information on this site."*

#### 2b. Two-column grid (1.4fr / 1fr, 20px gap; collapses to 1 col ≤960px)

- **Left column — URL Features panel** (1px `--border`, 6px radius):
  - Panel head (12px 16px, 1px bottom border): `⌦ URL Features` title (12.5px / 600); right-aligned sub `● contributing characteristic` (with a small amber dot).
  - Feature table (full width, no outer border, per-row 1px `--border-subtle` bottom):
    - Header row (`--bg-subtle` background): `FEATURE` / `VALUE`, 11px uppercase 0.06em, `--fg-subtle`, `9px 16px` padding.
    - Body rows: label left (`--fg-muted` for non-contributing, `--fg` + 500 for contributing rows with a 5px amber dot prefix); value right, mono.
    - Boolean values: `Yes` in `--safe` when it means "safe" (HTTPS: Yes), `No` in `--danger` when it means "bad" (HTTPS: No, IP as host: Yes → shown as `Yes` in `--danger`). Numbers plain mono.
  - **Feature order**: URL Length, Domain Length, Path + Query Length, Subdomains, Dot Count, Hyphens, Digits in Domain, Special Characters, Query Parameters, HTTPS, IP Address as Host, URL Shortener, "@" Symbol, Punycode (xn--), Suspicious Keywords.

- **Right column — stacked**:
  - **Contributing Characteristics panel**: head `ⓘ Contributing Characteristics` + sub `N noted`. Body is an ordered list, no bullets, each row: 2-digit mono index (`01`, `02`, …) in `--fg-faint` + text in `--fg`. 10px 16px padding per row, 1px bottom rule.
  - **Classification Engine panel**: head `⌬ Classification Engine` + green mono `● operational`. Body is a compact `<dl>` — `Model / random-forest`, `Version / 1.4.2`, `Feature Set / URL Features`, `Inference / Cloud` (or `Local`). Labels 13px `--fg-subtle`, values mono `--fg`, right-aligned. Missing values render as italic `Unavailable` in `--fg-faint`.

#### 2c. Request Timing panel (three-up stat block)

- Head: `↝ Request Timing` + sub `stages the request passed through`.
- Body is a 3-column grid, no gaps, 1px vertical dividers between columns:
  - Each **stat**: label 10.5px uppercase 0.08em `--fg-subtle`; value mono 22px / 500 / tabular-nums; unit `ms` in 12px `--fg-faint` with 4px left margin.
  - Cells: `Feature Extraction`, `Model Inference`, `Total Processing`. Missing = italic `Unavailable` in `--fg-faint`.

#### 2d. Pipeline — "what happened at each layer" (per-request outcomes)

- Head: `▤ Pipeline — what happened at each layer` + sub `per-request outcomes across the four architectural layers`.
- Body: 4-column grid, no gap, 1px right border between columns (rotated caret decorations peek out where columns meet, at 44px from top). Each **stage** (`padding: 14px 16px 12px`, flex column, 8px gap):
  - Head row: mono `01`–`04` (10.5px, `--fg-faint`) on the left; per-stage timing on the right (mono 11px, `--fg-subtle`) prefixed by a 5px safe-green dot.
  - Stage name: 12.5px / 600.
  - Description: 11.5px / `--fg-subtle`, 1.45 line-height.
  - **Outcome block** (pushed to bottom via `margin-top: auto`, 1px dashed `--border` top rule, 8px top padding):
    - Small caps label (`SUBMITTED` / `VECTOR PRODUCED` / `PREDICTED` / `RETURNED`), mono 9.5px, 0.1em uppercase, `--fg-faint`.
    - 3 rows of key/value: label 11.5px `--fg-subtle` left; value mono 11.5px `--fg` right (ellipsis-truncated, tabular-nums).
- **Per-stage outcome data** (derived from the response, not decorative):
  - **01 Client** — `Host: <hostname>`, `Scheme: HTTPS|HTTP`, `Length: N chars`.
  - **02 Feature Extraction** — `Features: N values`, `Contributing: N|none`, `Suspicious kws: N`.
  - **03 Model Inference** — `Model: random-forest`, `Score: N / 100` (colored by risk tone), `Level: <label>` (colored + sans-serif).
  - **04 Response** — `Classification: <string>`, `Explanation: N items`, `Source: cloud|local`.
- Score/level values apply the risk tone color via `data-tone` attribute (safe/low/warn/elev/danger).
- Missing fields render as `—` or italic `Unavailable`.

#### 2e. Raw response drawer (collapsed by default)

- Panel head is a full-width button — icon flips between chevron-right (collapsed) and chevron-down (expanded); title `Raw response`; right-side sub is the mono request ID.
- Expanded body: 1px top border on `--bg-inset`, mono 12px `<pre>` with the JSON-stringified response (excluding internal fields), max-height 320px, horizontal overflow scroll.

### 3. Overview (`#overview`)

- Page head: `Overview` + description `Operational summary of the classification service and recent activity.` Right: mono `last 7d` label + ghost button `Analyze URL →`.
- **Stat grid** (4 columns, 16px gap; 2-col ≤900px, 1-col ≤520px). Each metric (1px `--border`, 6px radius, 16px 18px padding, min-height 100px, flex column 8px gap):
  - `URLs Analyzed` — total count, sub `across all sources`.
  - `High Risk / Phishing` — count, colored `--danger` if > 0; sub shows percentage.
  - `Suspicious` — count, colored `--warn` if > 0; sub shows percentage.
  - `Avg. Inference` — mono `N ms`; **sparkline below** — 32px tall SVG, 200px wide, showing recent inference latency reversed (most recent right).
- **Two-column layout** (1.5fr / 1fr, 20px gap):
  - Left: **Recent Analyses panel** — head with `⌚ Recent Analyses` + `View all` chip. Body is a compact 4-column table: URL / Risk / Score (right-aligned mono) / Time (right-aligned mono relative time, e.g. `just now`, `12m ago`, `3h ago`, `2d ago`).
  - Right (stacked): **Model panel** (KV list: Model, Version, Feature Set, Inference) + **Service Health panel** (4 rows: Client API / Feature Extraction / Model Inference / Model — each with safe-green dot + `Operational` or `Loaded`).
- Empty state (no analyses): dashed empty state card with `Analyze a URL` primary CTA.

### 4. Analysis History (`#history`)

- Page head: `Analysis History` + description `Previously analyzed URLs and their classifications.` Right: mono `N of M` count + `Clear` chip.
- **Filter bar** (14px gap, wraps):
  - Search box (32px height, 1px `--border-strong`, min-width 280px, max-width 420px, flex 1) with search icon and `Search URLs` placeholder.
  - Risk filter chips: `All`, `Safe`, `Low`, `Suspicious`, `High`, `Phishing`. Active chip: `--fg` background, `--fg-inverse` text.
  - Right-aligned sort chips: `Recent` / `Highest score`.
- **Table** (1px `--border`, 6px radius, horizontal scroll on overflow, min-width 720px):
  - Columns: URL (mono, ellipsis, max-width 340px) / Risk (badge) / Score (right-aligned mono) / Classification (mono, dim) / Inference (right-aligned mono `N ms`) / Time (right-aligned mono relative).
  - Header row `--bg-subtle`, 11px uppercase 0.06em `--fg-subtle`, sticky.
  - Row hover: `--bg-subtle` background + pointer cursor (rows are clickable; clicking opens that record in Analyzer).
- Empty state when history is empty.

### 5. Model (`#model`)

- Page head: `Model` + description `Random Forest phishing classifier operating on URL-derived numerical features.`.
- **Stat grid** (3 columns):
  - `Model` — value `Random Forest` (18px), sub mono `v1.4.2`.
  - `Avg. Inference` — mono `N ms`; sub mono `p95 · N ms`.
  - `Requests Served` — count; sub mono `since first analysis`.
- **Two-column layout**:
  - Left: **Configuration panel** — KV list: Algorithm, Version, Feature Set, Feature Count (`15`), Inference, Status (with green dot + `Operational`).
  - Right: **Feature Vector panel** — head with sub `extracted per request`. Body is a list of feature names (13px, human labels on left) with their raw keys (mono 12px, `--fg-subtle`) on the right. 6px 16px padding per row.

### 6. System Status (`#system`)

- Page head: `System Status` + description `Health and latency of services that make up the phishing classification pipeline.` Right: mono `checked · HH:MM:SS`.
- **Status list** (1px `--border`, 6px radius, `--bg`):
  - Each **status row** (14px 20px padding, 4-column grid `1fr auto auto auto`, 24px gap, 1px `--border-subtle` bottom):
    - Left: service name (13.5px / 500) + description (12.5px / `--fg-subtle`).
    - Latency column: mono 12px `N ms`.
    - Last checked: mono 11.5px `just now`.
    - Status pill: green dot + `Operational` (safe green); amber for `Degraded`; red for down.
  - Rows: `Client API` (24 ms) / `Feature Extraction Service` (18 ms) / `Model Inference Service` (31 ms) / `Random Forest Model` (— / `Loaded`) / `Analysis Store` (9 ms).
- **Divider label**: `ARCHITECTURE`.
- **Architecture stages** (stacked, 16px gap between them; 1px `--border-strong` vertical connector between each):
  - Each **stage card** (1px `--border`, 6px radius, 20px 24px padding, 3-col grid `60px 1fr auto` with 20px gap):
    - Mono 22px `01`–`04` in `--fg-faint`.
    - Body: `<h3>` name (15px / 600) + `<p>` description (13px / `--fg-muted`, max-width 60ch, 1.5 line-height).
    - Status column: green dot + `Operational`.
  - Stage content:
    1. **Client Layer** — "Users submit URLs through desktop browser, mobile browser, or a mobile application. Submissions are treated as untrusted data and never rendered as active resources."
    2. **Feature Extraction Layer** — "The submitted URL is converted into a numerical feature vector — length, subdomain counts, character composition, protocol usage, and other URL-derived signals."
    3. **Model Inference Layer** — "The feature vector is evaluated by a cloud-hosted Random Forest classifier. Returns a risk score and confidence."
    4. **Response Layer** — "The classifier's output — score, risk level, and explanation — is returned to the client for presentation."

### 7. Documentation (`#docs`)

Long-form prose reference with:
- Overview paragraph.
- **Endpoint** code block: `POST /api/analyze` / `Content-Type: application/json`.
- **Request** JSON block: `{ "url": "https://example.com/login" }`.
- **Response** JSON block: full response shape (see API Contract below).
- **Risk Levels** ul: score ranges per level.
- **Notes** ul: backend authoritativeness, security handling, "Unavailable" behavior.

Uses `.prose` styling — max-width 68ch, 14px / 1.65 body, `<h2>` at 15px / 600, `<code>` chips with `--bg-inset` background, `<pre>` blocks with `--bg-inset` background + 1px border + 4px radius + 14px 16px padding + mono 12.5px.

---

## Interactions & Behavior

### URL Analyzer state machine

Model the analyzer as an explicit finite state machine:

```
idle → validating → extracting → inferring → success
                                            → error
                                            → timeout
                                            → cancelled
```

- **idle**: input empty or ready for input.
- **validating**: on submit, run client-side URL validation before hitting the network.
- **extracting**: feature-extraction stage of the pipeline; stage-02 progress bar animates.
- **inferring**: model inference stage; stage-03 progress bar animates.
- **success**: response received; stage-04 briefly ticks; result view renders.
- **error / timeout / cancelled**: show error message; stages either freeze or unmount after ~600ms.

### URL validation

- Trim whitespace.
- If no scheme, prepend `http://` before validation (so bare hostnames are accepted).
- Reject if hostname is < 3 chars.
- Reject if hostname has no `.` (unless it's a bare IPv4 literal).
- Only accept `http:` and `https:` schemes; anything else → `unsupported`.

Error messages:
- `empty` → "Enter a URL to begin analysis."
- `invalid` → "Enter a valid URL such as https://example.com."
- `unsupported` → "This URL format isn't supported."
- `timeout` → "The analysis took too long to complete. Please try again."
- `error` → "We couldn't complete the analysis. Please try again."

### Keyboard

- `Enter` inside the input submits.
- `Escape` while busy cancels the request (aborts the fetch).
- `/` from anywhere (except inside another input) focuses the URL input and navigates to the Analyzer route.

### Copy interactions

- Every copy button swaps its icon to a check for 1200ms after a successful `navigator.clipboard.writeText`. Icon-only, no toast.

### Theme

- Light / dark toggle in topbar. Persists to `localStorage` under `aperture.theme`. Initial value follows `prefers-color-scheme` if not set.
- Applied via `data-theme="dark"` on `<html>` — CSS custom properties are overridden inside `:root[data-theme="dark"]`.
- Boot script runs synchronously in `<head>` before render to prevent theme flash.

### Persistence

- `aperture.history.v1` — full analysis history array (bounded to 200 entries, most-recent first).
- `aperture.current.v1` — the last-viewed result (so a page reload preserves the Analyzer's rendered result).
- `aperture.route` — last-viewed route (used only when hash is absent).
- `aperture.seeded.v1` — flag to prevent re-seeding demo data on subsequent loads.

Seeding: on first load, silently populate `history` with ~15 realistic analyses spanning the last week (mix of safe / low / suspicious / high / phishing). Do not label them as seed/demo in the UI.

### Progressive disclosure

- Feature Table marks contributing rows with an amber dot; the "Contributing Characteristics" panel lists the human-readable reasons the model flagged the URL. **Do not** claim causal attribution — describe them as "contributed to" the assessment.
- Raw response drawer is collapsed by default; expands to show the JSON.

### Responsive behavior

- **Desktop (>820px)**: sidebar visible, all grids at full column count.
- **Tablet (≤960px)**: `.result__grid` collapses to 1 column.
- **Mobile (≤820px)**: sidebar becomes off-canvas (transform, 160ms ease-out) with a scrim, menu button appears in topbar; `result__hero-top` stacks; progress + pipeline become 2×2 grids; timing stats stack; analyzer row stacks; feature/history tables horizontal-scroll.
- **Mobile (≤520px)**: overview stat grid becomes 1 column.

### Accessibility

- Semantic HTML: `<aside>` for sidebar, `<header>` for topbar, `<main>`, `<nav>`, `<section>` for the analyzer, `<table>` for tabular data.
- `role="status"` on risk badge, callout, and progress region.
- `aria-live="polite"` on the analyze button and progress region.
- `aria-invalid` + `aria-describedby="analyzer-error"` on the input when it has a validation error.
- All buttons have `aria-label` and `title` where the label is icon-only.
- Focus rings: 3px `rgba(17, 17, 20, 0.14)` (light) / `rgba(237, 237, 240, 0.16)` (dark) via `--focus-ring`.
- Color is never the only channel — every semantic state is also conveyed with an icon and text label.
- Respects `prefers-reduced-motion` — animations reduced to 0.001ms.

### Motion

Subtle only. Every animation is short and functional:
- Stage progress bar: 800ms `cubic-bezier(0.4, 0, 0.2, 1)`.
- Sidebar slide-in (mobile): 160ms ease-out.
- Nav / button / chip hovers: 80ms ease.
- Toast enter: 160ms ease-out, translate + fade.
- No parallax, no bounce, no springs, no decorative motion.

---

## State Management

Suggested store shape (framework-agnostic):

```ts
type RiskLevel = 'safe' | 'low' | 'suspicious' | 'high' | 'phishing';
type AnalyzerState =
  | 'idle' | 'validating' | 'extracting' | 'inferring'
  | 'success' | 'error' | 'timeout' | 'cancelled';

interface Features {
  urlLength: number;
  domainLength: number;
  pathLength: number;
  subdomainCount: number;
  dotCount: number;
  hyphenCount: number;
  digitCount: number;
  specialCharacterCount: number;
  usesHttps: boolean;
  usesIpAddress: boolean;
  isShortener: boolean;
  suspiciousKeywordCount: number;
  suspiciousKeywords: string[];
  queryParamCount: number;
  hasAtSymbol: boolean;
  hasPunycode: boolean;
}

interface AnalysisResult {
  url: string;
  riskScore: number;         // 0..100
  riskLevel: RiskLevel;
  classification: string;    // e.g. 'phishing', 'likely-legitimate'
  explanation: string[];
  contributingFeatures: string[];
  features: Features;
  model: { name: string; version: string };
  timing: {
    featureExtractionMs: number;
    inferenceMs: number;
    totalMs: number;
  };
  requestId: string;
  analyzedAt: string;        // ISO
  source: 'cloud' | 'local';
}

interface AppState {
  route: 'analyzer' | 'overview' | 'history' | 'model' | 'system' | 'docs';
  theme: 'light' | 'dark';
  analyzer: {
    state: AnalyzerState;
    currentInput: string;
    errorKind: string | null;
    errorMessage: string;
    currentStage: 'validate' | 'extract' | 'infer' | 'respond' | null;
    abortController: AbortController | null;
  };
  currentResult: AnalysisResult | null;
  history: AnalysisResult[];
}
```

### Data flow

1. User types in the input → `analyzer.currentInput` updates (controlled input).
2. User presses Enter or clicks Analyze → `analyzer.state = 'validating'`. Run client-side validation. If invalid → `state = 'error'`, set `errorKind` + `errorMessage`.
3. If valid → `state = 'extracting'`, `currentStage = 'extract'`. Kick off request to `POST /api/analyze` (see API contract) via a service module. Store an `AbortController` for the request.
4. Service dispatches `onStage` callbacks to advance UI: `extracting` → `inferring` → `success`.
5. On success → `state = 'success'`, prepend the result to `history` (dedupe by `requestId`, cap at 200), set `currentResult`, persist to localStorage.
6. On failure → `state = 'error' | 'timeout' | 'cancelled'`, set error, keep last successful `currentResult` visible.

### Risk resolution (centralize this)

Backend `riskLevel` is authoritative when present. If missing, derive from `riskScore` via the level ranges. Score is used **only** for visualization (meter position + numeric display). Do not scatter the mapping — keep it in one module.

---

## API Contract

The prototype ships with a **local classifier fallback** so it works offline. In production you point it at your real endpoint via `window.__API_BASE__` or `<html data-api-base="…">`.

### Endpoint

```
POST {API_BASE}/api/analyze
Content-Type: application/json
Accept: application/json
```

### Request

```json
{ "url": "https://example.com/login" }
```

### Response (example)

```json
{
  "url": "https://example.com/login",
  "riskScore": 12,
  "riskLevel": "low",
  "classification": "likely-legitimate",
  "explanation": [
    "No individual URL characteristic exceeded caution thresholds"
  ],
  "contributingFeatures": [],
  "features": {
    "urlLength": 25,
    "domainLength": 11,
    "pathLength": 6,
    "subdomainCount": 0,
    "dotCount": 1,
    "hyphenCount": 0,
    "digitCount": 0,
    "specialCharacterCount": 0,
    "usesHttps": true,
    "usesIpAddress": false,
    "isShortener": false,
    "suspiciousKeywordCount": 1,
    "suspiciousKeywords": ["login"],
    "queryParamCount": 0,
    "hasAtSymbol": false,
    "hasPunycode": false
  },
  "model": { "name": "random-forest", "version": "1.4.2" },
  "timing": { "featureExtractionMs": 14, "inferenceMs": 23, "totalMs": 48 },
  "requestId": "req_a1b2c3d4e5f6",
  "analyzedAt": "2026-09-08T14:23:19.482Z"
}
```

### Behavior

- **Timeout**: 8 seconds, then abort → surface as `timeout` state.
- **Cancellation**: pass an `AbortSignal` from the analyzer so `Escape` or a new submission can abort in-flight requests.
- **Missing fields**: never fabricate. If `model.version` isn't returned, render *Unavailable* in italic `--fg-faint`. Same for any timing field.
- **Auth**: not part of the design — inherit from the target codebase's auth pattern.
- **Secrets**: no API keys or credentials in the frontend. Ever.

---

## Risk Levels (canonical mapping)

| ID | Label | Score range | Semantic tone | Callout headline |
|---|---|---|---|---|
| `safe` | Safe | 0–19 | `--safe` (green) | "No suspicious characteristics detected." |
| `low` | Low Risk | 20–39 | `--low` (olive-green) | "Minor characteristics of note." |
| `suspicious` | Suspicious | 40–59 | `--warn` (amber) | "Uncertain classification — proceed with caution." |
| `high` | High Risk | 60–79 | `--elev` (orange) | "Elevated risk — treat as untrusted." |
| `phishing` | Phishing | 80–100 | `--danger` (red) | "Classified as phishing." |

Guidance sentences (each accompanies the callout headline):

- **Safe** — "This URL passed all standard phishing checks in the classifier's feature space."
- **Low** — "The classifier flagged minor URL characteristics but did not identify a coherent phishing pattern."
- **Suspicious** — "Several URL characteristics contributed to an elevated risk assessment. Verify the destination independently before entering credentials."
- **High** — "This URL exhibits characteristics commonly associated with phishing. Avoid entering credentials unless you can independently verify the website."
- **Phishing** — "This URL has been classified as high risk by the phishing detection model. Do not enter credentials or sensitive information on this site."

---

## Security UX (critical)

Submitted URLs are **untrusted data**. The frontend must:

- Never navigate to a submitted URL (no `<a href>` on the submitted URL string, no `window.open`, no automatic redirects).
- Never render the URL inside an `iframe`.
- Never fetch the URL from the frontend.
- Never inject the URL as HTML — render it only as text inside `<code>` / `<span>` elements. Framework's default text-node rendering handles escaping.
- Copy button uses `navigator.clipboard.writeText` — plain string, never `.innerHTML`.
- Do not expose backend endpoints, credentials, or model internals to the client. `window.__API_BASE__` is only the public host — no keys.

---

## Design Tokens

### Colors — Light

| Token | Value |
|---|---|
| `--bg` | `#ffffff` |
| `--bg-subtle` | `#fafafa` |
| `--bg-muted` | `#f4f4f5` |
| `--bg-inset` | `#f7f7f8` |
| `--border` | `#e6e6e8` |
| `--border-strong` | `#d4d4d8` |
| `--border-subtle` | `#ececee` |
| `--fg` | `#111114` |
| `--fg-muted` | `#52525b` |
| `--fg-subtle` | `#71717a` |
| `--fg-faint` | `#a1a1aa` |
| `--fg-inverse` | `#ffffff` |
| `--neutral-dot` | `#a1a1aa` |

### Colors — Dark

| Token | Value |
|---|---|
| `--bg` | `#0a0a0b` |
| `--bg-subtle` | `#0f0f11` |
| `--bg-muted` | `#17171a` |
| `--bg-inset` | `#131316` |
| `--border` | `#26262a` |
| `--border-strong` | `#35353a` |
| `--border-subtle` | `#1e1e21` |
| `--fg` | `#ededf0` |
| `--fg-muted` | `#a1a1aa` |
| `--fg-subtle` | `#8b8b93` |
| `--fg-faint` | `#56565d` |
| `--fg-inverse` | `#0a0a0b` |

### Colors — Semantic status (both themes have paired bg/border)

| Level | Light fg | Light bg | Light border | Dark fg | Dark bg | Dark border |
|---|---|---|---|---|---|---|
| Safe (`--safe`) | `#157f3d` | `#ecf7ef` | `#cde8d4` | `#3fb264` | `#10241a` | `#1e3d2c` |
| Low (`--low`) | `#4d7c0f` | `#f2f7e8` | `#d8e5b7` | `#8db43c` | `#1b2412` | `#2e3f1e` |
| Suspicious (`--warn`) | `#a16207` | `#fbf5e5` | `#ecdfa8` | `#d99a1c` | `#2a2110` | `#46381b` |
| Elevated (`--elev`) | `#c2410c` | `#fbeee2` | `#eecdaf` | `#ea7a3f` | `#2a1a10` | `#4a2c1a` |
| Danger (`--danger`) | `#b42318` | `#fbe9e7` | `#f2c4bd` | `#e15a4b` | `#2a1512` | `#4a221d` |

### Typography

- **Sans**: `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- **Mono**: `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace` — with `font-variant-numeric: tabular-nums` on numeric values.
- **Base body**: 13.5px / 1.5 line-height.
- **Font smoothing**: `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`.
- **Zero webfonts.** Do not add Inter/Geist/etc. — the design commits to system fonts.

Scale (used throughout):

| Purpose | Size / weight / tracking |
|---|---|
| Page title | 22px / 600 / -0.015em |
| Section header (h3) | 15px / 600 / -0.005em |
| Panel title | 12.5px / 600 / -0.005em |
| Body | 13.5px / 400 |
| Body muted | 13px |
| Body small | 12–12.5px |
| Meta / mono | 11.5–12px |
| Uppercase label | 10.5–11px / 500 / 0.06–0.08em |
| Risk score value | 44px / 500 / -0.02em, mono, tabular-nums |
| Stat value | 22px / 500 / -0.01em, mono, tabular-nums |
| Metric value | 26px / 500 / -0.01em, mono, tabular-nums |
| Kbd | 10.5px, mono |

### Spacing

The design uses a loose 4/8 rhythm. Common values: 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40. Page padding 32px top/sides (16px on mobile), 64px bottom. Panels padded 12px 16px in the head and 16px in the body (or `--flush` at 0).

### Radius

- `--radius-sm`: 3px (chips, kbd, small badges)
- `--radius`: 4px (inputs, buttons, chips, stage cards)
- `--radius-lg`: 6px (panels, cards, hero, tables)
- Risk badge: 3px specifically (deliberately restrained).

### Shadows

- `--shadow-sm`: `0 1px 0 rgba(17, 17, 20, 0.04)` — extremely subtle 1px shadow.
- `--shadow-md`: `0 4px 12px -6px rgba(17, 17, 20, 0.14), 0 1px 2px rgba(17, 17, 20, 0.04)` — reserved for the mobile sidebar and toast.

**Do not use gradients. Do not add glow / glass / backdrop-filter effects. Do not add purple/violet anywhere.**

### Focus ring

- `--focus-ring`: `0 0 0 3px rgba(17, 17, 20, 0.14)` (light) / `0 0 0 3px rgba(237, 237, 240, 0.16)` (dark).
- Applied via `:focus-visible` on interactive elements. Uses `box-shadow` (not `outline`) so it composes with existing borders.

---

## Assets

No image, video, or font assets. Everything is text, CSS, and inline SVG.

- **Brand mark**: pure CSS — 22×22 outlined square with an inscribed cross drawn using `::before` and `::after` (see `.sidebar__mark` in `styles.css`).
- **Favicon**: inline SVG data URI (see `<head>` of the HTML).
- **Icons**: hand-drawn minimal SVG set in `icons.jsx`. 1.75 stroke width, `stroke-linecap: round`, `stroke-linejoin: round`, `currentColor`. Icon names used: `shield`, `search`, `activity`, `history`, `cpu`, `server`, `book`, `moon`, `sun`, `copy`, `check`, `chevron-right`, `chevron-down`, `close`, `menu`, `arrow-right`, `alert`, `info`, `shield-check`, `shield-alert`, `x-circle`, `filter`, `keyboard`. Recreate these using your icon library of choice (`lucide-react`, `phosphor`, `heroicons`) — they all have close equivalents.
- **Sparkline**: pure inline SVG, no charting library required. See `components.jsx` → `Sparkline`.

---

## Files

Source of truth for the design lives in these files (bundled here):

| File | Purpose |
|---|---|
| `Phishing Classification Console.html` | Entry HTML — theme boot script, script imports, `<div id="root">`. |
| `styles.css` | All design tokens (light + dark), component styles, responsive rules. |
| `risk.jsx` | Central risk mapping — `RISK_LEVELS` array, `levelFromScore`, `levelById`, `resolveRisk`. |
| `service.jsx` | Service layer — `analyzeUrl(url, {signal, onStage})`, real fetch → mock fallback, URL validation, feature extraction, mock classifier. **Lift the API contract, timeouts, and validation rules from here.** |
| `seed.jsx` | Silent history seeding (~15 realistic analyses). Remove or replace with your fixtures in production. |
| `icons.jsx` | Icon set (inline SVG). |
| `components.jsx` | `CopyButton`, `StatusDot`, `EmptyState`, `Sparkline`, `Toast`. |
| `shell.jsx` | `AppShell`, `Sidebar`, `TopBar` + nav config. |
| `analyzer.jsx` | `URLAnalyzer` — input, FSM, progress pipeline. |
| `result.jsx` | Result view — `RiskResult`, `RiskBadge`, `Meter`, `ScoreDisplay`, `Callout`, `FeatureTable`, `ExplanationPanel`, `TimingStats`, `InlinePipeline` (per-layer outcomes), `RawResponse`. |
| `pages.jsx` | `OverviewPage`, `HistoryPage`, `ModelPage`, `SystemPage`, `DocsPage`. |
| `app.jsx` | Top-level app — routing (hash), theme, persistence, error boundary. |

Open `Phishing Classification Console.html` in a browser (double-click or serve statically) to interact with the reference implementation.

---

## Implementation checklist

- [ ] Set up the target framework project (or extend the existing one).
- [ ] Translate design tokens into your token system (Tailwind config / CSS variables / theme object).
- [ ] Wire up light/dark theme with the same boot-before-paint pattern to prevent theme flash.
- [ ] Implement routing for the six routes.
- [ ] Build the AppShell (Sidebar + TopBar) with mobile off-canvas behavior.
- [ ] Build the Analyzer with the explicit FSM and progress pipeline.
- [ ] Wire up the service layer against your real `/api/analyze` endpoint (adopt the request/response contract).
- [ ] Centralize risk mapping in one module.
- [ ] Build the Result view — hero, meter, feature table, explanation, timing stats, per-layer pipeline, raw response drawer.
- [ ] Build the supporting pages (Overview with sparkline, History with search/filter/sort, Model, System, Docs).
- [ ] Add persistence for history + current result + theme + last route.
- [ ] Implement keyboard shortcuts (`/`, `Enter`, `Escape`).
- [ ] Add accessibility affordances (aria-live, aria-invalid, focus-visible, semantic tags).
- [ ] Respect `prefers-reduced-motion`.
- [ ] Add a global error boundary + 404 route.
- [ ] Never render submitted URLs as active resources (no `<a>`, no `iframe`).

If a decision comes up that isn't spelled out here, default to the most restrained option — this design succeeds because it refuses ornament.
