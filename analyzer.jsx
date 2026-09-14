/* URLAnalyzer — input + FSM + progress pipeline */

const STAGES = [
  { id: "validate",    label: "Validating URL",    hint: "syntax + safety" },
  { id: "extract",     label: "Extracting features", hint: "URL feature set" },
  { id: "infer",       label: "Running classifier", hint: "random-forest inference" },
  { id: "respond",     label: "Preparing result",  hint: "score + explanation" },
];

const VALIDATION_MESSAGES = {
  empty: "Enter a URL to begin analysis.",
  invalid: "Enter a valid URL such as https://example.com.",
  unsupported: "This URL format isn't supported.",
};

function computeStageState(stages, current, done, failed) {
  return stages.map((s, i) => {
    if (failed && current === s.id) return "failed";
    if (done) return "done";
    const activeIdx = stages.findIndex(x => x.id === current);
    if (activeIdx < 0) return "pending";
    if (i < activeIdx) return "done";
    if (i === activeIdx) return "active";
    return "pending";
  });
}

const URLAnalyzer = ({ onResult, onError, initialUrl = "", inputRef }) => {
  const [url, setUrl] = React.useState(initialUrl);
  const [state, setState] = React.useState("idle");         // idle | validating | extracting | inferring | success | error | timeout
  const [errorKind, setErrorKind] = React.useState(null);   // validation reason or api error
  const [errorMsg, setErrorMsg] = React.useState("");
  const [currentStage, setCurrentStage] = React.useState(null);
  const [showProgress, setShowProgress] = React.useState(false);
  const abortRef = React.useRef(null);
  const localInputRef = React.useRef(null);
  const ref = inputRef || localInputRef;

  const busy = ["validating", "extracting", "inferring"].includes(state);

  const clear = () => {
    setUrl("");
    setState("idle");
    setErrorKind(null);
    setErrorMsg("");
    setShowProgress(false);
    ref.current && ref.current.focus();
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setErrorKind(null);
      }
    } catch {}
  };

  const submit = async () => {
    if (busy) return;
    const trimmed = url.trim();
    if (!trimmed) {
      setState("error");
      setErrorKind("validation");
      setErrorMsg(VALIDATION_MESSAGES.empty);
      return;
    }
    const valid = window.analyzerService.validateUrl(trimmed);
    if (!valid.ok) {
      setState("error");
      setErrorKind("validation");
      setErrorMsg(VALIDATION_MESSAGES[valid.reason] || VALIDATION_MESSAGES.invalid);
      return;
    }

    setErrorKind(null);
    setErrorMsg("");
    setShowProgress(true);
    setState("validating");
    setCurrentStage("validate");

    // small pre-stage tick
    await new Promise(r => setTimeout(r, 180));
    setCurrentStage("extract");
    setState("extracting");

    const ac = new AbortController();
    abortRef.current = ac;

    const res = await window.analyzerService.analyzeUrl(trimmed, {
      signal: ac.signal,
      onStage: (name) => {
        if (name === "extracting") { setState("extracting"); setCurrentStage("extract"); }
        if (name === "inferring")  { setState("inferring");  setCurrentStage("infer"); }
        if (name === "success")    { setCurrentStage("respond"); }
      },
    });

    if (!res.ok) {
      setState(res.kind === "timeout" ? "timeout" : "error");
      setErrorKind(res.kind);
      const map = {
        validation: VALIDATION_MESSAGES[res.reason] || VALIDATION_MESSAGES.invalid,
        timeout: "The analysis took too long to complete. Please try again.",
        service_unavailable: "The classification service is temporarily unavailable.",
        cancelled: "Analysis cancelled.",
        error: "We couldn't complete the analysis. Please try again.",
      };
      setErrorMsg(map[res.kind] || map.error);
      onError && onError({ kind: res.kind, message: map[res.kind] });
      setTimeout(() => setShowProgress(false), 600);
      return;
    }

    // Small settle so users see the last stage tick
    await new Promise(r => setTimeout(r, 140));
    setState("success");
    setShowProgress(false);
    setCurrentStage(null);
    onResult && onResult(res.result);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    } else if (e.key === "Escape" && busy && abortRef.current) {
      abortRef.current.abort();
    }
  };

  const stageStates = computeStageState(STAGES, currentStage, false, state === "error" || state === "timeout");
  const hasError = state === "error" || state === "timeout";

  return (
    <section className="analyzer" aria-labelledby="analyzer-label">
      <div className="analyzer__label" id="analyzer-label">
        <Icon name="shield" size={12} /> Analyze a website
      </div>

      <div className="analyzer__row">
        <div className={"input" + (hasError && errorKind === "validation" ? " input--error" : "")}>
          <span className="input__scheme" aria-hidden="true">https://</span>
          <input
            ref={ref}
            type="text"
            inputMode="url"
            spellCheck="false"
            autoComplete="off"
            autoCapitalize="off"
            placeholder="example.com/login"
            aria-label="URL to analyze"
            aria-invalid={hasError && errorKind === "validation"}
            aria-describedby={hasError ? "analyzer-error" : undefined}
            value={url.replace(/^https?:\/\//i, "")}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
          />
          {url && !busy && (
            <button
              className="input__icon-btn"
              onClick={clear}
              aria-label="Clear URL"
              title="Clear"
              type="button"
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn--ghost"
          onClick={pasteFromClipboard}
          disabled={busy}
          aria-label="Paste from clipboard"
        >
          Paste
        </button>

        <button
          type="button"
          className="btn btn--primary"
          onClick={submit}
          disabled={busy}
          aria-live="polite"
        >
          {busy ? "Analyzing\u2026" : "Analyze URL"}
        </button>
      </div>

      {hasError && (
        <div className="analyzer__error" id="analyzer-error" role="alert">
          <Icon name="alert" size={12} /> {errorMsg}
        </div>
      )}

      {!hasError && (
        <div className="analyzer__hints" aria-hidden="true">
          <span className="analyzer__hint">
            <span className="kbd">Enter</span> to analyze
          </span>
          <span className="analyzer__hint">
            <span className="kbd">/</span> to focus input
          </span>
          <span className="analyzer__hint" style={{ marginLeft: "auto", color: "var(--fg-faint)" }}>
            {window.analyzerService.isConnected
              ? "Connected to cloud classifier"
              : "Local classifier · configure API base for cloud inference"}
          </span>
        </div>
      )}

      {showProgress && (
        <div className="progress" aria-live="polite">
          <div className="progress__stages">
            {STAGES.map((s, i) => (
              <div key={s.id} className="stage" data-state={stageStates[i]}>
                <div className="stage__head">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <span className="stage__status">
                    {stageStates[i] === "done" ? "done"
                      : stageStates[i] === "active" ? "running"
                      : stageStates[i] === "failed" ? "failed"
                      : "queued"}
                  </span>
                </div>
                <div className="stage__label">{s.label}</div>
                <div className="stage__bar"><span className="stage__bar-fill" /></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

Object.assign(window, { URLAnalyzer, STAGES });
