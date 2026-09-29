/**
 * LexoRank utility for Kanban board ordering.
 *
 * Ranks are zero-padded 12-digit decimal strings (e.g., "000000065536").
 * They are lexicographically sortable and partitioned per stage.
 *
 * Initial backfill uses a gap of 65536 (2^16) between consecutive cards,
 * providing ample room for insertions before string extension is needed.
 */

const PAD_LENGTH = 12;
const PAD_CHAR = '0';
const DEFAULT_GAP = BigInt(65536); // 2^16 gap between initial cards
const INITIAL_RANK = '000000065536'; // Rank of first card in any stage

function padRank(n: bigint): string {
  return n.toString().padStart(PAD_LENGTH, PAD_CHAR);
}

/**
 * Calculates a midpoint rank string between two rank strings.
 *
 * @param prevRank - The rank of the card immediately above the target position,
 *                   or null if the card is being prepended to the top.
 * @param nextRank - The rank of the card immediately below the target position,
 *                   or null if the card is being appended to the bottom.
 * @returns A new rank string that sorts strictly between prevRank and nextRank.
 *
 * @example
 * getMidpointRank(null, null)                     // => "000000065536" (empty stage)
 * getMidpointRank(null, "000000065536")            // => "000000032768" (prepend to top)
 * getMidpointRank("000000065536", null)            // => "000000131072" (append to bottom)
 * getMidpointRank("000000065536", "000000131072")  // => "000000098304" (midpoint)
 */
export function getMidpointRank(
  prevRank: string | null,
  nextRank: string | null,
): string {
  // Case 1: Empty stage — assign initial rank
  if (!prevRank && !nextRank) {
    return INITIAL_RANK;
  }

  // Case 2: Append to bottom (no next neighbor)
  if (prevRank && !nextRank) {
    const prev = BigInt(prevRank);
    return padRank(prev + DEFAULT_GAP);
  }

  // Case 3: Prepend to top (no prev neighbor)
  if (!prevRank && nextRank) {
    const next = BigInt(nextRank);
    if (next === 0n) {
      // No room to halve — extend the string to ensure lexicographic ordering
      return PAD_CHAR.repeat(PAD_LENGTH) + '5';
    }
    const mid = next / 2n;
    if (mid === 0n) {
      return PAD_CHAR.repeat(PAD_LENGTH) + '5';
    }
    return padRank(mid);
  }

  // Case 4: Between two cards (both prevRank and nextRank are provided)
  const prev = BigInt(prevRank!);
  const next = BigInt(nextRank!);

  if (next <= prev) {
    throw new Error(
      `Invalid rank order: prevRank (${prevRank}) must be strictly less than nextRank (${nextRank})`,
    );
  }

  const mid = (prev + next) / 2n;

  // Case 5: No integer gap left — extend the string lexicographically.
  // Appending '5' at the end creates a string that sorts between prevRank and nextRank
  // because in lexicographic comparison, "000000065536" < "0000000655365" < "000000065537".
  if (mid === prev) {
    return prevRank! + '5';
  }

  return padRank(mid);
}

/**
 * Generates the initial rank for a new lead being inserted at the bottom of a stage.
 * Queries the current maximum rank in the stage and appends one DEFAULT_GAP.
 *
 * If the stage is empty, returns INITIAL_RANK.
 *
 * @param lastRank - The current maximum rank in the target stage, or null if empty.
 */
export function getInitialRankForNewLead(lastRank: string | null): string {
  return getMidpointRank(lastRank, null);
}
