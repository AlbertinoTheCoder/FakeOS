import {
  Folder,
  FileText,
  Terminal,
  Calculator,
  StickyNote,
  Paintbrush,
  Music,
  Globe,
  Settings,
  Activity,
  Clock,
} from "lucide-react";
import type { AppId } from "../store";
const icons = {
  Files: Folder,
  Editor: FileText,
  Terminal,
  Calculator,
  Notes: StickyNote,
  Paint: Paintbrush,
  Music,
  Browser: Globe,
  Settings,
  Activity,
  Clock,
};
export default function Icon({
  app,
  size = 23,
}: {
  app: AppId;
  size?: number;
}) {
  const Component = icons[app];
  return (
    <span className={"app-icon icon-" + app.toLowerCase()}>
      <Component size={size} />
    </span>
  );
}
