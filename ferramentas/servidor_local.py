#!/usr/bin/env python3
"""
Servidor HTTP Local para Execucao e Teste do HabitOS PWA
Executa com suporte a CORS, Service Workers e cabecalhos de isolamento seguro
"""
import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class HabitOSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Cabecalhos de seguranca e suporte a PWA offline
        self.send_header('Cache-Control', 'no-cache, must-revalidate')
        self.send_header('Service-Worker-Allowed', '/')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), HabitOSRequestHandler) as httpd:
        print("=" * 60)
        print(f"[*] HabitOS Web rodando em: http://localhost:{PORT}")
        print(f"[*] Diretorio raiz: {DIRECTORY}")
        print("[*] No celular (mesmo Wi-Fi ou IP local):")
        print(f"    Acesse http://<SEU_IP_LOCAL>:{PORT}")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor encerrado.")
            sys.exit(0)

if __name__ == '__main__':
    run_server()
