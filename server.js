import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import selfsigned from 'selfsigned';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json({ limit: '50mb' }));

// Allow the launcher to set a directory to serve via SERVE_DIR
const serveDir = process.env.SERVE_DIR ? path.resolve(process.env.SERVE_DIR) : path.resolve(__dirname);
app.use(express.static(serveDir));

// A simple health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// POST endpoint to accept experiment data
app.post('/api/save-experiment-data', (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.participantId) {
      return res.status(400).json({ error: 'Missing participantId or data' });
    }

    const participantId = String(data.participantId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `experiment_${participantId}_${timestamp}.json`;
    const outDir = path.resolve(__dirname, 'data', 'to_analyze');

    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const filePath = path.join(outDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`Saved experiment data to ${filePath}`);
    return res.status(201).json({ ok: true, path: path.relative(__dirname, filePath) });
  } catch (err) {
    console.error('Error saving experiment data:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Attempt to load TLS cert/key from common locations; if missing, generate a short-lived self-signed cert.
const sslCandidates = [
  { cert: path.resolve(__dirname, 'cert.pem'), key: path.resolve(__dirname, 'key.pem') },
  { cert: path.resolve(__dirname, 'ssl', 'cert.pem'), key: path.resolve(__dirname, 'ssl', 'key.pem') },
  { cert: process.env.SSL_CERT, key: process.env.SSL_KEY }
].filter(c => c.cert && c.key);

let server;
let usedCertPath = null;
for (const cand of sslCandidates) {
  try {
    const cert = fs.readFileSync(cand.cert);
    const key = fs.readFileSync(cand.key);
    server = https.createServer({ key, cert }, app);
    usedCertPath = cand.cert;
    break;
  } catch (_) {
    // ignore and continue
  }
}

if (!server) {
  // generate an ephemeral self-signed certificate
  console.warn('No TLS certificates found in project; generating a self-signed certificate for localhost. Browsers may show a warning.');
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, { days: 365 });
  server = https.createServer({ key: pems.private, cert: pems.cert }, app);
}

server.listen(PORT, () => {
  const proto = 'https';
  console.log(`Express server serving static files from ${serveDir} and API at ${proto}://localhost:${PORT}` + (usedCertPath ? ` (cert: ${usedCertPath})` : ' (self-signed)'));
});
