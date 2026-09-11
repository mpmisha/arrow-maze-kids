// i18n support for Arrow Maze Kids — English & Hebrew (RTL)

const TRANSLATIONS = {
  en: {
    appTitle: 'Arrow Maze',
    tagline: 'Follow the arrows, solve the maze',
    level: 'Level',
    settings: 'Settings',
    sound: 'Sound',
    vibration: 'Vibration',
    language: 'Language',
    backToGames: '← Back to Games',
    undo: 'Undo',
    reset: 'Reset',
    hint: 'Hint',
    greatJob: 'Great Job!',
    levelComplete: 'You solved the maze!',
    nextLevel: 'Next Level',
    replay: 'Play Again',
    restartLevel: 'Restart Level',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    familyArrow: 'Arrow',
    familyGeometric: 'Shapes',
    familyAnimal: 'Animals',
    start: 'Start',
    goal: 'Goal',
    english: 'English',
    hebrew: 'עברית',
    howToPlay: 'Drag or tap through every arrow, then reach the Goal. Each arrow controls your next move!',
  },
  he: {
    appTitle: 'מבוך החצים',
    tagline: 'עקבו אחר החצים, פתרו את המבוך',
    level: 'שלב',
    settings: 'הגדרות',
    sound: 'צליל',
    vibration: 'רטט',
    language: 'שפה',
    backToGames: 'חזרה למשחקים →',
    undo: 'ביטול',
    reset: 'איפוס',
    hint: 'רמז',
    greatJob: 'כל הכבוד!',
    levelComplete: 'פתרתם את המבוך!',
    nextLevel: 'השלב הבא',
    replay: 'שחקו שוב',
    restartLevel: 'התחל מחדש',
    easy: 'קל',
    medium: 'רגיל',
    hard: 'קשה',
    familyArrow: 'חץ',
    familyGeometric: 'צורות',
    familyAnimal: 'חיות',
    start: 'התחלה',
    goal: 'יעד',
    english: 'English',
    hebrew: 'עברית',
    howToPlay: 'גררו או לחצו דרך כל החצים, ואז הגיעו ליעד. כל חץ קובע את הצעד הבא!',
  }
};

let currentLang = 'en';

function resolveLanguage() {
  try {
    const params = new URLSearchParams(location.search);
    const urlLang = params.get('lang');
    if (urlLang && TRANSLATIONS[urlLang]) {
      localStorage.setItem('lang', urlLang);
      return urlLang;
    }
  } catch (_) {}

  try {
    const stored = localStorage.getItem('lang');
    if (stored && TRANSLATIONS[stored]) return stored;
  } catch (_) {}

  try {
    const navLangs = navigator.languages || [navigator.language];
    for (const l of navLangs) {
      if (!l) continue;
      const code = l.toLowerCase().slice(0, 2);
      if (code === 'he' || code === 'iw') return 'he';
      if (code === 'en') return 'en';
    }
  } catch (_) {}

  return 'en';
}

function setLanguage(lang) {
  if (!TRANSLATIONS[lang]) lang = 'en';
  currentLang = lang;
  try {
    localStorage.setItem('lang', lang);
  } catch (_) {}

  const isRtl = lang === 'he';
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';

  // Dispatch custom event for UI updates
  window.dispatchEvent(new CustomEvent('playground:langchange', { detail: { lang, isRtl } }));
}

function initI18n() {
  const initial = resolveLanguage();
  setLanguage(initial);

  // Listen to same-origin messages from hub if embedded in iframe
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'playground:lang' && event.data.lang) {
      if (TRANSLATIONS[event.data.lang]) {
        setLanguage(event.data.lang);
      }
    }
  });
}

function t(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return dict[key] || TRANSLATIONS.en[key] || key;
}

function getLang() {
  return currentLang;
}

export { initI18n, setLanguage, t, getLang };
