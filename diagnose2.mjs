// diagnose2.mjs — login then check dashboard pages for errors.
import pkg from '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js';
const { chromium } = pkg;
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
await page.goto('https://masystem.co.in/login', { waitUntil: 'networkidle' });
await page.fill('input[placeholder="username"]', 'admin');
await page.fill('input[placeholder="password"]', 'MASys@9205a6c968d7');
await page.click('button.btn');
await page.waitForTimeout(3000);
const url = page.url();
const bodyText = (await page.textContent('body')).slice(0, 300);
console.log('=== after login url:', url);
console.log('=== body (300):', bodyText);
// visit each dashboard route and collect errors
const routes = ['/overview','/car','/hospital','/hotel','/manager','/backoffice','/reels','/leads','/sdr','/reminder','/reviews','/translate','/billing','/analytics','/users','/permissions','/settings'];
for (const r of routes) {
  await page.goto('https://masystem.co.in'+r, { waitUntil: 'networkidle' }).catch(e=>errors.push(r+': GOTO '+e.message));
  await page.waitForTimeout(800);
}
console.log('=== ERRORS ('+errors.length+') ===');
console.log(errors.slice(0,30).join('\n') || '(none)');
await browser.close();
