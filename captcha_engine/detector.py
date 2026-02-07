"""
CAPTCHA Engine - Detector Module
Detects and classifies CAPTCHAs on web pages
"""

import re
from typing import Optional, Dict, Any

class CaptchaDetector:
    """Detects CAPTCHA elements in web page content"""
    
    # Known CAPTCHA signatures
    CAPTCHA_SIGNATURES = {
        'image': [
            'captcha-image',
            'captcha_image',
            'g-recaptcha',
            'h-captcha',
            'arkose',
            'funcaptcha'
        ],
        'audio': [
            'captcha-audio',
            'audio-challenge'
        ],
        'text': [
            'captcha-input',
            'captcha_input'
        ]
    }
    
    # Twitter-specific CAPTCHA patterns
    TWITTER_PATTERNS = [
        r'arkose.*challenge',
        r'funcaptcha',
        r'verification.*required',
        r'prove.*human',
        r'security.*check'
    ]
    
    def __init__(self):
        self.last_detected_type = None
        self.detection_confidence = 0.0
    
    def detect_from_html(self, html_content: str) -> Optional[Dict[str, Any]]:
        """
        Analyze HTML content for CAPTCHA presence
        
        Args:
            html_content: Raw HTML string
            
        Returns:
            Dict with captcha info or None
        """
        html_lower = html_content.lower()
        
        # Check for reCAPTCHA
        if 'g-recaptcha' in html_lower or 'recaptcha' in html_lower:
            self.last_detected_type = 'recaptcha'
            self.detection_confidence = 0.95
            return {
                'type': 'recaptcha',
                'version': self._detect_recaptcha_version(html_content),
                'sitekey': self._extract_sitekey(html_content),
                'confidence': self.detection_confidence
            }
        
        # Check for hCaptcha
        if 'h-captcha' in html_lower or 'hcaptcha' in html_lower:
            self.last_detected_type = 'hcaptcha'
            self.detection_confidence = 0.95
            return {
                'type': 'hcaptcha',
                'sitekey': self._extract_hcaptcha_sitekey(html_content),
                'confidence': self.detection_confidence
            }
        
        # Check for FunCaptcha (Arkose) - Twitter uses this
        if 'arkose' in html_lower or 'funcaptcha' in html_lower:
            self.last_detected_type = 'funcaptcha'
            self.detection_confidence = 0.90
            return {
                'type': 'funcaptcha',
                'provider': 'arkose',
                'confidence': self.detection_confidence
            }
        
        # Check Twitter-specific patterns
        for pattern in self.TWITTER_PATTERNS:
            if re.search(pattern, html_lower):
                self.last_detected_type = 'twitter_challenge'
                self.detection_confidence = 0.80
                return {
                    'type': 'twitter_challenge',
                    'pattern_matched': pattern,
                    'confidence': self.detection_confidence
                }
        
        # Check generic CAPTCHA
        for captcha_type, signatures in self.CAPTCHA_SIGNATURES.items():
            for sig in signatures:
                if sig in html_lower:
                    self.last_detected_type = captcha_type
                    self.detection_confidence = 0.70
                    return {
                        'type': captcha_type,
                        'signature': sig,
                        'confidence': self.detection_confidence
                    }
        
        return None
    
    def detect_from_page_text(self, page_text: str) -> Optional[Dict[str, Any]]:
        """
        Detect CAPTCHA from visible page text
        
        Args:
            page_text: Visible text from page
            
        Returns:
            Dict with captcha info or None
        """
        text_lower = page_text.lower()
        
        challenge_phrases = [
            'verify you are human',
            'prove you are not a robot',
            'security verification',
            'complete the challenge',
            'select all images',
            'type the characters',
            'click to verify'
        ]
        
        for phrase in challenge_phrases:
            if phrase in text_lower:
                return {
                    'type': 'challenge_detected',
                    'trigger_phrase': phrase,
                    'confidence': 0.75
                }
        
        return None
    
    def _detect_recaptcha_version(self, html: str) -> str:
        """Detect reCAPTCHA v2 vs v3"""
        if 'recaptcha/api.js?render=' in html:
            return 'v3'
        return 'v2'
    
    def _extract_sitekey(self, html: str) -> Optional[str]:
        """Extract reCAPTCHA sitekey"""
        patterns = [
            r'data-sitekey=["\']([^"\']+)["\']',
            r'sitekey.*?["\']([0-9A-Za-z_-]{40})["\']'
        ]
        for pattern in patterns:
            match = re.search(pattern, html)
            if match:
                return match.group(1)
        return None
    
    def _extract_hcaptcha_sitekey(self, html: str) -> Optional[str]:
        """Extract hCaptcha sitekey"""
        match = re.search(r'data-sitekey=["\']([^"\']+)["\']', html)
        return match.group(1) if match else None


# For Puppeteer/Playwright integration
async def detect_captcha_on_page(page) -> Optional[Dict[str, Any]]:
    """
    Detect CAPTCHA on a Puppeteer/Playwright page
    
    Args:
        page: Puppeteer or Playwright page object
        
    Returns:
        Dict with captcha info or None
    """
    detector = CaptchaDetector()
    
    # Get page HTML
    html = await page.content()
    result = detector.detect_from_html(html)
    
    if result:
        return result
    
    # Get visible text
    text = await page.evaluate('() => document.body.innerText')
    return detector.detect_from_page_text(text)


if __name__ == '__main__':
    # Test the detector
    test_html = '''
    <html>
        <div class="g-recaptcha" data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"></div>
    </html>
    '''
    
    detector = CaptchaDetector()
    result = detector.detect_from_html(test_html)
    print(f"Detection result: {result}")
