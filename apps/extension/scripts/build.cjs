const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { execSync } = require('child_process');

const extensionDir = path.join(__dirname, '..');
const distDir = path.join(extensionDir, 'dist');

try {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('Removed dist directory');
} catch (e) {
  // ignore
}

console.log('Building extension...');
execSync('vite build', { stdio: 'inherit', cwd: extensionDir });

fs.copyFileSync(
  path.join(extensionDir, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);
console.log('Copied manifest.json');

const output = fs.createWriteStream(path.join(extensionDir, 'extension.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log(`Created extension.zip (${archive.pointer()} bytes)`);
});

archive.pipe(output);
archive.directory(distDir, false);
archive.finalize();