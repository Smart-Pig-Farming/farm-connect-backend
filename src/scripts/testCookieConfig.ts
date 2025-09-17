import dotenv from "dotenv";
import { getCookieConfig } from "../config/cookieConfig";

// Load environment variables
dotenv.config();

console.log("🚀 Starting Cookie Config Test...");
console.log("=======================================");

// Check environment variables first
console.log("\n📋 Environment Variables:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("COOKIE_DOMAIN:", process.env.COOKIE_DOMAIN);
console.log("COOKIE_SECURE:", process.env.COOKIE_SECURE);
console.log("COOKIE_SAME_SITE:", process.env.COOKIE_SAME_SITE);

console.log("\n🍪 Calling getCookieConfig():");
console.log("=======================================");

const config = getCookieConfig();

console.log("\n✅ Final Config Object:");
console.log("=======================================");
console.log(JSON.stringify(config, null, 2));

console.log("\n🏁 Cookie Config Test Complete!");
