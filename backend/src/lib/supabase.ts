import type { Bindings } from "../types/env";

export function createSupabase(env: Bindings) {
  const url = env.SUPABASE_URL;
  const svcKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.SUPABASE_ANON_KEY;

  const svcHeaders: Record<string, string> = {
    apikey: svcKey,
    Authorization: `Bearer ${svcKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  return {
    async getUser(token: string): Promise<{ id: string; email: string } | null> {
      const r = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return null;
      return r.json();
    },

    async select<T = Record<string, unknown>>(table: string, qs?: string): Promise<T[]> {
      const r = await fetch(`${url}/rest/v1/${table}${qs ? "?" + qs : ""}`, {
        headers: { ...svcHeaders, Prefer: "return=representation" },
      });
      if (!r.ok) {
        const msg = await r.text();
        throw new Error(`Supabase select(${table}) failed: ${msg}`);
      }
      return r.json();
    },

    async selectOne<T = Record<string, unknown>>(table: string, qs: string): Promise<T | null> {
      const r = await fetch(`${url}/rest/v1/${table}?${qs}&limit=1`, {
        headers: { ...svcHeaders, Prefer: "return=representation" },
      });
      if (!r.ok) return null;
      const rows: T[] = await r.json();
      return rows[0] ?? null;
    },

    async insert<T = Record<string, unknown>>(table: string, body: object): Promise<T> {
      const r = await fetch(`${url}/rest/v1/${table}`, {
        method: "POST",
        headers: svcHeaders,
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const msg = await r.text();
        throw new Error(`Supabase insert(${table}) failed: ${msg}`);
      }
      const rows: T[] = await r.json();
      return rows[0];
    },

    async update<T = Record<string, unknown>>(table: string, qs: string, body: object): Promise<T | null> {
      const r = await fetch(`${url}/rest/v1/${table}?${qs}`, {
        method: "PATCH",
        headers: svcHeaders,
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const msg = await r.text();
        throw new Error(`Supabase update(${table}) failed: ${msg}`);
      }
      const rows: T[] = await r.json();
      return rows[0] ?? null;
    },

    async remove(table: string, qs: string): Promise<void> {
      const r = await fetch(`${url}/rest/v1/${table}?${qs}`, {
        method: "DELETE",
        headers: { ...svcHeaders, Prefer: "return=minimal" },
      });
      if (!r.ok) {
        const msg = await r.text();
        throw new Error(`Supabase delete(${table}) failed: ${msg}`);
      }
    },
  };
}

export type SupabaseClient = ReturnType<typeof createSupabase>;
