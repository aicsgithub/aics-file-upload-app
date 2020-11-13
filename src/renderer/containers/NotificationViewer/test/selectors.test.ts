import { expect } from "chai";

import { mockState } from "../../../state/test/mocks";
import {
  AlertType,
  AppEvent,
  EnabledNotifications,
  State,
} from "../../../state/types";
import { getFilteredEvents, getUnreadEventsCount } from "../selectors";

function createMockState(
  events: AppEvent[],
  enabledNotifications: EnabledNotifications
): State {
  return {
    ...mockState,
    feedback: {
      ...mockState.feedback,
      events,
    },
    setting: {
      ...mockState.setting,
      enabledNotifications,
    },
  };
}

const defaultEvents: AppEvent[] = [
  {
    date: new Date("2020-10-30T10:45:00Z"),
    message: "Test warning",
    type: AlertType.WARN,
    viewed: false,
  },
  {
    date: new Date("2020-10-30T11:45:00Z"),
    message: "Test success",
    type: AlertType.SUCCESS,
    viewed: false,
  },
  {
    date: new Date("2020-10-30T12:45:00Z"),
    message: "Test error",
    type: AlertType.ERROR,
    viewed: false,
  },
  {
    date: new Date("2020-10-30T13:45:00Z"),
    message: "Test info",
    type: AlertType.INFO,
    viewed: false,
  },
  {
    date: new Date("2020-10-30T14:45:00Z"),
    message: "Test draft saved",
    type: AlertType.DRAFT_SAVED,
    viewed: false,
  },
];

describe("NotificationViewer selectors", () => {
  describe("getFilteredEvents", () => {
    it("returns all events when all notifications are enabled", () => {
      const state: State = createMockState(defaultEvents, {
        [AlertType.WARN]: true,
        [AlertType.SUCCESS]: true,
        [AlertType.ERROR]: true,
        [AlertType.INFO]: true,
        [AlertType.DRAFT_SAVED]: true,
      });
      const filteredEvents = getFilteredEvents(state);
      expect(
        filteredEvents.map((event) => event.message)
      ).to.have.ordered.members([
        "Test draft saved",
        "Test info",
        "Test error",
        "Test success",
        "Test warning",
      ]);
    });

    it("returns events based on enabled filters", () => {
      const state: State = createMockState(defaultEvents, {
        [AlertType.WARN]: true,
        [AlertType.SUCCESS]: false,
        [AlertType.ERROR]: true,
        [AlertType.INFO]: false,
        [AlertType.DRAFT_SAVED]: true,
      });
      const filteredEvents = getFilteredEvents(state);
      expect(
        filteredEvents.map((event) => event.message)
      ).to.have.ordered.members([
        "Test draft saved",
        "Test error",
        "Test warning",
      ]);
    });

    it("returns no events if all notifications are disabled", () => {
      const state: State = createMockState(defaultEvents, {
        [AlertType.WARN]: false,
        [AlertType.SUCCESS]: false,
        [AlertType.ERROR]: false,
        [AlertType.INFO]: false,
        [AlertType.DRAFT_SAVED]: false,
      });
      const filteredEvents = getFilteredEvents(state);
      expect(filteredEvents).to.be.empty;
    });
  });

  describe("getUnreadEventsCount", () => {
    it("returns count of all events when all notifications are enabled and not viewed", () => {
      const state: State = createMockState(defaultEvents, {
        [AlertType.WARN]: true,
        [AlertType.SUCCESS]: true,
        [AlertType.ERROR]: true,
        [AlertType.INFO]: true,
        [AlertType.DRAFT_SAVED]: true,
      });
      const count = getUnreadEventsCount(state);
      expect(count).to.equal(5);
    });

    it("returns count of events matching enabled notifications", () => {
      const state: State = createMockState(defaultEvents, {
        [AlertType.WARN]: true,
        [AlertType.SUCCESS]: false,
        [AlertType.ERROR]: true,
        [AlertType.INFO]: false,
        [AlertType.DRAFT_SAVED]: true,
      });
      const count = getUnreadEventsCount(state);
      expect(count).to.equal(3);
    });

    it("returns count of only events that are not viewed", () => {
      const state: State = createMockState(
        [
          {
            date: new Date("2020-10-30T10:45:00Z"),
            message: "Test warning",
            type: AlertType.WARN,
            viewed: false,
          },
          {
            date: new Date("2020-10-30T11:45:00Z"),
            message: "Test success",
            type: AlertType.SUCCESS,
            viewed: true,
          },
          {
            date: new Date("2020-10-30T12:45:00Z"),
            message: "Test error",
            type: AlertType.ERROR,
            viewed: false,
          },
        ],
        {
          [AlertType.WARN]: true,
          [AlertType.SUCCESS]: true,
          [AlertType.ERROR]: true,
          [AlertType.INFO]: true,
          [AlertType.DRAFT_SAVED]: true,
        }
      );
      const count = getUnreadEventsCount(state);
      expect(count).to.equal(2);
    });
  });
});
