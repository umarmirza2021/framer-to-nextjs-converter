/**
 * Deterministic interaction audit. Scans a Framer page's HTML (inline CSS
 * included) and reports which interactions survive Performance Mode vs. which
 * are dropped. No AI, no per-site logic — pure pattern detection that runs the
 * same way for every website.
 */
export type InteractionStatus = "preserved" | "restored" | "added" | "partial" | "lost";

export interface InteractionFinding {
  id: string;
  label: string;
  count: number;
  status: InteractionStatus;
  note: string;
}

export interface InteractionAudit {
  findings: InteractionFinding[];
  preserved: number;
  lost: number;
}

const count = (s: string, re: RegExp) => (s.match(re) || []).length;

export function auditInteractions(html: string): InteractionAudit {
  const findings: InteractionFinding[] = [];
  const add = (
    id: string,
    label: string,
    n: number,
    status: InteractionStatus,
    note: string
  ) => {
    if (n > 0) findings.push({ id, label, count: n, status, note });
  };

  // Entrance / "appear" animations — JS-driven. We reveal elements statically,
  // so content is intact but the intro motion is dropped.
  add(
    "appear",
    "Entrance animations",
    count(html, /data-framer-appear-id/g),
    "lost",
    "Elements show instantly (fully visible) instead of fading/sliding in. Content is preserved — only the intro motion is dropped for speed."
  );

  // Sticky positioning — pure CSS, survives JS removal (verified pinned on scroll).
  add(
    "sticky",
    "Sticky headers / elements",
    count(html, /position\s*:\s*sticky/g),
    "preserved",
    "CSS sticky positioning works with no JavaScript."
  );

  // Hover states — CSS :hover survives.
  add(
    "hover",
    "Hover states",
    count(html, /:hover/g),
    "preserved",
    "CSS hover effects (color, scale, underline, etc.) are kept."
  );

  // Looping animations (marquees, spinners, gradients) — CSS keyframes survive.
  add(
    "keyframes",
    "Looping animations (marquees, etc.)",
    count(html, /@(?:-\w+-)?keyframes/g),
    "preserved",
    "CSS keyframe animations run with no JavaScript."
  );

  // Smooth anchor scrolling — we add scroll-behavior:smooth.
  add(
    "smoothscroll",
    "Smooth anchor scrolling",
    count(html, /href="#/g),
    "added",
    "In-page anchor links scroll smoothly via CSS (added by the optimizer)."
  );

  // Forms — re-wired to Netlify Forms (works on static Netlify deploys).
  add(
    "forms",
    "Forms",
    count(html, /<form[\s>]/g),
    "restored",
    "Re-wired to Netlify Forms — submissions land in your Netlify dashboard (Netlify deploys)."
  );

  // Native video — HTML <video> playback survives.
  add(
    "video",
    "Videos",
    count(html, /<video[\s>]/g),
    "preserved",
    "Native HTML video playback is kept."
  );

  // Mobile menu — best-effort vanilla toggle re-added (common pattern).
  add(
    "menu",
    "Mobile menu toggle",
    count(html, /data-framer-name="Phone"/g),
    "partial",
    "A tiny (~0.5 KB) script restores the mobile menu toggle for the common pattern; unusual custom menus may need a tweak."
  );

  // Lottie — JS-driven vector animations, dropped.
  add(
    "lottie",
    "Lottie animations",
    count(html, /lottie/gi),
    "lost",
    "Lottie animations are JavaScript-driven and are dropped. Replace with a static image or an MP4/WebM for the same look."
  );

  const lost = findings.filter((f) => f.status === "lost").length;
  const preserved = findings.length - lost;
  return { findings, preserved, lost };
}
