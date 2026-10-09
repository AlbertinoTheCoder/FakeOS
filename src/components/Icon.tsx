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
  ShoppingBag,
  Gamepad2,
  Trash2,
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
  Store: ShoppingBag,
  Games: Gamepad2,
  Trash: Trash2,
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
