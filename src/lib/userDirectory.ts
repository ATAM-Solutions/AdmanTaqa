import type { ApiUser } from "@/types/user";

/**
 * Where a company's people are read from.
 *
 * `users.read` holders (platform overseers, custom roles) use the broad `/users` endpoints. A company manager whose
 * role carries only the team permissions (`team.read`, e.g. the default Station Owner / Station Manager) reads the
 * same people through the team-scoped endpoints instead, which the backend limits to the caller's OWN company.
 * The response shape is identical, so nothing downstream depends on which one answered.
 */
export function userDetailPath(id: number | string, canReadUsers: boolean): string {
  return canReadUsers ? `users/${id}` : `team/users/${id}`;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 50;

interface Page {
  items: ApiUser[];
  total: number;
}

/** Collects every page of `/organizations/me/users` (the backend caps a page at 100) into one flat list. */
export async function fetchAllCompanyUsers(
  fetchPage: (page: number, limit: number) => Promise<Page>,
): Promise<ApiUser[]> {
  const all: ApiUser[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const { items, total } = await fetchPage(page, PAGE_LIMIT);
    all.push(...items);
    if (items.length === 0 || all.length >= total) break;
  }
  return all;
}
