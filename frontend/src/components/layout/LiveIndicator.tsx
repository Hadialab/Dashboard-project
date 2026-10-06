import { Radio, WifiOff } from "lucide-react";

import type { LiveStatus } from "../../services/liveEvents";

/**
 * Whether the live-update stream is connected.
 *
 * Deliberately not a toast, and deliberately not on by default. The alternative —
 * announcing every colleague's edit with a toast — is the thing that gets a
 * notification feature switched off within a day, because a dashboard left open
 * all morning produces a steady stream of messages about changes the user did not
 * make and does not need to know about yet.
 *
 * What is worth showing is when the stream is *not* connected, and why: a silent
 * failure looks identical to a quiet afternoon, so a user who refreshes expecting
 * to see a change that never arrived has no way to tell that from it working. Two
 * states, no animation.
 */
type LiveIndicatorProps = {
  status: LiveStatus;
};

const PRESENTATION: Record<
  LiveStatus,
  { icon: typeof Radio; label: string; tone: string; show: boolean }
> = {
  // Shown only when broken. A permanently visible "live" badge is decoration.
  live: {
    icon: Radio,
    label: "Live updates connected",
    tone: "text-green-600 dark:text-green-400",
    show: false,
  },
  connecting: {
    icon: Radio,
    label: "Connecting to live updates",
    tone: "text-slate-400",
    show: false,
  },
  reconnecting: {
    icon: Radio,
    label: "Reconnecting to live updates",
    tone: "text-amber-600 dark:text-amber-400",
    show: true,
  },
  offline: {
    icon: WifiOff,
    label: "Live updates unavailable — pages will need refreshing",
    tone: "text-amber-600 dark:text-amber-400",
    show: true,
  },
};

function LiveIndicator({ status }: LiveIndicatorProps) {
  const presentation = PRESENTATION[status];
  if (!presentation.show) return null;

  const Icon = presentation.icon;

  return (
    // role=status so a screen reader announces the loss of live updates once, when
    // it happens, instead of leaving a silent icon for someone who cannot see it.
    <span
      role="status"
      title={presentation.label}
      className={`inline-flex items-center ${presentation.tone}`}
    >
      <Icon size={16} aria-hidden="true" />
      <span className="sr-only">{presentation.label}</span>
    </span>
  );
}

export default LiveIndicator;