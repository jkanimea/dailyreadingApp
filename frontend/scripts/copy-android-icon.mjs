import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICON_SRC = join(ROOT, 'resources', 'android-icon');
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

const WHITE = [0xFF, 0xFF, 0xFF, 0xFF];
const GOLD  = [0xD4, 0xAF, 0x37, 0xFF];
const SPINE = [0xC0, 0xC0, 0xC0, 0xFF];

const DENSITIES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crc]);
}

function makePng(raw, width, height) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const rowSize = width * 4 + 1;
  const filtered = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    filtered[y * rowSize] = 0;
    raw.copy(filtered, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = deflateSync(filtered);
  const chunks = [
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ];
  return Buffer.concat([sig, ...chunks]);
}

function drawForeground(size) {
  const raw = Buffer.alloc(size * size * 4);
  const S = size / 108;
  const bookL = Math.round(20 * S);
  const bookR = Math.round(88 * S);
  const bookT = Math.round(32 * S);
  const bookB = Math.round(88 * S);
  const mid = Math.round(54 * S);
  const cvL = Math.round(50 * S);
  const cvR = Math.round(58 * S);
  const cvT = Math.round(12 * S);
  const cvB = Math.round(36 * S);
  const chL = Math.round(42 * S);
  const chR = Math.round(66 * S);
  const chT = Math.round(20 * S);
  const chB = Math.round(28 * S);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const off = (y * size + x) * 4;
      if (x >= cvL && x < cvR && y >= cvT && y < cvB) {
        raw[off] = GOLD[0]; raw[off + 1] = GOLD[1]; raw[off + 2] = GOLD[2]; raw[off + 3] = GOLD[3];
        continue;
      }
      if (x >= chL && x < chR && y >= chT && y < chB) {
        raw[off] = GOLD[0]; raw[off + 1] = GOLD[1]; raw[off + 2] = GOLD[2]; raw[off + 3] = GOLD[3];
        continue;
      }
      if (x >= bookL && x < bookR && y >= bookT && y < bookB) {
        const leftPage = x < mid - 1;
        const rightPage = x >= mid + 1;
        if (leftPage || rightPage) {
          raw[off] = WHITE[0]; raw[off + 1] = WHITE[1]; raw[off + 2] = WHITE[2]; raw[off + 3] = WHITE[3];
        } else {
          raw[off] = SPINE[0]; raw[off + 1] = SPINE[1]; raw[off + 2] = SPINE[2]; raw[off + 3] = SPINE[3];
        }
        continue;
      }
      raw[off] = 0; raw[off + 1] = 0; raw[off + 2] = 0; raw[off + 3] = 0;
    }
  }
  return raw;
}

function drawLegacyIcon(size) {
  const BG = [0x38, 0x80, 0xFF, 0xFF];
  const raw = drawForeground(size);
  const cx = size / 2, cy = size / 2, r = size * 0.44;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const off = (y * size + x) * 4;
      const dx = x - cx + 0.5, dy = y - cy + 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let fa = 1;
      if (dist > r + 0.5) fa = 0;
      else if (dist > r - 0.5) fa = r + 0.5 - dist;
      if (fa === 0) {
        raw[off] = 0; raw[off + 1] = 0; raw[off + 2] = 0; raw[off + 3] = 0;
      } else if (fa < 1) {
        raw[off] = Math.round(BG[0] * fa + raw[off] * (1 - fa));
        raw[off + 1] = Math.round(BG[1] * fa + raw[off + 1] * (1 - fa));
        raw[off + 2] = Math.round(BG[2] * fa + raw[off + 2] * (1 - fa));
        raw[off + 3] = Math.round(255 * fa + raw[off + 3] * (1 - fa));
      }
    }
  }
  return raw;
}

function copyDir(src, dst) {
  if (!existsSync(src)) { console.log(`  SKIP (source missing): ${src}`); return; }
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
  for (const file of readdirSync(src)) {
    copyFileSync(join(src, file), join(dst, file));
    console.log(`  COPY ${join(src, file)} → ${join(dst, file)}`);
  }
}

if (!existsSync(join(ROOT, 'android'))) {
  console.log('Android project not found. Run: npx cap add android');
  process.exit(1);
}

console.log('\nOverwriting default Capacitor icon vectors (drawable/ + drawable-v24/)...');
copyDir(join(ICON_SRC, 'drawable'), join(ANDROID_RES, 'drawable'));
const drawableV24 = join(ANDROID_RES, 'drawable-v24');
if (!existsSync(drawableV24)) mkdirSync(drawableV24, { recursive: true });
const fgSrc = join(ICON_SRC, 'drawable', 'ic_launcher_foreground.xml');
const fgDst = join(drawableV24, 'ic_launcher_foreground.xml');
if (existsSync(fgSrc)) {
  copyFileSync(fgSrc, fgDst);
  console.log(`  COPY ${fgSrc} → ${fgDst}`);
}

console.log('Overwriting adaptive icon XML...');
copyDir(join(ICON_SRC, 'mipmap-anydpi-v26'), join(ANDROID_RES, 'mipmap-anydpi-v26'));

console.log('Updating background color to blue...');
const valuesDir = join(ANDROID_RES, 'values');
if (!existsSync(valuesDir)) mkdirSync(valuesDir, { recursive: true });
writeFileSync(
  join(valuesDir, 'ic_launcher_background.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#3880FF</color>\n</resources>\n'
);
console.log('  values/ic_launcher_background.xml → #3880FF');

console.log('Generating book+cross PNG icons...');
for (const d of DENSITIES) {
  const dstDir = join(ANDROID_RES, d.dir);
  if (!existsSync(dstDir)) mkdirSync(dstDir, { recursive: true });
  const fg = drawForeground(d.size);
  writeFileSync(join(dstDir, 'ic_launcher_foreground.png'), makePng(fg, d.size, d.size));
  const legacy = drawLegacyIcon(d.size);
  writeFileSync(join(dstDir, 'ic_launcher.png'), makePng(legacy, d.size, d.size));
  writeFileSync(join(dstDir, 'ic_launcher_round.png'), makePng(legacy, d.size, d.size));
  console.log(`  ${d.dir} — 3 PNGs (${d.size}x${d.size})`);
}

console.log('\nDone. APK will now use the custom book+cross icon.\n');
