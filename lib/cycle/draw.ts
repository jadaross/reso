/**
 * The Draw: a uniformly random choice among every Pick in the Outing's tier.
 *
 * Every Pick is one ticket. Nothing is filtered by who is available, nothing is
 * excluded for having been visited before, and duplicates are not merged — so a
 * place two Members both added really is twice as likely. That is the design, not
 * an oversight.
 */

/**
 * A uniformly distributed integer in [0, bound), from the CSPRNG.
 *
 * Rejection sampling rather than `% bound`, which would quietly bias the draw
 * toward the first `2^32 % bound` candidates.
 */
export function randomIndex(bound: number): number {
  if (bound <= 0) throw new RangeError("bound must be positive");
  if (bound === 1) return 0;

  const limit = Math.floor(0xffffffff / bound) * bound;
  const buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= limit);

  return value % bound;
}

/** Returns null when the tier has no Picks at all — the caller decides what to do. */
export function drawFrom<T>(candidates: readonly T[]): T | null {
  if (candidates.length === 0) return null;
  return candidates[randomIndex(candidates.length)];
}
