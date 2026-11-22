#!/usr/bin/env node
/* gen_pro_codes.js — generate one-to-one PRO unlock codes for itch.io.
 *
 * Design (2026-11-22):
 *   - The PUBLIC game file stores only an irreversible fingerprint (SHA-256,
 *     first 16 hex chars) of each valid code. No usable code is ever printed
 *     in site source, so reading the source cannot unlock PRO.
 *   - The PLAINTEXT codes go to a local file that is git-ignored. Import that
 *     list into itch.io's "external keys" so each buyer receives ONE code.
 *   - A leaked code can be revoked by deleting its fingerprint from index.html
 *     (and re-uploading). Every other buyer keeps working.
 *
 * Code format: MLPRO-XXXX-XXXX  (X = A-Z / 2-9, no 0/O/1/I ambiguity)
 * Combined space: 32^8 = 1,099,511,627,776 (~1.1 trillion)
 *
 * Usage:  node tools/gen_pro_codes.js [count]      (default 120)
 * Output: PRO-CODES.txt  (git-ignored)  + a fingerprint array to paste into index.html
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { sha256 } = require('./sha256.js');

const COUNT = Math.max(1, parseInt(process.argv[2], 10) || 120);
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, unambiguous
const PRE = 'MLPRO-';

function randomBlock(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += ALPHA[crypto.randomInt(0, ALPHA.length)];
  return s;
}
function newCode() { return PRE + randomBlock(4) + '-' + randomBlock(4); }
function fingerprint(code) {
  return sha256(code.trim().toUpperCase()).slice(0, 16);
}

// generate unique codes
const seen = new Set();
const codes = [];
while (codes.length < COUNT) {
  const c = newCode();
  if (seen.has(c)) continue;
  seen.add(c);
  codes.push(c);
}

const outFile = path.join(__dirname, '..', 'PRO-CODES.txt');
const lines = [
  'MY LIFE PRO — unlock codes for itch.io external keys',
  'Generated: ' + new Date().toISOString(),
  'Each line below is ONE buyer code. Import them as external keys on your',
  'itch.io PRO product. Never paste these into site source or a public page.',
  'To revoke a leaked code, remove its fingerprint from index.html.',
  '---------------------------------------------------------------',
  ...codes,
];
fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');

const fps = codes.map(fingerprint);
console.log('Wrote ' + COUNT + ' plaintext codes to: ' + outFile);
console.log('\n=== PASTE THIS ARRAY INTO index.html (PRO_FINGERPRINTS) ===');
console.log('const PRO_FINGERPRINTS = [\n  ' + fps.map(f => "'" + f + "'").join(',\n  ') + '\n];');
console.log('=== END ARRAY ===');
