import { useCallback } from "react";

import useNotificationStore from "../store/notificationStore";
import { getClosingSoon } from "../utils/myWork";
import { WON_STAGE, LOST_STAGE } from "../utils/crmConstants";
import type { Deal, Lead } from "../types";

/** What a page calls. Destructured, never depended on as an object. */
export type NotificationGenerator = {
  leadCreated: (lead: Pick<Lead, "id" | "name" | "company">) => void;
  dealStageChanged: (deal: Pick<Deal, "id" | "title" | "stage" | "value">) => void;
  checkClosingSoon: (deals: Deal[]) => void;
};

/**
 * Turns things that actually happened into notifications.
 *
 * The three event sources the app can know about:
 *   - a lead was created
 *   - a deal reached Won or Lost
 *   - a deal is closing soon
 *
 * The third is derived rather than pushed, so it is generated from data at the
 * point it is checked and deduplicated by a stable key. Without the key, every
 * re-check — a page load, a refetch, a tab focus — would add another copy of the
 * same reminder.
 *
 * Each callback is memoised so a consumer can safely put it in a dependency
 * array. The returned object is a fresh literal each render, so destructure it
 * rather than depending on the object itself.
 */
export function useNotificationGenerator(): NotificationGenerator {
  const notify = useNotificationStore((state) => state.notify);

  /** Called by the Leads page after a successful create. */
  const leadCreated = useCallback(
    (lead: Pick<Lead, "id" | "name" | "company">) => {
      notify({
        key: `lead-created:${lead.id}`,
        title: "New lead captured",
        body: `${lead.name} — ${lead.company}`,
        link: `/leads?open=${lead.id}`,
      });
    },
    [notify],
  );

  /**
   * Called whenever a deal's stage changes, but only for the two stages that
   * are a real outcome. The key is the deal and stage pair, so a deal dragged
   * back and forth between Won and Lost updates one notification rather than
   * accumulating a pair.
   */
  const dealStageChanged = useCallback(
    (deal: Pick<Deal, "id" | "title" | "stage" | "value">) => {
      if (deal.stage !== WON_STAGE && deal.stage !== LOST_STAGE) return;

      notify({
        key: `deal-${deal.stage.toLowerCase()}:${deal.id}`,
        title: `Deal ${deal.stage.toLowerCase()}`,
        body: `${deal.title} — $${Number(deal.value ?? 0).toLocaleString()}`,
        link: `/deals?open=${deal.id}`,
      });
    },
    [notify],
  );

  /**
   * Checks for deals closing inside three days.
   *
   * Three days rather than the seven the dashboard widget uses: a notification
   * is an interruption, and anything further out is not worth one.
   */
  const checkClosingSoon = useCallback(
    (deals: Deal[]) => {
      const soon = getClosingSoon(deals, 3);
      const day = new Date().toISOString().slice(0, 10);

      for (const deal of soon) {
        // Keyed on the deal and the day, so a reminder re-raised for the same
        // deal on the same day updates rather than duplicates, but a reminder
        // for a new day is a genuinely new thing to say.
        notify({
          key: `deal-closing:${deal.id}:${day}`,
          title: "Deal closing soon",
          body: `${deal.title} closes ${deal.expectedClose}`,
          type: "due",
          link: `/deals?open=${deal.id}`,
        });
      }
    },
    [notify],
  );

  return { leadCreated, dealStageChanged, checkClosingSoon };
}
