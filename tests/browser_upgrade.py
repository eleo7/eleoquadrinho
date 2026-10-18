"""Regression: upgrade a browser carrying the original service worker and immutable scripts."""
import json
import subprocess
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OLD = '69bd70f2b8719e95fa9e91a885e7e4262d4b9ee8'
legacy = True

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        file = urlparse(self.path).path.lstrip('/') or 'index.html'
        if file.startswith('api/'):
            body = json.dumps({'error': 'Entre na sua conta.'}).encode()
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
        else:
            try:
                if legacy:
                    body = subprocess.check_output(['git', 'show', f'{OLD}:{file}'], cwd=ROOT, stderr=subprocess.DEVNULL)
                else:
                    body = (ROOT / 'dist' / file).read_bytes()
            except (subprocess.CalledProcessError, OSError):
                self.send_error(404); return
            self.send_response(200)
            types = {'.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml'}
            self.send_header('Content-Type', types.get(Path(file).suffix, 'image/jpeg'))
            immutable = legacy and file != 'sw.js' and Path(file).suffix in ['.js', '.css']
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable' if immutable else 'no-cache')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers(); self.wfile.write(body)

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
        page = browser.new_page()
        page.route('https://**/*', lambda route: route.abort())
        page.goto(f'http://127.0.0.1:{server.server_port}', wait_until='domcontentloaded')
        page.wait_for_selector('#authNomeInput')
        page.evaluate('async()=>await navigator.serviceWorker.ready')
        legacy = False
        page.evaluate('async()=>await (await navigator.serviceWorker.getRegistration()).update()')
        page.wait_for_function('async()=> (await caches.keys()).includes("eq-cache-v15-rewards")')
        page.wait_for_timeout(500)
        page.reload(wait_until='domcontentloaded')
        page.wait_for_selector('#formConta #authLoginInput')
        assert page.locator('#authSenhaInput').get_attribute('required') is not None
        assert page.locator('#formAuthCadastro').count() == 0
        keys = page.evaluate('async()=>await caches.keys()')
        assert 'eq-cache-v3' not in keys
        print('Upgrade from original cached app to cloud login: PASS')
        browser.close()
finally:
    server.shutdown()
