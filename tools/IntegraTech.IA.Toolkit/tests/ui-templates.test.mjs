import test from 'node:test';
import assert from 'node:assert/strict';
import { reactInterfaceFiles } from '../scripts/lib/ui-templates.mjs';

test('React reference has only frontend destinations and pinned build/browser dependencies', () => {
  const files = reactInterfaceFiles({ name: 'ExampleApp' });
  assert.ok(files instanceof Map);
  for (const path of files.keys()) assert.ok(path.startsWith('frontend/') && !path.includes('..'));
  const pkg = JSON.parse(files.get('frontend/package.json'));
  assert.equal(pkg.engines.node, '>=22.12.0');
  assert.equal(pkg.scripts.build, 'tsc --noEmit && vite build');
  for (const version of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.ok(files.has('frontend/package-lock.json'));
  assert.match(files.get('frontend/src/App.tsx'), /ExampleApp/);
  assert.match(files.get('frontend/tests/browser.test.mjs'), /AxeBuilder/);
});

test('reference includes semantic interaction states and motion/focus styles', () => {
  const files = reactInterfaceFiles({ name: 'ReferenceApp' });
  const app = files.get('frontend/src/App.tsx');
  for (const state of ['loading', 'empty', 'error', 'success']) assert.ok(app.includes(state));
  assert.match(app, /<main/);
  assert.match(app, /<fieldset/);
  assert.match(app, /role="alert"/);
  const css = files.get('frontend/src/styles.css');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /focus-visible/);
  assert.doesNotMatch(css, /@import|https?:/);
});
