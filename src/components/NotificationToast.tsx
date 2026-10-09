import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useOS } from "../store";
export default function NotificationToast() {
  const notification = useOS((s) => s.notifications[0]);
  const focused = useOS((s) => s.prefs.focusMode);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!notification) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [notification?.id]);
  if (!notification || !visible || focused) return null;
  return (
    <div role="status" className="notification-toast glass">
      <Bell size={18} />
      <div>
        <strong>{notification.title}</strong>
        <p>{notification.message}</p>
      </div>
      <button aria-label="Hide notification" onClick={() => setVisible(false)}>
        <X size={16} />
      </button>
    </div>
  );
}
