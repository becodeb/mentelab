// Captura páginas de MenteLab para revisión visual.
import { chromium } from "playwright";

const outDir = process.argv[2] ?? ".";
const pages = [
  { path: "/play", name: "hub", wait: 4500 },
  { path: "/", name: "landing", wait: 2500 },
  { path: "/rankings", name: "rankings", wait: 3500 },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

for (const p of pages) {
  await page.goto(`http://localhost:3000${p.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(p.wait); // guest init + animaciones de entrada
  await page.screenshot({ path: `${outDir}/${p.name}.png`, fullPage: false });
  console.log(`✓ ${p.name}.png`);
}
await browser.close();
