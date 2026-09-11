// Mock global window/document BEFORE importing modules
if (typeof globalThis.window === 'undefined') {
  const win = {
    addEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} },
    location: { href: '', search: '', pathname: '/arrow-maze-kids/' }
  };
  win.parent = win;
  globalThis.window = win;
  globalThis.location = win.location;
  globalThis.localStorage = win.localStorage;
  globalThis.document = {
    getElementById: (id) => ({
      addEventListener: () => {},
      querySelector: () => ({ textContent: '' }),
      classList: { toggle: () => {}, contains: () => false, add: () => {}, remove: () => {} },
      setAttribute: () => {},
      style: {},
      innerHTML: '',
      appendChild: () => {}
    }),
    createElementNS: () => ({
      setAttribute: () => {},
      appendChild: () => {},
      textContent: ''
    })
  };
  globalThis.getLang = () => 'en';
  globalThis.t = (k) => k;
  globalThis.SettingsStore = { isSoundEnabled: true, areHapticsEnabled: true };
  globalThis.GameStateStore = { currentLevel: 1, loadSavedPath: () => null, savePath: () => {} };
}

import { generateLevel, getHintNextStep, getMissingRequiredArrowCells, solveMaze, validateMove } from '../js/maze-generator.js';
import { ArrowMazeUI } from '../js/ui.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
  } else {
    console.error(`FAILED: ${message}`);
    process.exitCode = 1;
  }
}

function requiredArrowKeys(board) {
  return Object.keys(board.arrows || {}).filter(key => {
    const [r, c] = key.split(',').map(Number);
    return !(r === board.goal.r && c === board.goal.c);
  });
}

function pathVisitsEveryArrow(board, path) {
  const visited = new Set(path.map(p => `${p.r},${p.c}`));
  return requiredArrowKeys(board).every(key => visited.has(key));
}

console.log('--- Running Movement & Bounds Validation Tests ---');

// 1. Test Out-of-Bounds Moves
const level1 = generateLevel(1); // 3x3 square
const pathStart1 = [level1.start]; // { r: 0, c: 0 }

// Moving Up from (0,0) -> (-1, 0)
const moveUpOB = validateMove(level1, pathStart1, { r: -1, c: 0 });
assert(!moveUpOB.valid && moveUpOB.reason === 'out_of_bounds', 'Move up out-of-bounds rejected');

// Moving Left from (0,0) -> (0, -1)
const moveLeftOB = validateMove(level1, pathStart1, { r: 0, c: -1 });
assert(!moveLeftOB.valid && moveLeftOB.reason === 'out_of_bounds', 'Move left out-of-bounds rejected');

// Moving far off board
const moveFarOB = validateMove(level1, pathStart1, { r: 10, c: 10 });
assert(!moveFarOB.valid && moveFarOB.reason === 'out_of_bounds', 'Far out-of-bounds rejected');

// Non-integer and malformed coordinates must never resolve to playable cells.
const moveFractional = validateMove(level1, pathStart1, { r: 0.5, c: 0 });
assert(!moveFractional.valid && moveFractional.reason === 'invalid_input', 'Fractional target rejected');

const moveInvalidHead = validateMove(level1, [{ r: -1, c: 0 }], { r: 0, c: 0 });
assert(!moveInvalidHead.valid && moveInvalidHead.reason === 'invalid_path', 'Invalid path head rejected');

// 2. Test Masked-Cell Moves (Off-board shape silhouettes)
const level2 = generateLevel(2); // Arrow shape mask
// Level 2 mask has (0, 0) as false
const pathStart2 = [{ r: 0, c: 1 }]; // Start is (3,1), but let's test head at (0,1)
const moveMasked = validateMove(level2, [{ r: 0, c: 1 }], { r: 0, c: 0 });
assert(!moveMasked.valid && moveMasked.reason === 'masked_cell', 'Step onto masked/unplayable cell rejected');

// Level 12 (Animal Shape)
const level12 = generateLevel(12);
// Find a masked cell adjacent to a valid cell
let maskedTarget = null;
let headPos = null;
for (let r = 0; r < level12.rows; r++) {
  for (let c = 0; c < level12.cols; c++) {
    if (level12.mask[r][c]) {
      const neighbors = [
        { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
      ];
      for (const n of neighbors) {
        if (n.r >= 0 && n.r < level12.rows && n.c >= 0 && n.c < level12.cols && !level12.mask[n.r][n.c]) {
          headPos = { r, c };
          maskedTarget = n;
          break;
        }
      }
    }
    if (maskedTarget) break;
  }
}

if (headPos && maskedTarget) {
  const res = validateMove(level12, [headPos], maskedTarget);
  assert(!res.valid && res.reason === 'masked_cell', `Animal shape masked cell move rejected at (${maskedTarget.r}, ${maskedTarget.c})`);
}

// 3. Test Arrow Rule Constraints
const level3 = generateLevel(3);
// Level 3 has arrow at (0,1) pointing 'E' -> required dr=0, dc=1
const pathAtArrow = [{ r: 0, c: 0 }, { r: 0, c: 1 }];
// Trying to move South (1,1) from (0,1) violates arrow pointing East
const moveWrongArrow = validateMove(level3, pathAtArrow, { r: 1, c: 1 });
assert(!moveWrongArrow.valid && moveWrongArrow.reason === 'arrow_mismatch', 'Arrow constraint mismatch rejected');

// Correct arrow move East (0,2) from (0,1)
const moveCorrectArrow = validateMove(level3, pathAtArrow, { r: 0, c: 2 });
assert(moveCorrectArrow.valid && moveCorrectArrow.type === 'step', 'Valid arrow constraint move accepted');

// 4. Test Self-Crossing / Cell Revisit
const pathVisited = [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 0 }];
// Trying to step onto (0,0) from (1,0)
const moveRevisit = validateMove(level1, pathVisited, { r: 0, c: 0 });
assert(!moveRevisit.valid && moveRevisit.reason === 'already_visited', 'Self-crossing / cell revisit rejected');

// 5. Test Backtracking
// Moving to immediately preceding cell (1,1) from (1,0)
const moveBacktrack = validateMove(level1, pathVisited, { r: 1, c: 1 });
assert(moveBacktrack.valid && moveBacktrack.type === 'backtrack', 'Backtracking move accepted');

// 6. Test Non-Adjacent Jump
const moveJump = validateMove(level1, [{ r: 0, c: 0 }], { r: 2, c: 2 });
assert(!moveJump.valid && moveJump.reason === 'not_adjacent', 'Non-adjacent jump rejected');

// 7. Test Required Arrow Checkpoints
const checkpointBoard = {
  rows: 2,
  cols: 3,
  mask: [
    [true, true, true],
    [true, true, true]
  ],
  start: { r: 0, c: 0 },
  goal: { r: 0, c: 2 },
  arrows: { '1,0': 'E' }
};
const bypassGoal = validateMove(checkpointBoard, [{ r: 0, c: 0 }, { r: 0, c: 1 }], { r: 0, c: 2 });
assert(!bypassGoal.valid && bypassGoal.reason === 'missing_arrows', 'Goal cannot be completed before visiting every arrow');

const missingArrows = getMissingRequiredArrowCells(checkpointBoard, [{ r: 0, c: 0 }, { r: 0, c: 1 }]);
assert(missingArrows.length === 1 && missingArrows[0].r === 1 && missingArrows[0].c === 0, 'Missing required arrows are reported for feedback');

const noMissingArrows = getMissingRequiredArrowCells(checkpointBoard, [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }]);
assert(noMissingArrows.length === 0, 'Visited required arrows are excluded from missing feedback');

const checkpointSolutions = solveMaze(checkpointBoard);
assert(checkpointSolutions.length > 0, 'Required-arrow board remains solvable');
assert(checkpointSolutions.every(path => pathVisitsEveryArrow(checkpointBoard, path)), 'Solver solutions visit every required arrow');

// 8. Solver and hint paths should stay playable, avoid loops, and visit every required arrow.
for (let level = 1; level <= 30; level++) {
  const board = generateLevel(level);
  const solutions = solveMaze(board);
  assert(solutions.length > 0, `Level ${level} has at least one solution`);
  assert(pathVisitsEveryArrow(board, board.solution), `Level ${level} stored solution visits every required arrow`);
  for (const solution of solutions) {
    const uniqueCells = new Set(solution.map(p => `${p.r},${p.c}`));
    assert(uniqueCells.size === solution.length, `Level ${level} solver solution does not revisit cells`);
    assert(solution.every(p => board.mask[p.r] && board.mask[p.r][p.c]), `Level ${level} solver stays on playable cells`);
    assert(pathVisitsEveryArrow(board, solution), `Level ${level} solver solution visits every required arrow`);
  }

  const hint = getHintNextStep(board, [{ r: board.start.r, c: board.start.c }]);
  if (hint) {
    const hintMove = validateMove(board, [{ r: board.start.r, c: board.start.c }], hint);
    assert(hintMove.valid && hintMove.type === 'step', `Level ${level} first hint is a valid step`);
  }
}

// 9. Test Saved Path Sanitization (Corrupted / Out-of-bounds saved path)
const mockUI = new ArrowMazeUI();
mockUI.board = level2; // Arrow shape mask

// Test corrupt sequence: Out-of-bounds node in saved path
const corruptPathOB = [{ r: 0, c: 1 }, { r: -1, c: 1 }];
assert(!mockUI.isValidPathSequence(corruptPathOB), 'Corrupt out-of-bounds path sequence rejected');

// Test corrupt sequence: Masked cell in saved path
const corruptPathMasked = [{ r: 0, c: 1 }, { r: 0, c: 0 }];
assert(!mockUI.isValidPathSequence(corruptPathMasked), 'Corrupt masked-cell path sequence rejected');

// Test corrupt sequence: Non-adjacent node in saved path
const corruptPathJump = [{ r: level2.start.r, c: level2.start.c }, { r: 5, c: 5 }];
assert(!mockUI.isValidPathSequence(corruptPathJump), 'Corrupt non-adjacent path sequence rejected');

console.log(`Summary: ${passedTests}/${totalTests} tests passed.`);

if (passedTests === totalTests) {
  console.log('ALL MOVEMENT & BOUNDS VALIDATION TESTS PASSED SUCCESSFULLY!');
} else {
  process.exit(1);
}
