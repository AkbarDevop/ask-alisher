const TOPIC_PATTERNS: Array<{ topic: string; patterns: RegExp[] }> = [
  {
    topic: "youth",
    patterns: [/\b(youth|young|yoshlar|yosh|student|students|talaba|talabalar)\b/iu],
  },
  {
    topic: "education",
    patterns: [/\b(education|learning|o'quv|ta'lim|imtihon|ielts|school|university|stanford|maktab|universitet)\b/iu],
  },
  {
    topic: "entrepreneurship",
    patterns: [/\b(startup|startups|startap|startaplar|founder|founders|entrepreneur|entrepreneurship|tadbirkor|tadbirkorlik|garage|inkubator)\b/iu],
  },
  {
    topic: "volunteering",
    patterns: [/\b(volunteer|volunteering|volontyor|volontyorlik|ko'ngilli)\b/iu],
  },
  {
    topic: "chess",
    patterns: [/\b(chess|shaxmat)\b/iu],
  },
  {
    topic: "policy",
    patterns: [/\b(senator|senate|policy|davlat|government|agentligi|federation|federatsiya|hukumat)\b/iu],
  },
  {
    topic: "reading",
    patterns: [/\b(book|books|reading|read|kitob|kitoblar|kitobxonlik)\b/iu],
  },
  {
    topic: "regional_visits",
    patterns: [
      /\b(fergana|andijan|namangan|hudud|hududlar|viloyat|viloyatlar|region|regions|samarqand|buxoro|xorazm|qashqadaryo|surxondaryo)\b/iu,
      /tashkentdan tashqar/i,
    ],
  },
];

export function inferTopics(text: string): string[] {
  const normalized = text.toLowerCase();
  return TOPIC_PATTERNS
    .filter((entry) => entry.patterns.some((pattern) => pattern.test(normalized)))
    .map((entry) => entry.topic);
}

export function detectFirstPersonVoice(text: string): boolean {
  return /\b(i|i'm|i’ve|i'd|my|me|we|our|us|men|meni|mening|o'zim|biz|bizning|o'ylayman|hisoblayman)\b/iu.test(
    text
  );
}
