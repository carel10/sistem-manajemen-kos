/**
 * Landing mode switch (docs/Architecture.md §1, docs/StyleGuide.md §7).
 * NEXT_PUBLIC_LAUNCHED='true' = launch mode ("Mulai Gratis" → /register, "Masuk" link, closing band with
 * "Mulai kelola kosmu hari ini"). Anything else, including unset, = pre-launch mode (the default):
 * "Daftar Minat" → #daftar and the interest form in the closing band.
 * Inlined at build time (NEXT_PUBLIC_), so changing it needs a rebuild/restart.
 */
export const IS_LAUNCHED = process.env.NEXT_PUBLIC_LAUNCHED === "true";

/** The design package writes /masuk and /daftar; this project keeps English route names (docs/Architecture.md §2). */
export const ROUTES = {
  login: "/login",
  register: "/register",
  registerPro: "/register?minat=pro",
} as const;
