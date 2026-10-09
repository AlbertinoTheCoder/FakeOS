import { create } from "zustand";
import { persist } from "zustand/middleware";
export const apps = [
  "Files",
  "Editor",
  "Terminal",
  "Calculator",
  "Notes",
  "Paint",
  "Music",
  "Browser",
  "Settings",
  "Activity",
  "Clock",
] as const;
export type AppId = (typeof apps)[number];
export interface WindowState {
  id: string;
  app: AppId;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  maximized: boolean;
  data?: string;
  dirty?: boolean;
}
interface Preferences {
  username: string;
  avatar: string;
  theme: string;
  wallpaper: string;
  accent: string;
  mode: "auto" | "desktop" | "mobile";
  setup: boolean;
  pin: string;
  reduced: boolean;
  scale: number;
  alignment: string;
  opacity: number;
  taskbarAutoHide: boolean;
  taskbarSize: number;
  focusMode: boolean;
  sound: boolean;
  brightness: number;
  contrast: boolean;
}
interface OS {
  prefs: Preferences;
  windows: WindowState[];
  active: string | null;
  notifications: { id: string; title: string; message: string }[];
  pinned: AppId[];
  setPrefs: (p: Partial<Preferences>) => void;
  open: (app: AppId, data?: string) => void;
  update: (id: string, p: Partial<WindowState>) => void;
  close: (id: string) => void;
  focus: (id: string) => void;
  notify: (title: string, message: string) => void;
  dismiss: (id?: string) => void;
  pinApp: (app: AppId) => void;
}
export const useOS = create<OS>()(
  persist(
    (set, get) => ({
      prefs: {
        username: "Explorer",
        avatar: "✦",
        theme: "dark",
        wallpaper: "aurora",
        accent: "#a78bfa",
        mode: "auto",
        setup: false,
        pin: "",
        reduced: false,
        scale: 1,
        alignment: "center",
        opacity: 0.85,
        taskbarAutoHide: false,
        taskbarSize: 35,
        focusMode: false,
        sound: true,
        brightness: 1,
        contrast: false,
      },
      windows: [],
      active: null,
      notifications: [],
      pinned: ["Files", "Browser", "Notes", "Settings"],
      setPrefs: (p) => set({ prefs: { ...get().prefs, ...p } }),
      open: (app, data) => {
        const id = crypto.randomUUID();
        set({
          windows: [
            ...get().windows,
            {
              id,
              app,
              data,
              x: Math.max(
                6,
                Math.min(
                  80 + get().windows.length * 26,
                  innerWidth - Math.min(820, innerWidth - 24) - 6,
                ),
              ),
              y: Math.max(
                38,
                Math.min(
                  65 + get().windows.length * 20,
                  innerHeight - Math.min(560, innerHeight - 110) - 85,
                ),
              ),
              width: Math.min(820, innerWidth - 24),
              height: Math.min(560, innerHeight - 110),
              minimized: false,
              maximized: false,
            },
          ],
          active: id,
        });
      },
      update: (id, p) =>
        set({
          windows: get().windows.map((w) => (w.id === id ? { ...w, ...p } : w)),
        }),
      close: (id) => {
        if (
          get().windows.find((w) => w.id === id)?.dirty &&
          !confirm("Discard unsaved document changes?")
        )
          return;
        const windows = get().windows.filter((w) => w.id !== id);
        set({ windows, active: windows.at(-1)?.id ?? null });
      },
      focus: (id) =>
        set({
          active: id,
          windows: get().windows.map((w) =>
            w.id === id ? { ...w, minimized: false } : w,
          ),
        }),
      notify: (title, message) =>
        set({
          notifications: [
            { id: crypto.randomUUID(), title, message },
            ...get().notifications,
          ].slice(0, 30),
        }),
      dismiss: (id) =>
        set({
          notifications: id
            ? get().notifications.filter((n) => n.id !== id)
            : [],
        }),
      pinApp: (app) =>
        set({
          pinned: get().pinned.includes(app)
            ? get().pinned.filter((a) => a !== app)
            : [...get().pinned, app],
        }),
    }),
    {
      name: "fakeos-preferences",
      partialize: (s) => ({ prefs: s.prefs, pinned: s.pinned }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<OS> | undefined;
        const prefs = { ...current.prefs };
        if (saved?.prefs && typeof saved.prefs === "object") {
          for (const key of Object.keys(prefs) as (keyof Preferences)[]) {
            const value = saved.prefs[key];
            if (typeof value === typeof prefs[key])
              Object.assign(prefs, { [key]: value });
          }
        }
        if (!["auto", "desktop", "mobile"].includes(prefs.mode))
          prefs.mode = "auto";
        prefs.brightness = Math.max(0.45, Math.min(1, prefs.brightness));
        prefs.taskbarSize = Math.max(28, Math.min(46, prefs.taskbarSize));
        prefs.scale = Math.max(0.85, Math.min(1.25, prefs.scale));
        prefs.opacity = Math.max(0.5, Math.min(1, prefs.opacity));
        return {
          ...current,
          prefs,
          pinned: Array.isArray(saved?.pinned)
            ? saved.pinned.filter((a) => apps.includes(a))
            : current.pinned,
        };
      },
    },
  ),
);
