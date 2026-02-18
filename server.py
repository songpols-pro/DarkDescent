import http.server
import socketserver

PORT = 5001

Handler = http.server.SimpleHTTPRequestHandler

# Allow reusing the address to prevent "Address already in use" errors on restart
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()
