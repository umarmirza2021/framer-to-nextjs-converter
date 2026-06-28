import * as cheerio from "cheerio";

/**
 * Restore the interactivity that stripping Framer's JS runtime removes — without
 * bringing back the heavy runtime.
 *
 *  1. Forms  → wired to Netlify Forms (works on static deploys, no JS, captures
 *     submissions in the Netlify dashboard). No-op if the site has no forms.
 *  2. Mobile menu → a tiny (~0.5 KB) vanilla script that toggles a Framer mobile
 *     menu overlay. Best-effort: it targets the common pattern (a tappable
 *     element named like a menu + a hidden overlay) and is harmless otherwise.
 */
export function enhanceInteractivity(html: string): string {
  const $ = cheerio.load(html);

  // ── 1. Netlify Forms ───────────────────────────────────────
  $("form").each((i, el) => {
    const $f = $(el);
    const name = $f.attr("name") || `form-${i + 1}`;
    $f.attr("name", name);
    $f.attr("data-netlify", "true");
    $f.attr("method", "POST");
    // Drop any external/Framer action so the POST goes to Netlify (which
    // intercepts same-site form submissions), not to Framer's backend.
    const action = $f.attr("action") || "";
    if (/^https?:\/\//i.test(action)) $f.removeAttr("action");
    if ($f.find('input[name="form-name"]').length === 0) {
      $f.prepend(`<input type="hidden" name="form-name" value="${name}" />`);
    }
  });

  // ── 2. Best-effort mobile menu toggle ──────────────────────
  $("body").append(
    `<script id="__ftn_menu">(function(){try{` +
      `var SIG=/menu|hamburger|burger/i;` +
      `function named(e){return ((e.getAttribute('data-framer-name')||'')+' '+(e.getAttribute('aria-label')||''));}` +
      `var nodes=[].slice.call(document.querySelectorAll('[data-framer-name],[aria-label]'));` +
      `var toggles=nodes.filter(function(e){return SIG.test(named(e));});` +
      `toggles.forEach(function(t){` +
      // find a hidden overlay: a named element that's currently not visible
      `var overlay=nodes.filter(function(e){if(!SIG.test(named(e))||e===t)return false;var s=getComputedStyle(e);return s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)===0;})[0];` +
      `t.style.cursor='pointer';` +
      `t.addEventListener('click',function(){if(!overlay)return;var open=overlay.getAttribute('data-ftn-open')==='1';` +
      `overlay.setAttribute('data-ftn-open',open?'0':'1');` +
      `overlay.style.display=open?'none':'flex';overlay.style.visibility='visible';overlay.style.opacity='1';overlay.style.pointerEvents='auto';});` +
      `});}catch(e){}})();</script>`
  );

  return $.html();
}
