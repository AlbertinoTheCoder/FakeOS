import { chromium, expect, devices } from "@playwright/test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const launch = async (app) => {
  await page.getByLabel("Start menu").click();
  await page
    .locator(".start-grid button")
    .filter({ hasText: new RegExp("^" + app + "$") })
    .click();
  const win = page.getByLabel(app + " window");
  await expect(win).toHaveCSS("transform", "none");
  return win;
};
const pixel = async (canvas, x, y) =>
  canvas.evaluate(
    (c, { x, y }) => [...c.getContext("2d").getImageData(x, y, 1, 1).data],
    { x, y },
  );
try {
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("button", { name: "Let's get started" }).click();
  let paint = await launch("Paint");
  let canvas = paint.locator("canvas");
  await canvas.waitFor();
  await paint.getByLabel("Paint tool").selectOption("rectangle");
  await paint.getByLabel("Filled shapes").check();
  await paint.getByLabel("Brush color").fill("#ff0000");
  let bounds = await canvas.boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width * 0.1,
    bounds.y + bounds.height * 0.1,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.3,
    bounds.y + bounds.height * 0.3,
  );
  await page.mouse.up();
  assert.deepEqual(await pixel(canvas, 200, 130), [255, 0, 0, 255]);
  await paint.getByLabel("Paint tool").selectOption("fill");
  await paint.getByLabel("Brush color").fill("#00ff00");
  await page.mouse.click(
    bounds.x + bounds.width * 0.4,
    bounds.y + bounds.height * 0.15,
  );
  assert.deepEqual(await pixel(canvas, 400, 100), [0, 255, 0, 255]);
  assert.deepEqual(await pixel(canvas, 200, 130), [255, 0, 0, 255]);
  await paint.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await pixel(canvas, 400, 100), [255, 255, 255, 255]);
  await paint.getByRole("button", { name: "Redo", exact: true }).click();
  assert.deepEqual(await pixel(canvas, 400, 100), [0, 255, 0, 255]);
  await paint.getByLabel("Canvas zoom").selectOption("2");
  await paint.getByLabel("Paint tool").selectOption("brush");
  await paint.getByLabel("Brush color").fill("#0000ff");
  bounds = await canvas.boundingBox();
  await page.mouse.click(
    bounds.x + bounds.width * 0.2,
    bounds.y + bounds.height * 0.2,
  );
  assert.deepEqual(await pixel(canvas, 200, 130), [0, 0, 255, 255]);
  await paint.getByLabel("Canvas zoom").selectOption("1");
  await paint.getByLabel("Drawing filename").fill("Feature drawing.png");
  await paint.getByRole("button", { name: "Save to FakeOS Pictures" }).click();
  await expect(paint.locator(".paint-save-hint")).toContainText("Saved");
  const downloadPromise = page.waitForEvent("download");
  await paint.getByRole("button", { name: "Save PNG", exact: true }).click();
  const png = await downloadPromise;
  const pngBytes = await readFile(await png.path());
  await paint
    .getByLabel("Open image from computer")
    .setInputFiles({
      name: "Reopened.png",
      mimeType: "image/png",
      buffer: pngBytes,
    });
  await expect(paint.getByLabel("Drawing filename")).toHaveValue(
    "Reopened.png",
  );
  assert.deepEqual(await pixel(canvas, 200, 130), [0, 0, 255, 255]);
  await paint.getByRole("button", { name: "Open saved drawing" }).click();
  await paint
    .locator(".paint-picker")
    .getByRole("button", { name: "Feature drawing.png" })
    .click();
  await expect(paint.getByLabel("Drawing filename")).toHaveValue(
    "Feature drawing.png",
  );
  await paint.getByLabel("Close", { exact: true }).click();
  await expect(page.getByLabel("Paint window")).toHaveCount(0);
  console.log(
    "PASS Paint shapes, bounded fill, undo/redo, zoom alignment, PNG download, and reopening from disk and Pictures",
  );
  await page.getByRole("button", { name: "+ Shortcut", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create desktop shortcut" });
  await dialog.getByLabel("Shortcut application").selectOption("Clock");
  await dialog.getByLabel("Shortcut name").fill("My Clock");
  await dialog
    .getByRole("button", { name: "Create shortcut", exact: true })
    .click();
  const shortcut = page
    .locator(".desktop-icons button")
    .filter({ hasText: "My Clock" });
  await shortcut.dblclick();
  let clock = page.getByLabel("Clock window");
  await clock.getByRole("button", { name: "Timer", exact: true }).click();
  await clock.getByLabel("Timer minutes").fill(".01");
  await clock.getByRole("button", { name: "Start timer", exact: true }).click();
  await clock.getByLabel("Close", { exact: true }).click();
  await expect(page.getByText("Timer finished", { exact: true })).toBeVisible();
  clock = await launch("Clock");
  await clock.getByRole("button", { name: "Stopwatch", exact: true }).click();
  await clock.getByRole("button", { name: "Start stopwatch" }).click();
  await clock.getByRole("button", { name: "Lap", exact: true }).click();
  await clock.getByRole("button", { name: "Pause stopwatch" }).click();
  await expect(clock.getByText(/Lap 1:/)).toBeVisible();
  await clock.getByRole("button", { name: "Alarms", exact: true }).click();
  await clock.getByLabel("Alarm time").fill("23:59");
  await clock.getByLabel("Alarm label").fill("Bedtime");
  await clock.getByRole("button", { name: "Add alarm", exact: true }).click();
  await expect(clock.getByLabel("Enable Bedtime")).toBeChecked();
  await clock.getByLabel("Close", { exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Unlock your space" }).click();
  await expect(
    page.locator(".desktop-icons button").filter({ hasText: "My Clock" }),
  ).toBeVisible();
  clock = await launch("Clock");
  await clock.getByRole("button", { name: "Alarms", exact: true }).click();
  await expect(clock.getByLabel("Enable Bedtime")).toBeChecked();
  await clock.getByLabel("Close", { exact: true }).click();
  const editableShortcut = page
    .locator(".desktop-icons button")
    .filter({ hasText: "My Clock" });
  await editableShortcut.click({ button: "right" });
  page.once("dialog", (dialog) => dialog.accept("Renamed clock"));
  await page
    .getByRole("dialog", { name: "Shortcut actions" })
    .getByRole("button", { name: "Rename", exact: true })
    .click();
  await expect(
    page.locator(".desktop-icons button").filter({ hasText: "Renamed clock" }),
  ).toBeVisible();
  await page
    .locator(".desktop-icons button")
    .filter({ hasText: "Renamed clock" })
    .click({ button: "right" });
  await page
    .getByRole("dialog", { name: "Shortcut actions" })
    .getByRole("button", { name: "Remove from desktop" })
    .click();
  await expect(
    page.locator(".desktop-icons button").filter({ hasText: "Renamed clock" }),
  ).toHaveCount(0);
  console.log(
    "PASS app shortcut persistence, background timer notification, stopwatch laps, and alarm persistence",
  );
  const files = await launch("Files");
  await files
    .locator("aside")
    .getByRole("button", { name: "◇ Pictures", exact: true })
    .click();
  const imageFile = files
    .locator(".file")
    .filter({ hasText: "Feature drawing.png" });
  await imageFile.click();
  await files.getByRole("button", { name: "shortcut", exact: true }).click();
  await expect(
    page
      .locator(".desktop-icons button")
      .filter({ hasText: "Feature drawing.png" }),
  ).toHaveCount(1);
  await page
    .locator(".desktop-icons button")
    .filter({ hasText: "Feature drawing.png" })
    .dblclick();
  paint = page.getByLabel("Paint window");
  await expect(paint.getByLabel("Drawing filename")).toHaveValue(
    "Feature drawing.png",
  );
  await paint.getByLabel("Close", { exact: true }).click();
  await expect(page.getByLabel("Paint window")).toHaveCount(0);
  await imageFile.getByText("Open →").click();
  await files.getByRole("button", { name: "Edit in Paint" }).click();
  paint = page.getByLabel("Paint window");
  await expect(paint.getByLabel("Drawing filename")).toHaveValue(
    "Feature drawing.png",
  );
  assert.deepEqual(
    await pixel(paint.locator("canvas"), 200, 130),
    [0, 0, 255, 255],
  );
  await paint.getByLabel("Close", { exact: true }).click();
  await expect(page.getByLabel("Paint window")).toHaveCount(0);
  await files.getByRole("button", { name: "Close preview" }).click();
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF",
  );
  await files
    .locator("input[type=file]")
    .setInputFiles({
      name: "Preview.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
  await files
    .locator(".file")
    .filter({ hasText: "Preview.pdf" })
    .getByText("Open →")
    .click();
  await expect(files.getByLabel("PDF preview")).toHaveAttribute(
    "data",
    /^blob:/,
  );
  await expect(
    files.getByRole("button", { name: "Download", exact: true }),
  ).toBeVisible();
  await files.getByRole("button", { name: "Close preview" }).click();
  const videoBytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const stream = canvas.captureStream(10),
      recorder = new MediaRecorder(stream, { mimeType: "video/webm" }),
      chunks = [];
    const result = new Promise((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () =>
        resolve([
          ...new Uint8Array(
            await new Blob(chunks, { type: "video/webm" }).arrayBuffer(),
          ),
        ]);
    });
    recorder.start();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "red";
    ctx.fillRect(0, 0, 64, 64);
    setTimeout(() => {
      ctx.fillStyle = "blue";
      ctx.fillRect(0, 0, 64, 64);
    }, 100);
    setTimeout(() => {
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
    }, 350);
    return result;
  });
  await files
    .locator("input[type=file]")
    .setInputFiles({
      name: "Preview.webm",
      mimeType: "video/webm",
      buffer: Buffer.from(videoBytes),
    });
  await files
    .locator(".file")
    .filter({ hasText: "Preview.webm" })
    .getByText("Open →")
    .click();
  await expect(files.getByLabel("Video preview")).toBeVisible();
  await expect
    .poll(() => files.getByLabel("Video preview").evaluate((v) => v.readyState))
    .toBeGreaterThanOrEqual(2);
  await files.getByLabel("Close", { exact: true }).click();
  console.log(
    "PASS file shortcuts, Paint reopening through Files, PDF preview/fallback controls, and decodable video preview",
  );
  const settings = await launch("Settings");
  const backupDownload = page.waitForEvent("download");
  await settings
    .getByRole("button", { name: "Download workspace backup" })
    .click();
  const backupFile = await backupDownload;
  const backupBytes = await readFile(await backupFile.path());
  const backup = JSON.parse(backupBytes.toString());
  assert.equal(backup.format, "fakeos-workspace");
  assert(backup.files.some((f) => f.name === "Feature drawing.png"));
  assert.equal(
    JSON.parse(backup.preferences["fakeos-preferences"]).state.prefs.pin,
    undefined,
  );
  await settings.getByLabel("Theme", { exact: true }).selectOption("light");
  await settings.getByLabel("Restore preferences too").check();
  await settings
    .getByLabel("Import workspace backup", { exact: true })
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: backupBytes,
    });
  await expect(
    settings.getByText(/Imported .* Existing files were kept/),
  ).toBeVisible();
  await expect(page.locator(".os")).toHaveClass(/dark/);
  await settings.getByLabel("Close", { exact: true }).click();
  const importedFiles = await launch("Files");
  await importedFiles
    .locator("aside")
    .getByRole("button", { name: "◇ Pictures", exact: true })
    .click();
  await expect(
    importedFiles
      .locator(".file")
      .filter({ hasText: "Feature drawing (imported 1).png" }),
  ).toBeVisible();
  await importedFiles.getByLabel("Close", { exact: true }).click();
  console.log(
    "PASS workspace backup download, PIN exclusion, non-destructive import, and imported file visibility",
  );
  assert.deepEqual(errors, []);
  const alarmContext = await browser.newContext();
  const alarmPage = await alarmContext.newPage();
  alarmPage.on("pageerror", (e) => errors.push(e.message));
  await alarmPage.clock.install({ time: new Date("2026-10-09T23:58:00Z") });
  await alarmPage.goto("http://127.0.0.1:5173");
  await alarmPage.getByRole("button", { name: "Let's get started" }).click();
  await alarmPage.getByLabel("Start menu").click();
  await alarmPage
    .locator(".start-grid button")
    .filter({ hasText: /^Clock$/ })
    .click();
  const alarmWindow = alarmPage.getByLabel("Clock window");
  await alarmWindow
    .getByRole("button", { name: "Alarms", exact: true })
    .click();
  await alarmWindow.getByLabel("Alarm time").fill("23:59");
  await alarmWindow.getByLabel("Alarm label").fill("Scheduled test");
  await alarmWindow.getByRole("button", { name: "Add alarm" }).click();
  await alarmPage.clock.fastForward(61000);
  await expect(
    alarmWindow.getByLabel("Enable Scheduled test"),
  ).not.toBeChecked();
  await expect(alarmPage.locator(".notification-toast p")).toContainText(
    "Scheduled test",
  );
  await alarmContext.close();
  console.log("PASS scheduled alarm fires at its deadline");
  const phone = await browser.newContext(devices["iPhone 13"]);
  const mobile = await phone.newPage();
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto("http://127.0.0.1:5173");
  await mobile.getByRole("button", { name: "Let's get started" }).click();
  await mobile.getByLabel("Second home page").click();
  await mobile
    .locator(".mobile-grid button")
    .filter({ hasText: "Clock" })
    .click();
  await expect(mobile.locator(".mobile-app .clock-app")).toBeVisible();
  assert(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await phone.close();
  assert.deepEqual(errors, []);
  console.log("PASS Clock on phone and no runtime errors");
} catch (error) {
  await page.screenshot({ path: "/tmp/feature-failure.png" });
  console.log(
    await page.evaluate(async () => ({
      windows: (await import("/src/store.ts")).useOS.getState().windows,
      paint: [...document.querySelectorAll('[aria-label="Paint window"]')].map(
        (w) => ({
          style: w.getAttribute("style"),
          text: w.innerText.slice(-150),
        }),
      ),
    })),
  );
  throw error;
} finally {
  await context.close();
  await browser.close();
}
