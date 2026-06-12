import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'administracionlagunanorte-png/PLANIFICACION-OPERATIVA';
const API = `https://api.github.com/repos/${REPO}`;
const headers = {
  'Authorization': `token ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json'
};

async function github(endpoint, method = 'GET', body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok && res.status !== 409) {
    console.error(`API Error ${res.status}:`, data.message?.substring(0, 100));
  }
  return data;
}

async function createBlob(content, encoding = 'utf-8') {
  const res = await fetch(`${API}/git/blobs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content, encoding })
  });
  const data = await res.json();
  return data.sha;
}

async function pushToGitHub() {
  console.log('=== Subiendo código a GitHub vía API ===\n');

  // Get list of files from git
  const files = execSync('git ls-files', { encoding: 'utf8' }).trim().split('\n');
  console.log(`Archivos a subir: ${files.length}`);

  // Filter out files we don't want
  const excludePatterns = ['skills/', '.zscripts/', 'agent-ctx/', 'examples/', 'mini-services/', 'download/', 'bun.lock'];
  const filteredFiles = files.filter(f => !excludePatterns.some(p => f.startsWith(p)));
  console.log(`Archivos filtrados: ${filteredFiles.length}`);

  // Create blobs in batches
  const treeItems = [];
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < filteredFiles.length; i += BATCH_SIZE) {
    const batch = filteredFiles.slice(i, i + BATCH_SIZE);
    console.log(`Creando blobs ${i + 1}-${Math.min(i + BATCH_SIZE, filteredFiles.length)} de ${filteredFiles.length}...`);
    
    const blobPromises = batch.map(async (filePath) => {
      try {
        const fullPath = path.join(process.cwd(), filePath);
        const stat = fs.statSync(fullPath);
        
        if (stat.size > 100000) {
          console.log(`  SKIP (too large): ${filePath} (${stat.size} bytes)`);
          return null;
        }
        
        const isBinary = /\.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(filePath);
        
        if (isBinary) {
          const content = fs.readFileSync(fullPath).toString('base64');
          const sha = await createBlob(content, 'base64');
          return { path: filePath, mode: '100644', type: 'blob', sha };
        } else {
          const content = fs.readFileSync(fullPath, 'utf8');
          const sha = await createBlob(content, 'utf-8');
          return { path: filePath, mode: '100644', type: 'blob', sha };
        }
      } catch (e) {
        console.error(`  Error with ${filePath}: ${e.message}`);
        return null;
      }
    });
    
    const results = await Promise.all(blobPromises);
    treeItems.push(...results.filter(Boolean));
    
    // Small delay to avoid rate limits
    if (i + BATCH_SIZE < filteredFiles.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`\nCreados ${treeItems.length} blobs`);

  // Create tree
  console.log('Creando tree...');
  const tree = await github('/git/trees', 'POST', { tree: treeItems });
  console.log(`Tree SHA: ${tree.sha}`);

  // Create commit
  console.log('Creando commit inicial...');
  const commit = await github('/git/commits', 'POST', {
    message: 'feat: Planificación Operativa - Sistema completo con Next.js + PostgreSQL',
    tree: tree.sha
  });
  console.log(`Commit SHA: ${commit.sha}`);

  // Create main branch reference
  console.log('Creando rama main...');
  const ref = await github('/git/refs', 'POST', {
    ref: 'refs/heads/main',
    sha: commit.sha
  });
  
  if (ref.message && ref.message.includes('already exists')) {
    console.log('La rama ya existe, actualizando referencia...');
    await github('/git/refs/heads/main', 'PATCH', { sha: commit.sha, force: true });
  }

  console.log('\n=== Código subido exitosamente a GitHub ===');
  console.log(`Repositorio: https://github.com/${REPO}`);
}

pushToGitHub().catch(e => {
  console.error('Error fatal:', e);
  process.exit(1);
});
