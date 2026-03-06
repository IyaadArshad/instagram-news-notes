import { Client, Databases, ID, Query } from "node-appwrite";
import Parser from "rss-parser";
import Note from "instagram-notes";
import RSS_FEEDS from "./feeds.js";

// ── Constants ────────────────────────────────────────────────────────────────
const DB_ID = "news_bot";
const STATE_COLLECTION = "state";
const STATE_DOC_ID = "current";
const NOTE_MAX_CHARS = 80;
const FEED_TIMEOUT_MS = 8000; // per-feed timeout

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a headline for Instagram Notes (max 60 chars).
 * Just the title, truncated if needed.
 */
function formatNote(title) {
  // Clean up title — strip HTML entities, extra whitespace
  const clean = title
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  // No prefix, just the title
  const maxLen = NOTE_MAX_CHARS;

  const body =
    clean.length > 77 ? clean.slice(0, 77) + "..." : clean;

  return body;
}

/**
 * Fetch a single RSS feed with a timeout. Returns an array of
 * { source, title, link, date } or an empty array on failure.
 */
async function fetchFeed(parser, feed) {
  try {
    const result = await Promise.race([
      parser.parseURL(feed.url),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), FEED_TIMEOUT_MS)
      ),
    ]);

    return (result.items || []).slice(0, 5).map((item) => ({
      source: feed.name,
      title: item.title || "",
      link: item.link || item.guid || "",
      date: item.isoDate ? new Date(item.isoDate) : new Date(0),
    }));
  } catch {
    // Feed unreachable / broken — silently skip
    return [];
  }
}

// ── Database auto-setup ──────────────────────────────────────────────────────

/**
 * Ensure the database and collection exist. Runs on first execution and is
 * idempotent afterwards.
 */
async function ensureDatabase(databases, log) {
  // Create database (ignore "already exists" error)
  try {
    await databases.create(DB_ID, "News Bot", true);
    log("Created database: " + DB_ID);
  } catch (e) {
    if (e.code !== 409) throw e; // 409 = already exists
  }

  // Create state collection
  try {
    await databases.createCollection(DB_ID, STATE_COLLECTION, "State", [], false, true);
    log("Created collection: " + STATE_COLLECTION);

    // Add attributes — positional: (dbId, colId, key, size, required, default, array, encrypt)
    await databases.createStringAttribute(DB_ID, STATE_COLLECTION, "lastLink", 2048, false, "");
    await databases.createStringAttribute(DB_ID, STATE_COLLECTION, "lastTitle", 512, false, "");
    await databases.createStringAttribute(DB_ID, STATE_COLLECTION, "igSessionId", 512, false, "");
    // createDatetimeAttribute(dbId, colId, key, required, default, array)
    await databases.createDatetimeAttribute(DB_ID, STATE_COLLECTION, "lastUpdated", false);

    log("Created attributes on state collection");

    // Wait a moment for attributes to become available
    await new Promise((r) => setTimeout(r, 2000));
  } catch (e) {
    if (e.code !== 409) throw e;
  }
}

// ── Instagram Note update ────────────────────────────────────────────────────

/**
 * Update the Instagram Note using a pre-obtained session ID.
 * Session IDs (Instagram's sessionid cookie) last ~1 year.
 * Generate one locally with:  node scripts/get-session.js
 * Then set IG_SESSION_ID env var on the Appwrite function.
 */
async function updateInstagramNote(text, sessionId, log, error) {
  if (!sessionId) {
    error("No IG session ID available. Run 'node scripts/get-session.js' locally and set IG_SESSION_ID env var.");
    return "";
  }

  try {
    const client = new Note(sessionId);
    await client.createNote(text, 0);
    log("IG note updated successfully");
    return sessionId;
  } catch (e) {
    error("IG note update failed: " + e.message);
    error("Session may have expired — re-run 'node scripts/get-session.js' locally and update IG_SESSION_ID");
    return sessionId;
  }
}

// ── Main Appwrite Function ───────────────────────────────────────────────────

export default async ({ req, res, log, error }) => {
  try {
    log("── Function started ──");
    log("Endpoint: " + (process.env.APPWRITE_FUNCTION_API_ENDPOINT || "NOT SET"));
    log("Project: " + (process.env.APPWRITE_FUNCTION_PROJECT_ID || "NOT SET"));
    log("API key present: " + !!(req.headers?.["x-appwrite-key"]));
    log("IU present: " + !!process.env.IU);
    log("IP present: " + !!process.env.IP);

    // ── 1. Init Appwrite client ────────────────────────────────────────────
    const apiKey = req.headers?.["x-appwrite-key"] || process.env.APPWRITE_API_KEY || "";
    if (!apiKey) {
      error("No API key found in x-appwrite-key header or APPWRITE_API_KEY env");
      return res.json({ ok: false, error: "missing API key" });
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(apiKey);

    const databases = new Databases(client);
    log("Appwrite client initialized");

    // ── 2. Auto-setup DB ──────────────────────────────────────────────────
    await ensureDatabase(databases, log);
    log("Database setup complete");

    // ── 3. Load saved state ────────────────────────────────────────────────
    let state = { lastLink: "", lastTitle: "", igSessionId: "", lastUpdated: null };
    try {
      const doc = await databases.getDocument(DB_ID, STATE_COLLECTION, STATE_DOC_ID);
      state.lastLink = doc.lastLink || "";
      state.lastTitle = doc.lastTitle || "";
      state.igSessionId = doc.igSessionId || "";
      state.lastUpdated = doc.lastUpdated || null;
      log("Loaded state: lastLink=" + state.lastLink.slice(0, 60));
    } catch (e) {
      if (e.code === 404) {
        log("No state document yet — first run");
      } else {
        error("Failed to load state: " + e.message);
      }
    }

    // Session ID from env var (set locally via scripts/get-session.js)
    if (process.env.IG_SESSION_ID) {
      state.igSessionId = process.env.IG_SESSION_ID;
    }
    log("IG session ID present: " + !!state.igSessionId);

    // ── 4. Fetch all RSS feeds concurrently ────────────────────────────────
    const parser = new Parser({
      timeout: FEED_TIMEOUT_MS,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsNoteBot/1.0)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    log(`Fetching ${RSS_FEEDS.length} RSS feeds…`);

    const results = await Promise.allSettled(
      RSS_FEEDS.map((feed) => fetchFeed(parser, feed))
    );

    // Flatten all articles
    const articles = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r) => r.value)
      .filter((a) => a.title && a.link);

    log(`Collected ${articles.length} articles from feeds`);

    if (articles.length === 0) {
      log("No articles found — ending execution");
      return res.json({ ok: true, updated: false, reason: "no articles" });
    }

    // ── 5. Sort by date and pick the newest ────────────────────────────────
    articles.sort((a, b) => b.date - a.date);
    const newest = articles[0];

    log(`Newest: [${newest.source}] ${newest.title}`);

    // ── 6. Check if this is a new article ──────────────────────────────────
    if (newest.link === state.lastLink) {
      log("Already posted — no update needed");
      return res.json({ ok: true, updated: false, reason: "already posted" });
    }

    // ── 7. Format and update Instagram Note ────────────────────────────────
    const noteText = formatNote(newest.title);
    log(`Updating IG note: "${noteText}"`);

    let updatedSessionId;
    try {
      updatedSessionId = await updateInstagramNote(noteText, state.igSessionId, log, error);
    } catch (igErr) {
      error("updateInstagramNote threw: " + igErr.message + "\n" + igErr.stack);
      updatedSessionId = "";
    }

    // ── 8. Save state to database ──────────────────────────────────────────
    const stateData = {
      lastLink: newest.link,
      lastTitle: newest.title.slice(0, 512),
      igSessionId: updatedSessionId || "",
      lastUpdated: new Date().toISOString(),
    };

    try {
      await databases.createDocument(DB_ID, STATE_COLLECTION, STATE_DOC_ID, stateData);
      log("State created in database");
    } catch (e) {
      if (e.code === 409) {
        try {
          await databases.updateDocument(DB_ID, STATE_COLLECTION, STATE_DOC_ID, stateData);
          log("State updated in database");
        } catch (e2) {
          error("Failed to update state: " + e2.message);
        }
      } else {
        error("Failed to save state: " + e.message);
      }
    }

    log("── Function completed successfully ──");
    return res.json({
      ok: true,
      updated: true,
      note: noteText,
      source: newest.source,
      title: newest.title,
      link: newest.link,
    });
  } catch (fatal) {
    const msg = fatal?.message || String(fatal);
    const stack = fatal?.stack || "(no stack)";
    error("FATAL UNCAUGHT ERROR: " + msg);
    error("Stack: " + stack);
    if (fatal?.code) error("Error code: " + fatal.code);
    if (fatal?.response) error("Response: " + JSON.stringify(fatal.response));
    return res.json({ ok: false, error: msg });
  }
};
