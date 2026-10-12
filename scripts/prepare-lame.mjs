// Generates src/lib/lame.all.bundle.js from the lamejs npm package.
// The lamejs package's ES modules reference bare globals (MPEGMode, Lame)
// that break under Vite bundling; the prebuilt lame.all.js single-file
// bundle works when exported as a module. Run via `npm run prebuild`.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '..', 'node_modules', 'lamejs', 'lame.all.js');
const dest = path.join(__dirname, '..', 'src', 'lib', 'lame.all.bundle.js');

if (!fs.existsSync(src)) {
  console.error('lamejs not installed; run npm install first');
  process.exit(1);
}
const header = '/* Vendored from lamejs/lame.all.js (MIT). The lamejs() function object doubles as the namespace. */\n';
const body = fs.readFileSync(src, 'utf8');
fs.writeFileSync(dest, header + body + '\nexport default lamejs;\n');
console.log('Wrote', dest);
