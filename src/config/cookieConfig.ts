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

  const baseConfig = {
    httpOnly: true,
    secure: isProduction ? true : process.env.COOKIE_SECURE === "true",
    sameSite:
      (process.env.COOKIE_SAME_SITE as "strict" | "lax" | "none") ||
      (isProduction ? "strict" : "lax"),
    domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
    path: "/",
  };

  return {
    accessToken: {
      ...baseConfig,
      maxAge: 15 * 60 * 1000, // 15 minutes
    } as CookieOptions,

    refreshToken: {
      ...baseConfig,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    } as CookieOptions,

    csrfToken: {
      httpOnly: false, // Needs to be readable by JavaScript
      secure: baseConfig.secure,
      sameSite: baseConfig.sameSite,
      domain: baseConfig.domain,
      path: "/",
      maxAge: 15 * 60 * 1000, // Same as access token
    } as CookieOptions,
  };
};

export const clearCookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0, // Expire immediately
};
