export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "strict" | "lax" | "none";
  domain?: string;
  path: string;
  maxAge: number;
}

export const getCookieConfig = () => {
  const isProduction = process.env.NODE_ENV === "production";
  // Allow explicit override of secure flag even in production (needed before HTTPS is enabled)
  const secureOverride = process.env.COOKIE_SECURE;
  const secureFlag = secureOverride ? secureOverride === "true" : isProduction; // default to true only if production and no override provided
  // Parse JWT style durations (very small parser supporting m,h,d suffix)
  function parseDuration(str: string | undefined, fallbackMs: number): number {
    if (!str) return fallbackMs;
    const m = /^([0-9]+)([mhd])$/.exec(str.trim());
    if (!m) return fallbackMs;
    const val = Number(m[1]);
    const unit = m[2];
    const mult =
      unit === "m"
        ? 60 * 1000
        : unit === "h"
        ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000; // d
    return val * mult;
  }

  const accessMs = parseDuration(
    process.env.JWT_ACCESS_EXPIRES_IN,
    15 * 60 * 1000
  );
  const refreshMs = parseDuration(
    process.env.JWT_REFRESH_EXPIRES_IN,
    30 * 24 * 60 * 60 * 1000
  );

  const baseConfig = {
    httpOnly: true,
    secure: secureFlag,
    sameSite:
      (process.env.COOKIE_SAME_SITE as "strict" | "lax" | "none") ||
      (isProduction ? "strict" : "lax"),
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
    path: "/",
  };

  return {
    accessToken: {
      ...baseConfig,
      maxAge: accessMs,
    } as CookieOptions,

    refreshToken: {
      ...baseConfig,
      maxAge: refreshMs,
    } as CookieOptions,

    csrfToken: {
      httpOnly: false, // Needs to be readable by JavaScript
      secure: baseConfig.secure,
      sameSite: baseConfig.sameSite,
      domain: baseConfig.domain,
      path: "/",
      maxAge: accessMs,
    } as CookieOptions,
  };
};

export const clearCookieConfig = {
  httpOnly: true,
  secure: (() => {
    const override = process.env.COOKIE_SECURE;
    if (override) return override === "true";
    return process.env.NODE_ENV === "production";
  })(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0, // Expire immediately
};
