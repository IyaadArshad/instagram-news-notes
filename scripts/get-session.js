#!/usr/bin/env node

/**
 * Helper script — run this LOCALLY on your own machine to get an Instagram
 * session ID. Do NOT run this inside the Appwrite Function (Instagram will
 * likely block datacenter IPs).
 *
 * Usage:
 *   cd functions/news-note-updater
 *   npm install
 *   node scripts/get-session.js
 *
 * Then paste the session ID into your Appwrite Function environment variable:
 *   IG_SESSION_ID=<paste here>
 */

import Note from "instagram-notes";
import { createInterface } from "readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log("──────────────────────────────────────────");
  console.log(" Instagram Session ID Generator");
  console.log("──────────────────────────────────────────\n");

  const username = await ask("Instagram username: ");
  const password = await ask("Instagram password: ");

  console.log("\nLogging in…");

  try {
    const sessionId = await Note.getSessionId(username, password);

    if (!sessionId) {
      console.error("\nLogin failed — no session ID returned.");
      console.error("Instagram may require 2FA or has flagged this login.");
      process.exit(1);
    }

    console.log("\n✓ Success! Your session ID:\n");
    console.log(sessionId);
    console.log("\n──────────────────────────────────────────");
    console.log("Set this as an environment variable in your");
    console.log("Appwrite Function configuration:");
    console.log("");
    console.log("  IG_SESSION_ID=" + sessionId);
    console.log("──────────────────────────────────────────\n");
  } catch (e) {
    console.error("\nLogin failed:", e.message);
    console.error("\nPossible causes:");
    console.error("  - Wrong username/password");
    console.error("  - 2FA is enabled (disable it or use app password)");
    console.error("  - Instagram flagged the login as suspicious");
    process.exit(1);
  }

  rl.close();
}

main();
