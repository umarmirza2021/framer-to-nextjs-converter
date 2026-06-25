const required = ["DATABASE_URL"];
const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error("\n❌ Missing required environment variables:\n");
  for (const key of missing) {
    console.error(`   • ${key}`);
  }
  console.error("\nAdd them in Vercel → Project → Settings → Environment Variables");
  console.error("See .env.example for details.\n");
  process.exit(1);
}