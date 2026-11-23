#!/usr/bin/env node
/**
 * Maps emulator localhost to the Mac host so Metro (8081) and API (4000) work with --localhost.
 */
import { execSync } from 'node:child_process';

const sdk = process.env.ANDROID_HOME || `${process.env.HOME}/Library/Android/sdk`;
const adb = `${sdk}/platform-tools/adb`;

function reverse(port) {
  try {
    execSync(`"${adb}" reverse tcp:${port} tcp:${port}`, { stdio: 'ignore' });
  } catch {
    console.warn(`[android-reverse] Could not adb reverse ${port} — is the emulator running?`);
  }
}

reverse(8081);
reverse(4000);
