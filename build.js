const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "supabase.local.js");
const url = (process.env.SUPABASE_URL || "").trim();
const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

if (Boolean(url) !== Boolean(anonKey)) {
  throw new Error("SUPABASE_URL et SUPABASE_ANON_KEY doivent être configurées ensemble.");
}

if (url) {
  const config = {
    url,
    anonKey
  };
  fs.writeFileSync(
    configPath,
    `window.SUPABASE_LOCAL_CONFIG = ${JSON.stringify(config)};\n`
  );
  console.log("Configuration Supabase générée pour le déploiement.");
} else if (!fs.existsSync(configPath)) {
  fs.writeFileSync(configPath, "window.SUPABASE_LOCAL_CONFIG = null;\n");
  console.warn("Supabase non configuré : le site utilisera les données de démonstration.");
}
