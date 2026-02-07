"""
Email Automation - Twitter Code Extractor
Extracts verification codes from Twitter emails
"""

import re
from typing import Optional
from .imap_client import IMAPClient, EmailMessage

class TwitterCodeExtractor:
    """Extracts verification codes from Twitter emails"""
    
    # Twitter sender patterns
    TWITTER_SENDERS = [
        'twitter.com',
        'x.com',
        'noreply@twitter.com',
        'verify@twitter.com',
        'info@twitter.com'
    ]
    
    # Subject patterns for verification emails
    SUBJECT_PATTERNS = [
        r'código.*verificação',
        r'verification.*code',
        r'confirm.*email',
        r'confirme.*email',
        r'código de acesso',
        r'access code',
        r'security code',
        r'código de segurança'
    ]
    
    # Code extraction patterns
    CODE_PATTERNS = [
        r'\b(\d{6})\b',           # 6 digit code
        r'\b(\d{8})\b',           # 8 digit code
        r'\b([A-Z0-9]{6})\b',     # 6 char alphanumeric
        r'\b([A-Z0-9]{8})\b',     # 8 char alphanumeric
        r'código[:\s]*(\d{6})',   # Portuguese: código: 123456
        r'code[:\s]*(\d{6})',     # English: code: 123456
    ]
    
    def __init__(self, email_address: str, password: str, server: str = None):
        """
        Initialize extractor
        
        Args:
            email_address: Email to monitor
            password: App password
            server: IMAP server (auto-detected)
        """
        self.client = IMAPClient(
            email_address=email_address,
            password=password,
            server=server
        )
    
    def extract_code_from_text(self, text: str) -> Optional[str]:
        """
        Extract verification code from text
        
        Args:
            text: Email body text
            
        Returns:
            Extracted code or None
        """
        if not text:
            return None
        
        # Try each pattern
        for pattern in self.CODE_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                # Return first valid code
                code = matches[0]
                # Validate it looks like a verification code
                if len(code) >= 6 and (code.isdigit() or code.isalnum()):
                    return code.upper()
        
        return None
    
    def extract_code_from_email(self, email: EmailMessage) -> Optional[str]:
        """
        Extract code from email message
        
        Args:
            email: EmailMessage object
            
        Returns:
            Extracted code or None
        """
        # Check subject first
        code = self.extract_code_from_text(email.subject)
        if code:
            return code
        
        # Check text body
        code = self.extract_code_from_text(email.text_body)
        if code:
            return code
        
        # Check HTML body (strip tags first)
        if email.html_body:
            # Simple HTML tag removal
            text = re.sub(r'<[^>]+>', ' ', email.html_body)
            code = self.extract_code_from_text(text)
            if code:
                return code
        
        return None
    
    def is_twitter_email(self, email: EmailMessage) -> bool:
        """
        Check if email is from Twitter
        
        Args:
            email: EmailMessage object
            
        Returns:
            True if from Twitter/X
        """
        sender_lower = email.sender.lower()
        return any(s in sender_lower for s in self.TWITTER_SENDERS)
    
    def is_verification_email(self, email: EmailMessage) -> bool:
        """
        Check if email is a verification email
        
        Args:
            email: EmailMessage object
            
        Returns:
            True if likely a verification email
        """
        subject_lower = email.subject.lower()
        return any(re.search(p, subject_lower) for p in self.SUBJECT_PATTERNS)
    
    def wait_for_verification_code(
        self,
        timeout: int = 120,
        check_interval: int = 5
    ) -> Optional[str]:
        """
        Wait for and extract Twitter verification code
        
        Args:
            timeout: Max wait time in seconds
            check_interval: Seconds between email checks
            
        Returns:
            Verification code or None if timeout
        """
        import time
        
        if not self.client.connect():
            return None
        
        start_time = time.time()
        checked_ids = set()
        
        print("⏳ Aguardando código de verificação do Twitter...")
        
        try:
            while time.time() - start_time < timeout:
                # Fetch recent emails from Twitter
                emails = self.client.fetch_recent_emails(
                    sender='twitter',
                    since_minutes=5,
                    limit=10
                )
                
                for email in emails:
                    if email.id in checked_ids:
                        continue
                    
                    checked_ids.add(email.id)
                    
                    # Check if it's a Twitter verification email
                    if not self.is_twitter_email(email):
                        continue
                    
                    print(f"📧 Email do Twitter: {email.subject}")
                    
                    # Try to extract code
                    code = self.extract_code_from_email(email)
                    if code:
                        print(f"✅ Código encontrado: {code}")
                        return code
                
                # Wait before next check
                elapsed = int(time.time() - start_time)
                remaining = timeout - elapsed
                print(f"   Verificando... ({remaining}s restantes)")
                time.sleep(check_interval)
            
            print(f"❌ Timeout: código não recebido em {timeout}s")
            return None
            
        finally:
            self.client.disconnect()
    
    def get_recent_twitter_codes(self, since_minutes: int = 60) -> list:
        """
        Get all verification codes from recent Twitter emails
        
        Args:
            since_minutes: Look back period in minutes
            
        Returns:
            List of (code, email_subject, date) tuples
        """
        if not self.client.connect():
            return []
        
        try:
            emails = self.client.fetch_recent_emails(
                sender='twitter',
                since_minutes=since_minutes,
                limit=20
            )
            
            codes = []
            for email in emails:
                if self.is_twitter_email(email):
                    code = self.extract_code_from_email(email)
                    if code:
                        codes.append((code, email.subject, email.date))
            
            return codes
            
        finally:
            self.client.disconnect()


if __name__ == '__main__':
    # Test extractor
    extractor = TwitterCodeExtractor(
        email_address='test@gmail.com',
        password='app-password-here'
    )
    
    # Test code extraction
    test_texts = [
        "Seu código de verificação é 123456",
        "Your verification code is 789012",
        "Use o código: 456789 para confirmar",
        "Twitter verification: ABCD1234"
    ]
    
    for text in test_texts:
        code = extractor.extract_code_from_text(text)
        print(f"Text: {text} -> Code: {code}")
