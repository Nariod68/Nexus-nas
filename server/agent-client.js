import http from 'node:http';
export function agentClient(socketPath = '/run/nexus-agent/socket') {
  return (action, data = {}) => new Promise((resolve, reject) => {
    const req = http.request({ socketPath, path: '/', method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 15000 }, res => {
      let body = ''; res.on('data', chunk => { body += chunk; if (body.length > 2e6) req.destroy(new Error('Réponse trop volumineuse')); });
      res.on('end', () => { try { const parsed = JSON.parse(body); if (res.statusCode !== 200) reject(new Error(parsed.error)); else resolve(parsed); } catch (error) { reject(error); } });
    });
    req.on('error', error => reject(new Error(error.code === 'ENOENT' || error.code === 'ECONNREFUSED' ? 'Le service Linux Nexus Agent est indisponible' : error.message)));
    req.on('timeout', () => req.destroy(new Error('Le service Linux ne répond pas')));
    req.end(JSON.stringify({ action, data }));
  });
}
