const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to https://ai-assistant-web-demo.netlify.app...');
  
  // Collect console messages
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.log('Page error:', error.message);
  });
  
  try {
    await page.goto('https://ai-assistant-web-demo.netlify.app', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if body has content
    const bodyContent = await page.evaluate(() => document.body.innerHTML.length);
    console.log('Body content length:', bodyContent);
    
    // Look for main elements
    const hasMain = await page.evaluate(() => !!document.querySelector('main'));
    console.log('Has main element:', hasMain);
    
    const hasNav = await page.evaluate(() => !!document.querySelector('nav'));
    console.log('Has nav element:', hasNav);
    
    // Check for visible text
    const pageText = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Page text preview:', pageText.substring(0, 200));
    
    if (consoleErrors.length > 0) {
      console.log('\nConsole errors found:');
      consoleErrors.forEach(err => console.log('  -', err));
    } else {
      console.log('\nNo console errors found!');
    }
    
  } catch (error) {
    console.log('Navigation error:', error.message);
  }
  
  await browser.close();
})();
