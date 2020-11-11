import { createSelector } from "reselect";

import { getEventsByNewest } from "../../state/feedback/selectors";
import { getEnabledNotifications } from "../../state/setting/selectors";

export const getFilteredEvents = createSelector(
  [getEventsByNewest, getEnabledNotifications],
  (events, enabledNotifications) =>
    events.filter((event) => enabledNotifications[event.type])
);

export const getUnreadEventsCount = createSelector(
  getFilteredEvents,
  (events) => events.filter((event) => !event.viewed).length
);
