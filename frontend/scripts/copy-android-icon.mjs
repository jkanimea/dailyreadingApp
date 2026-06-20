import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function findLogo() {
  const tried = [];
  // Walk up from script dir, checking each parent for assets/Logo.png
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    const p = join(dir, 'assets', 'Logo.png');
    tried.push(p);
    if (existsSync(p)) return { path: p, tried };
    const parent = join(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // Also try CWD-based paths as fallback
  const cwdPaths = [
    join(process.cwd(), '..', 'assets', 'Logo.png'),
    join(process.cwd(), 'assets', 'Logo.png'),
  ];
  for (const p of cwdPaths) {
    tried.push(p);
    if (existsSync(p)) return { path: p, tried };
  }
  return { path: null, tried };
}

const { path: logoPath, tried: triedPaths } = findLogo();
const ANDROID_RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

const DENSITIES = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

async function generateIcons() {
  if (!existsSync(join(ROOT, 'android'))) {
    console.log('Android project not found at ' + join(ROOT, 'android'));
    console.log('Run: npx cap add android');
    process.exit(1);
  }

  if (!logoPath) {
    console.log('Logo source not found. Tried:\n  ' + triedPaths.join('\n  '));
    console.log('CWD: ' + process.cwd());
    console.log('ROOT: ' + ROOT);
    process.exit(1);
  }

  console.log('Generating Android icons from ' + logoPath + '...\n');

  for (const d of DENSITIES) {
    const dstDir = join(ANDROID_RES, d.dir);
    if (!existsSync(dstDir)) mkdirSync(dstDir, { recursive: true });

    const resized = await sharp(logoPath)
      .resize(d.size, d.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    writeFileSync(join(dstDir, 'ic_launcher_foreground.png'), resized);
    writeFileSync(join(dstDir, 'ic_launcher.png'), resized);
    writeFileSync(join(dstDir, 'ic_launcher_round.png'), resized);
    console.log(`  ${d.dir} — 3 PNGs (${d.size}x${d.size})`);
  }

  const storeDir = join(ROOT, 'android', 'play-store-icon');
  if (!existsSync(storeDir)) mkdirSync(storeDir, { recursive: true });
  const storeIcon = await sharp(logoPath)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  writeFileSync(join(storeDir, 'play-store-icon.png'), storeIcon);
  console.log(`  play-store-icon.png — 512x512 (for Play Store listing)`);

  const adaptiveDir = join(ANDROID_RES, 'mipmap-anydpi-v26');
  if (!existsSync(adaptiveDir)) mkdirSync(adaptiveDir, { recursive: true });
  writeFileSync(join(adaptiveDir, 'ic_launcher.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`);
  writeFileSync(join(adaptiveDir, 'ic_launcher_round.xml'), `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`);
  console.log('  mipmap-anydpi-v26 — adaptive icon XMLs');

  const valuesDir = join(ANDROID_RES, 'values');
  if (!existsSync(valuesDir)) mkdirSync(valuesDir, { recursive: true });
  writeFileSync(
    join(valuesDir, 'ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FFFFFF</color>\n</resources>\n'
  );
  console.log('  values/ic_launcher_background.xml → #FFFFFF (white)');

  console.log('\nDone. Android icons and Play Store icon generated.\n');
}

generateIcons().catch(e => { console.error(e); process.exit(1); });
