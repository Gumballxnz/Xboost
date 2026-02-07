"""
Email Automation Package
"""

from .imap_client import IMAPClient, EmailMessage
from .code_extractor import TwitterCodeExtractor

__all__ = ['IMAPClient', 'EmailMessage', 'TwitterCodeExtractor']
