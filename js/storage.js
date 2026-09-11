// Player settings + saved progress persistence via localStorage.

const KEYS = {
  sound: 'soundEnabled',
  haptics: 'hapticsEnabled',
  lang: 'lang',
  currentLevel: 'arrowMaze_currentLevel',
  highestLevel: 'arrowMaze_highestLevel',
  savedPath: 'arrowMaze_savedPath',
};

function readBool(key, fallback) {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  return v === 'true';
}

const SettingsStore = {
  get isSoundEnabled() {
    return readBool(KEYS.sound, true);
  },
  set isSoundEnabled(value) {
    localStorage.setItem(KEYS.sound, value ? 'true' : 'false');
  },
  get areHapticsEnabled() {
    return readBool(KEYS.haptics, true);
  },
  set areHapticsEnabled(value) {
    localStorage.setItem(KEYS.haptics, value ? 'true' : 'false');
  },
  get lang() {
    return localStorage.getItem(KEYS.lang) || 'en';
  },
  set lang(value) {
    localStorage.setItem(KEYS.lang, value);
  },
};

const GameStateStore = {
  get currentLevel() {
    const v = parseInt(localStorage.getItem(KEYS.currentLevel) || '1', 10);
    return isNaN(v) || v < 1 ? 1 : v;
  },
  set currentLevel(level) {
    localStorage.setItem(KEYS.currentLevel, String(level));
    if (level > this.highestLevel) {
      this.highestLevel = level;
    }
  },
  get highestLevel() {
    const v = parseInt(localStorage.getItem(KEYS.highestLevel) || '1', 10);
    return isNaN(v) || v < 1 ? 1 : v;
  },
  set highestLevel(level) {
    localStorage.setItem(KEYS.highestLevel, String(level));
  },
  savePath(level, path) {
    try {
      localStorage.setItem(KEYS.savedPath, JSON.stringify({ level, path }));
    } catch (_) {}
  },
  loadSavedPath(level) {
    try {
      const raw = localStorage.getItem(KEYS.savedPath);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.level === level && Array.isArray(parsed.path)) {
        return parsed.path;
      }
    } catch (_) {}
    return null;
  },
  clearSavedPath() {
    localStorage.removeItem(KEYS.savedPath);
  }
};

export { SettingsStore, GameStateStore };
