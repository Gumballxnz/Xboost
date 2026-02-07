"""
Integration Module - Account Creation with CAPTCHA and Email Verification
Connects all modules for automated Twitter account creation
"""

import asyncio
import sys
import os
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import dataclass

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from captcha_engine import CaptchaDetector, AudioCaptchaSolver, ManualCaptchaFallback
from email_automation import TwitterCodeExtractor

@dataclass
class AccountCreationResult:
    """Result of account creation attempt"""
    success: bool
    username: str = None
    email: str = None
    error: str = None
    captcha_solved: bool = False
    email_verified: bool = False

class TwitterAccountCreator:
    """
    Automated Twitter account creation with CAPTCHA handling and email verification
    """
    
    def __init__(
        self,
        email_address: str,
        email_password: str,
        email_server: str = None,
        headless: bool = False,
        manual_captcha_port: int = 5555
    ):
        """
        Initialize account creator
        
        Args:
            email_address: Email for verification
            email_password: Email app password
            email_server: IMAP server (auto-detected)
            headless: Run browser headless
            manual_captcha_port: Port for manual CAPTCHA dashboard
        """
        self.email_address = email_address
        self.headless = headless
        
        # Initialize components
        self.captcha_detector = CaptchaDetector()
        self.audio_solver = AudioCaptchaSolver()
        self.manual_fallback = ManualCaptchaFallback(port=manual_captcha_port)
        self.email_extractor = TwitterCodeExtractor(
            email_address=email_address,
            password=email_password,
            server=email_server
        )
        
        # Start manual fallback dashboard
        self.manual_fallback.start_dashboard()
    
    async def create_account(
        self,
        username: str,
        password: str,
        name: str = None,
        proxy: Dict[str, str] = None
    ) -> AccountCreationResult:
        """
        Create a new Twitter account
        
        Args:
            username: Desired username
            password: Account password
            name: Display name
            proxy: Proxy configuration {server, username, password}
            
        Returns:
            AccountCreationResult
        """
        from playwright.async_api import async_playwright
        
        result = AccountCreationResult(success=False, username=username, email=self.email_address)
        
        print(f"\n{'='*50}")
        print(f"🚀 Creating Twitter Account: {username}")
        print(f"   Email: {self.email_address}")
        print(f"{'='*50}\n")
        
        async with async_playwright() as p:
            # Launch browser
            browser_args = {
                'headless': self.headless,
            }
            
            if proxy:
                browser_args['proxy'] = proxy
            
            browser = await p.chromium.launch(**browser_args)
            context = await browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            page = await context.new_page()
            
            try:
                # Step 1: Navigate to signup
                print("📱 Opening Twitter signup...")
                await page.goto('https://twitter.com/i/flow/signup', wait_until='networkidle')
                await asyncio.sleep(3)
                
                # Step 2: Fill signup form
                print("📝 Filling signup form...")
                await self._fill_signup_form(page, name or username, self.email_address)
                
                # Step 3: Handle CAPTCHA if present
                print("🔍 Checking for CAPTCHA...")
                captcha_result = await self._handle_captcha(page)
                result.captcha_solved = captcha_result
                
                if not captcha_result:
                    result.error = "CAPTCHA not solved"
                    return result
                
                # Step 4: Wait for email verification code
                print("📧 Waiting for verification email...")
                verification_code = self.email_extractor.wait_for_verification_code(timeout=120)
                
                if not verification_code:
                    result.error = "Email verification code not received"
                    return result
                
                result.email_verified = True
                
                # Step 5: Enter verification code
                print(f"✅ Entering code: {verification_code}")
                await self._enter_verification_code(page, verification_code)
                
                # Step 6: Set username and password
                print("🔐 Setting credentials...")
                await self._set_credentials(page, username, password)
                
                # Step 7: Verify success
                print("✔️ Verifying account creation...")
                success = await self._verify_account_created(page)
                
                if success:
                    result.success = True
                    print(f"\n{'='*50}")
                    print(f"✅ ACCOUNT CREATED SUCCESSFULLY!")
                    print(f"   Username: @{username}")
                    print(f"   Email: {self.email_address}")
                    print(f"{'='*50}\n")
                else:
                    result.error = "Account creation failed at final step"
                
            except Exception as e:
                result.error = str(e)
                print(f"❌ Error: {e}")
                
                # Save screenshot for debugging
                await page.screenshot(path=f'error_{username}.png')
                
            finally:
                await browser.close()
        
        return result
    
    async def _fill_signup_form(self, page, name: str, email: str):
        """Fill the initial signup form"""
        try:
            # Name field
            name_input = await page.wait_for_selector('input[name="name"]', timeout=10000)
            await name_input.fill(name)
            await asyncio.sleep(0.5)
            
            # Email field
            email_input = await page.wait_for_selector('input[name="email"]', timeout=5000)
            await email_input.fill(email)
            await asyncio.sleep(0.5)
            
            # Click next
            next_button = await page.wait_for_selector('[role="button"]:has-text("Próximo"), [role="button"]:has-text("Next")')
            await next_button.click()
            await asyncio.sleep(2)
            
        except Exception as e:
            print(f"⚠️ Form fill error: {e}")
    
    async def _handle_captcha(self, page) -> bool:
        """Handle CAPTCHA challenge if present"""
        # Get page content
        html = await page.content()
        
        # Detect CAPTCHA type
        captcha_info = self.captcha_detector.detect_from_html(html)
        
        if not captcha_info:
            print("   ✅ No CAPTCHA detected")
            return True
        
        print(f"   🔒 CAPTCHA detected: {captcha_info['type']}")
        
        # Try audio CAPTCHA first (easier to solve)
        if captcha_info['type'] in ['recaptcha', 'hcaptcha']:
            print("   🎧 Attempting audio CAPTCHA...")
            
            try:
                # Click audio button
                audio_btn = await page.query_selector('#recaptcha-audio-button, .audiochallenge')
                if audio_btn:
                    await audio_btn.click()
                    await asyncio.sleep(2)
                    
                    # Get audio URL and solve
                    audio_src = await page.evaluate('() => document.querySelector("audio")?.src')
                    if audio_src:
                        solution = self.audio_solver.solve_from_url(audio_src)
                        if solution:
                            # Enter solution
                            audio_input = await page.query_selector('#audio-response, input[name="audio_response"]')
                            if audio_input:
                                await audio_input.fill(solution)
                                await page.keyboard.press('Enter')
                                await asyncio.sleep(2)
                                return True
            except Exception as e:
                print(f"   ⚠️ Audio CAPTCHA failed: {e}")
        
        # Fallback to manual resolution
        print("   👤 Requesting manual resolution...")
        
        # Screenshot the CAPTCHA
        screenshot = await page.screenshot()
        
        # Request manual solve
        solution = self.manual_fallback.request_manual_solve(
            image_data=screenshot,
            captcha_type=captcha_info['type'],
            timeout=300  # 5 minutes
        )
        
        if solution:
            # Apply solution based on CAPTCHA type
            # This would need to be customized per CAPTCHA type
            return True
        
        return False
    
    async def _enter_verification_code(self, page, code: str):
        """Enter the email verification code"""
        try:
            code_input = await page.wait_for_selector(
                'input[name="verfication_code"], input[data-testid="ocfEnterTextTextInput"]',
                timeout=10000
            )
            await code_input.fill(code)
            await asyncio.sleep(0.5)
            
            # Click verify
            verify_btn = await page.wait_for_selector('[role="button"]:has-text("Verificar"), [role="button"]:has-text("Verify")')
            await verify_btn.click()
            await asyncio.sleep(2)
            
        except Exception as e:
            print(f"⚠️ Code entry error: {e}")
    
    async def _set_credentials(self, page, username: str, password: str):
        """Set the account username and password"""
        try:
            # Password
            pwd_input = await page.wait_for_selector('input[name="password"]', timeout=10000)
            await pwd_input.fill(password)
            await asyncio.sleep(0.5)
            
            # Next
            next_btn = await page.query_selector('[role="button"]:has-text("Próximo"), [role="button"]:has-text("Next")')
            if next_btn:
                await next_btn.click()
                await asyncio.sleep(2)
            
            # Username (if prompted)
            username_input = await page.query_selector('input[name="username"]')
            if username_input:
                await username_input.fill(username)
                await asyncio.sleep(0.5)
                
                next_btn = await page.query_selector('[role="button"]:has-text("Próximo"), [role="button"]:has-text("Next")')
                if next_btn:
                    await next_btn.click()
                    await asyncio.sleep(2)
                    
        except Exception as e:
            print(f"⚠️ Credentials error: {e}")
    
    async def _verify_account_created(self, page) -> bool:
        """Verify that account was created successfully"""
        try:
            # Check for home timeline or onboarding
            home = await page.wait_for_selector(
                '[data-testid="AppTabBar_Home_Link"], [aria-label="Home"]',
                timeout=30000
            )
            return home is not None
        except:
            return False
    
    def cleanup(self):
        """Cleanup resources"""
        self.manual_fallback.stop_dashboard()


# CLI usage
async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Create Twitter account')
    parser.add_argument('--email', required=True, help='Email address')
    parser.add_argument('--email-password', required=True, help='Email app password')
    parser.add_argument('--username', required=True, help='Desired username')
    parser.add_argument('--password', required=True, help='Account password')
    parser.add_argument('--name', help='Display name')
    parser.add_argument('--headless', action='store_true', help='Run headless')
    
    args = parser.parse_args()
    
    creator = TwitterAccountCreator(
        email_address=args.email,
        email_password=args.email_password,
        headless=args.headless
    )
    
    try:
        result = await creator.create_account(
            username=args.username,
            password=args.password,
            name=args.name
        )
        
        if result.success:
            print(f"✅ Success: @{result.username}")
        else:
            print(f"❌ Failed: {result.error}")
            
    finally:
        creator.cleanup()


if __name__ == '__main__':
    asyncio.run(main())
