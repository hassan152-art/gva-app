/**
 * Browser bootstrap.
 *
 * Uses the Chrome/Edge already installed on the machine (puppeteer-core, no
 * 300MB download). Throws a clear message if neither is present.
 */
import { existsSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

export function findBrowser() {
  const found = CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'No Chrome or Edge found. Set CHROME_PATH to a Chromium-based browser executable.'
    );
  }
  return found;
}

export async function launch() {
  return puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'shell',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--force-device-scale-factor=2',
      '--hide-scrollbars',
      '--font-render-hinting=none',
    ],
  });
}
