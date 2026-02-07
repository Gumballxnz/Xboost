
import sys
import os
import json
import logging
import re
import argparse
import time

# Adiciona raiz ao path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from email_automation.imap_client import IMAPClient, EmailMessage
except ImportError as e:
    print(f"Erro ao importar módulo de email: {e}")
    sys.exit(1)

class EmailVerificationClient:
    def __init__(self, email_user=None, email_pass=None):
        self.email_user = email_user or os.getenv('EMAIL_USER')
        self.email_pass = email_pass or os.getenv('EMAIL_PASS')
        self.logger = logging.getLogger('EmailClient')
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)

        if not self.email_user or not self.email_pass:
            self.logger.error("Credenciais de email não configuradas (EMAIL_USER/EMAIL_PASS).")
            # Em prod, lançaria exceção. Aqui permite instanciar para testes se passar no método.

    def get_twitter_code(self, timeout=300):
        """
        Conecta ao email e espera pelo código do Twitter.
        """
        client = IMAPClient(self.email_user, self.email_pass)
        
        self.logger.info(f"Conectando IMAP para {self.email_user}...")
        if not client.connect():
            self.logger.error("Falha na conexão IMAP.")
            return None

        try:
            # Padrões comuns de remetente do Twitter
            senders = ['twitter.com', 'x.com', 'verify@twitter.com', 'info@twitter.com', 'verify@x.com']
            
            start_time = time.time()
            self.logger.info("Aguardando email do Twitter...")
            
            while time.time() - start_time < timeout:
                # Busca emails recentes de "twitter" ou "x" (filtro genérico 'ALL' com processamento local é custoso,
                # IMAPClient suporta filtro de sender. Vamos tentar um por vez ou 'TEXT "twitter"' se suportado)
                
                # Usando a lógica do IMAPClient existente (fetch_recent_emails com sender)
                messages = client.fetch_recent_emails(sender='twitter.com', limit=3, since_minutes=10)
                if not messages:
                    messages = client.fetch_recent_emails(sender='x.com', limit=3, since_minutes=10)
                
                # Se não achou por sender exato, busca por subject
                if not messages:
                    messages = client.fetch_recent_emails(subject_contains='verification', limit=3, since_minutes=10)

                for msg in messages:
                    # Validar se é realmente do Twitter (segurança extra)
                    if 'twitter' in msg.sender.lower() or 'x.com' in msg.sender.lower():
                         code = self._extract_verification_code(msg.text_body + " " + msg.html_body)
                         if code:
                             self.logger.info(f"Código encontrado: {code}")
                             return code
                
                time.sleep(10) # Polling interval
            
            self.logger.warning("Timeout aguardando código.")
            return None
            
        finally:
            client.disconnect()

    def _extract_verification_code(self, text):
        """
        Extrai código numérico de 6 a 8 dígitos do texto.
        """
        # Procura por padrões como: "verification code is 123456" ou apenas "123456" isolado
        # Twitter costuma enviar apenas o código ou "Seu código de verificação do Twitter é 123456"
        
        # Regex para encontrar números de 6 a 8 dígitos isolados
        matches = re.findall(r'\b\d{6,8}\b', text)
        
        if matches:
            # Retorna o primeiro encontrado (geralmente é o código)
            # Pode-se refinar pegando o que está próximo de palavras chaves "code", "código"
            return matches[0]
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--email', help='Email address')
    parser.add_argument('--password', help='App Password')
    parser.add_argument('--timeout', type=int, default=300)
    args = parser.parse_args()
    
    verifier = EmailVerificationClient(args.email, args.password)
    code = verifier.get_twitter_code(timeout=args.timeout)
    
    if code:
        print(json.dumps({"status": "success", "code": code}))
    else:
        print(json.dumps({"status": "failed"}))
        sys.exit(1)
