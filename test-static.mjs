import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const primary = ['index.html', 'quick.html', 'doc-organizer.html', 'all-in-one.html', 'full-suite.html', 'loan-suite.html'];
const compatibility = ['quick-income.html', 'income-calculator.html', 'renovation-suite.html'];
const pages = [...primary, ...compatibility];
assert.ok(existsSync(path.join(root, 'income-enhancements.js')), 'income enhancements script exists');
const sourceAllowlist = new RegExp(
  '^(workflow-ui\\.js|sync-bridge\\.js|income-enhancements\\.js|loan-ux\\.js|quick-worksheet\\.js|https://cdnjs\\.cloudflare\\.com/ajax/libs/(html2canvas|jspdf|pdf\\.js)/|https://cdn\\.jsdelivr\\.net/)'
);

for (const file of pages) {
  const full = path.join(root, file);
  assert.ok(existsSync(full), `${file} exists`);
  const html = readFileSync(full, 'utf8');
  assert.match(html, /<!DOCTYPE html>/i, `${file} is an HTML document`);
  assert.match(html, /<html[^>]+lang=/i, `${file} declares a language`);
  assert.match(html, /name=["']viewport["']/i, `${file} is responsive`);
  assert.match(html, /<title>/i, `${file} has a title`);
  const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/gi)].map(m => m[1]);
  assert.ok(externalScripts.every(src => sourceAllowlist.test(src)), `${file} only uses approved local/export libraries`);
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
  for (const [index, script] of scripts.entries()) {
    assert.doesNotThrow(() => new vm.Script(script), `${file} inline script ${index + 1} parses`);
  }
}

const landing = readFileSync(path.join(root, 'index.html'), 'utf8');
for (const target of ['quick.html', 'doc-organizer.html', 'income-calculator.html', 'full-suite.html']) {
  assert.match(landing, new RegExp(`href=["']${target.replace('.', '\\.')}`), `landing links to ${target}`);
}
for (const file of ['all-in-one.html', 'full-suite.html', 'loan-suite.html']) {
  assert.match(readFileSync(path.join(root, file), 'utf8'), /LOS55|los55/i, `${file} contains the Release 55 app`);
}
for (const file of ['all-in-one.html', 'full-suite.html', 'income-calculator.html']) {
  assert.match(readFileSync(path.join(root, file), 'utf8'), /income-enhancements\.js/, `${file} loads the income enhancements`);
}
for (const file of compatibility) {
  assert.ok(existsSync(path.join(root, file)), `${file} compatibility alias remains available`);
}

console.log(`PASS: ${pages.length} pages, Release 55 scripts, landing links, and compatibility aliases.`);
