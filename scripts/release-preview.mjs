import { chromium, devices, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const origin = process.env.PREVIEW_URL || "http://127.0.0.1:4174/FakeOS/";
const errors = [];
const badAssets = [];
await mkdir("docs/images", { recursive: true });
const setup = async (device) => {
  const context = await browser.newContext(device);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() >= 400)
      badAssets.push(r.url());
  });
  await page.goto(origin);
  await page.getByRole("button", { name: "Let's get started" }).click();
  const hide = page.getByLabel("Hide notification");
  if (await hide.isVisible()) await hide.click();
  return { context, page };
};
try {
  const { context, page } = await setup({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });
  await expect(page.locator(".desktop")).toBeVisible();
  await page.getByLabel("Start menu").click();
  await page
    .locator(".start-grid button")
    .filter({ hasText: /^Files$/ })
    .click();
  const files = page.getByLabel("Files window");
  await files
    .locator("aside")
    .getByRole("button", { name: "◇ Documents", exact: true })
    .click();
  await page.getByLabel("Start menu").click();
  await page
    .locator(".start-grid button")
    .filter({ hasText: /^Paint$/ })
    .click();
  const paint = page.getByLabel("Paint window");
  await expect(paint).toHaveCSS("transform", "none");
  const resize = await paint.locator(".resize-handle").boundingBox();
  await page.mouse.move(resize.x + 12, resize.y + 12);
  await page.mouse.down();
  await page.mouse.move(resize.x - 280, resize.y + 140);
  await page.mouse.up();
  const title = await paint.locator(".window-title").boundingBox();
  await page.mouse.move(title.x + 110, title.y + 20);
  await page.mouse.down();
  await page.mouse.move(1120, 150);
  await page.mouse.up();
  await paint.getByLabel("Paint tool").selectOption("ellipse");
  await paint.getByLabel("Filled shapes").check();
  await paint.getByLabel("Brush color").fill("#a78bfa");
  const canvas = await paint.locator("canvas").boundingBox();
  await page.mouse.move(
    canvas.x + canvas.width * 0.18,
    canvas.y + canvas.height * 0.12,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas.x + canvas.width * 0.78,
    canvas.y + canvas.height * 0.68,
  );
  await page.mouse.up();
  await paint.getByLabel("Paint tool").selectOption("rectangle");
  await paint.getByLabel("Brush color").fill("#dfb6cb");
  await page.mouse.move(
    canvas.x + canvas.width * 0.47,
    canvas.y + canvas.height * 0.44,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas.x + canvas.width * 0.88,
    canvas.y + canvas.height * 0.83,
  );
  await page.mouse.up();
  await page.screenshot({ path: "docs/images/desktop.png" });
  await context.close();
  const mobile = await setup({ ...devices["iPhone 13"], deviceScaleFactor: 1 });
  await expect(mobile.page.locator(".mobile")).toBeVisible();
  await mobile.page.screenshot({ path: "docs/images/mobile.png" });
  await mobile.context.close();
  const social = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await social.setContent(
    `<style>html,body{margin:0;width:1200px;height:630px;overflow:hidden}svg{display:block;width:1200px;height:630px}</style>${await readFile("public/social-preview.svg", "utf8")}`,
  );
  await social.screenshot({ path: "public/social-preview.png" });
  await social.close();
  if (errors.length || badAssets.length)
    throw Error(JSON.stringify({ errors, badAssets }));
  console.log(
    "PASS Pages-path production desktop/mobile preview; screenshots and social image saved.",
  );
} finally {
  await browser.close();
}
