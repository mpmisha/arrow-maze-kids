// Regression test for move validation and bounds checking in Arrow Maze Kids

import { generateLevel, validateMove } from '../js/maze-generator.js';

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

console.log(`Summary: ${passedTests}/${totalTests} tests passed.`);

if (passedTests === totalTests) {
  console.log('ALL MOVEMENT & BOUNDS VALIDATION TESTS PASSED SUCCESSFULLY!');
} else {
  process.exit(1);
}
