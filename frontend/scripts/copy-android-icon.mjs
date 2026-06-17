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
const CRISP = [0xFF, 0xF8, 0xDC, 0xFF]; // cream pages
const BROWN = [0x5D, 0x40, 0x37, 0xFF]; // leather cover
const RED   = [0xC6, 0x28, 0x28, 0xFF]; // bookmark
const SHADOW = [0x2B, 0x00, 0x00, 0x00];

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
  const raw = Buffer.alloc(size * size * 4, 0);
  const S = size / 108;
  const covL = Math.round(24 * S);
  const covR = Math.round(84 * S);
  const covT = Math.round(22 * S);
  const covB = Math.round(92 * S);
  const pgL  = Math.round(26 * S);
  const pgR  = Math.round(82 * S);
  const pgT  = Math.round(24 * S);
  const pgB  = Math.round(88 * S);
  const spineX = Math.round(34 * S);
  const bandT = Math.round(50 * S);
  const bandB = Math.round(56 * S);
  const bmL  = Math.round(48 * S);
  const bmR  = Math.round(60 * S);
  const bmT  = Math.round(88 * S);
  const bmB  = Math.round(98 * S);
  const bmV  = Math.round(54 * S);
  const bmVy = Math.round(94 * S);
  function setPx(x, y, color) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const off = (y * size + x) * 4;
    raw[off] = color[0]; raw[off + 1] = color[1]; raw[off + 2] = color[2]; raw[off + 3] = color[3];
  }
  // Shadow
  for (let y = covT; y < covB; y++) {
    for (let x = covL; x < covR; x++) {
      setPx(x + 2, y + 2, SHADOW);
    }
  }
  // Cover / pages / spine
  for (let y = covT; y < covB; y++) {
    for (let x = covL; x < covR; x++) {
      if (x >= pgL && x < pgR && y >= pgT && y < pgB) {
        setPx(x, y, (x >= spineX - 1 && x <= spineX) ? SPINE : CRISP);
      } else {
        setPx(x, y, BROWN);
      }
    }
  }
  // Band
  for (let y = bandT; y < bandB; y++) {
    for (let x = covL; x < covR; x++) {
      setPx(x, y, GOLD);
    }
  }
  // Bookmark (below cover, with V-notch)
  for (let y = bmT; y < bmB; y++) {
    for (let x = bmL; x < bmR; x++) {
      const inV = y >= bmVy && (
        x < bmV
          ? (x - bmL) < (bmV - bmL) * (bmB - y) / (bmB - bmVy)
          : (bmR - x - 1) < (bmR - bmV) * (bmB - y) / (bmB - bmVy)
      );
      if (!inV) setPx(x, y, RED);
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

console.log('\nDone. APK will now use the custom journal/notebook icon.\n');
