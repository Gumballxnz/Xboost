"""
Email Automation - IMAP Client
Generic IMAP client for reading emails from any provider
"""

import imaplib
import email
from email.header import decode_header
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import time

@dataclass
class EmailMessage:
    """Represents an email message"""
    id: str
    sender: str
    subject: str
    date: datetime
    text_body: str
    html_body: str
    
class IMAPClient:
    """Generic IMAP email client"""
    
    # Common IMAP servers
    SERVERS = {
        'gmail': 'imap.gmail.com',
        'outlook': 'imap-mail.outlook.com',
        'yahoo': 'imap.mail.yahoo.com',
        'hotmail': 'imap-mail.outlook.com'
    }
    
    def __init__(
        self,
        email_address: str,
        password: str,
        server: str = None,
        port: int = 993
    ):
        """
        Initialize IMAP client
        
        Args:
            email_address: Email address
            password: App password (not regular password for Gmail)
            server: IMAP server (auto-detected from email domain)
            port: IMAP port (default 993 for SSL)
        """
        self.email_address = email_address
        self.password = password
        self.port = port
        
        # Auto-detect server
        if server:
            self.server = server
        else:
            domain = email_address.split('@')[-1].lower()
            for provider, imap_server in self.SERVERS.items():
                if provider in domain:
                    self.server = imap_server
                    break
            else:
                self.server = f'imap.{domain}'
        
        self.connection = None
    
    def connect(self) -> bool:
        """
        Connect to IMAP server
        
        Returns:
            True if successful
        """
        try:
            self.connection = imaplib.IMAP4_SSL(self.server, self.port)
            self.connection.login(self.email_address, self.password)
            print(f"✅ Connected to {self.server}")
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False
    
    def disconnect(self):
        """Disconnect from server"""
        if self.connection:
            try:
                self.connection.logout()
            except:
                pass
    
    def fetch_recent_emails(
        self,
        folder: str = 'INBOX',
        sender: str = None,
        subject_contains: str = None,
        since_minutes: int = 10,
        limit: int = 10
    ) -> List[EmailMessage]:
        """
        Fetch recent emails with optional filters
        
        Args:
            folder: Folder to search (INBOX, etc.)
            sender: Filter by sender email/domain
            subject_contains: Filter by subject text
            since_minutes: Only emails from last N minutes
            limit: Max number of emails to return
            
        Returns:
            List of EmailMessage objects
        """
        if not self.connection:
            if not self.connect():
                return []
        
        try:
            self.connection.select(folder)
            
            # Build search criteria
            criteria = []
            
            # Date filter
            since_date = (datetime.now() - timedelta(minutes=since_minutes)).strftime('%d-%b-%Y')
            criteria.append(f'SINCE {since_date}')
            
            # Sender filter
            if sender:
                criteria.append(f'FROM "{sender}"')
            
            # Subject filter
            if subject_contains:
                criteria.append(f'SUBJECT "{subject_contains}"')
            
            search_criteria = ' '.join(criteria) if criteria else 'ALL'
            
            # Search emails
            status, messages = self.connection.search(None, search_criteria)
            
            if status != 'OK':
                return []
            
            email_ids = messages[0].split()
            
            # Get most recent emails
            email_ids = email_ids[-limit:] if len(email_ids) > limit else email_ids
            email_ids = reversed(email_ids)  # Newest first
            
            results = []
            for email_id in email_ids:
                msg = self._fetch_email(email_id)
                if msg:
                    results.append(msg)
            
            return results
            
        except Exception as e:
            print(f"❌ Fetch error: {e}")
            return []
    
    def _fetch_email(self, email_id: bytes) -> Optional[EmailMessage]:
        """Fetch a single email by ID"""
        try:
            status, data = self.connection.fetch(email_id, '(RFC822)')
            
            if status != 'OK':
                return None
            
            raw_email = data[0][1]
            msg = email.message_from_bytes(raw_email)
            
            # Decode subject
            subject = ''
            if msg['Subject']:
                decoded = decode_header(msg['Subject'])
                for part, encoding in decoded:
                    if isinstance(part, bytes):
                        subject += part.decode(encoding or 'utf-8', errors='ignore')
                    else:
                        subject += part
            
            # Get sender
            sender = msg.get('From', '')
            
            # Get date
            date_str = msg.get('Date', '')
            try:
                date = email.utils.parsedate_to_datetime(date_str)
            except:
                date = datetime.now()
            
            # Get body
            text_body = ''
            html_body = ''
            
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    try:
                        payload = part.get_payload(decode=True)
                        if payload:
                            charset = part.get_content_charset() or 'utf-8'
                            decoded = payload.decode(charset, errors='ignore')
                            
                            if content_type == 'text/plain':
                                text_body += decoded
                            elif content_type == 'text/html':
                                html_body += decoded
                    except:
                        pass
            else:
                payload = msg.get_payload(decode=True)
                if payload:
                    charset = msg.get_content_charset() or 'utf-8'
                    text_body = payload.decode(charset, errors='ignore')
            
            return EmailMessage(
                id=email_id.decode(),
                sender=sender,
                subject=subject,
                date=date,
                text_body=text_body,
                html_body=html_body
            )
            
        except Exception as e:
            print(f"❌ Parse error: {e}")
            return None
    
    def wait_for_email(
        self,
        sender: str,
        timeout: int = 120,
        check_interval: int = 5
    ) -> Optional[EmailMessage]:
        """
        Wait for a new email from specific sender
        
        Args:
            sender: Expected sender domain/email
            timeout: Max wait time in seconds
            check_interval: Seconds between checks
            
        Returns:
            EmailMessage if found, None if timeout
        """
        start_time = time.time()
        checked_ids = set()
        
        print(f"⏳ Waiting for email from {sender}...")
        
        while time.time() - start_time < timeout:
            emails = self.fetch_recent_emails(sender=sender, limit=5)
            
            for msg in emails:
                if msg.id not in checked_ids:
                    checked_ids.add(msg.id)
                    print(f"📧 New email: {msg.subject}")
                    return msg
            
            time.sleep(check_interval)
        
        print(f"❌ Timeout: no email from {sender} in {timeout}s")
        return None


if __name__ == '__main__':
    # Test connection
    client = IMAPClient(
        email_address='test@gmail.com',
        password='app-password-here'
    )
    
    if client.connect():
        emails = client.fetch_recent_emails(
            sender='twitter.com',
            since_minutes=60
        )
        
        for msg in emails:
            print(f"From: {msg.sender}")
            print(f"Subject: {msg.subject}")
            print("---")
        
        client.disconnect()
