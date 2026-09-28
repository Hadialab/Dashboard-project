import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Menu, Search, X } from "lucide-react";

import ThemeToggle from "../ui/ThemeToggle";
import UserMenu from "./UserMenu";
import useNotificationStore, { selectUnreadCount } from "../../store/notificationStore";
import { formatRelative } from "../../utils/time";

function Navbar({ onToggleSidebar, onOpenSearch }) {
  const navigate = useNavigate();

  const notifications = useNotificationStore();
  const unreadCount = useNotificationStore(selectUnreadCount);

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    const listener = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    };

    window.addEventListener("click", listener);
    return () => window.removeEventListener("click", listener);
  }, []);

  /**
   * Opening a notification marks it read and jumps to the record.
   *
   * Marked before navigating: if the click navigates away, marking it afterwards
   * would be updating a store nobody is looking at any more.
   */
  function openNotification(notification) {
    notifications.markRead(notification.key);
    setShowNotifications(false);

    if (notification.link) navigate(notification.link);
  }

  return (
    <header className="sticky top-0 z-30 flex w-full flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 transition dark:border-slate-800 dark:bg-slate-950 sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-900 md:hidden"
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </button>

      {/* The discoverable entry point for the palette. The keyboard shortcut is
          the faster route, but nothing about Cmd+K is discoverable on a
          desktop. */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-left text-sm text-slate-500 transition hover:border-blue-300 hover:bg-white sm:max-w-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-slate-950"
      >
        <Search size={16} className="shrink-0" aria-hidden="true" />
        <span className="truncate">Search…</span>

        <kbd className="ml-auto hidden shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] font-semibold text-slate-500 sm:inline dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
          Ctrl K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:border-blue-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-900"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          >
            <Bell size={20} />

            {/* Only shown when there is something unread. A permanent dot that
                never changes state is noise, not information. */}
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed inset-x-3 top-16 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-96 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Notifications
                </p>

                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={notifications.markAllRead}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                    >
                      <Check size={13} />
                      Mark all read
                    </button>
                  )}

                  {notifications.notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        notifications.clear();
                        setShowNotifications(false);
                      }}
                      aria-label="Clear all notifications"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>

              {notifications.notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  Nothing yet. You'll be told when a deal closes, is won, or a
                  lead comes in.
                </p>
              ) : (
                <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                  {notifications.notifications.map((notification) => (
                    <li key={notification.key}>
                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        className={[
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900",
                          notification.read ? "opacity-60" : "",
                        ].join(" ")}
                      >
                        {/* Unread marker, so read state is visible in the list
                            and not only in the badge. */}
                        <span
                          aria-hidden="true"
                          className={[
                            "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                            notification.read
                              ? "bg-transparent"
                              : "bg-blue-600",
                          ].join(" ")}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-slate-900 dark:text-white">
                            {notification.title}
                          </span>
                          <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                            {notification.body}
                          </span>
                          <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">
                            {formatRelative(notification.createdAt)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

export default Navbar;
