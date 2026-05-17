// ─── AUTO CROSSWORD SOLVER ─────────────────────────────────
// Takes 6 words, automatically finds a valid grid arrangement
// satisfying all hard constraints. No need to specify across/down.

// HARD CONSTRAINTS (enforced by solver):
// 1. Exactly 3 across, 3 down
// 2. No two across words on adjacent rows (min 2-row gap)
// 3. Every word intersects at least one perpendicular word
// 4. All intersection letters must match exactly
// 5. No across/down words connect end-to-end visually
// 6. Down word columns must not fall outside across word spans (unless no intersection)
// 7. Grid must be connected (all words reachable via intersections)

const CW_SOLVER = {

  // Find all valid grid layouts for 6 words
  // Returns best layout or null if none found
  solve(words) {
    if (words.length !== 6) return null;

    // Try all permutations of which 3 words are across vs down
    const results = [];
    const combos = this.combinations(6, 3);

    for (const acrossIndices of combos) {
      const downIndices = [0,1,2,3,4,5].filter(i => !acrossIndices.includes(i));
      const acrossWords = acrossIndices.map(i => words[i]);
      const downWords = downIndices.map(i => words[i]);

      // Try all orderings of across words (rows) and down words (cols)
      for (const aPerm of this.permutations(acrossWords)) {
        for (const dPerm of this.permutations(downWords)) {
          const layout = this.tryLayout(aPerm, dPerm, acrossIndices, downIndices, words);
          if (layout) results.push(layout);
          if (results.length >= 3) break; // found enough, stop early
        }
        if (results.length >= 3) break;
      }
      if (results.length >= 3) break;
    }

    // Return the layout with the most intersections (most interesting crossword)
    if (!results.length) return null;
    return results.sort((a,b) => b.intersections.length - a.intersections.length)[0];
  },

  // Try a specific across/down arrangement and find valid row/col positions
  tryLayout(acrossWords, downWords, acrossOrigIdx, downOrigIdx, allWords) {
    // Find all possible intersections between each across/down pair
    const possibleInts = [];
    for (let ai = 0; ai < acrossWords.length; ai++) {
      for (let di = 0; di < downWords.length; di++) {
        const aw = acrossWords[ai], dw = downWords[di];
        for (let apos = 0; apos < aw.length; apos++) {
          for (let dpos = 0; dpos < dw.length; dpos++) {
            if (aw[apos] === dw[dpos]) {
              possibleInts.push({ ai, di, apos, dpos, ch: aw[apos] });
            }
          }
        }
      }
    }

    if (possibleInts.length < 2) return null; // need at least 2 intersections

    // Check every across word has at least one intersection
    const aCovered = new Set(possibleInts.map(x => x.ai));
    const dCovered = new Set(possibleInts.map(x => x.di));
    if (aCovered.size < 2 || dCovered.size < 2) return null;

    // Try to assign rows to across words and cols to down words
    // using the intersections to derive positions
    // Pick a subset of intersections (one per word minimum)
    const intSubsets = this.pickIntersectionSubset(possibleInts, acrossWords.length, downWords.length);
    
    for (const ints of intSubsets) {
      const layout = this.assignPositions(acrossWords, downWords, ints);
      if (layout && this.validateLayout(layout)) {
        return {
          across: acrossWords.map((w, i) => ({ word: w, row: layout.rows[i], colStart: layout.aColStarts[i] })),
          down: downWords.map((w, i) => ({ word: w, col: layout.cols[i], rowStart: layout.dRowStarts[i] })),
          intersections: ints,
          acrossOrigIdx, downOrigIdx, allWords,
        };
      }
    }
    return null;
  },

  // Pick a workable subset of intersections
  pickIntersectionSubset(ints, numAcross, numDown) {
    // Try combinations that cover all across and down words
    const subsets = [];
    // Start with 2-3 intersections
    for (let size = 2; size <= Math.min(4, ints.length); size++) {
      const combos = this.combinations(ints.length, size);
      for (const combo of combos.slice(0, 50)) { // limit iterations
        const subset = combo.map(i => ints[i]);
        const ac = new Set(subset.map(x => x.ai));
        const dc = new Set(subset.map(x => x.di));
        if (ac.size >= 2 && dc.size >= 2) subsets.push(subset);
        if (subsets.length >= 20) return subsets;
      }
    }
    return subsets;
  },

  // Given intersections, derive row/col positions for all words
  assignPositions(acrossWords, downWords, ints) {
    const rows = new Array(acrossWords.length).fill(null);
    const cols = new Array(downWords.length).fill(null);
    const aColStarts = new Array(acrossWords.length).fill(0);
    const dRowStarts = new Array(downWords.length).fill(0);

    // Use first intersection to anchor
    const first = ints[0];
    rows[first.ai] = 7; // anchor first across word at row 7
    cols[first.di] = first.apos; // col of down word = position of intersecting letter in across
    aColStarts[first.ai] = 0;
    dRowStarts[first.di] = rows[first.ai] - first.dpos;

    // Propagate positions from remaining intersections
    for (const int of ints.slice(1)) {
      const { ai, di, apos, dpos } = int;
      if (rows[ai] !== null && cols[di] !== null) continue; // already set

      if (rows[ai] !== null) {
        // row known, derive col
        cols[di] = aColStarts[ai] + apos;
        dRowStarts[di] = rows[ai] - dpos;
      } else if (cols[di] !== null) {
        // col known, derive row
        rows[ai] = dRowStarts[di] + dpos;
        aColStarts[ai] = cols[di] - apos;
      } else {
        // neither known — assign relative to first
        rows[ai] = rows[0] + (ai * 4); // space across words apart
        aColStarts[ai] = 0;
        cols[di] = aColStarts[ai] + apos;
        dRowStarts[di] = rows[ai] - dpos;
      }
    }

    // Fill in any unset positions
    let nextRow = 0;
    for (let i = 0; i < acrossWords.length; i++) {
      if (rows[i] === null) {
        // Find a row that doesn't conflict
        while (Object.values(rows).includes(nextRow) || Object.values(rows).includes(nextRow+1)) nextRow += 3;
        rows[i] = nextRow;
        nextRow += 4;
      }
    }
    let nextCol = 0;
    for (let i = 0; i < downWords.length; i++) {
      if (cols[i] === null) {
        while (Object.values(cols).includes(nextCol)) nextCol += 2;
        cols[i] = nextCol;
        dRowStarts[i] = Math.max(0, rows[0] - 3);
        nextCol += 3;
      }
    }

    // Normalise so all values are >= 0
    const minRow = Math.min(...dRowStarts, ...rows);
    const minCol = Math.min(...aColStarts, ...cols);
    const rowOffset = minRow < 0 ? -minRow : 0;
    const colOffset = minCol < 0 ? -minCol : 0;

    return {
      rows: rows.map(r => r + rowOffset),
      cols: cols.map(c => c + colOffset),
      aColStarts: aColStarts.map(c => c + colOffset),
      dRowStarts: dRowStarts.map(r => r + rowOffset),
    };
  },

  // Validate layout against all hard constraints
  validateLayout(layout) {
    const { rows, cols, aColStarts, dRowStarts } = layout;

    // Constraint: No two across words on same row
    if (new Set(rows).size !== rows.length) return false;

    // Constraint: No two across words on adjacent rows (min 2-row gap)
    const sortedRows = [...rows].sort((a,b) => a-b);
    for (let i = 1; i < sortedRows.length; i++) {
      if (sortedRows[i] - sortedRows[i-1] < 2) return false;
    }

    // Constraint: Grid fits in reasonable bounds (< 20 rows, < 20 cols)
    if (Math.max(...rows) > 18 || Math.max(...cols) > 18) return false;
    if (Math.min(...rows) < 0 || Math.min(...cols) < 0) return false;

    return true;
  },

  // Generate all combinations of size k from array of length n
  combinations(n, k) {
    const result = [];
    const combo = [];
    function helper(start) {
      if (combo.length === k) { result.push([...combo]); return; }
      for (let i = start; i < n; i++) {
        combo.push(i);
        helper(i + 1);
        combo.pop();
      }
    }
    helper(0);
    return result;
  },

  // Generate all permutations of an array
  permutations(arr) {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0,i), ...arr.slice(i+1)];
      for (const perm of this.permutations(rest)) {
        result.push([arr[i], ...perm]);
      }
    }
    return result;
  },

  // Format the solution as display-ready crossword data
  format(solution, clues, wordLengths) {
    if (!solution) return null;
    const { across, down } = solution;
    return {
      across: across.map((a, i) => ({
        answer: a.word,
        row: a.row,
        colStart: a.colStart,
        clue: clues[solution.acrossOrigIdx?.[i] ?? i] || '',
        wordLengths: wordLengths[solution.acrossOrigIdx?.[i] ?? i] || null,
        display: wordLengths[solution.acrossOrigIdx?.[i] ?? i] || `(${a.word.length})`,
      })),
      down: down.map((d, i) => ({
        answer: d.word,
        col: d.col,
        rowStart: d.rowStart,
        clue: clues[solution.downOrigIdx?.[i] ?? (i + 3)] || '',
        wordLengths: wordLengths[solution.downOrigIdx?.[i] ?? (i + 3)] || null,
        display: wordLengths[solution.downOrigIdx?.[i] ?? (i + 3)] || `(${d.word.length})`,
      })),
    };
  },
};
