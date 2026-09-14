#!/usr/bin/env node
/**
 * Renders the real OKR Goals Book UI once in a headless Chrome (Playwright,
 * `channel: 'chrome'` — no downloaded Playwright browser needed, matches the
 * project's established esbuild+playwright verification pattern) against a
 * mocked PrivOS Hub bridge, and saves a screenshot.
 *
 * `esbuild` bundles the app's real `App.tsx` entry (see harness/entry.tsx) —
 * not a rewritten stand-in — so this proves the actual shipped code renders,
 * not just a description of it. The mock bridge (harness/mock-bridge.js)
 * runs in a parent page; the real app runs inside an iframe, exactly like it
 * does under the real Hub.
 *
 * Usage: node scripts/render-screenshot.mjs [output-png-path]
 */
import { existsSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const HARNESS_SRC = path.join(__dirname, 'harness');
const outputPath = path.resolve(process.argv[2] ?? path.join(ROOT, 'tmp', 'okr-goals-book-screenshot.png'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function serveDir(dir) {
  const server = createServer(async (req, res) => {
    try {
      const filePath = path.join(dir, decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!filePath.startsWith(dir)) throw new Error('path escapes served directory');
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

async function main() {
  const serveRoot = path.join(ROOT, 'tmp', 'screenshot-harness');
  rmSync(serveRoot, { recursive: true, force: true });
  mkdirSync(serveRoot, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(HARNESS_SRC, 'entry.tsx')],
    bundle: true,
    format: 'iife',
    jsx: 'automatic',
    outfile: path.join(serveRoot, 'app.bundle.js'),
    absWorkingDir: ROOT,
    logLevel: 'warning',
  });

  for (const file of ['parent.html', 'iframe.html', 'mock-bridge.js']) {
    copyFileSync(path.join(HARNESS_SRC, file), path.join(serveRoot, file));
  }
  copyFileSync(path.join(ROOT, 'src/ui/okr/okr.css'), path.join(serveRoot, 'okr.css'));

  const server = await serveDir(serveRoot);
  const { port } = server.address();

  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    await page.goto(`http://127.0.0.1:${port}/parent.html`);
    // The board renders once `useOkrData` resolves both `getAll` and the
    // three `getItems` round trips through the mocked bridge.
    await page.frameLocator('#app').getByRole('heading', { name: '2026-Q3' }).waitFor({ timeout: 10_000 });
    await page.frameLocator('#app').getByText('Needs attention').first().waitFor({ timeout: 10_000 });

    mkdirSync(path.dirname(outputPath), { recursive: true });
    await page.screenshot({ path: outputPath });
    console.log(`Screenshot saved to ${outputPath}`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
