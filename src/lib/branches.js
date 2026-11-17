/**
 * Sites are the company's premises: the buildings a visitor can sign in at and
 * the scope a staff member is limited to. The list lives in Settings, so any
 * company can name its own sites without a code change.
 */
export const DEFAULT_SITES = ["Main Site"];

/** Where a sign-in lands when no site has been configured yet. */
export const DEFAULT_SITE = DEFAULT_SITES[0];

export function sitesFrom(settings) {
  const list = Array.isArray(settings?.sites) ? settings.sites : [];
  const cleaned = list.map((site) => String(site ?? "").trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : DEFAULT_SITES;
}

export function isSite(sites, value) {
  const list = Array.isArray(sites) && sites.length > 0 ? sites : DEFAULT_SITES;
  return list.includes(String(value ?? "").trim());
}

/** Human label for a site filter value. */
export function siteLabel(sites, value) {
  return isSite(sites, value) ? String(value).trim() : "All sites";
}