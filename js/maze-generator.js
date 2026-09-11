// Deterministic Level & Maze Generator for Arrow Maze Kids
// Generates 100% solvable levels with shape masks, arrow rules, and solver validation.

function isFiniteInteger(value) {
  return Number.isInteger(value) && Number.isFinite(value);
}

function isPlayableCell(board, cell) {
  if (!board || !cell || !isFiniteInteger(cell.r) || !isFiniteInteger(cell.c)) {
    return false;
  }

  const { rows, cols, mask } = board;
  return (
    isFiniteInteger(rows) && isFiniteInteger(cols) &&
    Array.isArray(mask) &&
    cell.r >= 0 && cell.r < rows &&
    cell.c >= 0 && cell.c < cols &&
    Array.isArray(mask[cell.r]) &&
    mask[cell.r][cell.c] === true
  );
}

// Validate a candidate step from currentPath's head to target cell
export function validateMove(board, currentPath, target) {
  if (!board || !Array.isArray(currentPath) || currentPath.length === 0 || !target) {
    return { valid: false, reason: 'invalid_input' };
  }

  const { arrows } = board;
  const head = currentPath[currentPath.length - 1];

  if (!isPlayableCell(board, head)) {
    return { valid: false, reason: 'invalid_path' };
  }

  if (!isPlayableCell(board, target)) {
    if (!target || !isFiniteInteger(target.r) || !isFiniteInteger(target.c)) {
      return { valid: false, reason: 'invalid_input' };
    }

    const { rows, cols, mask } = board;
    if (!isFiniteInteger(rows) || !isFiniteInteger(cols) || !Array.isArray(mask)) {
      return { valid: false, reason: 'invalid_input' };
    }

    if (
      target.r < 0 || target.r >= rows ||
      target.c < 0 || target.c >= cols
    ) {
      return { valid: false, reason: 'out_of_bounds' };
    }

    if (!Array.isArray(mask[target.r]) || mask[target.r][target.c] !== true) {
      return { valid: false, reason: 'masked_cell' };
    }
  }

  // 1. Backtracking check (target is immediately preceding path cell)
  if (currentPath.length > 1) {
    const prev = currentPath[currentPath.length - 2];
    if (target.r === prev.r && target.c === prev.c) {
      return { valid: true, type: 'backtrack' };
    }
  }

  // 2. Same cell as current head
  if (target.r === head.r && target.c === head.c) {
    return { valid: false, reason: 'same_head' };
  }

  // 3. Orthogonal adjacency check
  const dist = Math.abs(target.r - head.r) + Math.abs(target.c - head.c);
  if (dist !== 1) {
    return { valid: false, reason: 'not_adjacent' };
  }

  // 4. Visited check (no self-crossing / cell revisits)
  if (currentPath.some(p => p.r === target.r && p.c === target.c)) {
    return { valid: false, reason: 'already_visited' };
  }

  // 5. Arrow constraint on current head cell
  const headKey = `${head.r},${head.c}`;
  const arrowDir = arrows && arrows[headKey];
  if (arrowDir) {
    let reqDr = 0, reqDc = 0;
    if (arrowDir === 'N') reqDr = -1;
    else if (arrowDir === 'S') reqDr = 1;
    else if (arrowDir === 'E') reqDc = 1;
    else if (arrowDir === 'W') reqDc = -1;

    if (target.r - head.r !== reqDr || target.c - head.c !== reqDc) {
      return { valid: false, reason: 'arrow_mismatch' };
    }
  }

  return { valid: true, type: 'step' };
}

class PRNG {
  constructor(seed) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  range(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  choice(array) {
    return array[Math.floor(this.next() * array.length)];
  }
}

const DIRS = [
  { name: 'N', dr: -1, dc: 0, arrow: '⬆️' },
  { name: 'S', dr: 1, dc: 0, arrow: '⬇️' },
  { name: 'E', dr: 0, dc: 1, arrow: '➡️' },
  { name: 'W', dr: 0, dc: -1, arrow: '⬅️' },
];

const DIR_MAP = {
  N: { dr: -1, dc: 0, arrow: '⬆️' },
  S: { dr: 1, dc: 0, arrow: '⬇️' },
  E: { dr: 0, dc: 1, arrow: '➡️' },
  W: { dr: 0, dc: -1, arrow: '⬅️' },
};

// Mask Generators for Shape Families
function generateMask(family, shapeName, rows, cols) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(true));

  if (family === 'geometric') {
    if (shapeName === 'l-shape') {
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);
      for (let r = 0; r < midR; r++) {
        for (let c = midC; c < cols; c++) {
          grid[r][c] = false;
        }
      }
    } else if (shapeName === 't-shape') {
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 3);
      for (let r = midR; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (c < midC || c >= cols - midC) {
            grid[r][c] = false;
          }
        }
      }
    } else if (shapeName === 'diamond') {
      const midR = (rows - 1) / 2;
      const midC = (cols - 1) / 2;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (Math.abs(r - midR) / midR + Math.abs(c - midC) / midC > 1.2) {
            grid[r][c] = false;
          }
        }
      }
    } else if (shapeName === 'frame') {
      // Ring with hollow center
      if (rows >= 5 && cols >= 5) {
        for (let r = 2; r < rows - 2; r++) {
          for (let c = 2; c < cols - 2; c++) {
            grid[r][c] = false;
          }
        }
      }
    }
  } else if (family === 'arrow') {
    // Arrow pointing up
    const midC = Math.floor(cols / 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r < Math.floor(rows / 2)) {
          // Arrow head triangle
          if (Math.abs(c - midC) > r) grid[r][c] = false;
        } else {
          // Arrow stem
          if (Math.abs(c - midC) > 1) grid[r][c] = false;
        }
      }
    }
  } else if (family === 'animal') {
    if (shapeName === 'cat') {
      // Cat face with ears
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r === 0 && c !== 0 && c !== cols - 1 && c !== Math.floor(cols / 2)) {
            // Ears at top corners
            grid[r][c] = false;
          }
        }
      }
    } else if (shapeName === 'fish') {
      // Fish body + tail
      const midR = Math.floor(rows / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (c === 0 && (r === 0 || r === rows - 1)) grid[r][c] = false; // Tail fork
          if (c === cols - 1 && Math.abs(r - midR) > 1) grid[r][c] = false; // Nose
        }
      }
    } else if (shapeName === 'turtle') {
      // Oval shell with feet
      const midR = Math.floor(rows / 2);
      const midC = Math.floor(cols / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r === 0 || r === rows - 1) && (c === 0 || c === cols - 1)) {
            grid[r][c] = false; // Corners cut
          }
        }
      }
    } else if (shapeName === 'rocket') {
      // Rocket body + fins
      const midC = Math.floor(cols / 2);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r === 0 && c !== midC) grid[r][c] = false; // Tip
          if (r === 1 && Math.abs(c - midC) > 1) grid[r][c] = false;
        }
      }
    }
  }

  // Ensure at least 4 connected cells exist
  let validCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) validCount++;
    }
  }
  if (validCount < 4) {
    return Array.from({ length: rows }, () => Array(cols).fill(true));
  }

  return grid;
}

// Solver using BFS/DFS to verify level solvability
function solveMaze(board) {
  const { rows, cols, mask, start, goal, arrows } = board;

  function getKey(r, c) {
    return `${r},${c}`;
  }

  // Queue holds: { r, c, path: [{r, c}], visitedSet: Set }
  const queue = [{
    r: start.r,
    c: start.c,
    path: [{ r: start.r, c: start.c }],
    visited: new Set([getKey(start.r, start.c)])
  }];

  const solutions = [];
  const MAX_SOLUTIONS = 5; // We only need to confirm solvability

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.r === goal.r && curr.c === goal.c) {
      solutions.push(curr.path);
      if (solutions.length >= MAX_SOLUTIONS) break;
      continue;
    }

    const cellKey = getKey(curr.r, curr.c);
    const arrowDir = arrows[cellKey];

    let possibleDirs = DIRS;
    if (arrowDir) {
      possibleDirs = [DIR_MAP[arrowDir]];
    }

    for (const d of possibleDirs) {
      const nr = curr.r + d.dr;
      const nc = curr.c + d.dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (!mask[nr][nc]) continue;

      const nextKey = getKey(nr, nc);
      if (curr.visited.has(nextKey)) continue; // Already visited

      const visited = new Set(curr.visited);
      visited.add(nextKey);

      queue.push({
        r: nr,
        c: nc,
        path: [...curr.path, { r: nr, c: nc }],
        visited
      });
    }
  }

  return solutions;
}

// Main Level Generator Function
function generateLevel(levelIndex) {
  // Tutorial / Onboarding Levels 1-3
  if (levelIndex === 1) {
    return {
      levelIndex: 1,
      rows: 3,
      cols: 3,
      family: 'geometric',
      shapeName: 'square',
      familyNameKey: 'familyGeometric',
      mask: [
        [true, true, true],
        [true, true, true],
        [true, true, true]
      ],
      start: { r: 0, c: 0 },
      goal: { r: 2, c: 2 },
      arrows: {}, // No arrows, pure movement intro
      solution: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 1, c: 2 }, { r: 2, c: 2 }]
    };
  }

  if (levelIndex === 2) {
    return {
      levelIndex: 2,
      rows: 4,
      cols: 3,
      family: 'arrow',
      shapeName: 'arrow-up',
      familyNameKey: 'familyArrow',
      mask: [
        [false, true, false],
        [true, true, true],
        [false, true, false],
        [false, true, false]
      ],
      start: { r: 3, c: 1 },
      goal: { r: 0, c: 1 },
      arrows: { '2,1': 'N' }, // 1 arrow forcing North
      solution: [{ r: 3, c: 1 }, { r: 2, c: 1 }, { r: 1, c: 1 }, { r: 0, c: 1 }]
    };
  }

  if (levelIndex === 3) {
    return {
      levelIndex: 3,
      rows: 4,
      cols: 4,
      family: 'geometric',
      shapeName: 'square',
      familyNameKey: 'familyGeometric',
      mask: Array.from({ length: 4 }, () => Array(4).fill(true)),
      start: { r: 0, c: 0 },
      goal: { r: 3, c: 3 },
      arrows: { '0,1': 'E', '1,3': 'S' },
      solution: [
        { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 },
        { r: 1, c: 3 }, { r: 2, c: 3 }, { r: 3, c: 3 }
      ]
    };
  }

  // Levels 4+ Procedural Generation with seed
  let seedAttempt = levelIndex * 1000 + 42;
  while (true) {
    const prng = new PRNG(seedAttempt++);

    // Determine grid size and parameters based on level
    let rows, cols, numArrows;
    let family, shapeName, familyNameKey;

    if (levelIndex <= 10) { // Easy
      rows = prng.range(4, 5);
      cols = prng.range(4, 5);
      numArrows = prng.range(1, 2);
      const famChoices = [
        { family: 'arrow', shape: 'arrow-up', key: 'familyArrow' },
        { family: 'geometric', shape: prng.choice(['square', 'l-shape', 't-shape']), key: 'familyGeometric' }
      ];
      const choice = prng.choice(famChoices);
      family = choice.family;
      shapeName = choice.shape;
      familyNameKey = choice.key;
    } else if (levelIndex <= 25) { // Medium
      rows = prng.range(5, 6);
      cols = prng.range(5, 6);
      numArrows = prng.range(2, 4);
      const famChoices = [
        { family: 'geometric', shape: prng.choice(['diamond', 'frame', 'l-shape']), key: 'familyGeometric' },
        { family: 'animal', shape: prng.choice(['cat', 'fish', 'turtle', 'rocket']), key: 'familyAnimal' }
      ];
      const choice = prng.choice(famChoices);
      family = choice.family;
      shapeName = choice.shape;
      familyNameKey = choice.key;
    } else { // Hard / Infinite
      rows = Math.min(8, 6 + Math.floor((levelIndex - 25) / 10));
      cols = Math.min(8, 6 + Math.floor((levelIndex - 25) / 10));
      numArrows = prng.range(3, 6);
      const famChoices = [
        { family: 'arrow', shape: 'arrow-up', key: 'familyArrow' },
        { family: 'geometric', shape: prng.choice(['diamond', 'frame', 't-shape', 'square']), key: 'familyGeometric' },
        { family: 'animal', shape: prng.choice(['cat', 'fish', 'turtle', 'rocket']), key: 'familyAnimal' }
      ];
      const choice = prng.choice(famChoices);
      family = choice.family;
      shapeName = choice.shape;
      familyNameKey = choice.key;
    }

    const mask = generateMask(family, shapeName, rows, cols);

    // Get all valid mask cells
    const validCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (mask[r][c]) validCells.push({ r, c });
      }
    }

    if (validCells.length < 5) continue;

    // Pick Start and Goal with good distance
    let start, goal;
    let maxDist = -1;

    for (let i = 0; i < 10; i++) {
      const c1 = prng.choice(validCells);
      const c2 = prng.choice(validCells);
      const dist = Math.abs(c1.r - c2.r) + Math.abs(c1.c - c2.c);
      if (dist > maxDist) {
        maxDist = dist;
        start = c1;
        goal = c2;
      }
    }

    if (maxDist < 2) continue;

    // Build a candidate solution path from Start to Goal
    const boardCandidate = {
      rows, cols, family, shapeName, familyNameKey,
      mask, start, goal, arrows: {}
    };

    // First solve without arrows to get a base path
    let solutions = solveMaze(boardCandidate);
    if (solutions.length === 0) continue;

    const mainPath = prng.choice(solutions);

    // Place arrows along the solution path to enforce direction
    const arrows = {};
    const placedCount = Math.min(numArrows, Math.max(1, mainPath.length - 2));

    for (let i = 0; i < placedCount; i++) {
      const pathIdx = prng.range(1, mainPath.length - 2);
      const curr = mainPath[pathIdx];
      const next = mainPath[pathIdx + 1];

      let dirName = 'E';
      if (next.r < curr.r) dirName = 'N';
      else if (next.r > curr.r) dirName = 'S';
      else if (next.c < curr.c) dirName = 'W';
      else if (next.c > curr.c) dirName = 'E';

      arrows[`${curr.r},${curr.c}`] = dirName;
    }

    // Also place 0-2 dummy arrows on off-path cells
    const offPathCells = validCells.filter(cell =>
      !mainPath.some(p => p.r === cell.r && p.c === cell.c) &&
      !(cell.r === start.r && cell.c === start.c) &&
      !(cell.r === goal.r && cell.c === goal.c)
    );

    if (offPathCells.length > 0 && prng.next() > 0.5) {
      const dummyCell = prng.choice(offPathCells);
      arrows[`${dummyCell.r},${dummyCell.c}`] = prng.choice(['N', 'S', 'E', 'W']);
    }

    boardCandidate.arrows = arrows;

    // SOLVER VERIFICATION: Verify that level is STILL solvable with the placed arrows!
    const verifiedSolutions = solveMaze(boardCandidate);
    if (verifiedSolutions.length > 0) {
      boardCandidate.levelIndex = levelIndex;
      boardCandidate.solution = verifiedSolutions[0];
      return boardCandidate;
    }

    // If placed arrows made it unsolvable, loop will try next seed
  }
}

// Get next hint cell along shortest solution path from current path position
function getHintNextStep(board, currentPath) {
  if (!currentPath || currentPath.length === 0) return board.start;
  const currentHead = currentPath[currentPath.length - 1];

  // If already at goal, no hint needed
  if (currentHead.r === board.goal.r && currentHead.c === board.goal.c) return null;

  // Run BFS from currentHead to goal respecting current path's visited cells
  const { rows, cols, mask, goal, arrows } = board;
  const visitedSet = new Set(currentPath.map(p => `${p.r},${p.c}`));

  function getKey(r, c) { return `${r},${c}`; }

  const queue = [{
    r: currentHead.r,
    c: currentHead.c,
    path: [],
    visited: new Set(visitedSet)
  }];

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr.r === goal.r && curr.c === goal.c) {
      if (curr.path.length > 0) return curr.path[0];
      return null;
    }

    const cellKey = getKey(curr.r, curr.c);
    const arrowDir = arrows[cellKey];

    let possibleDirs = DIRS;
    if (arrowDir) {
      possibleDirs = [DIR_MAP[arrowDir]];
    }

    for (const d of possibleDirs) {
      const nr = curr.r + d.dr;
      const nc = curr.c + d.dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (!mask[nr][nc]) continue;

      const nextKey = getKey(nr, nc);
      if (curr.visited.has(nextKey)) continue;

      const newVisited = new Set(curr.visited);
      newVisited.add(nextKey);

      queue.push({
        r: nr,
        c: nc,
        path: [...curr.path, { r: nr, c: nc }],
        visited: newVisited
      });
    }
  }

  // If stuck/dead-end, return null (suggests undo)
  return null;
}

export { generateLevel, solveMaze, getHintNextStep, DIRS, DIR_MAP };
