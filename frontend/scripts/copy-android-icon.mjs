import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ICON_SRC = join(ROOT, 'resources', 'android-icon');
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

// Blue matching @color/ionblue = hsl(227,100%,61%) → #3880FF
const BG_COLOR = [0x38, 0x80, 0xFF, 0xFF]; // RGBA

// Density configs: { dir name, size in px }
const DENSITIES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

function pngSolidCircle(size, color) {
  // 4 bytes per pixel (RGBA)
  const cx = size / 2, cy = size / 2, r = size * 0.44; // radius ~90% of half-size with padding
  const r2 = r * r;
  const raw = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx + 0.5, dy = y - cy + 0.5;
      // Antialiased circle: 1-pixel smooth edge
      const d2 = dx * dx + dy * dy;
      const rr = Math.sqrt(d2);
      let alpha = 1;
      if (rr > r + 0.5) {
        alpha = 0;
      } else if (rr > r - 0.5) {
        alpha = r + 0.5 - rr;
      }
      const off = (y * size + x) * 4;
      raw[off]     = color[0];
      raw[off + 1] = color[1];
      raw[off + 2] = color[2];
      raw[off + 3] = Math.round(color[3] * alpha);
    }
  }
  return raw;
}

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
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw data: filter byte (0 = None) per row + pixel data
  const rowSize = width * 4 + 1;
  const filtered = Buffer.alloc(rowSize * height);
  for (let y = 0; y < height; y++) {
    filtered[y * rowSize] = 0; // filter None
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

function copyDir(src, dst) {
  if (!existsSync(src)) return;
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
  for (const file of readdirSync(src)) {
    copyFileSync(join(src, file), join(dst, file));
  }
}

if (!existsSync(join(ROOT, 'android'))) {
  console.log('Android project not found. Run: npx cap add android');
  process.exit(1);
}

console.log('Copying custom adaptive icon (API 26+)...');
copyDir(join(ICON_SRC, 'drawable'), join(ANDROID_RES, 'drawable'));
copyDir(join(ICON_SRC, 'mipmap-anydpi-v26'), join(ANDROID_RES, 'mipmap-anydpi-v26'));

console.log('Generating fallback PNG icons (pre-API 26)...');
for (const d of DENSITIES) {
  const dstDir = join(ANDROID_RES, d.dir);
  if (!existsSync(dstDir)) mkdirSync(dstDir, { recursive: true });
  const raw = pngSolidCircle(d.size, BG_COLOR);
  const png = makePng(raw, d.size, d.size);
  writeFileSync(join(dstDir, 'ic_launcher.png'), png);
  writeFileSync(join(dstDir, 'ic_launcher_round.png'), png);
}

console.log('Syncing Capacitor...');
execSync('npx cap sync android', { cwd: ROOT, stdio: 'inherit' });

console.log('Done. Rebuild the APK to see the new icon.');
