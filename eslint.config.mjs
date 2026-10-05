import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Class tokens that animate `outline-color` in Tailwind v4: `transition`, `transition-colors` and `transition-all`
// (checked in node_modules/tailwindcss/dist/lib.js). The focus ring then flashes in the text colour before it settles
// on `primary` (this happened twice: ThemeSwitcher in 0.1a, the nav links in 0.3a). Scope the transition instead,
// e.g. `transition-[color,background-color,border-color]` or `transition-[color]`. The regex matches one whole class
// token, with or without variant prefixes (`hover:`, `md:`, `data-[x=y]:`) or `!`, so `transition-[color]`,
// `transition-shadow`, `transition-none` and CSS such as `{transition:none}` are not matched.
// docs/StyleGuide.md §5 ("Aturan transisi") has the rule and the same check as a grep.
const UNSCOPED_TRANSITION = String.raw`/(^|\s)(\S*:)?!?transition(-colors|-all)?(\s|$)/`;
// (The message avoids the bare word between spaces, or the guard would flag its own text.)
const UNSCOPED_TRANSITION_MESSAGE =
  "Unscoped Tailwind class (`transition`, `transition-colors`, `transition-all`) also animates `outline-color` and breaks the focus ring. Use `transition-[color,background-color,border-color]` or a subset (docs/StyleGuide.md §5, Aturan transisi).";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: `Literal[value=${UNSCOPED_TRANSITION}]`, message: UNSCOPED_TRANSITION_MESSAGE },
        { selector: `TemplateElement[value.cooked=${UNSCOPED_TRANSITION}]`, message: UNSCOPED_TRANSITION_MESSAGE },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
