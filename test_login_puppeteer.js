import puppeteer from 'puppeteer';

(async () => {
    console.log('🚀 Launching Browser...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        userDataDir: './puppeteer_data_' + Date.now()
    });
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.failure().errorText, request.url()));

    try {
        console.log('🌐 Navigating to login...');
        const response = await page.goto('http://localhost:3000/auth.html', { waitUntil: 'networkidle0', timeout: 30000 });
        if (!response.ok()) {
            console.log('❌ Failed to load page:', response.status(), response.statusText());
        }

        // Type Credentials
        console.log('🔑 Entering credentials...');
        await page.waitForSelector('#login-email', { visible: true, timeout: 10000 });
        await page.type('#login-email', 'admin@local.com');
        await page.type('#login-password', 'AdminPassword123!');

        // Click Login
        console.log('🖱️ Clicking login...');
        await Promise.all([
            page.click('button[type="submit"]'),
            page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 })
        ]);

        // Wait for Dashboard
        console.log('⌛ Waiting for Dashboard...');
        if (page.url().includes('/admin')) {
            await page.waitForSelector('#dashboard', { visible: true, timeout: 10000 });
        } else {
            await page.waitForSelector('#dashboard-view', { visible: true, timeout: 10000 });
        }

        // Screenshot success
        console.log('📸 Taking screenshot...');
        await page.screenshot({ path: 'admin_login_success.png' });

        console.log('✅ Login Successful! Screenshot saved as admin_login_success.png');
        console.log('Admin Dashboard is visible.');

    } catch (e) {
        console.error('❌ Test Failed:', e.message);

        // Try to capture error message from page
        try {
            const errorMsg = await page.evaluate(() => {
                const el = document.getElementById('error-msg');
                return el && el.style.display !== 'none' ? el.innerText : null;
            });
            if (errorMsg) console.log('❌ Page Error Message:', errorMsg);
        } catch (err) { /* ignore */ }

        console.log('📸 Taking failure screenshot...');
        await page.screenshot({ path: 'test_failure.png' });
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
