import fs from 'fs';
import path from 'path';

const TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'unRekable';
const REPO = 'rtk-agnt-integration';

async function getAllFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = base ? path.join(base, entry.name) : entry.name;
    if (entry.isDirectory() && !['node_modules', 'coverage', '.test-stats', 'scripts'].includes(entry.name)) {
      files.push(...await getAllFiles(path.join(dir, entry.name), relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

async function getFileSha(filePath) {
  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`, {
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    });
    if (res.status === 200) {
      const data = await res.json();
      return data.sha;
    }
  } catch {}
  return null;
}

async function uploadFile(filePath) {
  const localPath = path.join('/app/rtk-agnt-integration', filePath);
  const content = fs.readFileSync(localPath, 'utf8');
  const base64 = Buffer.from(content).toString('base64');
  const sha = await getFileSha(filePath);
  
  const body = {
    message: `feat(v3): ${filePath}`,
    content: base64
  };
  if (sha) body.sha = sha;
  
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(body)
  });
  
  if (res.status === 200 || res.status === 201) {
    console.log(`✅ ${filePath}`);
    return true;
  } else {
    const err = await res.json();
    console.error(`❌ ${filePath}: ${err.message}`);
    return false;
  }
}

async function deleteOldFiles() {
  // Delete files that shouldn't exist in v3
  const toDelete = ['.eslintrc.js', 'jest.config.js', '__tests__/rtk-runner.test.js', '__tests__/run-tests.js'];
  for (const file of toDelete) {
    const sha = await getFileSha(file);
    if (sha) {
      const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${file}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + TOKEN,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({ message: `chore(v3): remove ${file}`, sha })
      });
      if (res.status === 200) console.log(`🗑️  Deleted ${file}`);
    }
  }
}

const files = (await getAllFiles('/app/rtk-agnt-integration'))
  .filter(f => !f.startsWith('node_modules/') && !f.startsWith('coverage/') && !f.startsWith('.test-stats/'));

console.log(`Found ${files.length} files to upload\n`);

await deleteOldFiles();

let success = 0, failed = 0;
for (const file of files) {
  if (await uploadFile(file)) success++;
  else failed++;
  await new Promise(r => setTimeout(r, 350));
}

console.log(`\n📊 Results: ${success} uploaded, ${failed} failed`);
console.log('🔗 https://github.com/unRekable/rtk-agnt-integration');
