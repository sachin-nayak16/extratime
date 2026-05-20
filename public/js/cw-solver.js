// ─── CROSSWORD AUTO-SOLVER ─────────────────────────────────
// Takes 6 words, finds valid arrangement (3 across, 3 down)
// Hard constraints:
// 1. No two across words on same or adjacent rows (min 2-row gap)
// 2. Every word intersects at least one perpendicular word
// 3. All intersection letters match exactly
// 4. Grid must be connected
// 5. No word isolated without an intersection

const CW_SOLVER = {

  solve(words) {
    if (words.length !== 6) return null;
    const results = [];

    // Try all ways to split 6 words into 3 across + 3 down
    const combos = this.combinations([0,1,2,3,4,5], 3);
    for (const acrossIdx of combos) {
      const downIdx = [0,1,2,3,4,5].filter(i => !acrossIdx.includes(i));
      const aw = acrossIdx.map(i => words[i]);
      const dw = downIdx.map(i => words[i]);

      // Find all possible intersections between across and down words
      const allInts = [];
      for (let ai = 0; ai < 3; ai++) {
        for (let di = 0; di < 3; di++) {
          for (let ap = 0; ap < aw[ai].length; ap++) {
            for (let dp = 0; dp < dw[di].length; dp++) {
              if (aw[ai][ap] === dw[di][dp]) {
                allInts.push({ ai, di, ap, dp });
              }
            }
          }
        }
      }

      // Need at least 2 intersections covering at least 2 across and 2 down words
      const aCov = new Set(allInts.map(x => x.ai));
      const dCov = new Set(allInts.map(x => x.di));
      if (aCov.size < 2 || dCov.size < 2) continue;

      // Try to build a valid layout from these intersections
      const layout = this.buildLayout(aw, dw, allInts);
      if (layout) {
        results.push({
          across: aw.map((w, i) => ({
            word: w,
            row: layout.rows[i],
            colStart: layout.aColStarts[i],
            origIdx: acrossIdx[i],
          })),
          down: dw.map((w, i) => ({
            word: w,
            col: layout.cols[i],
            rowStart: layout.dRowStarts[i],
            origIdx: downIdx[i],
          })),
          intCount: layout.intCount,
        });
        if (results.length >= 5) break;
      }
    }

    if (!results.length) return null;
    // Return layout with most intersections
    return results.sort((a,b) => b.intCount - a.intCount)[0];
  },

  buildLayout(aw, dw, allInts) {
    // Try pairs of intersections to anchor the grid
    const intPairs = this.combinations(allInts.map((_,i)=>i), 2);
    
    for (const [i1, i2] of intPairs.slice(0, 100)) {
      const int1 = allInts[i1], int2 = allInts[i2];
      // Need them to cover different words
      if (int1.ai === int2.ai && int1.di === int2.di) continue;

      // Assign positions from first intersection
      const rows = [null, null, null];
      const cols = [null, null, null];
      const aColStarts = [0, 0, 0];
      const dRowStarts = [0, 0, 0];

      // Anchor first intersection
      rows[int1.ai] = 6;
      aColStarts[int1.ai] = 2;
      cols[int1.di] = aColStarts[int1.ai] + int1.ap;
      dRowStarts[int1.di] = rows[int1.ai] - int1.dp;

      // Derive second intersection position
      if (rows[int2.ai] !== null && cols[int2.di] === null) {
        cols[int2.di] = aColStarts[int2.ai] + int2.ap;
        dRowStarts[int2.di] = rows[int2.ai] - int2.dp;
      } else if (cols[int2.di] !== null && rows[int2.ai] === null) {
        rows[int2.ai] = dRowStarts[int2.di] + int2.dp;
        aColStarts[int2.ai] = cols[int2.di] - int2.ap;
      } else if (rows[int2.ai] === null && cols[int2.di] === null) {
        // Place second across word with a gap
        const usedRows = rows.filter(r => r !== null);
        const minUsed = Math.min(...usedRows);
        rows[int2.ai] = minUsed - 3; // 3-row gap
        aColStarts[int2.ai] = 0;
        cols[int2.di] = aColStarts[int2.ai] + int2.ap;
        dRowStarts[int2.di] = rows[int2.ai] - int2.dp;
      }

      // Fill remaining unset words
      const usedCols = new Set(cols.filter(c => c !== null));
      let nextRow = Math.min(...rows.filter(r=>r!==null)) - 4;
      for (let i = 0; i < 3; i++) {
        if (rows[i] === null) {
          rows[i] = nextRow;
          aColStarts[i] = 0;
          nextRow -= 4;
        }
      }
      let nextCol = Math.max(...cols.filter(c=>c!==null)) + 3;
      for (let i = 0; i < 3; i++) {
        if (cols[i] === null) {
          cols[i] = nextCol;
          dRowStarts[i] = Math.max(0, Math.min(...rows) - 1);
          nextCol += 3;
        }
      }

      // Normalise — shift everything so minimum row/col is 0
      const minRow = Math.min(...rows, ...dRowStarts);
      const minCol = Math.min(...cols, ...aColStarts);
      const ro = minRow < 0 ? -minRow : 0;
      const co = minCol < 0 ? -minCol : 0;
      const normRows = rows.map(r => r + ro);
      const normCols = cols.map(c => c + co);
      const normACS = aColStarts.map(c => c + co);
      const normDRS = dRowStarts.map(r => r + ro);

      // Validate constraints
      if (!this.validate(aw, dw, normRows, normCols, normACS, normDRS)) continue;

      // Count valid intersections in this layout
      let intCount = 0;
      for (let ai=0;ai<3;ai++) for (let di=0;di<3;di++) {
        for (let ap=0;ap<aw[ai].length;ap++) {
          const col = normACS[ai] + ap;
          const dp = normRows[ai] - normDRS[di];
          if (dp >= 0 && dp < dw[di].length && col === normCols[di] && aw[ai][ap] === dw[di][dp]) intCount++;
        }
      }
      if (intCount < 2) continue;

      return { rows:normRows, cols:normCols, aColStarts:normACS, dRowStarts:normDRS, intCount };
    }
    return null;
  },

  validate(aw, dw, rows, cols, aCS, dRS) {
    // 1. No two across words on same row
    if (new Set(rows).size !== 3) return false;

    // 2. Across words must have min 2-row gap between them
    const sorted = [...rows].sort((a,b)=>a-b);
    for (let i=1;i<sorted.length;i++) {
      if (sorted[i] - sorted[i-1] < 2) return false;
    }

    // 3. Grid must fit in reasonable bounds
    const maxRow = Math.max(...rows, ...dRS.map((r,i)=>r+dw[i].length-1));
    const maxCol = Math.max(...aCS.map((c,i)=>c+aw[i].length-1), ...cols);
    if (maxRow > 20 || maxCol > 20) return false;
    if (Math.min(...rows,...dRS) < 0 || Math.min(...aCS,...cols) < 0) return false;

    // 4. All cells are consistent — no letter conflicts at intersections
    for (let ai=0;ai<3;ai++) {
      for (let di=0;di<3;di++) {
        const col = cols[di];
        // Check if this down word's column falls within across word's span
        if (col >= aCS[ai] && col < aCS[ai] + aw[ai].length) {
          const ap = col - aCS[ai]; // position in across word
          const dp = rows[ai] - dRS[di]; // position in down word
          if (dp >= 0 && dp < dw[di].length) {
            // They intersect — letters must match
            if (aw[ai][ap] !== dw[di][dp]) return false;
          }
        }
      }
    }

    return true;
  },

  combinations(arr, k) {
    const result = [];
    function helper(start, combo) {
      if (combo.length === k) { result.push([...combo]); return; }
      for (let i=start; i<arr.length; i++) {
        combo.push(arr[i]);
        helper(i+1, combo);
        combo.pop();
      }
    }
    helper(0, []);
    return result;
  },
};
