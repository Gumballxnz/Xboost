import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "XBoost - Aumente seu engajamento no X",
  description: "Comentários automáticos inteligentes para suas postagens no X (Twitter)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Proteções anti-copy, anti-zoom, anti-download */}
        <script dangerouslySetInnerHTML={{
          __html: `
          // Desabilitar menu de contexto (botão direito)
          document.addEventListener('contextmenu', e => e.preventDefault());
          
          // Desabilitar seleção de texto
          document.addEventListener('selectstart', e => e.preventDefault());
          
          // Desabilitar copiar
          document.addEventListener('copy', e => e.preventDefault());
          
          // Desabilitar atalhos de teclado perigosos
          document.addEventListener('keydown', e => {
            // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (e.key === 'F12' || 
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'u') ||
                (e.ctrlKey && e.key === 's')) {
              e.preventDefault();
            }
          });
          
          // Desabilitar zoom
          document.addEventListener('wheel', e => {
            if (e.ctrlKey) e.preventDefault();
          }, { passive: false });
          
          // Desabilitar drag de imagens
          document.addEventListener('dragstart', e => e.preventDefault());
        `}} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} antialiased select-none`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
