import { UNAUTHORIZED_EVENT } from "../api/axios";
import { liveUpdates } from "./liveEvents";
import { getCurrentUser } from "./authService";

// Tying the live-update stream to the session.
//
// Kept out of the hook and out of axios so neither has to know the other exists.
// The rule is simple: there is one session, and the stream may only exist while
// there is one. Getting that wrong leaks — a stream left open after logout keeps
// delivering a colleague's activity to a browser that is no longer signed in.

/**
 * Opens the stream, if there is a session to open it for.
 *
 * Asks the API rather than reading localStorage, because "is there a token" and
 * "is the token valid" are different questions and only the second one matters.
 */
export async function connectLiveUpdates(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await liveUpdates.connect();
}

/** Closes the stream. Called on logout. */
export function disconnectLiveUpdates(): void {
  liveUpdates.close();
}

/**
 * Closes the stream whenever the session is dropped for any reason.
 *
 * Listens for the event the axios interceptor already dispatches on a 401, rather
 * than adding a second place that decides the browser is signed out. Two places
 * clearing the session is how a stream ends up outliving the token that authorised
 * it.
 */
export function watchForSessionEnd(): () => void {
  const onUnauthorized = () => disconnectLiveUpdates();

  window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
}