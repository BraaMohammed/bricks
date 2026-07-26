/**
 * provider-health.ts
 *
 * Tracks per-provider availability state (cooldowns after rate limits or errors).
 *
 * Two modes — selected at module initialization via WATERFALL_MODE env var:
 *
 *   WATERFALL_MODE=stateful   (default)
 *     • In-memory Map<providerId, coolingUntilMs>
 *     • Optional file-system persistence (provider-health.json) so state
 *       survives Node.js process restarts (but NOT serverless cold starts)
 *
 *   WATERFALL_MODE=serverless
 *     • All functions are no-ops; every provider is always "available"
 *     • Safe for Vercel, Cloudflare Workers, AWS Lambda, etc.
 */

import * as fs from 'fs';
import * as path from 'path';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProviderHealthEntry {
  coolingUntil: number; // epoch ms; 0 = healthy
  reason: 'rate_limit' | 'error' | null;
}

export interface HealthStore {
  isAvailable(providerId: string): boolean;
  markRateLimited(providerId: string, cooldownMs: number): void;
  markError(providerId: string, cooldownMs: number): void;
  reset(providerId: string): void;
  getAll(): Record<string, ProviderHealthEntry>;
}

// ── Serverless no-op implementation ──────────────────────────────────────────

const SERVERLESS_STORE: HealthStore = {
  isAvailable: () => true,
  markRateLimited: () => {},
  markError: () => {},
  reset: () => {},
  getAll: () => ({}),
};

// ── Stateful in-memory + optional file-system implementation ─────────────────

const HEALTH_FILE = path.join(process.cwd(), 'provider-health.json');
const PERSIST_TO_DISK =
  process.env.WATERFALL_PERSIST_HEALTH === 'true' &&
  process.env.WATERFALL_MODE !== 'serverless';

/** In-memory map; epoch ms. 0 = healthy. */
const healthMap = new Map<string, ProviderHealthEntry>();

/** Load persisted state from disk on first use. */
function loadFromDisk(): void {
  if (!PERSIST_TO_DISK) return;
  try {
    if (fs.existsSync(HEALTH_FILE)) {
      const raw = fs.readFileSync(HEALTH_FILE, 'utf-8');
      const saved: Record<string, ProviderHealthEntry> = JSON.parse(raw);
      const now = Date.now();
      for (const [id, entry] of Object.entries(saved)) {
        // Only load entries that are still in the future
        if (entry.coolingUntil > now) {
          healthMap.set(id, entry);
        }
      }
    }
  } catch {
    // Ignore corrupt/missing file — start fresh
  }
}

/** Persist current state to disk. */
function saveToDisk(): void {
  if (!PERSIST_TO_DISK) return;
  try {
    const obj: Record<string, ProviderHealthEntry> = {};
    healthMap.forEach((entry, id) => {
      obj[id] = entry;
    });
    fs.writeFileSync(HEALTH_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch {
    // Non-fatal — just skip persistence
  }
}

let diskLoaded = false;

function ensureDiskLoaded(): void {
  if (!diskLoaded) {
    loadFromDisk();
    diskLoaded = true;
  }
}

const STATEFUL_STORE: HealthStore = {
  isAvailable(providerId: string): boolean {
    ensureDiskLoaded();
    const entry = healthMap.get(providerId);
    if (!entry) return true;
    if (entry.coolingUntil <= Date.now()) {
      healthMap.delete(providerId);
      return true;
    }
    return false;
  },

  markRateLimited(providerId: string, cooldownMs: number): void {
    ensureDiskLoaded();
    const entry: ProviderHealthEntry = {
      coolingUntil: Date.now() + cooldownMs,
      reason: 'rate_limit',
    };
    healthMap.set(providerId, entry);
    const remaining = Math.round(cooldownMs / 1000);
    console.warn(
      `⏳ [waterfall] ${providerId} rate-limited — cooling down for ${remaining}s`,
    );
    saveToDisk();
  },

  markError(providerId: string, cooldownMs: number): void {
    ensureDiskLoaded();
    const entry: ProviderHealthEntry = {
      coolingUntil: Date.now() + cooldownMs,
      reason: 'error',
    };
    healthMap.set(providerId, entry);
    const remaining = Math.round(cooldownMs / 1000);
    console.warn(
      `⚠️  [waterfall] ${providerId} errored — cooling down for ${remaining}s`,
    );
    saveToDisk();
  },

  reset(providerId: string): void {
    if (healthMap.has(providerId)) {
      healthMap.delete(providerId);
      saveToDisk();
    }
  },

  getAll(): Record<string, ProviderHealthEntry> {
    ensureDiskLoaded();
    const result: Record<string, ProviderHealthEntry> = {};
    healthMap.forEach((entry, id) => {
      result[id] = entry;
    });
    return result;
  },
};

// ── Export the right store based on WATERFALL_MODE ────────────────────────────

const IS_SERVERLESS = process.env.WATERFALL_MODE === 'serverless';

export const health: HealthStore = IS_SERVERLESS
  ? SERVERLESS_STORE
  : STATEFUL_STORE;
