"""
CAPTCHA Engine - Manual Fallback Dashboard
Web interface for manual CAPTCHA resolution when automated methods fail
"""

import os
import json
import uuid
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Store for pending CAPTCHAs
PENDING_CAPTCHAS: Dict[str, Dict[str, Any]] = {}
SOLVED_CAPTCHAS: Dict[str, str] = {}

class ManualCaptchaFallback:
    """Manual CAPTCHA resolution system"""
    
    def __init__(self, port: int = 5555):
        self.port = port
        self.server = None
        self.server_thread = None
    
    def start_dashboard(self):
        """Start the manual resolution dashboard"""
        handler = CaptchaDashboardHandler
        self.server = HTTPServer(('0.0.0.0', self.port), handler)
        
        self.server_thread = threading.Thread(target=self.server.serve_forever)
        self.server_thread.daemon = True
        self.server_thread.start()
        
        print(f"🖥️ Manual CAPTCHA Dashboard: http://localhost:{self.port}")
    
    def stop_dashboard(self):
        """Stop the dashboard server"""
        if self.server:
            self.server.shutdown()
    
    def request_manual_solve(
        self,
        image_data: bytes = None,
        image_url: str = None,
        captcha_type: str = "image",
        timeout: int = 300
    ) -> Optional[str]:
        """
        Request manual CAPTCHA resolution
        
        Args:
            image_data: Raw image bytes
            image_url: URL of CAPTCHA image
            captcha_type: Type of CAPTCHA
            timeout: Max wait time in seconds
            
        Returns:
            Solution or None if timeout
        """
        captcha_id = str(uuid.uuid4())[:8]
        
        PENDING_CAPTCHAS[captcha_id] = {
            'id': captcha_id,
            'type': captcha_type,
            'image_url': image_url,
            'image_data': image_data.hex() if image_data else None,
            'created_at': datetime.now().isoformat(),
            'status': 'pending'
        }
        
        print(f"⏳ Aguardando resolução manual: {captcha_id}")
        print(f"   Dashboard: http://localhost:{self.port}")
        
        # Wait for solution
        start_time = datetime.now()
        while True:
            if captcha_id in SOLVED_CAPTCHAS:
                solution = SOLVED_CAPTCHAS.pop(captcha_id)
                del PENDING_CAPTCHAS[captcha_id]
                print(f"✅ CAPTCHA resolvido: {solution}")
                return solution
            
            elapsed = (datetime.now() - start_time).seconds
            if elapsed > timeout:
                print(f"❌ Timeout: CAPTCHA não resolvido em {timeout}s")
                del PENDING_CAPTCHAS[captcha_id]
                return None
            
            asyncio.sleep(1)
    
    def submit_solution(self, captcha_id: str, solution: str) -> bool:
        """
        Submit a CAPTCHA solution
        
        Args:
            captcha_id: ID of the CAPTCHA
            solution: The solution text
            
        Returns:
            True if successful
        """
        if captcha_id in PENDING_CAPTCHAS:
            SOLVED_CAPTCHAS[captcha_id] = solution
            return True
        return False


class CaptchaDashboardHandler(SimpleHTTPRequestHandler):
    """HTTP handler for the CAPTCHA dashboard"""
    
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.send_dashboard_html()
        elif self.path == '/api/pending':
            self.send_pending_captchas()
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/solve':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            captcha_id = data.get('id')
            solution = data.get('solution')
            
            if captcha_id and solution:
                SOLVED_CAPTCHAS[captcha_id] = solution
                self.send_json({'success': True})
            else:
                self.send_json({'success': False, 'error': 'Missing data'})
        else:
            self.send_error(404)
    
    def send_dashboard_html(self):
        html = '''
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>XBoost - Resolver CAPTCHA</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: #0f0f0f;
            color: #fafafa;
            min-height: 100vh;
            padding: 20px;
        }
        h1 { color: #10b981; margin-bottom: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .captcha-card {
            background: #1f1f1f;
            border: 1px solid #333;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .captcha-image {
            max-width: 100%;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            background: #262626;
            border: 1px solid #404040;
            border-radius: 8px;
            color: #fff;
            font-size: 18px;
            margin-bottom: 10px;
        }
        button {
            background: linear-gradient(135deg, #10b981, #0d9488);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
        }
        button:hover { transform: translateY(-2px); }
        .empty { color: #666; text-align: center; padding: 40px; }
        .badge { 
            background: #f59e0b;
            color: #000;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Resolver CAPTCHA</h1>
        <div id="captcha-list"></div>
    </div>
    
    <script>
        async function loadCaptchas() {
            const res = await fetch('/api/pending');
            const captchas = await res.json();
            const list = document.getElementById('captcha-list');
            
            if (captchas.length === 0) {
                list.innerHTML = '<div class="empty">✅ Nenhum CAPTCHA pendente</div>';
                return;
            }
            
            list.innerHTML = captchas.map(c => `
                <div class="captcha-card">
                    <span class="badge">${c.type}</span>
                    <p style="margin: 10px 0; color: #888">ID: ${c.id}</p>
                    ${c.image_url ? `<img src="${c.image_url}" class="captcha-image">` : ''}
                    ${c.image_data ? `<img src="data:image/png;base64,${c.image_data}" class="captcha-image">` : ''}
                    <input type="text" id="solution-${c.id}" placeholder="Digite a solução...">
                    <button onclick="solve('${c.id}')">Enviar</button>
                </div>
            `).join('');
        }
        
        async function solve(id) {
            const solution = document.getElementById('solution-' + id).value;
            if (!solution) return alert('Digite a solução');
            
            await fetch('/api/solve', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({id, solution})
            });
            
            loadCaptchas();
        }
        
        loadCaptchas();
        setInterval(loadCaptchas, 3000);
    </script>
</body>
</html>
        '''
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())
    
    def send_pending_captchas(self):
        captchas = list(PENDING_CAPTCHAS.values())
        self.send_json(captchas)
    
    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())


if __name__ == '__main__':
    fallback = ManualCaptchaFallback(port=5555)
    fallback.start_dashboard()
    
    print("Dashboard rodando. Pressione Ctrl+C para sair.")
    
    try:
        while True:
            pass
    except KeyboardInterrupt:
        fallback.stop_dashboard()
