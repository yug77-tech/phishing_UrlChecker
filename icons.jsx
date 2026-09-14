/* Minimal, restrained icon set. 1.5 stroke, currentColor. */
const Icon = ({ name, size = 14, ...rest }) => {
  const s = size;
  const common = {
    width: s, height: s, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor",
    strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round",
    "aria-hidden": "true", ...rest,
  };
  switch (name) {
    case "shield":
      return <svg {...common}><path d="M12 3l8 3v6c0 4.5-3.4 8.5-8 9-4.6-.5-8-4.5-8-9V6l8-3z"/></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>;
    case "activity":
      return <svg {...common}><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>;
    case "history":
      return <svg {...common}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 8v5l3 2"/></svg>;
    case "cpu":
      return <svg {...common}><rect x="6" y="6" width="12" height="12" rx="1"/><rect x="9" y="9" width="6" height="6"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/></svg>;
    case "server":
      return <svg {...common}><rect x="3" y="4" width="18" height="7" rx="1"/><rect x="3" y="13" width="18" height="7" rx="1"/><path d="M7 8h.01M7 17h.01"/></svg>;
    case "book":
      return <svg {...common}><path d="M4 4h10a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4V4z"/><path d="M4 16a4 4 0 0 1 4-4h10"/></svg>;
    case "moon":
      return <svg {...common}><path d="M20 15A8 8 0 1 1 9 4a7 7 0 0 0 11 11z"/></svg>;
    case "sun":
      return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>;
    case "check":
      return <svg {...common}><path d="M4 12l5 5L20 6"/></svg>;
    case "chevron-right":
      return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case "chevron-down":
      return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case "close":
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case "menu":
      return <svg {...common}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case "arrow-right":
      return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case "alert":
      return <svg {...common}><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 18h.01"/></svg>;
    case "info":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>;
    case "shield-check":
      return <svg {...common}><path d="M12 3l8 3v6c0 4.5-3.4 8.5-8 9-4.6-.5-8-4.5-8-9V6l8-3z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>;
    case "shield-alert":
      return <svg {...common}><path d="M12 3l8 3v6c0 4.5-3.4 8.5-8 9-4.6-.5-8-4.5-8-9V6l8-3z"/><path d="M12 8v4M12 16h.01"/></svg>;
    case "x-circle":
      return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>;
    case "filter":
      return <svg {...common}><path d="M3 5h18l-7 9v6l-4-2v-4L3 5z"/></svg>;
    case "keyboard":
      return <svg {...common}><rect x="2" y="6" width="20" height="12" rx="1.5"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>;
    default:
      return <svg {...common}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

window.Icon = Icon;
