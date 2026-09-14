/* Centralized risk mapping + labels. Single source of truth. */

const RISK_LEVELS = [
  { id: "safe",       min: 0,  max: 19,  label: "Safe",       short: "Safe",
    headline: "No suspicious characteristics detected",
    guidance: "This URL passed all standard phishing checks in the classifier's feature space." },
  { id: "low",        min: 20, max: 39,  label: "Low Risk",   short: "Low",
    headline: "Minor characteristics of note",
    guidance: "The classifier flagged minor URL characteristics but did not identify a coherent phishing pattern." },
  { id: "suspicious", min: 40, max: 59,  label: "Suspicious", short: "Suspicious",
    headline: "Uncertain classification — proceed with caution",
    guidance: "Several URL characteristics contributed to an elevated risk assessment. Verify the destination independently before entering credentials." },
  { id: "high",       min: 60, max: 79,  label: "High Risk",  short: "High",
    headline: "Elevated risk — treat as untrusted",
    guidance: "This URL exhibits characteristics commonly associated with phishing. Avoid entering credentials unless you can independently verify the website." },
  { id: "phishing",   min: 80, max: 100, label: "Phishing",   short: "Phishing",
    headline: "Classified as phishing",
    guidance: "This URL has been classified as high risk by the phishing detection model. Do not enter credentials or sensitive information on this site." },
];

function levelFromScore(score) {
  if (typeof score !== "number" || Number.isNaN(score)) return RISK_LEVELS[0];
  for (const lv of RISK_LEVELS) {
    if (score >= lv.min && score <= lv.max) return lv;
  }
  return RISK_LEVELS[RISK_LEVELS.length - 1];
}

function levelById(id) {
  return RISK_LEVELS.find(l => l.id === id) || null;
}

/* Resolve backend classification vs. score. Backend classification is
   authoritative if present; score is used for visualization. */
function resolveRisk(response) {
  if (!response) return { level: RISK_LEVELS[0], score: 0, classification: "unknown" };
  const score = typeof response.riskScore === "number"
    ? Math.max(0, Math.min(100, Math.round(response.riskScore)))
    : 0;
  const declared = response.riskLevel ? levelById(response.riskLevel) : null;
  const level = declared || levelFromScore(score);
  return {
    level,
    score,
    classification: response.classification || level.id,
  };
}

window.RISK_LEVELS = RISK_LEVELS;
window.resolveRisk = resolveRisk;
window.levelFromScore = levelFromScore;
window.levelById = levelById;
