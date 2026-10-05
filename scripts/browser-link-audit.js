/*
 * Browser link audit (strict). Method and history: docs/design/README.md, "Penyimpangan dari paket desain", item 2.
 *
 * HOW TO RUN: open the page in Chromium, set the viewport width you want to audit, open the DevTools console, paste this
 * whole file and press Enter. It prints a one-line summary per theme and returns the full result object. One run covers
 * ONE viewport width and ONE landing mode (pre-launch / launch, NEXT_PUBLIC_LAUNCHED): resize and run again for each
 * width (the project audits 320, 375, 768, 1023, 1024 and 1280). It switches the theme itself and restores it.
 *
 * WHAT IT CHECKS, for EVERY <a> (hidden ones included; below 1024px the mobile menu is opened through its real button):
 *   size       min(width, height) >= 44px. No exclusions (the skip link counts).
 *   colour     the computed colour is a design token of the active theme (whitelist) and is not a browser default
 *              link colour (light or dark, link / visited / active).
 *   underline  none at rest (the browser default is an underline). A DELIBERATE underline is reported as well:
 *              review it ("Sudah punya akun? Masuk" in the launch band is underlined on purpose, `.band-link`).
 *   href       present, not empty / "#" / "javascript:", an in-page "#id" points at an element, no duplicate ids,
 *              the link has an accessible name.
 *   contrast   link text against its effective background: 4.5:1, or 3:1 for large text.
 *   header     links inside <header> do not overlap each other. Also reported: horizontal page overflow.
 *
 * SELF-TEST (positive control). A clean result only means something if the tool can fail. Set
 *     globalThis.LINK_AUDIT_SELF_TEST = true
 * before pasting: the script injects six known defects (a 43px-wide link, a browser-blue link, a default underline,
 * href="#", a link without href, a link to a missing id), runs the audit, checks that each one is reported, restores the
 * page and returns { selfTest: "PASS" | "FAIL" }. Run it first, on the page you are about to audit.
 *
 * LIMITS: computed style cannot see :visited (Chrome hides it on purpose), so check visited links by eye. Hover and
 * focus states are not covered. Only Chromium was used. The colour whitelist (TOKENS) mirrors app/globals.css:
 * update it when a colour token is added.
 */
/* global document, getComputedStyle, innerWidth, innerHeight, devicePixelRatio, globalThis */
(async () => {
  const SELF_TEST = globalThis.LINK_AUDIT_SELF_TEST === true;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const TOKENS = [
    "--background", "--surface", "--border", "--text-primary", "--text-secondary", "--primary", "--primary-hover",
    "--primary-subtle", "--action", "--action-hover", "--on-action", "--input-bg", "--input-border", "--ink",
    "--on-ink-muted", "--forest-mid", "--band", "--on-band", "--on-band-muted", "--success", "--warning",
    "--warning-text-strong", "--danger", "--locked-bg", "--locked-text",
  ];
  // Chrome's default link colours: light #0000EE / #551A8B / #FF0000, dark #9E9EFF / #D0ADF0 / #FF9E9E (+ two older blues).
  const BROWSER_DEFAULTS = new Set([
    "rgb(0, 0, 238)", "rgb(85, 26, 139)", "rgb(255, 0, 0)", "rgb(158, 158, 255)", "rgb(208, 173, 240)",
    "rgb(255, 158, 158)", "rgb(0, 102, 204)", "rgb(238, 0, 0)",
  ]);

  const parse = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  });
  const luminance = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  // Effective background: stack the translucent layers up to the first opaque one; null when an image is involved.
  const backgroundOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== "none") return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
    return acc;
  };
  const rendered = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  };
  const resolveColour = (variable) => {
    const probe = document.createElement("i");
    probe.style.color = `var(${variable})`;
    document.body.appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  };
  const labelOf = (a) => {
    const name = (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 26);
    const marker = a.getAttribute("data-audit-target");
    return marker ? `${name}[#${marker}]` : name;
  };

  // ---- the audit itself ------------------------------------------------------------------------------------
  async function audit() {
    const noMotion = document.createElement("style");
    noMotion.id = "link-audit-no-motion";
    noMotion.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
    document.head.appendChild(noMotion);
    document.querySelectorAll("[data-rv]").forEach((e) => { e.dataset.rv = "shown"; }); // leaves reveal blocks shown

    const root = document.documentElement;
    const originalTheme = root.dataset.theme;
    const menuButton = document.querySelector('button[aria-controls="menu-penuh"]');
    let menuOpened = false;
    if (innerWidth < 1024 && menuButton && menuButton.getAttribute("aria-expanded") !== "true") {
      menuButton.click();
      await wait(400);
      menuOpened = true;
    }

    const result = {
      tool: "browser-link-audit",
      mode: document.getElementById("mulai") ? "peluncuran" : document.getElementById("daftar") ? "pra-peluncuran" : "?",
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio,
      menuOpened,
      overflowX: document.documentElement.scrollWidth > innerWidth + 0.5,
      themes: {},
      hrefs: [],
    };

    for (const theme of ["light", "dark"]) {
      root.dataset.theme = theme;
      void document.body.offsetHeight;
      const allowed = new Set(TOKENS.map(resolveColour));
      const R = {
        total: 0, rendered: 0,
        small: [], colorNotToken: [], browserColor: [], underlineAtRest: [], badHref: [], missingTarget: [],
        noName: [], contrastFail: [], headerOverlap: [], duplicateIds: [],
      };
      const anchors = [...document.querySelectorAll("a")];
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      R.duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
      R.total = anchors.length;

      for (const a of anchors) {
        const label = labelOf(a);
        const href = a.getAttribute("href");
        if (theme === "light") result.hrefs.push(href);
        if (href === null || href.trim() === "" || href.trim() === "#" || /^javascript:/i.test(href.trim())) {
          R.badHref.push(`${label} -> ${JSON.stringify(href)}`);
        }
        if (href && href.startsWith("#") && href.length > 1) {
          let id = href.slice(1);
          try { id = decodeURIComponent(id); } catch { /* keep the raw id */ }
          if (!document.getElementById(id)) R.missingTarget.push(`${label} -> ${href}`);
        }
        if (!(a.getAttribute("aria-label") || a.textContent || "").trim()) R.noName.push(`${label} -> ${href}`);
        if (!rendered(a)) continue;
        R.rendered++;

        const cs = getComputedStyle(a);
        const box = a.getBoundingClientRect();
        if (Math.min(box.width, box.height) < 44 - 0.01) R.small.push(`${label} ${box.width.toFixed(1)}x${box.height.toFixed(1)}`);
        if (!allowed.has(cs.color)) R.colorNotToken.push(`${label} ${cs.color}`);
        if (BROWSER_DEFAULTS.has(cs.color)) R.browserColor.push(`${label} ${cs.color}`);
        if (cs.textDecorationLine !== "none") R.underlineAtRest.push(`${label} ${cs.textDecorationLine}`);
        const bg = backgroundOf(a);
        const fg = parse(cs.color);
        if (bg && fg) {
          const size = parseFloat(cs.fontSize);
          const bold = parseInt(cs.fontWeight, 10) >= 700;
          const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
          const c = ratio(over(fg, bg), bg);
          if (c < need) R.contrastFail.push(`${label} ${c.toFixed(2)}<${need}`);
        }
      }

      const inHeader = anchors
        .filter((a) => a.closest("header") && rendered(a) && !a.closest("#menu-penuh"))
        .map((a) => [labelOf(a), a.getBoundingClientRect()]);
      for (let i = 0; i < inHeader.length; i++) {
        for (let j = i + 1; j < inHeader.length; j++) {
          const a = inHeader[i][1];
          const b = inHeader[j][1];
          const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (w > 1 && h > 1) R.headerOverlap.push(`${inHeader[i][0]} x ${inHeader[j][0]}`);
        }
      }
      result.themes[theme] = R;
    }

    if (originalTheme === undefined) delete root.dataset.theme; else root.dataset.theme = originalTheme;
    if (menuOpened) { menuButton.click(); await wait(200); }
    noMotion.remove();
    return result;
  }

  const PROBLEM_KEYS = ["small", "colorNotToken", "browserColor", "badHref", "missingTarget", "noName", "contrastFail", "headerOverlap", "duplicateIds"];
  const summarize = (result) => {
    for (const [theme, R] of Object.entries(result.themes)) {
      const problems = PROBLEM_KEYS.reduce((n, k) => n + R[k].length, 0);
      const note = R.underlineAtRest.length ? `, ${R.underlineAtRest.length} underlined at rest (review)` : "";
      console.log(`[link-audit] ${result.mode} ${result.width}px ${theme}: ${R.total} links (${R.rendered} rendered), ${problems} problems${note}${result.overflowX ? ", PAGE OVERFLOWS HORIZONTALLY" : ""}`);
    }
  };

  if (!SELF_TEST) {
    const result = await audit();
    summarize(result);
    return result;
  }

  // ---- self-test: inject known defects, expect each to be reported, restore ---------------------------------
  const candidates = [...document.querySelectorAll("a")].filter(rendered);
  if (candidates.length < 6) return { selfTest: "FAIL", reason: `need 6 rendered links, found ${candidates.length}` };
  const [sizeLink, blueLink, underlineLink, hashLink, noHrefLink, missingLink] = candidates;
  const touched = [sizeLink, blueLink, underlineLink, hashLink, noHrefLink, missingLink];
  const saved = touched.map((a) => ({ a, style: a.getAttribute("style"), href: a.getAttribute("href") }));
  touched.forEach((a, i) => a.setAttribute("data-audit-target", String(i + 1)));
  sizeLink.style.cssText += ";min-width:0;max-width:43px;width:43px;padding:0";
  blueLink.style.color = "rgb(0, 0, 238)";
  underlineLink.style.textDecoration = "underline";
  hashLink.setAttribute("href", "#");
  noHrefLink.removeAttribute("href");
  missingLink.setAttribute("href", "#__no_such_id__");

  const result = await audit();
  const expected = [
    ["1 undersized link (43px wide)", "small", 1],
    ["2 browser-blue link", "browserColor", 2],
    ["2 browser-blue link (not a token)", "colorNotToken", 2],
    ["3 underline at rest", "underlineAtRest", 3],
    ["4 href=\"#\"", "badHref", 4],
    ["5 link without href", "badHref", 5],
    ["6 link to a missing id", "missingTarget", 6],
  ];
  const missing = [];
  for (const theme of Object.keys(result.themes)) {
    for (const [what, key, marker] of expected) {
      if (!result.themes[theme][key].some((entry) => entry.includes(`[#${marker}]`))) missing.push(`${theme}: ${what} was NOT reported`);
    }
  }

  for (const { a, style, href } of saved) {
    a.removeAttribute("data-audit-target");
    if (style === null) a.removeAttribute("style");
    else a.setAttribute("style", style);
    if (href === null) a.removeAttribute("href");
    else a.setAttribute("href", href);
  }
  const verdict = { selfTest: missing.length ? "FAIL" : "PASS", injected: expected.length, missing };
  console.log(`[link-audit] self-test ${verdict.selfTest}${missing.length ? ": " + missing.join("; ") : `: all ${expected.length} injected defects were reported`}`);
  return verdict;
})().then((outcome) => {
  console.log(outcome); // pasted into the DevTools console, the promise would otherwise print as "pending"
  return outcome;
});
