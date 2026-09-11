// Arrow Maze Kids — Main Application Entrypoint

import './telemetry.js';
import { initI18n } from './i18n.js';
import { ArrowMazeUI } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize internationalization (loads language preference, sets html lang/dir)
  initI18n();

  // Initialize UI & Board Engine
  window.app = new ArrowMazeUI();

  // Register Service Worker for Offline PWA
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
});
