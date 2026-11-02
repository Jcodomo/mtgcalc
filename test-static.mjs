import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.dirname(fileURLToPath(import.meta.url));
const pages = readdirSync(root).filter(name => name.endsWith('.html'));
assert.ok(pages.length >= 30, `expected at least 30 HTML pages, found ${pages.length}`);

const required = [
  'index.html', 'quick.html', 'income-calculator.html', 'doc-organizer.html',
  'full-suite.html', 'loan-suite.html', 'loan-suite-quote.html',
  'loan-suite-documents-ocr.html', 'loan-suite-draft-le.html'
];
for (const file of required) assert.ok(existsSync(path.join(root, file)), `${file} exists`);

for (const file of pages) {
  const full = path.join(root, file);
  const html = readFileSync(full, 'utf8');
  assert.match(html, /<!DOCTYPE html>/i, `${file} is an HTML document`);
  assert.match(html, /<html[^>]+lang=/i, `${file} declares a language`);
  assert.match(html, /name=["']viewport["']/i, `${file} is responsive`);
  assert.match(html, /<title>/i, `${file} has a title`);

  const refs = [...html.matchAll(/(?:src|href)=["']([^"'#?]+)/gi)].map(match => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|data:|mailto:|javascript:|\$\{)/i.test(ref)) continue;
    assert.ok(existsSync(path.resolve(path.dirname(full), ref)), `${file} local asset exists: ${ref}`);
  }

  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1])
    .filter(Boolean);
  scripts.forEach((script, index) => {
    assert.doesNotThrow(() => new vm.Script(script), `${file} inline script ${index + 1} parses`);
  });
}

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(path.join(root, 'assets')).filter(name => name.endsWith('.js'))) {
  assert.doesNotThrow(() => new vm.Script(readFileSync(file, 'utf8')), `${path.relative(root, file)} parses`);
}

const landing = readFileSync(path.join(root, 'index.html'), 'utf8');
for (const target of ['quick.html', 'income-calculator.html', 'doc-organizer.html', 'full-suite.html']) {
  assert.match(landing, new RegExp(`href=["']${target.replace('.', '\\.')}`), `landing links to ${target}`);
}

console.log(`PASS: ${pages.length} pages, all local assets, inline scripts, shared JavaScript, and landing links.`);
