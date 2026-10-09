import { lazy } from "react";
import type { AppId } from "./store";
const Files = lazy(() => import("./apps/files/Files"));
const Editor = lazy(() => import("./apps/editor/Editor"));
const Notes = lazy(() => import("./apps/notes/Notes"));
const Terminal = lazy(() => import("./apps/terminal/Terminal"));
const Calculator = lazy(() => import("./apps/calculator/Calculator"));
const Settings = lazy(() => import("./apps/settings/Settings"));
const Paint = lazy(() => import("./apps/paint/Paint"));
const Music = lazy(() => import("./apps/music/Music"));
const Browser = lazy(() => import("./apps/browser/Browser"));
const Activity = lazy(() => import("./apps/activity/Activity"));
const Clock = lazy(() => import("./apps/clock/Clock"));
export default function Application({
  app,
  data,
  instanceId,
}: {
  app: AppId;
  data?: string;
  instanceId?: string;
}) {
  switch (app) {
    case "Files":
      return <Files data={data} />;
    case "Editor":
      return <Editor data={data} instanceId={instanceId} />;
    case "Notes":
      return <Notes />;
    case "Terminal":
      return <Terminal />;
    case "Calculator":
      return <Calculator />;
    case "Settings":
      return <Settings />;
    case "Paint":
      return <Paint data={data} instanceId={instanceId} />;
    case "Music":
      return <Music />;
    case "Browser":
      return <Browser />;
    case "Activity":
      return <Activity />;
    case "Clock":
      return <Clock />;
  }
}
