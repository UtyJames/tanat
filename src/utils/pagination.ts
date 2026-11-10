/**
 * Tanat — pagination parsing.
 *
 * The security review (L-01) found that `limit=-1` reached SQLite as
 * `LIMIT -1`, which means "no limit". Values are now parsed as integers and
 * clamped to a safe range.
 */

export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(
  query: { page?: string; limit?: string },
  defaultLimit = 20,
  maxLimit = 100,
): Pagination {
  const rawPage = Number.parseInt(query.page ?? '', 10);
  const rawLimit = Number.parseInt(query.limit ?? '', 10);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1
      ? Math.min(rawLimit, maxLimit)
      : defaultLimit;

  return { page, limit, offset: (page - 1) * limit };
}
