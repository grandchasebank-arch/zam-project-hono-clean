import type {
  BaseRecord,
  CreateParams,
  CustomParams,
  DataProvider,
  DeleteOneParams,
  GetListParams,
  GetOneParams,
  UpdateParams,
} from "@refinedev/core";
import { apiFetch, ApiError } from "@/lib/api";

const LIST_PATH: Record<string, string> = {
  members: "/admin/members",
  "upgrade-requests": "/admin/upgrade-requests",
  tiers: "/admin/tiers",
};

function listPath(resource: string): string {
  const base = LIST_PATH[resource];
  if (!base) throw new Error(`Unknown resource: ${resource}`);
  return base;
}

function onePath(resource: string, id: string | number): string {
  if (resource === "settings") return "/admin/settings";
  if (resource === "upgrade-requests") return `/upgrade-requests/${id}`;
  return `${listPath(resource)}/${id}`;
}

function updatePath(resource: string, id: string | number): string {
  if (resource === "settings") return "/admin/settings";
  if (resource === "upgrade-requests") return `/upgrade-requests/${id}`;
  return `${listPath(resource)}/${id}`;
}

function toRefineError(e: unknown) {
  if (e instanceof ApiError) {
    return {
      message: e.message,
      statusCode: e.status ?? 400,
    };
  }
  return { message: "Request failed", statusCode: 500 };
}

/** Maps Refine CRUD to Hono { success, data } responses */
export const dataProvider: DataProvider = {
  getList: async <TData extends BaseRecord = BaseRecord>({
    resource,
    filters,
  }: GetListParams) => {
    try {
      if (resource === "dashboard" || resource === "notify") {
        return { data: [] as TData[], total: 0 };
      }
      let rows = await apiFetch<TData[]>(listPath(resource));
      if (filters?.length) {
        for (const f of filters) {
          if (f.operator !== "eq" || !("field" in f)) continue;
          rows = rows.filter((row) => row[f.field as keyof TData] === f.value);
        }
      }
      return { data: rows, total: rows.length };
    } catch (e) {
      throw toRefineError(e);
    }
  },

  getOne: async <TData extends BaseRecord = BaseRecord>({
    resource,
    id,
  }: GetOneParams) => {
    try {
      if (resource === "settings") {
        const data = await apiFetch<TData>("/admin/settings");
        return { data };
      }
      const list = await apiFetch<TData[]>(listPath(resource));
      const row = list.find((r) => String(r.id) === String(id));
      if (!row) throw new ApiError("Not found", "NOT_FOUND", 404);
      return { data: row };
    } catch (e) {
      throw toRefineError(e);
    }
  },

  create: async <TData extends BaseRecord = BaseRecord, TVariables = object>({
    resource,
    variables,
  }: CreateParams<TVariables>) => {
    try {
      const data = await apiFetch<TData>(listPath(resource), {
        method: "POST",
        body: JSON.stringify(variables),
      });
      return { data };
    } catch (e) {
      throw toRefineError(e);
    }
  },

  update: async <TData extends BaseRecord = BaseRecord, TVariables = object>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>) => {
    try {
      const data = await apiFetch<TData>(updatePath(resource, id), {
        method: "PATCH",
        body: JSON.stringify(variables),
      });
      return { data };
    } catch (e) {
      throw toRefineError(e);
    }
  },

  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = object>(
    params: DeleteOneParams<TVariables>
  ) => {
    const { resource, id } = params;
    try {
      const data = await apiFetch<TData>(`${listPath(resource)}/${id}`, {
        method: "DELETE",
      });
      return { data };
    } catch (e) {
      throw toRefineError(e);
    }
  },

  getApiUrl: () => "",

  custom: async <TData extends BaseRecord = BaseRecord, TQuery = unknown>({
    url,
    method,
    payload,
  }: CustomParams<TQuery>) => {
    try {
      const data = await apiFetch<TData>(String(url), {
        method: method ?? "GET",
        body: payload ? JSON.stringify(payload) : undefined,
      });
      return { data };
    } catch (e) {
      throw toRefineError(e);
    }
  },
};
