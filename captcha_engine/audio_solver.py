"""
CAPTCHA Engine - Audio Solver
Uses Whisper for speech-to-text on audio CAPTCHAs
"""

import os
import tempfile
import subprocess
from typing import Optional
from pathlib import Path

class AudioCaptchaSolver:
    """Solves audio CAPTCHAs using speech-to-text"""
    
    def __init__(self, whisper_model: str = "base"):
        """
        Initialize audio solver
        
        Args:
            whisper_model: Whisper model size (tiny, base, small, medium, large)
        """
        self.whisper_model = whisper_model
        self.whisper_available = self._check_whisper()
    
    def _check_whisper(self) -> bool:
        """Check if Whisper is available"""
        try:
            import whisper
            return True
        except ImportError:
            print("⚠️ Whisper not installed. Run: pip install openai-whisper")
            return False
    
    def solve_from_url(self, audio_url: str) -> Optional[str]:
        """
        Download and solve audio CAPTCHA from URL
        
        Args:
            audio_url: URL of the audio file
            
        Returns:
            Transcribed text or None
        """
        import requests
        
        # Download audio
        try:
            response = requests.get(audio_url, timeout=30)
            response.raise_for_status()
        except Exception as e:
            print(f"❌ Failed to download audio: {e}")
            return None
        
        # Save to temp file
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
            f.write(response.content)
            temp_path = f.name
        
        try:
            result = self.solve_from_file(temp_path)
        finally:
            os.unlink(temp_path)
        
        return result
    
    def solve_from_file(self, audio_path: str) -> Optional[str]:
        """
        Solve audio CAPTCHA from local file
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Transcribed text or None
        """
        if not self.whisper_available:
            return self._fallback_solve(audio_path)
        
        try:
            import whisper
            
            print(f"🎧 Transcribing audio with Whisper ({self.whisper_model})...")
            
            model = whisper.load_model(self.whisper_model)
            result = model.transcribe(audio_path, language='en')
            
            text = result['text'].strip()
            
            # Clean up CAPTCHA text (usually numbers/letters)
            cleaned = self._clean_captcha_text(text)
            
            print(f"✅ Transcribed: {cleaned}")
            return cleaned
            
        except Exception as e:
            print(f"❌ Whisper error: {e}")
            return self._fallback_solve(audio_path)
    
    def _clean_captcha_text(self, text: str) -> str:
        """
        Clean transcribed text to extract CAPTCHA value
        
        Args:
            text: Raw transcribed text
            
        Returns:
            Cleaned CAPTCHA text
        """
        import re
        
        # Remove common filler words
        filler_words = ['the', 'is', 'are', 'please', 'type', 'enter', 'following']
        words = text.lower().split()
        cleaned_words = [w for w in words if w not in filler_words]
        
        # Join and remove spaces for typical CAPTCHA
        result = ''.join(cleaned_words)
        
        # Keep only alphanumeric
        result = re.sub(r'[^a-zA-Z0-9]', '', result)
        
        return result.upper()
    
    def _fallback_solve(self, audio_path: str) -> Optional[str]:
        """
        Fallback method using external tools
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Transcribed text or None
        """
        # Try using vosk if available
        try:
            return self._solve_with_vosk(audio_path)
        except:
            pass
        
        # Try using Google Speech (if configured)
        try:
            return self._solve_with_google(audio_path)
        except:
            pass
        
        print("⚠️ No speech recognition available")
        return None
    
    def _solve_with_vosk(self, audio_path: str) -> Optional[str]:
        """Solve using Vosk offline recognition"""
        from vosk import Model, KaldiRecognizer
        import wave
        import json
        
        # Convert to WAV if needed
        wav_path = self._convert_to_wav(audio_path)
        
        model = Model(model_name="vosk-model-small-en-us-0.15")
        
        with wave.open(wav_path, 'rb') as wf:
            rec = KaldiRecognizer(model, wf.getframerate())
            rec.SetWords(True)
            
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                rec.AcceptWaveform(data)
            
            result = json.loads(rec.FinalResult())
            return result.get('text', '')
    
    def _solve_with_google(self, audio_path: str) -> Optional[str]:
        """Solve using Google Speech Recognition"""
        import speech_recognition as sr
        
        r = sr.Recognizer()
        
        with sr.AudioFile(audio_path) as source:
            audio = r.record(source)
        
        try:
            text = r.recognize_google(audio)
            return self._clean_captcha_text(text)
        except sr.UnknownValueError:
            return None
    
    def _convert_to_wav(self, audio_path: str) -> str:
        """Convert audio to WAV format using ffmpeg"""
        wav_path = audio_path.rsplit('.', 1)[0] + '.wav'
        
        subprocess.run([
            'ffmpeg', '-i', audio_path,
            '-ar', '16000', '-ac', '1',
            wav_path, '-y'
        ], capture_output=True)
        
        return wav_path


if __name__ == '__main__':
    solver = AudioCaptchaSolver()
    
    # Test with a sample file
    test_file = "test_audio.mp3"
    if os.path.exists(test_file):
        result = solver.solve_from_file(test_file)
        print(f"Result: {result}")
    else:
        print("No test file found")
