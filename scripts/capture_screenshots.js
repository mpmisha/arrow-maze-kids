import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { firefox } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');
const SCREENSHOTS_DIR = path.join(ROOT_DIR, 'docs', 'screenshots');

// Ensure docs/screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Simple static HTTP server
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(ROOT_DIR, reqPath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = 8089;

server.listen(PORT, async () => {
  console.log(`Server running at http://localhost:${PORT}`);

  try {
    const browser = await firefox.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone 12/13/14 portrait
      deviceScaleFactor: 2 // High DPI retina
    });

    const page = await context.newPage();

    // 1. Level 1 - Onboarding / Easy Board
    await page.goto(`http://localhost:${PORT}`);
    await page.evaluate(() => {
      localStorage.clear();
      window.app.loadLevel(1);
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'level1-onboarding.png')
    });
    console.log('Captured level1-onboarding.png');

    // 2. Level 2 - Arrow Shape Silhouette Board
    await page.evaluate(() => {
      window.app.loadLevel(2);
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'level2-arrow-shape.png')
    });
    console.log('Captured level2-arrow-shape.png');

    // 3. Level 12 - Animal Shape Silhouette Board
    await page.evaluate(() => {
      window.app.loadLevel(12);
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'level12-animal-shape.png')
    });
    console.log('Captured level12-animal-shape.png');

    // 4. In-Progress Board with Path
    await page.evaluate(() => {
      window.app.loadLevel(3);
      window.app.attemptMoveTo({ r: 0, c: 1 });
      window.app.attemptMoveTo({ r: 0, c: 2 });
      window.app.attemptMoveTo({ r: 0, c: 3 });
    });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'level3-in-progress.png')
    });
    console.log('Captured level3-in-progress.png');

    // 5. Level Complete State / Modal
    await page.evaluate(() => {
      window.app.loadLevel(1);
      const sol = [
        { r: 0, c: 0 },
        { r: 0, c: 1 },
        { r: 0, c: 2 },
        { r: 1, c: 2 },
        { r: 2, c: 2 }
      ];
      sol.slice(1).forEach(step => window.app.attemptMoveTo(step));
    });
    await page.waitForTimeout(800); // Wait for modal animation
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, 'level-complete.png')
    });
    console.log('Captured level-complete.png');

    await browser.close();
    console.log('Screenshots successfully generated!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    server.close();
  }
});
