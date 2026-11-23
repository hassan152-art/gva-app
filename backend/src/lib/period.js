/**
 * Sponsorship period maths, shared by the impact tiles and the history summary
 * so both always report the same average.
 *
 * Months are counted in UTC. The database stores timestamps; using the server's
 * local time would shift a 1 Aug UTC start into July for negative UTC offsets
 * and silently inflate the divisor.
 */
export function monthsActiveSince(since) {
  const start = since ? new Date(since) : new Date();
  const now = new Date();
  const months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth()) +
    1;
  return Math.max(1, months);
}
