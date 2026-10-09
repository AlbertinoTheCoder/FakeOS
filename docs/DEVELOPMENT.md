# FakeOS

A local browser operating-system foundation with a desktop shell, a distinct phone shell, eleven applications, centralized window state, and a shared IndexedDB filesystem.

## Run in Codespaces

```sh
npm install
npm run dev
```

In the Codespaces **Ports** panel, find port **5173**, then select **Open in Browser**. Use the forwarded Codespaces URL; localhost on your own device does not point to this Codespace. Vite binds to `0.0.0.0:5173` with strict port selection and HMR.

```sh
npm run build
npm run preview
npm test
```

For Chromium interaction checks, keep the dev server running, then run:

```sh
npx playwright install --with-deps chromium
npm run test:browser
npm run test:features
```

The browser script checks desktop dragging, resizing, minimize/restore, maximize, unsaved-close protection, saved files after refresh, shared files after switching modes, iPad shell selection and emulated touch dragging in both orientations, phone layout and app switching, app launches, calculator arithmetic, terminal filesystem commands, note pinning, and saving a drawing. These are Chromium emulation checks; they do not establish Safari or physical-device compatibility.

Desktop computers, iPads, and Android tablets use desktop windows. Phones use full-screen apps. Settings provides a persistent manual override. Files, notes, and documents share IndexedDB in the same browser origin; preferences use localStorage. Clearing browser data removes them. There is no cross-device synchronization.

The terminal is simulated entirely in the browser and has no host execution access. The browser app respects iframe restrictions and offers an external-tab link. Activity reports running FakeOS windows and browser storage usage, not fabricated CPU measurements. A lock PIN is a convenience screen lock, not encrypted storage or authentication.

Browser navigation opens regular browser tabs by default. If your browser blocks automatic tabs, use the Open website link. Turning off Regular tabs enables optional embedded browsing; sites may refuse to display there. This mode preference persists. Browser interaction tests use controlled website responses to verify page content renders and do not establish availability of arbitrary live sites.

## Current scope and limitations

The foundation includes setup, boot, lock/restart/shutdown, themes, wallpapers, desktop dragging/resizing/snapping, taskbar, launcher, mobile pages/switcher, notifications, file operations, text editing, notes with pinning, drawing, audio imports, calculator, and simulated terminal commands.

Further work remains for notification actions, terminal quoting, and PIN recovery. Text editing uses native textarea undo/redo. Paint undo is capped at 25 snapshots and a 32 MB history budget; images larger than 2000 pixels are resized on open. PDF previews use the browser PDF viewer; video codecs depend on browser support, and downloads remain available if a preview cannot render. Uploaded media uses data URLs in IndexedDB and may exhaust browser quotas on large imports. iPad Safari and real-device tests remain necessary.

Mobile app ordering and folders persist locally. Swipe up on an app-switcher card to close it, or use its Close button. Focus mode suppresses banners while retaining notification history. Workspace brightness dims FakeOS only; the audio switch mutes FakeOS music. Taskbar auto-hide, icon sizing, and high contrast are available in Settings. Browser tabs have independent navigation histories.

## New apps and tools

- Paint: open PNG/JPEG/WebP from your computer or saved Pictures; image previews offer Edit in Paint. Brush, eraser, fill bucket, line/rectangle/ellipse tools, filled shapes, undo/redo, and zoom work with mouse and touch. Save PNG downloads to your device; Save to FakeOS Pictures keeps an editable image in the virtual filesystem.
- Desktop shortcuts: use + Shortcut for apps or Files → select an item → shortcut for files and folders. Right-click a desktop item for Rename or Remove from desktop, or manage the shortcut in Files → Desktop. Desktop icons support touch dragging. Shortcuts and positions persist.
- File previews: images, PDFs, and supported videos open in Files with a Download fallback.
- Clock: local time, one-time alarms, timer with pause/resume/reset, and stopwatch with laps. Timers and alarms are monitored while FakeOS is running or locked, even with Clock closed. Keep FakeOS open; sleeping/closed browsers cannot deliver timely alarms. Audio requires a user interaction and the FakeOS audio preference to be enabled.
- Settings → Workspace backup: download a JSON backup with files, media, notes, shortcuts, and preferences. Import validates the backup and adds copies with new IDs without replacing existing files. Duplicate filenames preserve their extensions. Preferences can optionally be restored; the existing lock PIN is retained and never exported. Backups larger than 100 MB are rejected, and browser storage quotas still apply.

The feature test script checks painted pixels, fill boundaries, undo/redo, zoom alignment, PNG download and reopening, app/file shortcuts, rename/remove, persisted alarms and scheduled firing, timer completion with Clock closed, stopwatch laps, PDF preview controls, video decoding, non-destructive backup imports, preference restoration, and Clock's phone layout. PDF content rendering is browser-dependent and is not asserted by the automated suite.
