const { chromium } = require('playwright');
const path = require('path');

async function runVerification() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1000);

  // Click Stickers tab
  console.log('Clicking Stickers tab...');
  await page.click('.tab[data-tool="stickers"]');
  await page.waitForTimeout(500);

  // Add Fire sticker
  console.log('Adding sticker...');
  await page.click('.stk-btn[data-emoji="🔥"]');
  await page.waitForTimeout(500);

  // Click Background tab
  console.log('Clicking Background tab...');
  await page.click('.tab[data-tool="background"]');
  await page.waitForTimeout(500);

  // Click Ratio tab
  console.log('Clicking Format/Ratio tab...');
  await page.click('.tab[data-tool="format"]');
  await page.waitForTimeout(500);

  // Select 16:9 YouTube ratio
  console.log('Selecting 16:9 aspect ratio...');
  await page.click('.chip[data-act="set-ratio"][data-v="landscape"]');
  await page.waitForTimeout(500);

  const screenshotPath = '/home/jules/verification/stickers_bg_ratio.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
