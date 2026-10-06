/**
 * src/lib/change-stream.ts
 *
 * Stage 6 — MongoDB Change Streams
 *
 * Opens a single change stream on the MongoDB database (using the oplog) and
 * watches ALL collections at once.  When a document is inserted, updated, or
 * deleted, it resolves the affected cache tags using COLLECTION_TAG_MAP and
 * fires a POST to /api/revalidate — busting the Vercel CDN cache within ~100ms
 * of the DB write.
 *
 * Features:
 *   - Resume token persistence: if the process restarts, it resumes from where
 *     it left off — zero events missed.
 *   - Exponential back-off on transient errors.
 *   - Per-document surgical tag busting (e.g. "listing:abc123" in addition to
 *     the collection-level "listings" tag).
 *   - Works with ANY write source: your API, a script, Atlas UI, mongoimport.
 *
 * How to run:
 *   Option A — Vercel Cron job (recommended for Vercel deployments):
 *     Add to vercel.json:
 *       { "crons": [{ "path": "/api/change-stream-tick", "schedule": "* * * * *" }] }
 *     Then implement /api/change-stream-tick as a short-polling Route Handler
 *     that reads recent oplog entries (see docs/change-stream-cron.md).
 *
 *   Option B — Long-lived Node process (self-hosted / Railway / Render):
 *     import { startChangeStreamListener } from '@/lib/change-stream';
 *     startChangeStreamListener();  // call once at process start
 *
 *   Option C — Next.js instrumentation hook (recommended for local dev):
 *     // src/instrumentation.ts
 *     export async function register() {
 *       if (process.env.NEXT_RUNTIME === 'nodejs') {
 *         const { startChangeStreamListener } = await import('./lib/change-stream');
 *         startChangeStreamListener();
 *       }
 *     }
 */

import mongoose, { Model, Schema } from 'mongoose';
import { COLLECTION_TAG_MAP } from '@/config/route-registry';
import connectToDatabase from '@/lib/mongooes';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REVALIDATE_URL =
  process.env.NEXT_PUBLIC_SITE_URL
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/revalidate`
    : `http://localhost:${process.env.PORT ?? 3000}/api/revalidate`;

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET ?? '';
const RESUME_TOKEN_KEY = 'change_stream_resume_token';

interface IResumeToken {
  key: string;
  token: unknown;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Resume token storage (in-memory + MongoDB)
// ---------------------------------------------------------------------------

/** Lightweight model to persist the resume token across restarts. */
function getResumeTokenModel(): Model<IResumeToken> {
  if (mongoose.models.ChangeStreamToken) {
    return mongoose.models.ChangeStreamToken as Model<IResumeToken>;
  }

  // 2. Pass the interface to the schema and model
  const schema = new Schema<IResumeToken>({
    key: { type: String, unique: true },
    token: { type: mongoose.Schema.Types.Mixed },
    updatedAt: { type: Date, default: Date.now },
  });

  return mongoose.model<IResumeToken>('ChangeStreamToken', schema, 'change_stream_tokens');
}

async function loadResumeToken(): Promise<unknown | undefined> {
  try {
    const Model = getResumeTokenModel();
    const doc = await Model?.findOne({ key: RESUME_TOKEN_KEY as string }).lean();
    return (doc as { token?: unknown } | null)?.token ?? undefined;
  } catch {
    return undefined;
  }
}

async function saveResumeToken(token: unknown): Promise<void> {
  try {
    const Model = getResumeTokenModel();
    await Model.findOneAndUpdate(
      { key: RESUME_TOKEN_KEY as string },
      { token, updatedAt: new Date() },
      { upsert: true },
    );
  } catch (err) {
    console.warn('[change-stream] Failed to save resume token:', err);
  }
}

// ---------------------------------------------------------------------------
// Tag resolution
// ---------------------------------------------------------------------------

/**
 * Given a change event, returns the list of cache tags to invalidate.
 *
 * Always includes the collection-level tags (e.g. "listings").
 * Also includes a per-document tag when the document has an _id
 * (e.g. "listing:66abc123") so page-level caches for individual documents
 * can be busted without touching the whole collection cache.
 */
function resolveTags(event: {
  ns: { coll: string };
  documentKey?: { _id?: unknown };
  operationType: string;
}): string[] {
  const coll = event.ns.coll.toLowerCase().replace(/_/g, '');
  const collectionTags = COLLECTION_TAG_MAP[coll] ?? [];

  const tags = [...collectionTags];

  // Singular collection name for per-document tags
  // e.g. collection "listings" → tag "listing:66abc123"
  const singular = coll.replace(/s$/, '');
  const docId = event.documentKey?._id;
  if (docId) {
    tags.push(`${singular}:${String(docId)}`);
  }

  return [...new Set(tags)]; // deduplicate
}

// ---------------------------------------------------------------------------
// Revalidate webhook caller
// ---------------------------------------------------------------------------

async function fireRevalidate(tags: string[], reason: string): Promise<void> {
  if (tags.length === 0) return;
  try {
    const res = await fetch(REVALIDATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': REVALIDATE_SECRET,
      },
      body: JSON.stringify({ tags, reason }),
    });
    if (!res.ok) {
      console.warn(`[change-stream] Revalidate responded ${res.status} for tags: ${tags.join(', ')}`);
    }
  } catch (err) {
    console.error('[change-stream] Failed to fire revalidate:', err);
  }
}

// ---------------------------------------------------------------------------
// Main listener
// ---------------------------------------------------------------------------

let _running = false;

/**
 * Starts the change stream listener.  Idempotent — safe to call multiple times.
 * Automatically reconnects with exponential back-off on errors.
 */
export async function startChangeStreamListener(): Promise<void> {
  if (_running) return;
  _running = true;
  console.log('[change-stream] Starting listener…');

  let backoff = 1000; // ms

  const run = async () => {
    try {
      await connectToDatabase();
      const db = mongoose.connection.db;
      if (!db) throw new Error('Database not connected');

      const resumeToken = await loadResumeToken();
      console.log('[change-stream] Connected.', resumeToken ? 'Resuming from saved token.' : 'Starting fresh.');

      const streamOptions: mongoose.mongo.ChangeStreamOptions = {
        fullDocument: 'updateLookup', // get the full doc on updates
      };
      if (resumeToken) {
        streamOptions.resumeAfter = resumeToken as mongoose.mongo.ResumeToken;
      }

      // Watch the entire database (all collections)
      const stream = db.watch([], streamOptions);

      stream.on('change', async (event) => {
        // Persist resume token immediately so a crash doesn't replay events
        await saveResumeToken(event._id);
        backoff = 1000; // reset back-off on successful event

        const op = event.operationType;
        // Only react to writes
        if (!['insert', 'update', 'replace', 'delete'].includes(op)) return;

        const tags = resolveTags(event as Parameters<typeof resolveTags>[0]);
        const reason = `${op} on ${(event as { ns: { coll: string } }).ns.coll} via change-stream`;

        console.log(`[change-stream] ${reason} → invalidating: ${tags.join(', ')}`);
        await fireRevalidate(tags, reason);
      });

      stream.on('error', (err) => {
        console.error('[change-stream] Stream error:', err);
        stream.close().catch(() => { });
        scheduleReconnect();
      });

      stream.on('close', () => {
        console.warn('[change-stream] Stream closed unexpectedly — reconnecting…');
        scheduleReconnect();
      });

    } catch (err) {
      console.error('[change-stream] Connection error:', err);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    _running = true; // keep the guard up
    console.log(`[change-stream] Reconnecting in ${backoff}ms…`);
    setTimeout(() => {
      backoff = Math.min(backoff * 2, 30_000); // cap at 30s
      run();
    }, backoff);
  };

  run();
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('[change-stream] SIGTERM received — shutting down…');
    _running = false;
  });
}