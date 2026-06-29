import { Hono } from "hono";
import { createSupabase } from "../lib/supabase";
import { AppError } from "../lib/errors";
import type { Bindings, Variables } from "../types/env";

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

interface TierRow {
  id: string;
  name: string;
  label: string;
  price: number;
  description: string | null;
  benefits: string[];
  rank: number;
  is_active: boolean;
}

function formatPrice(amount: number): string {
  return `$${Number(amount).toLocaleString("en-US")}`;
}

function variantFromRank(rank: number): "explorer" | "pioneer" | "vanguard" {
  if (rank === 1) return "explorer";
  if (rank === 2) return "pioneer";
  return "vanguard";
}

// FIX: map DB tier row to API shape expected by frontend mapTier()
export function mapTierRow(row: TierRow) {
  const benefits = row.benefits ?? []; // FIX: normalize benefits for TierCard features list
  const priceNum = Number(row.price);
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    price: formatPrice(priceNum),
    description: row.description ?? "",
    benefits: row.benefits ?? [], // FIX: expose benefits in API response
    rank: row.rank,
    price_cents: Math.round(priceNum * 100),
    priceValue: priceNum,
    clearance: row.label,
    features: benefits, // FIX: TierCard.tsx renders tier.features
    variant: variantFromRank(row.rank),
  };
}

// GET /tiers — public, served from DB
app.get("/", async (c) => {
  const sb = createSupabase(c.env);
  const rows = await sb.select<TierRow>(
    "tiers",
    "is_active=eq.true&order=rank.asc"
  );
  return c.json({ success: true, data: rows.map(mapTierRow) });
});

// GET /tiers/:id
app.get("/:id", async (c) => {
  const sb = createSupabase(c.env);
  const row = await sb.selectOne<TierRow>(
    "tiers",
    `id=eq.${c.req.param("id")}&is_active=eq.true`
  );
  if (!row) throw new AppError(404, "Tier not found", "NOT_FOUND");
  return c.json({ success: true, data: mapTierRow(row) });
});

export default app;
