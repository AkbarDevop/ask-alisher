export const ASK_ALISHER_ANALYTICS_EVENTS = [
  "askalisher_view",
  "askalisher_prompt_submit",
  "askalisher_first_response",
  "askalisher_response_time",
  "askalisher_response_error",
  "askalisher_share_click",
  "askalisher_scroll_depth",
  "askalisher_engaged_time",
  "askalisher_session_time",
  "askalisher_outbound_click",
  "askalisher_language_change",
  "askalisher_theme_toggle",
  "askalisher_new_chat",
  "askalisher_retry_click",
] as const;

export const ASK_ALISHER_ANALYTICS_TABLE = "ask_alisher_analytics_events";

export type AskAlisherAnalyticsEvent = (typeof ASK_ALISHER_ANALYTICS_EVENTS)[number];
