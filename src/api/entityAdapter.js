/**
 * The app's entities on Supabase.
 *
 * The UI was written against the Base44 entity API (`list`, `filter`, `create`, …),
 * so this module keeps that surface and translates each call into PostgREST queries
 * against the matching Supabase table. Filters use the Mongo-style operators the
 * app already sends (`$in`, `$gte`, `$regex`, `$or`, `$and`).
 */

const TABLES = {
  User: "profiles",
  Settings: "settings",
  SlideshowSlide: "slideshow_slides",
  VisitReason: "visit_reasons",
  Member: "members",
  Visit: "visits",
  AuditLog: "audit_logs",
};

const OPERATORS = {
  $eq: "eq",
  $ne: "neq",
  $gt: "gt",
  $gte: "gte",
  $lt: "lt",
  $lte: "lte",
  $like: "like",
  $ilike: "ilike",
};

const MAX_AGGREGATE_ROWS = 20000;

function table(entity) {
  const name = TABLES[entity];
  if (!name) throw new Error(`Unknown entity: ${entity}`);
  return name;
}

function toRecord(entity, row) {
  if (!row) return row;
  const record = { ...row };
  // The app reads the platform role as `role`; Supabase stores it as `app_role`.
  if (entity === "User") record.role = row.app_role;
  return record;
}

function toPatch(entity, data = {}) {
  const patch = { ...data };
  delete patch.id;
  delete patch.created_date;
  delete patch.updated_date;
  if (entity === "User" && "role" in patch) {
    patch.app_role = patch.role;
    delete patch.role;
  }
  return patch;
}

function fail(error) {
  const wrapped = new Error(error.message || "The database request failed");
  wrapped.status = error.code === "PGRST116" ? 404 : error.status ?? 500;
  return wrapped;
}

function applySort(query, sort) {
  if (!sort) return query;
  const keys = String(sort)
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  for (const key of keys) {
    const descending = key.startsWith("-");
    const column = descending ? key.slice(1) : key;
    query = query.order(column, { ascending: !descending, nullsFirst: false });
  }
  return query;
}

const quote = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

function condition(field, value) {
  if (value === null) return `${field}.is.null`;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    if ("$regex" in value) {
      const operator = String(value.$options || "").includes("i") ? "ilike" : "like";
      return `${field}.${operator}.${quote(`%${value.$regex}%`)}`;
    }
    if ("$in" in value) return `${field}.in.(${value.$in.map(quote).join(",")})`;
    for (const [operator, name] of Object.entries(OPERATORS)) {
      if (operator in value) return `${field}.${name}.${quote(value[operator])}`;
    }
  }
  return `${field}.eq.${quote(value)}`;
}

// Turns one logical group into a PostgREST `or(...)` / `and(...)` expression.
function group(clause) {
  if (!clause || typeof clause !== "object") return "";
  if (clause.$or) return `or(${clause.$or.map(group).filter(Boolean).join(",")})`;
  if (clause.$and) return `and(${clause.$and.map(group).filter(Boolean).join(",")})`;
  return Object.entries(clause)
    .map(([field, value]) => condition(field, value))
    .join(",");
}

function applyQuery(query, filter) {
  for (const [field, value] of Object.entries(filter || {})) {
    if (field === "$or") {
      query = query.or(value.map(group).filter(Boolean).join(","));
      continue;
    }
    if (field === "$and") {
      for (const clause of value) query = applyQuery(query, clause);
      continue;
    }
    if (value === null) {
      query = query.is(field, null);
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ("$regex" in value) {
        const pattern = `%${value.$regex}%`;
        query = String(value.$options || "").includes("i") ? query.ilike(field, pattern) : query.like(field, pattern);
        continue;
      }
      if ("$in" in value) {
        query = query.in(field, value.$in);
        continue;
      }
      let applied = false;
      for (const [operator, name] of Object.entries(OPERATORS)) {
        if (operator in value) {
          query = query[name](field, value[operator]);
          applied = true;
        }
      }
      if (applied) continue;
    }
    query = query.eq(field, value);
  }
  return query;
}

const hasFilter = (filter) => !!filter && Object.keys(filter).length > 0;

async function readPage(client, entity, filter, { sort, limit = 100, offset = 0 } = {}) {
  let query = client.from(table(entity)).select("*", { count: "exact" });
  query = applyQuery(query, filter);
  query = applySort(query, sort);
  query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) throw fail(error);
  const items = (data ?? []).map((row) => toRecord(entity, row));
  const nextOffset = offset + items.length;
  return {
    items,
    total: count ?? items.length,
    next_cursor: items.length === limit ? String(nextOffset) : null,
    has_more: items.length === limit,
  };
}

async function readArray(client, entity, filter, { sort, limit, skip } = {}) {
  let query = client.from(table(entity)).select("*");
  query = applyQuery(query, filter);
  query = applySort(query, sort);
  if (skip) query = query.range(skip, skip + (limit ?? 1000) - 1);
  else if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw fail(error);
  return (data ?? []).map((row) => toRecord(entity, row));
}

function handler(client, entity) {
  return {
    /** list(sort, limit, skip) returns an array; list({ sort, limit, cursor }) returns one page. */
    async list(sortOrOptions, limit, skip) {
      if (sortOrOptions && typeof sortOrOptions === "object") {
        const offset = Number(sortOrOptions.cursor ?? 0) || 0;
        return readPage(client, entity, null, {
          sort: sortOrOptions.sort,
          limit: sortOrOptions.limit ?? 100,
          offset,
        });
      }
      return readArray(client, entity, null, { sort: sortOrOptions, limit, skip });
    },

    /** filter(query, sort, limit, skip) returns an array; filter(query, options) returns one page. */
    async filter(filterQuery, optionsOrSort, limit, skip) {
      if (optionsOrSort && typeof optionsOrSort === "object") {
        const offset = Number(optionsOrSort.cursor ?? 0) || 0;
        return readPage(client, entity, filterQuery, {
          sort: optionsOrSort.sort,
          limit: optionsOrSort.limit ?? 100,
          offset,
        });
      }
      return readArray(client, entity, filterQuery, { sort: optionsOrSort, limit, skip });
    },

    async get(id) {
      const { data, error } = await client.from(table(entity)).select("*").eq("id", id).maybeSingle();
      if (error) throw fail(error);
      if (!data) throw Object.assign(new Error("Not found"), { status: 404 });
      return toRecord(entity, data);
    },

    async create(data) {
      const { data: row, error } = await client.from(table(entity)).insert(toPatch(entity, data)).select().single();
      if (error) throw fail(error);
      return toRecord(entity, row);
    },

    async update(id, data) {
      const { data: row, error } = await client
        .from(table(entity))
        .update(toPatch(entity, data))
        .eq("id", id)
        .select()
        .single();
      if (error) throw fail(error);
      return toRecord(entity, row);
    },

    async delete(id) {
      const { error } = await client.from(table(entity)).delete().eq("id", id);
      if (error) throw fail(error);
      return { ok: true };
    },

    async deleteMany(filterQuery) {
      let query = client.from(table(entity)).delete();
      query = applyQuery(query, filterQuery);
      if (!hasFilter(filterQuery)) query = query.not("id", "is", null);
      const { error } = await query;
      if (error) throw fail(error);
      return { ok: true };
    },

    async updateMany(filterQuery, data) {
      const patch = toPatch(entity, data?.$set ?? data);
      let query = client.from(table(entity)).update(patch);
      query = applyQuery(query, filterQuery);
      if (!hasFilter(filterQuery)) query = query.not("id", "is", null);
      const { error } = await query;
      if (error) throw fail(error);
      return { ok: true };
    },

    async count(filterQuery) {
      let query = client.from(table(entity)).select("id", { count: "exact", head: true });
      query = applyQuery(query, filterQuery);
      const { count: total, error } = await query;
      if (error) throw fail(error);
      return total ?? 0;
    },

    /** aggregate({ groupBy: "reason" }) -> { rows: [{ reason, count }] } */
    async aggregate({ groupBy } = {}) {
      if (!groupBy) throw new Error("aggregate needs a groupBy field");
      const { data, error } = await client.from(table(entity)).select(groupBy).limit(MAX_AGGREGATE_ROWS);
      if (error) throw fail(error);
      const counts = new Map();
      for (const row of data ?? []) {
        const key = row[groupBy] ?? "Unspecified";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return { rows: [...counts.entries()].map(([value, count]) => ({ [groupBy]: value, count })) };
    },
  };
}

/** Builds the `entities.<Name>` map over one Supabase client. */
export function createEntities(client) {
  const cache = new Map();
  return new Proxy(
    {},
    {
      get(_target, entity) {
        if (typeof entity !== "string" || !TABLES[entity]) return undefined;
        if (!cache.has(entity)) cache.set(entity, handler(client, entity));
        return cache.get(entity);
      },
    },
  );
}
