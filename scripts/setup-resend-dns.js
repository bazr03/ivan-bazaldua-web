#!/usr/bin/env node
/**
 * setup-resend-dns.js
 *
 * Provision ibazaldua.com in Resend and add DNS records to Cloudflare.
 *
 * Env required (in .env or shell):
 *   RESEND_API_KEY          — from Resend.com (re_xxxxxxxx)
 *   CLOUDFLARE_ZONE_ID      — Cloudflare Zone ID for ibazaldua.com
 *   CLOUDFLARE_API_TOKEN    — Cloudflare API token with Zone.DNS.Edit permission
 *
 * Usage:
 *   node scripts/setup-resend-dns.js
 */

import { readFileSync } from "node:fs";

// Load .env manually (no external deps — built-in Node fetch)
function loadEnv() {
  try {
    const env = readFileSync(".env", "utf8");
    for (const line of env.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env not required to exist; vars may already be in environment
  }
}

loadEnv();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DOMAIN = "ibazaldua.com";

if (!RESEND_API_KEY) {
  console.error("❌  RESEND_API_KEY is required. Get one at https://resend.com");
  process.exit(1);
}

if (!ZONE_ID || !CF_TOKEN) {
  console.error("❌  CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN are required.");
  console.error("    Find Zone ID: Cloudflare Dashboard → ibazaldua.com → Overview → API Zone ID");
  console.error("    Create token: My Profile → API Tokens → Create Custom Token → Zone.DNS.Edit");
  process.exit(1);
}

const RESEND_BASE = "https://api.resend.com";
const CF_BASE = "https://api.cloudflare.com/client/v4";

const resendHeaders = {
  Authorization: `Bearer ${RESEND_API_KEY}`,
  "Content-Type": "application/json",
};

const cfHeaders = {
  Authorization: `Bearer ${CF_TOKEN}`,
  "Content-Type": "application/json",
};

// ── helpers ──────────────────────────────────────────────────────────────────

async function resend(method, path, body) {
  const res = await fetch(`${RESEND_BASE}${path}`, {
    method,
    headers: resendHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend ${method} ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function cf(method, path, body) {
  const res = await fetch(`${CF_BASE}${path}`, {
    method,
    headers: cfHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Cloudflare ${method} ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

async function addDnsRecord(record) {
  const payload = {
    type: record.type,
    name: record.name,
    content: record.value,
    ttl: record.ttl === "Auto" ? 1 : record.ttl,
    proxied: false,
  };
  if (record.priority !== undefined) payload.priority = record.priority;

  const existing = await cf(
    "GET",
    `/zones/${ZONE_ID}/dns_records?type=${record.type}&name=${record.name}`,
  );

  if (existing.result.length > 0) {
    const existingRecord = existing.result[0];
    // Update if value differs
    if (existingRecord.content !== record.value) {
      await cf("PUT", `/zones/${ZONE_ID}/dns_records/${existingRecord.id}`, payload);
      console.log(`  🔄  Updated ${record.type} ${record.name}`);
    } else {
      console.log(`  ✅  ${record.type} ${record.name} (already correct)`);
    }
  } else {
    await cf("POST", `/zones/${ZONE_ID}/dns_records`, payload);
    console.log(`  ➕  Added ${record.type} ${record.name}`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log(`\n🔧  Setting up ${DOMAIN} in Resend + Cloudflare\n`);

// Step 1 — Create or fetch domain in Resend
let domainData;
try {
  domainData = await resend("POST", "/domains", { name: DOMAIN });
  console.log("📬  Domain created in Resend");
} catch (err) {
  if (err.message.includes("already exists")) {
    const list = await resend("GET", `/domains`);
    domainData = list.data.find((d) => d.name === DOMAIN);
    if (!domainData) throw new Error("Domain listed but not found");
    console.log("📬  Domain already exists in Resend");
  } else {
    throw err;
  }
}

const records = domainData.records ?? [];
console.log(`\n📋  ${records.length} DNS records to provision:\`);
for (const r of records) {
  console.log(`     [${r.type}] ${r.name} → ${r.value}${r.priority ? ` (prio ${r.priority})` : ""}`);
}

// Step 2 — Add DNS records to Cloudflare
console.log(`\n☁️  Adding records to Cloudflare (zone: ${ZONE_ID})…`);
for (const record of records) {
  await addDnsRecord(record);
}

// Step 3 — Verify domain in Resend
console.log("\n✅  Triggering Resend verification…");
try {
  await resend("POST", `/domains/${domainData.id}/verify`);
  console.log("✅  Verification triggered. DNS may take up to 72 hrs to propagate globally.");
} catch (err) {
  if (err.message.includes("pending")) {
    console.log("⚠️  Verification in progress — Resend will retry automatically.");
  } else {
    throw err;
  }
}

// Step 4 — Update the Worker from address
console.log("\n💡  Next: update src/pages/api/contact.ts");
console.log(`    Change:  from: \"Sitio Web <onboarding@resend.dev>\"`);
console.log(`    To:      from: \"Contacto <contacto@${DOMAIN}>\"`);
console.log("\n✅  Done!\n");
