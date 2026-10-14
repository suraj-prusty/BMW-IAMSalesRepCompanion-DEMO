// ── Recommendation store ─────────────────────────────────────────────────────
//
// One interface, two backends:
//   • DynamoDB      — used when RECOMMENDATION_TABLE is set (production/AWS).
//   • Local JSON    — used otherwise, so `npm run dev:server` works offline.
//
// The weekly "recommendation" rows (one per recommended dealer) are written on
// manager Save and later reconciled against visit_capture. See
// table_structures/recommendation-tracking-analysis.txt for the data model.
// ────────────────────────────────────────────────────────────────────────────

import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { mkdir, readFile, writeFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TABLE   = process.env.RECOMMENDATION_TABLE;
const USE_DDB = process.env.RECOMMENDATION_BACKEND === "dynamodb" && Boolean(TABLE);

// ── Helpers ──────────────────────────────────────────────────────────────────
const compactPeriod = (label) => String(label || "").replace(/-/g, "");
const repPeriodKey  = (repId, period) => `${repId}#${period}`;

// Build the full row set for one Save. Config is repeated on every row so each
// item is self-contained (DynamoDB-friendly, no join needed on read).
function buildRows(batch) {
  const {
    market,
    manager_id,
    planning_period_label,
    planning_period_start,
    planning_period_end,
    selected_kpis_json,
    rows = [],
  } = batch;

  const save_batch_id = batch.save_batch_id
    || `sb-${market}-${compactPeriod(planning_period_label)}`;
  const generated_at = new Date().toISOString();

  const built = rows.map((r) => ({
    recommendation_id:     randomUUID(),
    save_batch_id,
    market,
    manager_id,
    sales_rep_id:          r.sales_rep_id,
    planning_period_label,
    planning_period_start,
    planning_period_end,
    selected_kpis_json:    selected_kpis_json ?? r.selected_kpis_json ?? null,
    generated_at,
    dealer_id:             r.dealer_id,
    account_type:          r.account_type || "DEALER",
    rank:                  r.rank ?? null,
    dealer_sales:          r.dealer_sales ?? null,
    carry_over_count:      r.carry_over_count ?? 0,
    rep_action:            r.rep_action || "RECOMMENDED",
    action_at:             r.action_at || null,
    action_by:             r.action_by || null,
  }));

  return { save_batch_id, generated_at, built };
}

// ── Local JSON backend ───────────────────────────────────────────────────────
const TABLES_DIR = process.env.LOCAL_TABLES_DIR || path.join(__dirname, "table_structures");
const DATA_FILE = path.join(TABLES_DIR, "recommendation.json");

async function localReadAll() {
  try {
    const text = await readFile(DATA_FILE, "utf8");
    if (!text.trim()) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function localWriteAll(rows) {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(rows, null, 2), "utf8");
}

const localStore = {
  async saveBatch(batch) {
    const { save_batch_id, built } = buildRows(batch);
    const all = await localReadAll();
    // Re-save replaces the week's batch for the same market + period.
    const kept = all.filter((r) => r.save_batch_id !== save_batch_id);
    await localWriteAll([...kept, ...built]);
    return { save_batch_id, count: built.length };
  },

  async listByRep(salesRepId, period) {
    const all = await localReadAll();
    return all
      .filter((r) => r.sales_rep_id === salesRepId
        && (!period || r.planning_period_label === period))
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  },

  async getBatch(saveBatchId) {
    const all = await localReadAll();
    return all
      .filter((r) => r.save_batch_id === saveBatchId)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  },

  async updateAction(recommendationId, { rep_action, action_by }) {
    const all = await localReadAll();
    let updated = null;
    const next = all.map((r) => {
      if (r.recommendation_id !== recommendationId) return r;
      updated = {
        ...r,
        rep_action: rep_action ?? r.rep_action,
        action_by:  action_by ?? null,
        action_at:  new Date().toISOString(),
      };
      return updated;
    });
    if (!updated) return null;
    await localWriteAll(next);
    return updated;
  },
};

// ── DynamoDB backend ─────────────────────────────────────────────────────────
// Table (single): PK = recommendation_id
//   GSI1: PK = save_batch_id,   SK = rank        (batch queries)
//   GSI2: PK = rep_period,      SK = rank        (rep + period queries)
let ddbStore = null;
if (USE_DDB) {
  const { DynamoDBClient }   = await import("@aws-sdk/client-dynamodb");
  const {
    DynamoDBDocumentClient, BatchWriteCommand, QueryCommand, UpdateCommand,
  } = await import("@aws-sdk/lib-dynamodb");

  const doc = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: process.env.AWS_REGION || "eu-central-1" })
  );

  const chunk = (arr, n) =>
    Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  ddbStore = {
    async saveBatch(batch) {
      const { save_batch_id, built } = buildRows(batch);
      const items = built.map((r) => ({
        ...r,
        rep_period: repPeriodKey(r.sales_rep_id, r.planning_period_label),
      }));
      for (const group of chunk(items, 25)) {
        await doc.send(new BatchWriteCommand({
          RequestItems: { [TABLE]: group.map((Item) => ({ PutRequest: { Item } })) },
        }));
      }
      return { save_batch_id, count: items.length };
    },

    async listByRep(salesRepId, period) {
      const res = await doc.send(new QueryCommand({
        TableName: TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "rep_period = :rp",
        ExpressionAttributeValues: { ":rp": repPeriodKey(salesRepId, period) },
      }));
      return res.Items || [];
    },

    async getBatch(saveBatchId) {
      const res = await doc.send(new QueryCommand({
        TableName: TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "save_batch_id = :b",
        ExpressionAttributeValues: { ":b": saveBatchId },
      }));
      return res.Items || [];
    },

    async updateAction(recommendationId, { rep_action, action_by }) {
      const res = await doc.send(new UpdateCommand({
        TableName: TABLE,
        Key: { recommendation_id: recommendationId },
        UpdateExpression: "SET rep_action = :a, action_by = :by, action_at = :at",
        ExpressionAttributeValues: {
          ":a": rep_action, ":by": action_by || null, ":at": new Date().toISOString(),
        },
        ReturnValues: "ALL_NEW",
      }));
      return res.Attributes || null;
    },
  };
}

export const recommendationStore = USE_DDB ? ddbStore : localStore;
export const recommendationBackend = USE_DDB ? "dynamodb" : "local-json";
