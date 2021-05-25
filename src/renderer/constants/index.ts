export const APP_ID = "app";
export const DATE_FORMAT = "MM-DD-YYYY";
export const DATETIME_FORMAT = "MM-DD-YYYY, h:mm:ss a";
export const LONG_DATETIME_FORMAT = "lll";
export const LIST_DELIMITER_SPLIT = ",";
export const LIST_DELIMITER_JOIN = ", ";

export const CHANNEL_ANNOTATION_NAME = "Channel Type";
export const WELL_ANNOTATION_NAME = "Well";
export const NOTES_ANNOTATION_NAME = "Notes";

// This was calculated by finding an element with the main font size (18px), getting the clientWidth
// and dividing by the number of characters.
export const MAIN_FONT_WIDTH = 8.45; // px

export const MINUTE_AS_MS = 60 * 1000;
export const HOUR_AS_MS = 60 * MINUTE_AS_MS;
export const DAY_AS_MS = 24 * HOUR_AS_MS;

export const TIME_DISPLAY_CONFIG = Object.freeze({
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  weekday: "short",
  year: "numeric",
});
