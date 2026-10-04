/**
 * Theme script, run inline in <head> BEFORE the page renders, so <html data-theme> is already
 * correct on first paint (no flash of the wrong theme).
 * The choice lives in localStorage("mk-theme") = "light" | "dark" | "system" (default "system").
 * No cookie: reading cookies in the root layout forces dynamic rendering in the App Router
 * (full reasoning: docs/Architecture.md §1a).
 *
 * Adapted from the final design package (kode/lib/theme-script.ts). Deliberate differences, so that
 * ThemeSwitcher can use useSyncExternalStore instead of setState inside an effect: readThemePref
 * reads the <html> attribute first, applyTheme notifies listeners in the same tab, and
 * subscribeThemePref is new. See docs/design/README.md.
 */
export const THEME_STORAGE_KEY = "mk-theme";
export type ThemePref = "light" | "system" | "dark";
export type ResolvedTheme = "light" | "dark";

export const themeScript = `(function(){try{
var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p!=='light'&&p!=='dark')p='system';
var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;r.dataset.theme=d?'dark':'light';r.dataset.themePref=p;r.style.colorScheme=d?'dark':'light';
}catch(e){document.documentElement.dataset.theme='light';}})();`;

// The "storage" event only reaches OTHER tabs, so this tab needs its own signal.
const THEME_CHANGE_EVENT = "mk-theme-change";

function isThemePref(value: unknown): value is ThemePref {
  return value === "light" || value === "dark" || value === "system";
}

function readStoredThemePref(): ThemePref {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

/**
 * The choice for this session. The <html data-theme-pref> attribute (set by the inline script and
 * by applyTheme) is the source of truth, so it stays correct even when localStorage is blocked
 * and the choice cannot be persisted.
 */
export function readThemePref(): ThemePref {
  const fromDom = document.documentElement.dataset.themePref;
  return isThemePref(fromDom) ? fromDom : readStoredThemePref();
}

export function applyTheme(pref: ThemePref, options: { persist?: boolean } = {}): void {
  const { persist = true } = options;
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePref = pref;
  root.style.colorScheme = resolved;
  if (persist) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // Private mode / blocked storage: the theme still applies for this session.
    }
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** For useSyncExternalStore: fires when the choice changes in this tab or in another one. */
export function subscribeThemePref(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    // key === null means storage was cleared. When another tab changes the choice, follow it here
    // without writing back to storage (persist: false); applyTheme then fires THEME_CHANGE_EVENT.
    if (event.key === THEME_STORAGE_KEY || event.key === null) {
      applyTheme(readStoredThemePref(), { persist: false });
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
  };
}
