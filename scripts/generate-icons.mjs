// Regenerate all PWA / favicon / app-icon assets from the source logo.
//
//   Source:  assets/logo/logo.svg   (white line-art, viewBox 0 0 1524 1284)
//   Run:     pnpm generate:icons
//
// Re-run whenever assets/logo/logo.svg changes. Everything written below is
// derived, so the generated files should never be hand-edited.
//
// The logo is a *white* outline, so on its own it vanishes on bright surfaces
// (home screens, browser tabs, the PWA install card). Every app icon is
// therefore composited onto an opaque dark "container" so the mark stays
// visible everywhere. The in-app `logo.png` is the one exception: the app
// renders it on a transparent canvas and recolors it with CSS
// (`invert dark:invert-0`), so it must stay transparent — no container.
import { Buffer } from "node:buffer";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "assets/logo/logo.svg");
const PUB = path.join(root, "public");
const ICONS = path.join(PUB, "icons");

// ---------------------------------------------------------------- config ----
// The container the white logo sits on. Change CONTAINER_BG to restyle every
// app icon in one place (theme_color #2563eb is an on-brand alternative).
const CONTAINER_BG = "#1f2937"; // dark slate — white line-art reads cleanly
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const ICON_PAD = 0.1; // standard icons: logo fills ~80% of the container
const FAVICON_PAD = 0.12; // tiny favicons: a touch more breathing room
const APPLE_PAD = 0.12; // apple-touch-icon
const MASKABLE_PAD = 0.2; // Android adaptive safe-zone (logo fills ~60%)

// Corner radius as a fraction of the icon size, for icons shown *as-is*.
// Maskable + apple-touch stay square (radius 0): the OS supplies the mask and
// pre-rounding them would double-round / clip the corners.
const CARD_RADIUS = 0.2;

// ------------------------------------------------------------- rendering ----
const svg = await import("node:fs/promises").then((fs) => fs.readFile(SRC, "utf8"));

/**
 * Composite the white logo, centered and padded, onto a SIZE×SIZE container.
 * Returns a lossless PNG buffer (re-encoded to webp by writeWebp where needed).
 *
 * @param {number} size
 * @param {{pad?:number, bg?:string|object, radius?:number}} [opts]
 */
async function compose(size, { pad = ICON_PAD, bg = CONTAINER_BG, radius = 0 } = {}) {
  const inner = Math.round(size * (1 - 2 * pad));
  // Supersample the SVG well above the target so downscaled edges stay crisp.
  const density = Math.max(96, Math.ceil(size * 0.6));
  const logo = await sharp(Buffer.from(svg), { density })
    .resize(inner, inner, { fit: "contain", background: TRANSPARENT })
    .png()
    .toBuffer();

  let base;
  if (radius > 0 && bg !== TRANSPARENT) {
    const r = Math.round(size * radius);
    const rect = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${bg}"/></svg>`;
    base = sharp(Buffer.from(rect));
  } else {
    base = sharp({ create: { width: size, height: size, channels: 4, background: bg } });
  }
  return base.composite([{ input: logo, gravity: "center" }]).png().toBuffer();
}

async function writePng(file, buf) {
  await writeFile(file, buf);
  const { width, height } = await sharp(buf).metadata();
  console.log(`  ${path.relative(root, file).replace(/\\/g, "/")}  ${width}x${height}`);
}

async function writeWebp(file, pngBuf) {
  const buf = await sharp(pngBuf).webp({ quality: 92, effort: 6 }).toBuffer();
  await writeFile(file, buf);
  const { width, height } = await sharp(buf).metadata();
  console.log(`  ${path.relative(root, file).replace(/\\/g, "/")}  ${width}x${height}`);
}

// ----------------------------------------------------------------- build ----
await mkdir(ICONS, { recursive: true });

console.log("in-app logo (transparent — recolored via CSS invert):");
await copyFile(SRC, path.join(PUB, "logo.svg"));
console.log("  public/logo.svg  (copied)");
await writePng(path.join(PUB, "logo.png"), await compose(686, { pad: 0.04, bg: TRANSPARENT }));

console.log("pwa manifest icons (public/icons, dark container):");
for (const s of [48, 72, 96, 128, 144, 152, 192, 256, 384, 512]) {
  await writeWebp(
    path.join(ICONS, `icon-${s}x${s}.webp`),
    await compose(s, { pad: ICON_PAD, radius: CARD_RADIUS }),
  );
}
// Dedicated maskable: full-bleed opaque square + generous safe-zone.
await writeWebp(
  path.join(ICONS, "maskable-512x512.webp"),
  await compose(512, { pad: MASKABLE_PAD, radius: 0 }),
);

console.log("favicons:");
const fav16 = await compose(16, { pad: FAVICON_PAD, radius: CARD_RADIUS });
const fav32 = await compose(32, { pad: FAVICON_PAD, radius: CARD_RADIUS });
const fav48 = await compose(48, { pad: FAVICON_PAD, radius: CARD_RADIUS });
await writePng(path.join(PUB, "favicon-16x16.png"), fav16);
await writePng(path.join(PUB, "favicon-32x32.png"), fav32);
await writeFile(path.join(PUB, "favicon.ico"), await pngToIco([fav16, fav32, fav48]));
console.log("  public/favicon.ico  (16/32/48)");

console.log("apple / android-chrome:");
// apple-touch stays square — iOS applies its own rounded mask.
await writePng(path.join(PUB, "apple-touch-icon.png"), await compose(180, { pad: APPLE_PAD, radius: 0 }));
await writePng(
  path.join(PUB, "android-chrome-192x192.png"),
  await compose(192, { pad: ICON_PAD, radius: CARD_RADIUS }),
);
await writePng(
  path.join(PUB, "android-chrome-512x512.png"),
  await compose(512, { pad: ICON_PAD, radius: CARD_RADIUS }),
);

console.log("safari pinned-tab mask icon (monochrome):");
// Safari recolors a single-color silhouette; force solid, fully-opaque fills.
const maskSvg = svg
  .replace(/fill:rgb\([\d,\s]+\)/g, "fill:#000000")
  .replace(/fill-opacity:[\d.]+/g, "fill-opacity:1");
await writeFile(path.join(PUB, "mask-icon.svg"), maskSvg);
console.log("  public/mask-icon.svg");

console.log("\nDone.");
