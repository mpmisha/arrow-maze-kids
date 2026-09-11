// UI & Board Renderer for Arrow Maze Kids

import { t, getLang, setLanguage } from './i18n.js';
import { generateLevel, getHintNextStep, DIRS } from './maze-generator.js';
import { SettingsStore, GameStateStore } from './storage.js';
import { SoundPlayer, Haptics } from './audio.js';
import { track } from './telemetry.js';

class ArrowMazeUI {
  constructor() {
    this.sound = new SoundPlayer(SettingsStore);
    this.haptics = new Haptics(SettingsStore);

    this.currentLevel = GameStateStore.currentLevel;
    this.board = null;
    this.path = [];
    this.isDragging = false;
    this.activePointerId = null;
    this.hintCell = null;

    this.initDOMElements();
    this.bindEvents();
    this.loadLevel(this.currentLevel);
  }

  initDOMElements() {
    this.levelBadge = document.getElementById('levelBadge');
    this.shapeBadge = document.getElementById('shapeBadge');
    this.gearBtn = document.getElementById('gearBtn');
    this.boardWrapper = document.getElementById('boardWrapper');
    this.boardSvg = document.getElementById('boardSvg');

    this.undoBtn = document.getElementById('undoBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.hintBtn = document.getElementById('hintBtn');

    // Overlays
    this.settingsOverlay = document.getElementById('settingsOverlay');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    this.backToGamesBtn = document.getElementById('backToGamesBtn');

    this.soundToggle = document.getElementById('soundToggle');
    this.hapticsToggle = document.getElementById('hapticsToggle');

    this.langEnBtn = document.getElementById('langEnBtn');
    this.langHeBtn = document.getElementById('langHeBtn');

    this.levelCompleteOverlay = document.getElementById('levelCompleteOverlay');
    this.nextLevelBtn = document.getElementById('nextLevelBtn');
    this.replayBtn = document.getElementById('replayBtn');
  }

  loadLevel(levelIndex) {
    this.currentLevel = levelIndex;
    GameStateStore.currentLevel = levelIndex;
    this.board = generateLevel(levelIndex);

    // Try to load saved path if resuming level
    const saved = GameStateStore.loadSavedPath(levelIndex);
    if (saved && saved.length > 0 && this.isValidPathSequence(saved)) {
      this.path = saved;
    } else {
      this.path = [this.board.start];
      GameStateStore.savePath(levelIndex, this.path);
    }

    this.hintCell = null;
    this.updateHUD();
    this.renderBoard();
  }

  isValidPathSequence(pathSeq) {
    if (!pathSeq || pathSeq.length === 0) return false;
    if (pathSeq[0].r !== this.board.start.r || pathSeq[0].c !== this.board.start.c) return false;
    for (let i = 1; i < pathSeq.length; i++) {
      const prev = pathSeq[i - 1];
      const curr = pathSeq[i];
      const dist = Math.abs(prev.r - curr.r) + Math.abs(prev.c - curr.c);
      if (dist !== 1) return false;
      if (!this.board.mask[curr.r][curr.c]) return false;
    }
    return true;
  }

  updateHUD() {
    this.levelBadge.textContent = `${t('level')} ${this.currentLevel}`;
    const shapeKey = this.board.familyNameKey || 'familyGeometric';
    this.shapeBadge.textContent = t(shapeKey);

    // Apply i18n texts to buttons and labels
    this.undoBtn.querySelector('.btn-label').textContent = t('undo');
    this.resetBtn.querySelector('.btn-label').textContent = t('reset');
    this.hintBtn.querySelector('.btn-label').textContent = t('hint');

    this.backToGamesBtn.textContent = t('backToGames');
    this.nextLevelBtn.textContent = t('nextLevel');
    this.replayBtn.textContent = t('replay');

    // Update settings toggle states
    this.soundToggle.classList.toggle('on', SettingsStore.isSoundEnabled);
    this.hapticsToggle.classList.toggle('on', SettingsStore.areHapticsEnabled);

    const currentLang = getLang();
    this.langEnBtn.classList.toggle('active', currentLang === 'en');
    this.langHeBtn.classList.toggle('active', currentLang === 'he');
  }

  renderBoard() {
    const { rows, cols, mask, start, goal, arrows } = this.board;
    const svg = this.boardSvg;
    svg.innerHTML = '';

    // Calculate grid dimensions
    const padding = 10;
    const size = 100;
    const gap = 6;
    const viewBoxWidth = cols * size + (cols - 1) * gap + padding * 2;
    const viewBoxHeight = rows * size + (rows - 1) * gap + padding * 2;

    svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);

    // Create Path Set for quick lookup
    const pathSet = new Set(this.path.map(p => `${p.r},${p.c}`));
    const pathHead = this.path[this.path.length - 1];

    // Helper to get cell center
    const getCellCenter = (r, c) => ({
      x: padding + c * (size + gap) + size / 2,
      y: padding + r * (size + gap) + size / 2
    });

    // 1. Render Cell Backgrounds
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!mask[r][c]) continue; // Off-board cell

        const x = padding + c * (size + gap);
        const y = padding + r * (size + gap);
        const cellKey = `${r},${c}`;

        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', y);
        rect.setAttribute('width', size);
        rect.setAttribute('height', size);

        let cls = 'cell-bg';
        if (r === start.r && c === start.c) cls += ' start';
        if (r === goal.r && c === goal.c) cls += ' goal';
        if (pathSet.has(cellKey)) cls += ' path-node';
        if (this.hintCell && this.hintCell.r === r && this.hintCell.c === c) cls += ' hint-target';

        rect.setAttribute('class', cls);
        rect.setAttribute('data-r', r);
        rect.setAttribute('data-c', c);

        svg.appendChild(rect);

        // Render Start / Goal Markers
        if (r === start.r && c === start.c) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', x + size / 2);
          text.setAttribute('y', y + size / 2);
          text.setAttribute('class', 'marker-text');
          text.textContent = '🟢';
          svg.appendChild(text);
        } else if (r === goal.r && c === goal.c) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', x + size / 2);
          text.setAttribute('y', y + size / 2);
          text.setAttribute('class', 'marker-text');
          text.textContent = '⭐';
          svg.appendChild(text);
        }

        // Render Arrow Overlay if cell has an arrow
        const arrowDir = arrows[cellKey];
        if (arrowDir && !(r === goal.r && c === goal.c)) {
          const arrowText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          arrowText.setAttribute('x', x + size / 2);
          arrowText.setAttribute('y', y + size / 2);
          arrowText.setAttribute('class', 'arrow-icon');

          let arrowChar = '⬆️';
          if (arrowDir === 'S') arrowChar = '⬇️';
          else if (arrowDir === 'E') arrowChar = '➡️';
          else if (arrowDir === 'W') arrowChar = '⬅️';

          arrowText.textContent = arrowChar;
          svg.appendChild(arrowText);
        }
      }
    }

    // 2. Render Path Ribbon Line
    if (this.path.length > 1) {
      const pathLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      let dStr = '';

      this.path.forEach((p, idx) => {
        const center = getCellCenter(p.r, p.c);
        if (idx === 0) dStr += `M ${center.x} ${center.y}`;
        else dStr += ` L ${center.x} ${center.y}`;
      });

      pathLine.setAttribute('d', dStr);
      pathLine.setAttribute('class', 'path-line');
      svg.appendChild(pathLine);
    }

    // 3. Render Path Beads / Head
    this.path.forEach((p, idx) => {
      const center = getCellCenter(p.r, p.c);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', center.x);
      circle.setAttribute('cy', center.y);

      if (idx === this.path.length - 1) {
        circle.setAttribute('class', 'path-bead head');
      } else {
        circle.setAttribute('class', 'path-bead');
      }

      svg.appendChild(circle);
    });
  }

  getCellFromPointer(clientX, clientY) {
    const svg = this.boardSvg;
    const rect = svg.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return null;
    }

    const { rows, cols } = this.board;
    const xRel = (clientX - rect.left) / rect.width;
    const yRel = (clientY - rect.top) / rect.height;

    const c = Math.floor(xRel * cols);
    const r = Math.floor(yRel * rows);

    if (r >= 0 && r < rows && c >= 0 && c < cols && this.board.mask[r][c]) {
      return { r, c };
    }
    return null;
  }

  attemptMoveTo(target) {
    if (!target) return;
    const head = this.path[this.path.length - 1];

    // Check if tapping/moving to current head
    if (target.r === head.r && target.c === head.c) return;

    // Check if backtracking (target is cell immediately before head)
    if (this.path.length > 1) {
      const prev = this.path[this.path.length - 2];
      if (target.r === prev.r && target.c === prev.c) {
        this.path.pop();
        this.hintCell = null;
        this.sound.play('backtrack');
        this.haptics.backtrack();
        GameStateStore.savePath(this.currentLevel, this.path);
        this.renderBoard();
        return;
      }
    }

    // Check if move is adjacent
    const dist = Math.abs(target.r - head.r) + Math.abs(target.c - head.c);
    if (dist !== 1) return; // Must be orthogonally adjacent

    // Check if already in path (no self-crossing / cell revisits)
    if (this.path.some(p => p.r === target.r && p.c === target.c)) {
      this.triggerInvalidMove(target);
      return;
    }

    // Check Arrow constraint on current head cell
    const headKey = `${head.r},${head.c}`;
    const arrowDir = this.board.arrows[headKey];
    if (arrowDir) {
      let requiredDr = 0, requiredDc = 0;
      if (arrowDir === 'N') requiredDr = -1;
      else if (arrowDir === 'S') requiredDr = 1;
      else if (arrowDir === 'E') requiredDc = 1;
      else if (arrowDir === 'W') requiredDc = -1;

      if (target.r - head.r !== requiredDr || target.c - head.c !== requiredDc) {
        this.triggerInvalidMove(target);
        return;
      }
    }

    // Move is legal! Extend path
    this.path.push(target);
    this.hintCell = null;
    this.sound.play('step');
    this.haptics.step();
    GameStateStore.savePath(this.currentLevel, this.path);
    this.renderBoard();

    // Check win condition
    if (target.r === this.board.goal.r && target.c === this.board.goal.c) {
      this.handleWin();
    }
  }

  triggerInvalidMove(cell) {
    this.sound.play('invalid');
    this.haptics.invalid();

    const rect = this.boardSvg.querySelector(`.cell-bg[data-r="${cell.r}"][data-c="${cell.c}"]`);
    if (rect) {
      rect.classList.add('invalid-pulse');
      setTimeout(() => rect.classList.remove('invalid-pulse'), 300);
    }
  }

  handleWin() {
    this.sound.play('levelUp');
    this.haptics.levelUp();
    GameStateStore.clearSavedPath();

    track('level_complete', {
      level: this.currentLevel,
      family: this.board.family,
      pathLength: this.path.length
    });

    // Show celebration modal after short delay
    setTimeout(() => {
      this.levelCompleteOverlay.classList.add('visible');
    }, 400);
  }

  undo() {
    if (this.path.length > 1) {
      this.path.pop();
      this.hintCell = null;
      this.sound.play('backtrack');
      this.haptics.backtrack();
      GameStateStore.savePath(this.currentLevel, this.path);
      this.renderBoard();
    }
  }

  reset() {
    this.path = [this.board.start];
    this.hintCell = null;
    this.sound.play('button');
    GameStateStore.savePath(this.currentLevel, this.path);
    this.renderBoard();
  }

  showHint() {
    this.sound.play('hint');
    const nextStep = getHintNextStep(this.board, this.path);
    if (nextStep) {
      this.hintCell = nextStep;
      this.renderBoard();
    } else {
      // If stuck, undo 1 step
      this.undo();
    }
  }

  bindEvents() {
    const wrapper = this.boardWrapper;

    // Pointer events for touch & mouse drag
    wrapper.addEventListener('pointerdown', (e) => {
      this.sound.unlock();
      this.isDragging = true;
      this.activePointerId = e.pointerId;
      wrapper.setPointerCapture(e.pointerId);

      const cell = this.getCellFromPointer(e.clientX, e.clientY);
      if (cell) this.attemptMoveTo(cell);
    });

    wrapper.addEventListener('pointermove', (e) => {
      if (!this.isDragging || e.pointerId !== this.activePointerId) return;
      const cell = this.getCellFromPointer(e.clientX, e.clientY);
      if (cell) this.attemptMoveTo(cell);
    });

    const endDrag = (e) => {
      if (this.isDragging && e.pointerId === this.activePointerId) {
        this.isDragging = false;
        this.activePointerId = null;
        try { wrapper.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };

    wrapper.addEventListener('pointerup', endDrag);
    wrapper.addEventListener('pointercancel', endDrag);

    // Button actions
    this.undoBtn.addEventListener('click', () => {
      this.sound.unlock();
      this.undo();
    });

    this.resetBtn.addEventListener('click', () => {
      this.sound.unlock();
      this.reset();
    });

    this.hintBtn.addEventListener('click', () => {
      this.sound.unlock();
      this.showHint();
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      this.sound.unlock();
      const head = this.path[this.path.length - 1];
      let target = null;

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') target = { r: head.r - 1, c: head.c };
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') target = { r: head.r + 1, c: head.c };
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') target = { r: head.r, c: head.c + 1 };
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') target = { r: head.r, c: head.c - 1 };
      else if (e.key === 'Backspace' || e.key === 'u' || e.key === 'U') { this.undo(); return; }
      else if (e.key === 'r' || e.key === 'R') { this.reset(); return; }
      else if (e.key === 'h' || e.key === 'H') { this.showHint(); return; }

      if (target) {
        e.preventDefault();
        this.attemptMoveTo(target);
      }
    });

    // Settings Modal
    this.gearBtn.addEventListener('click', () => {
      this.sound.unlock();
      this.sound.play('button');
      this.updateHUD();
      this.settingsOverlay.classList.add('visible');
    });

    this.closeSettingsBtn.addEventListener('click', () => {
      this.sound.play('button');
      this.settingsOverlay.classList.remove('visible');
    });

    this.soundToggle.addEventListener('click', () => {
      SettingsStore.isSoundEnabled = !SettingsStore.isSoundEnabled;
      this.soundToggle.classList.toggle('on', SettingsStore.isSoundEnabled);
      if (SettingsStore.isSoundEnabled) this.sound.play('button');
    });

    this.hapticsToggle.addEventListener('click', () => {
      SettingsStore.areHapticsEnabled = !SettingsStore.areHapticsEnabled;
      this.hapticsToggle.classList.toggle('on', SettingsStore.areHapticsEnabled);
      if (SettingsStore.areHapticsEnabled) this.haptics.step();
    });

    this.langEnBtn.addEventListener('click', () => {
      setLanguage('en');
      this.updateHUD();
      this.renderBoard();
    });

    this.langHeBtn.addEventListener('click', () => {
      setLanguage('he');
      this.updateHUD();
      this.renderBoard();
    });

    // Hub Return Handshake
    const HUB_URL = new URLSearchParams(location.search).get('hub') || 'https://mpmisha.github.io/playground/';
    this.backToGamesBtn.addEventListener('click', () => {
      this.sound.play('button');
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'playground:back' }, new URL(HUB_URL).origin);
      } else {
        location.href = HUB_URL;
      }
    });

    // Next Level & Replay
    this.nextLevelBtn.addEventListener('click', () => {
      this.sound.play('button');
      this.levelCompleteOverlay.classList.remove('visible');
      this.loadLevel(this.currentLevel + 1);
    });

    this.replayBtn.addEventListener('click', () => {
      this.sound.play('button');
      this.levelCompleteOverlay.classList.remove('visible');
      this.reset();
    });

    // Handle language change events
    window.addEventListener('playground:langchange', () => {
      this.updateHUD();
      this.renderBoard();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.renderBoard();
    });
  }
}

export { ArrowMazeUI };
