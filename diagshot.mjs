import pkg from '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js';
const { chromium } = pkg;
const browser = await chromium.launch();
// MOBILE
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto('https://masystem.co.in/login', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/shot_login_mobile.png' });
await page.fill('input[placeholder="username"]', 'admin').catch(e=>errs.push('fill user: '+e.message));
await page.fill('input[placeholder="password"]', 'MASys@9205a6c968d7').catch(e=>errs.push('fill pass: '+e.message));
await page.click('button.btn').catch(e=>errs.push('click: '+e.message));
await page.waitForTimeout(3000);
console.log('mobile after login url:', page.url());
await page.screenshot({ path: '/tmp/shot_dash_mobile.png', fullPage: true });
const sb = await page.$('.side'); console.log('mobile .side exists:', !!sb);
console.log('mobile errors:', errs.join(' | ') || '(none)');
// DESKTOP shot for reference
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p2 = await ctx2.newPage();
await p2.goto('https://masystem.co.in/', { waitUntil: 'networkidle' });
await p2.waitForTimeout(1500);
await p2.screenshot({ path: '/tmp/shot_landing_desktop.png', fullPage: true });
await browser.close();
console.log('shots saved');
