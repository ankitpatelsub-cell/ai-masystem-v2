import pkg from '/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js';
const { chromium } = pkg;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.goto('https://masystem.co.in/login', { waitUntil: 'networkidle' });
await page.fill('input[placeholder="username"]', 'admin');
await page.fill('input[placeholder="password"]', 'MASys@9205a6c968d7');
await page.click('button.btn');
await page.waitForTimeout(2500);
const data = await page.evaluate(() => {
  const app = document.querySelector('.app');
  const side = document.querySelector('.side');
  const main = document.querySelector('.main');
  const sb = side.getBoundingClientRect();
  const mb = main.getBoundingClientRect();
  return {
    winW: window.innerWidth,
    sideW: Math.round(sb.width), sideLeft: Math.round(sb.left), sideRight: Math.round(sb.right),
    mainLeft: Math.round(mb.left), mainW: Math.round(mb.width),
    mainRight: Math.round(mb.right),
    overlap: mb.left < sb.right,
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
