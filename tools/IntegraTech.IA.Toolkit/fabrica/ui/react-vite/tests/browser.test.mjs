import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { preview } from 'vite';

// Explicit opt-in: npm run build && npm run test:browser. Never runs during prepare.
test('reference components, keyboard, responsive layout and automated accessibility checks', { timeout: 120000 }, async () => {
  let server;
  let browser;
  try {
    server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } });
    const address = server.httpServer.address();
    assert.ok(address && typeof address === 'object');
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${address.port}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Um ponto de partida para a interface.');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Ir para o conteúdo' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('main')).toBeFocused();
    for (const width of [375, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const theme of ['light', 'dark']) {
        await page.getByRole('combobox', { name: 'Tema' }).selectOption(theme);
        for (const [state, message] of [['Vazio', 'Nenhum conteúdo ainda'], ['Carregando', 'Carregando demonstração…'], ['Erro', 'Não foi possível concluir a demonstração'], ['Sucesso', 'Demonstração concluída']]) {
          await page.getByRole('radio', { name: state, exact: true }).check();
          await expect(page.getByRole('heading', { name: message, exact: true })).toBeVisible();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow: ${width}/${theme}/${state}`);
          const accessibility = await new AxeBuilder({ page }).analyze();
          assert.deepEqual(accessibility.violations.map(v => ({ id: v.id, impact: v.impact })), [], `${width}/${theme}/${state}`);
        }
      }
    }
    await page.getByRole('radio', { name: 'Erro', exact: true }).check();
    await page.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(page.getByRole('heading', { name: 'Demonstração concluída', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reiniciar demonstração' }).click();
    await expect(page.getByRole('heading', { name: 'Nenhum conteúdo ainda' })).toBeVisible();
    await page.getByRole('combobox', { name: 'Tema' }).selectOption('light');
    await mkdir('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/reference.png', fullPage: true });
  } finally {
    await browser?.close();
    if (server) await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
  }
});
