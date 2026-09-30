import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const pages = ['index.html', 'quick-income.html', 'income-calculator.html', 'renovation-suite.html', 'all-in-one.html', 'loan-suite.html'];
const links = {
  'index.html': ['quick-income.html', 'income-calculator.html', 'renovation-suite.html', 'all-in-one.html', 'loan-suite.html'],
  'all-in-one.html': ['index.html', 'quick-income.html', 'income-calculator.html', 'renovation-suite.html', 'loan-suite.html'],
  'renovation-suite.html': ['index.html', 'quick-income.html', 'income-calculator.html', 'all-in-one.html', 'loan-suite.html']
};

for (const file of pages) {
  const full = path.join(root, file);
  assert.ok(existsSync(full), `${file} exists`);
  const html = readFileSync(full, 'utf8');
  assert.match(html, /<!DOCTYPE html>/i, `${file} is an HTML document`);
  assert.match(html, /<html[^>]+lang=/i, `${file} declares a language`);
  assert.match(html, /name=["']viewport["']/i, `${file} is responsive`);
  assert.match(html, /<title>/i, `${file} has a title`);
  const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)/gi)].map(m => m[1]);
  assert.ok(externalScripts.every(src => src === 'sync-bridge.js' || /^(https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/(html2canvas|jspdf)\/|https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/pdf\.js\/)/.test(src)), `${file} only uses approved local sync or optional export/OCR libraries`);
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(Boolean);
  for (const [index, script] of scripts.entries()) {
    assert.doesNotThrow(() => new vm.Script(script), `${file} inline script ${index + 1} parses`);
  }
}

for (const [file, targets] of Object.entries(links)) {
  const html = readFileSync(path.join(root, file), 'utf8');
  for (const target of targets) assert.match(html, new RegExp(`href=["']${target.replace('.', '\\.')}`), `${file} links to ${target}`);
}

for (const file of ['quick-income.html', 'income-calculator.html', 'renovation-suite.html', 'all-in-one.html', 'loan-suite.html']) {
  assert.match(readFileSync(path.join(root, file), 'utf8'), /src=["']sync-bridge\.js["']/, `${file} has shared-workflow sync`);
}
console.log(`PASS: ${pages.length} pages, navigation, accessibility basics, script parsing, and shared-workflow sync.`);
