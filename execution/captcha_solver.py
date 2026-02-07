
import sys
import os
import json
import logging
import argparse

# Adiciona o diretório raiz ao path para importar módulos irmãos
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from captcha_engine.detector import CaptchaDetector
    from captcha_engine.audio_solver import AudioCaptchaSolver
except ImportError as e:
    print(f"Erro ao importar módulos de captcha: {e}")
    sys.exit(1)

class CaptchaSolver:
    def __init__(self):
        self.logger = logging.getLogger('CaptchaSolver')
        self.logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        self.logger.addHandler(handler)
        
        self.detector = CaptchaDetector()
        self.audio_solver = AudioCaptchaSolver(whisper_model="base") # Pode ser configurado via env

    def solve(self, context_data):
        """
        Orquestra a resolução do CAPTCHA baseada no contexto.
        
        Args:
            context_data (dict): Dados do contexto (html, audio_url, image_path, etc)
        
        Returns:
            str: Solução do captcha ou None se falhar
        """
        self.logger.info("Iniciando resolução de CAPTCHA...")
        
        # 1. Detecção
        captcha_type = context_data.get('type')
        if not captcha_type and context_data.get('html'):
            detection = self.detector.detect_from_html(context_data['html'])
            if detection:
                captcha_type = detection.get('type')
                self.logger.info(f"CAPTCHA detectado: {captcha_type}")
        
        # 2. Resolução
        try:
            if captcha_type == 'audio' or context_data.get('audio_url'):
                return self._solve_audio(context_data.get('audio_url'), context_data.get('audio_path'))
            
            elif captcha_type == 'image' or context_data.get('image_path'):
                return self._solve_image(context_data.get('image_path'))
            
            elif captcha_type == 'recaptcha' or captcha_type == 'hcaptcha':
                 # Para v2/v3/hcaptcha, geralmente precisamos de audio ou click challenge
                 # Se tivermos audio_url disponível (acessibilidade), usamos.
                 if context_data.get('audio_url'):
                     return self._solve_audio(context_data['audio_url'])
                 else:
                     self.logger.warning("Desafio visual puro detectado. Tentando fallback.")
                     return self._request_fallback(context_data)
            
            else:
                self.logger.warning("Tipo de CAPTCHA desconhecido ou dados insuficientes.")
                return self._request_fallback(context_data)
                
        except Exception as e:
            self.logger.error(f"Erro na resolução automática: {e}")
            return self._request_fallback(context_data)

    def _solve_audio(self, url=None, path=None):
        self.logger.info("Tentando resolver via Áudio (Whisper)...")
        if url:
            return self.audio_solver.solve_from_url(url)
        elif path:
            return self.audio_solver.solve_from_file(path)
        return None

    def _solve_image(self, image_path):
        self.logger.info("Tentando resolver imagem (CNN)... [TODO: Integrar Modelo]")
        # Placeholder para modelo CNN futuro
        # return self.image_model.predict(image_path)
        return self._request_fallback({'image_path': image_path, 'reason': 'image_model_not_implemented'})

    def _request_fallback(self, data):
        """
        Aciona fallback manual. 
        Por enquanto, imprime no console e espera input (útil para debug local).
        Em produção, enviaria para um dashboard web.
        """
        self.logger.warning("⚠️ AUTOMATION FAILED. MANUAL FALLBACK REQUIRED.")
        print("\n" + "="*50)
        print("SOLICITAÇÃO DE RESOLUÇÃO MANUAL")
        print(f"Dados: {json.dumps(data, indent=2)}")
        print("="*50 + "\n")
        
        # Se rodando interativo
        if sys.stdin.isatty():
            return input("Digite a solução do CAPTCHA: ")
        else:
            self.logger.error("Sem terminal interativo para fallback.")
            return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='XBoost Captcha Solver')
    parser.add_argument('--context', type=str, help='JSON string with context data')
    parser.add_argument('--audio', type=str, help='Direct audio URL')
    
    args = parser.parse_args()
    
    solver = CaptchaSolver()
    
    context = {}
    if args.context:
        context = json.loads(args.context)
    
    if args.audio:
        context['audio_url'] = args.audio
        context['type'] = 'audio'
        
    solution = solver.solve(context)
    
    if solution:
        print(json.dumps({"status": "success", "solution": solution}))
    else:
        print(json.dumps({"status": "failed"}))
        sys.exit(1)
