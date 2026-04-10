const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5005;
const DATA_FILE = path.join(__dirname, '../data.json');

const server = http.createServer((req, res) => {
    // Enable CORS for localhost and local files
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/status' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'online', file: DATA_FILE }));
        return;
    }

    if (req.url === '/sync' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                // Validate JSON before saving
                JSON.parse(body); 
                fs.writeFileSync(DATA_FILE, body, 'utf8');
                console.log(`[${new Date().toISOString()}] Sync successful: data.json updated.`);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                console.error('Sync failed:', error.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
        });
        return;
    }

    // Static file serving
    if (req.method === 'GET') {
        let filePath = req.url === '/' ? '/index.html' : req.url;
        // Basic path sanitization
        filePath = filePath.split('?')[0];
        const absolutePath = path.normalize(path.join(__dirname, '..', filePath));
        
        // Prevent directory traversal
        if (!absolutePath.startsWith(path.normalize(path.join(__dirname, '..')))) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        if (fs.existsSync(absolutePath) && fs.lstatSync(absolutePath).isFile()) {
            const ext = path.extname(absolutePath);
            const contentTypes = {
                '.html': 'text/html',
                '.js': 'text/javascript',
                '.css': 'text/css',
                '.json': 'application/json',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.svg': 'image/svg+xml'
            };
            res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
            res.end(fs.readFileSync(absolutePath));
            return;
        }
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`Vibe Sync Bridge running at http://localhost:${PORT}`);
    console.log(`- Dashboard: http://localhost:${PORT}/dev/admin.html`);
    console.log(`- Public Site: http://localhost:${PORT}/index.html`);
    console.log(`Watching: ${DATA_FILE}`);
});
