import { base44 } from "@/api/base44Client";

/** Turns the visits page's search params into an entity filter. */
export function buildVisitFilter(search = {}) {
  const filter = {};
  const clauses = [];

  if (search.q) {
    const rx = String(search.q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    clauses.push({
      $or: [
        { full_name: { $regex: rx, $options: "i" } },
        { contact_number: { $regex: rx, $options: "i" } },
        { address: { $regex: rx, $options: "i" } },
      ],
    });
  }
  if (search.reason) filter.reason = search.reason;
  if (search.status) filter.status = search.status;
  if (search.branch) filter.branch = search.branch;
  if (search.from || search.to) {
    filter.visit_date = {};
    if (search.from) filter.visit_date.$gte = search.from;
    if (search.to) filter.visit_date.$lte = search.to;
  }
  if (clauses.length > 0) filter.$and = clauses;
  return filter;
}

/** Walks every cursor page so exports always cover the whole filtered view. */
export async function fetchAllVisits(filter, sort = "-visit_date", max = 5000) {
  const rows = [];
  let cursor;
  do {
    const page = await base44.entities.Visit.filter(filter, { sort, limit: 200, cursor });
    rows.push(...(page?.items ?? []));
    cursor = page?.next_cursor;
  } while (cursor && rows.length < max);
  return rows.slice(0, max);
}