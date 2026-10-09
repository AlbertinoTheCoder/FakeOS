import { chromium, devices, expect } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox"],
});
const errors = [];
async function setup(options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("button", { name: "Let's get started" }).click();
  return { context, page };
}
try {
  const { page, context } = await setup({
    viewport: { width: 1440, height: 900 },
  });
  assert(await page.locator(".desktop").count());
  await page.screenshot({ path: "/tmp/fakeos-desktop.png" });
  await page
    .locator(".desktop-icons button")
    .filter({ hasText: "Files" })
    .dblclick();
  await page.getByLabel("Files window").waitFor();
  await page.getByLabel("Minimize", { exact: true }).click();
  await expect(page.locator(".window")).toBeHidden();
  await page.locator('.taskbar button[title="Files"]').click();
  await page.getByLabel("Files window").waitFor();
  const title = page.locator(".window-title");
  const box = await title.boundingBox();
  await page.mouse.move(box.x + 120, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 90);
  await page.mouse.up();
  assert((await page.locator(".window").boundingBox()).x > 100);
  await page.getByLabel("Maximize or restore").click();
  assert((await page.locator(".window").boundingBox()).width > 1400);
  await page.getByLabel("Maximize or restore").click();
  const oldSize = await page.locator(".window").boundingBox();
  const handle = await page.locator(".resize-handle").boundingBox();
  await page.mouse.move(handle.x + 12, handle.y + 12);
  await page.mouse.down();
  await page.mouse.move(handle.x + 65, handle.y + 45);
  await page.mouse.up();
  assert((await page.locator(".window").boundingBox()).width > oldSize.width);
  await page.getByLabel("Close", { exact: true }).click();
  await page.getByLabel("Start menu").click();
  await page
    .locator(".start-grid button")
    .filter({ hasText: "Editor" })
    .click();
  await page.getByLabel("Document text").fill("Browser persistence check");
  await page.getByLabel("Minimize", { exact: true }).click();
  await page.locator('.taskbar button[title="Editor"]').click();
  await expect(page.getByLabel("Document text")).toHaveValue(
    "Browser persistence check",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByLabel("Close", { exact: true }).click();
  await expect(page.getByLabel("Document text")).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Unlock your space" }).click();
  await page
    .locator(".desktop-icons button")
    .filter({ hasText: "Files" })
    .dblclick();
  await page.locator("aside button").filter({ hasText: "Documents" }).click();
  await page.getByRole("button", { name: /Untitled.txt/ }).waitFor();
  await page.getByLabel("Close", { exact: true }).click();
  await page
    .locator(".desktop-icons button")
    .filter({ hasText: "Settings" })
    .dblclick();
  await page
    .locator("select")
    .filter({ has: page.locator('option[value="mobile"]') })
    .selectOption("mobile");
  await page.locator(".mobile").waitFor();
  await page.getByRole("button", { name: "‹ Home" }).click();
  await page
    .locator(".mobile-grid button")
    .filter({ hasText: "Files" })
    .click();
  await page.locator("aside button").filter({ hasText: "Documents" }).click();
  await page.getByRole("button", { name: /Untitled.txt/ }).waitFor();
  await context.close();
  console.log(
    "PASS desktop launch, drag, resize, minimize/restore, maximize, dirty-close protection, save/reload, shared mobile files",
  );
  for (const [name, device, mobile] of [
    ["iPad portrait", devices["iPad (gen 7)"], false],
    ["iPad landscape", devices["iPad (gen 7) landscape"], false],
    ["iPhone", devices["iPhone 13"], true],
    ["Android", devices["Pixel 7"], true],
  ]) {
    const { page, context } = await setup(device);
    assert(await page.locator(mobile ? ".mobile" : ".desktop").count(), name);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name + " overflow",
    );
    if (mobile) {
      await page.screenshot({ path: "/tmp/fakeos-" + name + ".png" });
      await page
        .locator(".mobile-grid button")
        .filter({ hasText: "Notes" })
        .click();
      await page.locator(".mobile-app").waitFor();
      await page.getByRole("button", { name: "Apps", exact: true }).click();
      await page.locator(".app-switcher").waitFor();
      const card = await page.locator(".switcher-card").boundingBox();
      const touch = await context.newCDPSession(page);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: card.x + 70, y: card.y + 45 }],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: card.x + 70, y: card.y - 55 }],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect(page.locator(".switcher-card")).toHaveCount(0);
      await page.getByRole("button", { name: "Return home" }).click();
      await page.getByRole("button", { name: "Organize apps" }).click();
      const organizer = page.getByRole("dialog", { name: "Organize apps" });
      await organizer.getByLabel("Files", { exact: true }).check();
      await organizer.getByLabel("Browser", { exact: true }).check();
      await organizer.getByLabel("Folder name").fill("Daily apps");
      await organizer
        .getByRole("button", { name: "Create app folder" })
        .click();
      await page.reload();
      await page.getByRole("button", { name: "Unlock your space" }).click();
      await page.getByLabel("Second home page").click();
      await page
        .locator(".mobile-grid button")
        .filter({ hasText: "Daily apps" })
        .click();
      const folder = page.getByRole("dialog", { name: "App folder" });
      await expect(
        folder.getByRole("button", { name: "Files", exact: true }),
      ).toBeVisible();
      await folder.getByRole("button", { name: "Dissolve folder" }).click();
      await page.getByLabel("First home page").click();
      await page
        .locator(".mobile-grid button")
        .filter({ hasText: "Paint" })
        .click();
      const touchCanvas = page.locator(".mobile-app canvas");
      await touchCanvas.waitFor();
      const touchBounds = await touchCanvas.boundingBox();
      assert(
        Math.abs(touchBounds.width / touchBounds.height - 1000 / 650) < 0.01,
        "mobile canvas preserves bitmap proportions",
      );
      await touchCanvas.tap({
        position: { x: touchBounds.width * 0.25, y: touchBounds.height * 0.25 },
      });
      const tappedPixel = await touchCanvas.evaluate((canvas) => [
        ...canvas.getContext("2d").getImageData(250, 162, 1, 1).data,
      ]);
      assert.deepEqual(
        tappedPixel,
        [167, 139, 250, 255],
        name + " brush lands at tap",
      );
    } else {
      await page
        .locator(".desktop-icons button")
        .filter({ hasText: "Files" })
        .tap();
      await page.getByLabel("Files window").waitFor();
      const before = await page.locator(".window").boundingBox();
      const initialLeft = await page
        .locator(".window")
        .evaluate((el) => parseFloat(el.style.left));
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: before.x + 100, y: before.y + 20 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: before.x + 160, y: before.y + 70 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect
        .poll(
          () =>
            page.locator(".window").evaluate((el) => parseFloat(el.style.left)),
          { message: name + " touch drag" },
        )
        .toBeGreaterThan(initialLeft);
    }
    await context.close();
    console.log("PASS " + name + " shell and layout");
  }
  const core = await setup({ viewport: { width: 1440, height: 900 } });
  for (const app of [
    "Calculator",
    "Terminal",
    "Notes",
    "Paint",
    "Music",
    "Browser",
    "Activity",
  ]) {
    await core.page.getByLabel("Start menu").click();
    await core.page
      .locator(".start-grid button")
      .filter({ hasText: new RegExp("^" + app + "$") })
      .click();
    const win = core.page.getByLabel(app + " window");
    await win.waitFor();
    if (app === "Calculator") {
      for (const key of ["2", "+", "3", "="])
        await win.getByRole("button", { name: key, exact: true }).click();
      await expect(win.locator("output")).toHaveText("5");
    }
    if (app === "Terminal") {
      await win.getByLabel("Terminal command").fill("mkdir BrowserTest");
      await win.getByLabel("Terminal command").press("Enter");
      await win.getByLabel("Terminal command").fill("ls");
      await win.getByLabel("Terminal command").press("Enter");
      await expect(win.locator("pre")).toContainText("BrowserTest/");
    }
    if (app === "Notes") {
      await win.getByRole("button", { name: "+ New note" }).click();
      await win.getByLabel("Note content").fill("Persistent thoughts");
      await win.getByRole("button", { name: "Pin", exact: true }).click();
      await expect(
        win.getByRole("button", { name: "Unpin", exact: true }),
      ).toBeVisible();
    }
    if (app === "Paint") {
      await win.locator("canvas").waitFor();
      const paintCanvas = win.locator("canvas");
      const bounds = await paintCanvas.boundingBox();
      assert(
        Math.abs(bounds.width / bounds.height - 1000 / 650) < 0.01,
        "desktop canvas preserves bitmap proportions",
      );
      await core.page.mouse.click(
        bounds.x + bounds.width * 0.25,
        bounds.y + bounds.height * 0.25,
      );
      assert.deepEqual(
        await paintCanvas.evaluate((canvas) => [
          ...canvas.getContext("2d").getImageData(250, 162, 1, 1).data,
        ]),
        [167, 139, 250, 255],
        "desktop brush lands at click",
      );
      const resize = await win.locator(".resize-handle").boundingBox();
      await core.page.mouse.move(resize.x + 12, resize.y + 12);
      await core.page.mouse.down();
      await core.page.mouse.move(resize.x - 140, resize.y - 100);
      await core.page.mouse.up();
      const resized = await paintCanvas.boundingBox();
      assert(
        Math.abs(resized.width / resized.height - 1000 / 650) < 0.01,
        "resized canvas preserves bitmap proportions",
      );
      await core.page.mouse.click(
        resized.x + resized.width * 0.4,
        resized.y + resized.height * 0.3,
      );
      assert.deepEqual(
        await paintCanvas.evaluate((canvas) => [
          ...canvas.getContext("2d").getImageData(400, 195, 1, 1).data,
        ]),
        [167, 139, 250, 255],
        "resized brush lands at click",
      );
      await win.getByLabel("Drawing filename").fill("My artwork");
      const pngDownload = core.page.waitForEvent("download");
      await win.getByRole("button", { name: "Save PNG", exact: true }).click();
      const png = await pngDownload;
      assert.equal(png.suggestedFilename(), "My artwork.png");
      assert.equal(await png.failure(), null);
      const pngPath = await png.path();
      const { readFile } = await import("node:fs/promises");
      const bytes = await readFile(pngPath);
      assert.deepEqual(
        [...bytes.subarray(0, 8)],
        [137, 80, 78, 71, 13, 10, 26, 10],
      );
      await win
        .getByRole("button", { name: "Save to FakeOS Pictures", exact: true })
        .click();
    }
    if (app === "Music") {
      await expect(win.locator("audio")).toBeVisible();
      await core.page.getByLabel("Quick settings", { exact: true }).click();
      await core.page.getByRole("button", { name: "FakeOS audio: on" }).click();
      await expect
        .poll(() => win.locator("audio").evaluate((audio) => audio.muted))
        .toBe(true);
      await core.page.getByLabel("Close panel").click();
    }
    if (app === "Browser") {
      await expect(win.getByLabel("Website address")).toBeVisible();
      await core.context.route(
        /https:\/\/(example\.com|example\.org|wikipedia\.org)\//,
        (route) =>
          route.fulfill({
            body: "<h1>Embedded test page</h1>",
            contentType: "text/html",
          }),
      );
      await expect(win.getByLabel("Use regular browser tabs")).toBeChecked();
      await win.getByLabel("Website address").fill("https://example.com/");
      const defaultPopup = core.page.waitForEvent("popup");
      await win.getByRole("button", { name: "Go", exact: true }).click();
      const defaultPage = await defaultPopup;
      await expect(
        defaultPage.getByRole("heading", { name: "Embedded test page" }),
      ).toBeVisible();
      await defaultPage.close();
      await expect(win.locator("iframe")).toHaveCount(0);
      await win.getByLabel("Use regular browser tabs").uncheck();
      for (const url of ["https://example.com/", "https://example.org/"]) {
        await win.getByLabel("Website address").fill(url);
        await win.getByRole("button", { name: "Go", exact: true }).click();
      }
      await win.getByRole("button", { name: "←", exact: true }).click();
      await expect(win.getByLabel("Website address")).toHaveValue(
        "https://example.com/",
      );
      await win.getByRole("button", { name: "+", exact: true }).click();
      await win.getByLabel("Website address").fill("https://wikipedia.org/");
      await win.getByRole("button", { name: "Go", exact: true }).click();
      await expect(
        win.getByRole("button", { name: "←", exact: true }),
      ).toBeDisabled();
      await win
        .getByRole("button", { name: "example.com ×", exact: true })
        .click();
      await expect(win.getByLabel("Website address")).toHaveValue(
        "https://example.com/",
      );
    }
    if (app === "Activity")
      await expect(win.getByText("Activity monitor")).toBeVisible();
    if (app === "Browser") {
      await win.getByRole("button", { name: "Page not working?" }).click();
      await expect(
        win.getByText("Having trouble opening this page?"),
      ).toBeVisible();
      await expect(
        win.getByRole("link", { name: "Open in a regular browser tab ↗" }),
      ).toHaveAttribute("href", "https://example.com/");
      await win.getByLabel("Use regular browser tabs").check();
      await expect(win.locator("iframe")).toHaveCount(0);
      await win.getByLabel("Website address").fill("https://example.org/");
      const popup = core.page.waitForEvent("popup");
      await win.getByRole("button", { name: "Go", exact: true }).click();
      const externalPage = await popup;
      await externalPage.waitForURL("https://example.org/");
      await externalPage.close();
      await win.getByLabel("Use regular browser tabs").uncheck();
      await expect(win.locator("iframe")).toHaveCount(1);
      await core.context.setOffline(true);
      await expect(
        win.getByText("You appear to be offline", { exact: true }),
      ).toBeVisible();
      await core.context.setOffline(false);
      await expect(win.locator("iframe")).toHaveCount(1);
    }
    await win.getByLabel("Close", { exact: true }).click();
  }
  await core.page.getByLabel("Start menu").click();
  await core.page
    .locator(".start-grid button")
    .filter({ hasText: "Settings" })
    .click();
  const settings = core.page.getByLabel("Settings window");
  await settings.getByLabel("Focus mode", { exact: true }).check();
  await settings.getByLabel("High contrast").check();
  await settings.getByLabel("Taskbar auto-hide").check();
  await expect(core.page.locator(".os")).toHaveClass(/high-contrast/);
  await expect(core.page.locator(".taskbar")).toHaveClass(/auto-hide/);
  await core.page.reload();
  await core.page.getByRole("button", { name: "Unlock your space" }).click();
  await expect(core.page.locator(".os")).toHaveClass(/high-contrast/);
  await expect(core.page.locator(".taskbar")).toHaveClass(/auto-hide/);
  await core.context.close();
  console.log(
    "PASS all additional apps launch, calculator arithmetic, terminal filesystem, note pinning, paint save",
  );
  assert.deepEqual(errors, []);
  console.log("PASS no browser runtime errors");
} finally {
  await browser.close();
}
