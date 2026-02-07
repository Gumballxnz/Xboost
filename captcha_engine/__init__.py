"""
CAPTCHA Engine Package
"""

from .detector import CaptchaDetector, detect_captcha_on_page
from .audio_solver import AudioCaptchaSolver
from .manual_fallback import ManualCaptchaFallback

__all__ = [
    'CaptchaDetector',
    'detect_captcha_on_page',
    'AudioCaptchaSolver',
    'ManualCaptchaFallback'
]
