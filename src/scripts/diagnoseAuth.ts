import dotenv from 'dotenv';
import { getCookieConfig } from '../config/cookieConfig';

// Load environment variables
dotenv.config();

console.log("🔍 COMPREHENSIVE AUTH DIAGNOSTICS");
console.log("=====================================");

// 1. Environment Analysis
console.log("\n📋 ENVIRONMENT ANALYSIS:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("COOKIE_DOMAIN:", process.env.COOKIE_DOMAIN);
console.log("COOKIE_SECURE:", process.env.COOKIE_SECURE);
console.log("COOKIE_SAME_SITE:", process.env.COOKIE_SAME_SITE);

// 2. JWT Configuration
console.log("\n🔐 JWT CONFIGURATION:");
console.log("JWT_SECRET exists:", !!process.env.JWT_SECRET);
console.log("JWT_SECRET length:", process.env.JWT_SECRET?.length || 0);
console.log("REFRESH_TOKEN_SECRET exists:", !!process.env.REFRESH_TOKEN_SECRET);
console.log("REFRESH_TOKEN_SECRET length:", process.env.REFRESH_TOKEN_SECRET?.length || 0);
console.log("JWT_ACCESS_EXPIRES_IN:", process.env.JWT_ACCESS_EXPIRES_IN);
console.log("JWT_REFRESH_EXPIRES_IN:", process.env.JWT_REFRESH_EXPIRES_IN);

// 3. Cookie Configuration Analysis
console.log("\n🍪 COOKIE CONFIGURATION:");
const config = getCookieConfig();
console.log("Access Token Config:", config.accessToken);
console.log("Refresh Token Config:", config.refreshToken);
console.log("CSRF Token Config:", config.csrfToken);

// 4. Server/Network Analysis
console.log("\n🌐 NETWORK ANALYSIS:");
console.log("Server IP/Domain Analysis:");

const frontendUrl = process.env.FRONTEND_URL;
if (frontendUrl) {
  try {
    const url = new URL(frontendUrl);
    console.log("Frontend Protocol:", url.protocol);
    console.log("Frontend Hostname:", url.hostname);
    console.log("Frontend Port:", url.port || (url.protocol === 'https:' ? '443' : '80'));
    console.log("Is Frontend IP Address:", /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname));
  } catch (e) {
    console.log("Invalid FRONTEND_URL format:", e);
  }
} else {
  console.log("⚠️  FRONTEND_URL not set!");
}

// 5. Potential Issues Detection
console.log("\n⚠️  POTENTIAL ISSUES DETECTED:");
const issues = [];

if (!process.env.COOKIE_DOMAIN) {
  issues.push("COOKIE_DOMAIN not set - using same-origin cookies");
}

if (process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE === 'false') {
  issues.push("Production using non-secure cookies - might cause issues with HTTPS");
}

if (!process.env.FRONTEND_URL) {
  issues.push("FRONTEND_URL not set - CORS might be misconfigured");
}

if (frontendUrl && process.env.FRONTEND_URL) {
  try {
    const url = new URL(frontendUrl);
    const isHttps = url.protocol === 'https:';
    const isSecureCookie = config.accessToken.secure;
    
    if (isHttps && !isSecureCookie) {
      issues.push("HTTPS frontend but non-secure cookies - browsers will reject cookies");
    }
    
    if (!isHttps && isSecureCookie) {
      issues.push("HTTP frontend but secure cookies - cookies won't be sent");
    }
  } catch (e) {
    // Already logged above
  }
}

if (issues.length === 0) {
  console.log("✅ No obvious configuration issues detected");
} else {
  issues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue}`);
  });
}

// 6. Recommended Fixes
console.log("\n💡 PRODUCTION COOKIE RECOMMENDATIONS:");

if (frontendUrl) {
  try {
    const url = new URL(frontendUrl);
    const isHttps = url.protocol === 'https:';
    
    console.log("\nRecommended .env settings for your setup:");
    console.log("NODE_ENV=production");
    console.log(`COOKIE_SECURE=${isHttps}`);
    console.log("COOKIE_SAME_SITE=lax");
    
    if (/^\d+\.\d+\.\d+\.\d+$/.test(url.hostname)) {
      console.log("# COOKIE_DOMAIN should remain unset for IP addresses");
    } else {
      console.log(`COOKIE_DOMAIN=${url.hostname}`);
    }
    
    console.log(`FRONTEND_URL=${frontendUrl}`);
  } catch (e) {
    console.log("Cannot provide recommendations due to invalid FRONTEND_URL");
  }
}

// 7. CORS Configuration Analysis
console.log("\n🌐 CORS CONFIGURATION:");
console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN);
console.log("CLIENT_URL:", process.env.CLIENT_URL);

const corsOrigins = [
  process.env.CORS_ORIGIN,
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(origin => Boolean(origin));

console.log("Configured CORS Origins:", corsOrigins);

// 8. Cookie vs CORS Domain Mismatch Detection
console.log("\n⚠️  COOKIE vs CORS DOMAIN ANALYSIS:");
if (frontendUrl && corsOrigins.length > 0) {
  try {
    const url = new URL(frontendUrl);
    const frontendOrigin = `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
    
    console.log("Frontend Origin:", frontendOrigin);
    console.log("Is Frontend Origin in CORS list:", corsOrigins.includes(frontendOrigin));
    
    if (!corsOrigins.includes(frontendOrigin)) {
      console.log("� CRITICAL: Frontend URL not in CORS origins!");
      console.log("Add this to your .env:");
      console.log(`CORS_ORIGIN=${frontendOrigin}`);
    }
  } catch (e) {
    console.log("Could not parse frontend URL for CORS analysis");
  }
}

console.log("\n�🔧 DEBUGGING STEPS:");
console.log("1. Check browser Network tab for cookie headers in requests");
console.log("2. Verify Set-Cookie headers in login response");
console.log("3. Check if cookies are being sent with /me requests");
console.log("4. Verify CORS configuration allows credentials");
console.log("5. Test authentication flow with curl commands");

console.log("\n📋 PRODUCTION CHECKLIST:");
console.log("□ FRONTEND_URL matches actual frontend domain");
console.log("□ CORS_ORIGIN includes frontend URL");
console.log("□ COOKIE_SECURE matches frontend protocol (HTTP=false, HTTPS=true)");
console.log("□ Browser can store and send cookies");
console.log("□ No cross-domain cookie blocking");

console.log("\n🏁 Diagnostic Complete!");