export const ALISHER_SYSTEM_PROMPT = `You are Alisher Sadullaev — an Uzbek senator and public leader focused on youth development, education, entrepreneurship, volunteering, reading culture, and chess. Your public profile also identifies you with the Youth Affairs Agency, the Chess Federation, and Stanford GSB Executive.

PERSONALITY & VOICE:
- You are energetic, optimistic, and action-oriented.
- You speak directly and practically, usually around opportunities for young people.
- You care about real programs, field visits, regional development, and concrete outcomes.
- You often emphasize education, modern skills, entrepreneurship, books, volunteering, and chess.
- You sound encouraging, patriotic, and public-service minded, but not theatrical.
- You prefer examples from initiatives, meetings, and public work over abstract theory.

RULES:
1. Answer ONLY based on the context provided below. The context contains public Telegram posts, interviews, talks, transcripts, and other public-source material.
2. If the context does not contain the answer, say something like: "I haven't spoken publicly about that" or "That's not something I've shared publicly yet." NEVER invent facts, opinions, or private details.
3. Keep responses conversational and grounded, usually 2-4 short paragraphs.
4. Never use filler like "Certainly!", "Great question!", or "As an AI language model..."
5. If asked who you are, briefly introduce yourself using only what is supported by the context.
6. Match the user's language. You can answer in English or Uzbek.
7. Do NOT include citation numbers or source links in the response. Sources are shown by the UI.
8. You have strong public context around youth policy, education, entrepreneurship, startup support, volunteering, reading culture, regional visits, and chess.
9. If the user asks about your latest thinking, prioritize the freshest Telegram posts or recent dated interviews in the context.
10. If the user asks about Telegram posts, recent activity, or a specific month/date, stay tightly anchored to the dated context provided. Do not invent posts outside the retrieved window.
11. Do not imply private access to government decisions, internal discussions, or personal relationships unless that appears directly in the context.

CONTEXT FROM YOUR PUBLIC WRITINGS AND INTERVIEWS:
{retrieved_context}`;

const EVERGREEN_SUGGESTED_QUESTIONS = {
  en: [
    "How do you think about youth leadership in Uzbekistan?",
    "What role should the Youth Affairs Agency play?",
    "Why does youth entrepreneurship matter so much to you?",
    "What should a young founder in Uzbekistan focus on first?",
    "How do you support startups outside Tashkent?",
    "What makes a good startup incubator or Startup Garage?",
    "Why do learning centers matter for young people?",
    "How can students prepare for modern careers?",
    "What role do English and foreign languages play for Uzbek youth?",
    "How do you think about volunteering?",
    "Why do you emphasize books and reading culture?",
    "What does chess teach young people?",
    "Why should chess matter at a national level?",
    "What did Stanford GSB Executive change in your perspective?",
    "How do you balance public service and youth work?",
    "What opportunities do regional youth need most right now?",
    "What kind of habits matter most for ambitious young people?",
    "How should university students use their time well?",
    "What mistakes do young founders make most often?",
    "How should young people move from ideas to execution?",
    "How do you think about grants, loans, and support programs?",
    "What kind of entrepreneurship deserves the most support?",
    "How do you judge whether an initiative is actually helping youth?",
    "What advice would you give to a 17-year-old in Uzbekistan?",
    "What advice would you give to a university student who wants to build something?",
    "Why is visiting regions and meeting people on the ground important to you?",
    "What is your long-term vision for Uzbek youth?",
    "Who are you and what are you focused on?",
  ],
  uz: [
    "O'zbekistonda yoshlar yetakchiligi haqida qanday o'ylaysiz?",
    "Yoshlar ishlari agentligi qanday rol o'ynashi kerak?",
    "Nega yoshlar tadbirkorligi siz uchun muhim?",
    "O'zbekistondagi yosh founder birinchi navbatda nimaga e'tibor berishi kerak?",
    "Toshkentdan tashqaridagi startaplarni qanday qo'llab-quvvatlash kerak?",
    "Yaxshi Startup Garage yoki inkubator nimasi bilan kuchli bo'ladi?",
    "O'quv markazlari yoshlar uchun nega muhim?",
    "Talabalar zamonaviy kasblarga qanday tayyorlanishi kerak?",
    "Xorijiy tillar yoshlar uchun qanday ahamiyatga ega?",
    "Volontyorlik haqida qanday fikrdasiz?",
    "Nega kitob va kitobxonlikni ko'p ta'kidlaysiz?",
    "Shaxmat yoshlar uchun nimani o'rgatadi?",
    "Shaxmatni milliy darajada rivojlantirish nega muhim?",
    "Stanford GSB Executive sizning qarashlaringizni qanday o'zgartirdi?",
    "Davlat xizmati va yoshlar bilan ishlash o'rtasida balansni qanday tutasiz?",
    "Hududlardagi yoshlar uchun eng kerakli imkoniyatlar nimalar?",
    "Ambitsiyali yoshlar uchun eng muhim odatlar qaysilar?",
    "Universitet talabalari vaqtini qanday to'g'ri ishlatishi kerak?",
    "Yosh founderlar eng ko'p qanday xato qiladi?",
    "Yoshlar g'oyadan amaliyotga qanday o'tishi kerak?",
    "Grant, kredit va qo'llab-quvvatlash dasturlari haqida qanday o'ylaysiz?",
    "Qanday tadbirkorlik ko'proq qo'llab-quvvatlanishi kerak?",
    "Tashabbus haqiqatan yoshlar hayotiga ta'sir qilayotganini qanday bilasiz?",
    "O'zbekistondagi 17 yoshli yigit-qizga qanday maslahat berardingiz?",
    "Biror narsa qurmoqchi bo'lgan talaba uchun qanday maslahat berasiz?",
    "Hududlarga borib, odamlar bilan joyida uchrashish nega muhim?",
    "O'zbek yoshlarining uzoq muddatli kelajagini qanday tasavvur qilasiz?",
    "Siz kimsiz va hozir nimaga ko'proq e'tibor qaratgansiz?",
  ],
} as const;

const RECENT_SUGGESTED_QUESTIONS = {
  en: [
    "What did you post on Telegram last month?",
    "What were you focused on in March 2026?",
    "What youth initiatives did you highlight most recently?",
    "Why were you recently visiting Fergana, Andijan, and Namangan?",
    "What did you recently say about Startup Garage?",
    "Why are learning centers and books showing up so often in your posts?",
    "What did you recently say about supporting youth entrepreneurship?",
    "What recent Telegram post best reflects your priorities today?",
    "What are you trying to change for young people outside Tashkent right now?",
    "What recent post best shows your view on youth opportunity?",
  ],
  uz: [
    "O'tgan oy Telegramda nimalar yozgansiz?",
    "2026 yil martda nimalarga ko'proq e'tibor qaratgansiz?",
    "So'nggi paytda qaysi yoshlar tashabbuslarini ko'proq ta'kidladingiz?",
    "Nega yaqinda Farg'ona, Andijon va Namanganga ko'p bordingiz?",
    "Startup Garage haqida yaqinda nimalar degansiz?",
    "Nega postlaringizda o'quv markazlari va kitoblar ko'p uchrayapti?",
    "Yoshlar tadbirkorligini qo'llab-quvvatlash haqida yaqinda nima degansiz?",
    "Bugungi ustuvorliklaringizni qaysi Telegram postingiz yaxshi ko'rsatadi?",
    "Hozir Toshkentdan tashqaridagi yoshlar hayotida nimani o'zgartirmoqchisiz?",
    "Yoshlar imkoniyati haqidagi qarashingizni qaysi so'nggi postingiz yaxshi ifodalaydi?",
  ],
} as const;

export const SUGGESTED_QUESTIONS = {
  en: [...RECENT_SUGGESTED_QUESTIONS.en, ...EVERGREEN_SUGGESTED_QUESTIONS.en],
  uz: [...RECENT_SUGGESTED_QUESTIONS.uz, ...EVERGREEN_SUGGESTED_QUESTIONS.uz],
} as const;

export type Language = "en" | "uz";

export const UI_TEXT = {
  en: {
    heroTitle: "Ask Alisher",
    heroDescription:
      "AI clone of Alisher Sadullaev — senator, youth leader, chess advocate, Stanford GSB Executive",
    poweredBy: "Powered by Gemini · Context from verified Telegram posts, interviews, and public talks",
    newChat: "New chat",
    placeholder: "Ask Alisher anything...",
    moreSuggestions: "More suggestions",
    copy: "Copy",
    copied: "Copied",
    share: "Share",
    tryAgain: "Try again",
    disclaimer: "AI simulation — not affiliated with Alisher Sadullaev",
    inputHint: "Enter to send, Shift+Enter for new line",
    thinkingSteps: [
      "Searching through interviews",
      "Reviewing public talks",
      "Browsing Telegram posts",
      "Preparing response",
    ],
    errorRate: "Too many requests. Please wait a moment and try again.",
    errorServer: "Alisher is temporarily unavailable. Please try again shortly.",
    errorGeneric: "Something went wrong. Please try again.",
  },
  uz: {
    heroTitle: "Alisherga savol bering",
    heroDescription:
      "Alisher Sadullaevning AI kloni — senator, yoshlar yetakchisi, shaxmat targ'ibotchisi, Stanford GSB Executive",
    poweredBy:
      "Gemini asosida · Verifikatsiyalangan Telegram postlari, intervyular va ommaviy chiqishlardan kontekst",
    newChat: "Yangi suhbat",
    placeholder: "Alisherga savol bering...",
    moreSuggestions: "Boshqa savollar",
    copy: "Nusxalash",
    copied: "Nusxalandi",
    share: "Ulashish",
    tryAgain: "Qayta urinish",
    disclaimer: "AI simulyatsiya — Alisher Sadullaev bilan bog'liq emas",
    inputHint: "Yuborish — Enter, yangi qator — Shift+Enter",
    thinkingSteps: [
      "Intervyularni qidiryapman",
      "Ommaviy chiqishlarni ko'ryapman",
      "Telegram postlarini ko'ryapman",
      "Javob tayyorlayapman",
    ],
    errorRate: "Juda ko'p so'rov. Iltimos, biroz kuting va qayta urinib ko'ring.",
    errorServer: "Alisher vaqtincha mavjud emas. Iltimos, keyinroq urinib ko'ring.",
    errorGeneric: "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
  },
} as const;

function pickRandomQuestions(
  pool: readonly string[],
  count: number,
  seen: Set<string>
): string[] {
  const available = pool.filter((question) => !seen.has(question));
  const picked: string[] = [];

  for (let i = 0; i < count && available.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * available.length);
    const [question] = available.splice(idx, 1);
    seen.add(question);
    picked.push(question);
  }

  return picked;
}

function shuffleQuestions(questions: string[]): string[] {
  const next = [...questions];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function getRandomQuestions(lang: Language, count = 4): string[] {
  const seen = new Set<string>();
  const recentQuota = Math.min(Math.ceil(count / 2), RECENT_SUGGESTED_QUESTIONS[lang].length);
  const evergreenQuota = Math.min(
    Math.max(count - recentQuota, 0),
    EVERGREEN_SUGGESTED_QUESTIONS[lang].length
  );

  const picked = [
    ...pickRandomQuestions(RECENT_SUGGESTED_QUESTIONS[lang], recentQuota, seen),
    ...pickRandomQuestions(EVERGREEN_SUGGESTED_QUESTIONS[lang], evergreenQuota, seen),
  ];

  if (picked.length < count) {
    picked.push(...pickRandomQuestions(SUGGESTED_QUESTIONS[lang], count - picked.length, seen));
  }

  return shuffleQuestions(picked);
}

const FOLLOW_UP_STOP_WORDS = new Set([
  "what",
  "how",
  "why",
  "when",
  "where",
  "who",
  "did",
  "does",
  "is",
  "are",
  "was",
  "were",
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "for",
  "with",
  "from",
  "into",
  "about",
  "that",
  "this",
  "your",
  "his",
  "her",
  "their",
  "them",
  "you",
  "they",
  "have",
  "has",
  "had",
  "been",
  "being",
  "there",
  "post",
  "posted",
  "posts",
  "telegram",
  "channel",
  "recent",
  "recently",
  "latest",
  "lately",
  "month",
  "year",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
  "january",
  "february",
  "mart",
  "iyun",
  "iyul",
  "avgust",
  "sentyabr",
  "oktyabr",
  "noyabr",
  "dekabr",
  "yanvar",
  "fevral",
  "talked",
  "said",
  "share",
  "shared",
  "tell",
  "more",
  "last",
  "time",
]);

function isUnsupportedPublicAnswer(answer: string): boolean {
  const normalized = answer.trim().toLowerCase();

  return [
    /i haven't spoken publicly about/u,
    /i have not spoken publicly about/u,
    /that's not something i've shared/u,
    /that is not something i've shared/u,
    /i don't have any information on that/u,
    /i do not have any information on that/u,
    /bu haqda ochiq gapirmaganman/u,
    /bu mavzu bo'yicha ochiq fikr bildirganim yo'q/u,
    /bu haqda menda ma'lumot yo'q/u,
    /buni omma bilan ulashmaganman/u,
  ].some((pattern) => pattern.test(normalized));
}

function extractTopic(question: string, answer: string): string | null {
  const text = `${question} ${answer}`.toLowerCase();
  const words = text.match(/[\p{L}\p{N}]{4,30}/gu) ?? [];
  const keywords = [...new Set(words)].filter((word) => !FOLLOW_UP_STOP_WORDS.has(word));
  if (keywords.length === 0) return null;
  return keywords.slice(0, 3).join(" ");
}

function dedupeQuestions(questions: string[], count: number): string[] {
  return [...new Set(questions.map((question) => question.trim()).filter(Boolean))].slice(0, count);
}

export function getContextualFollowUpQuestions(
  lang: Language,
  question: string,
  answer: string,
  count = 3
): string[] {
  if (isUnsupportedPublicAnswer(answer)) {
    return [];
  }

  const combined = `${question} ${answer}`.toLowerCase();
  const topic = extractTopic(question, answer);
  const followUps: string[] = [];

  const isTelegram = /(telegram|channel|post|posted|kanal|postlar)/u.test(combined);
  const isYouth = /\b(youth|young|student|students|graduate|graduates|volunteer|volunteering|yosh|yoshlar|talaba|bitiruvchi|volontyor)\b/u.test(combined);
  const isEducation = /\b(education|school|university|learning|center|centers|book|books|reading|language|ta'lim|o'quv|markaz|kitob|kitobxon|til|universitet|maktab)\b/u.test(combined);
  const isStartup = /\b(startup|founder|entrepreneur|business|grant|loan|credit|incubator|garage|tadbirkor|startap|biznes|kredit|ssuda|inkubator|garaj)\b/u.test(combined);
  const isChess = /\b(chess|fide|shaxmat)\b/u.test(combined);
  const isPolicy = /\b(senate|senator|agency|program|initiative|policy|prezident|dastur|tashabbus|hudud|viloyat)\b/u.test(combined);

  if (lang === "uz") {
    if (isTelegram) {
      followUps.push("O'sha paytda Telegramda yana nimalar yozgansiz?");
      followUps.push("Bu postdagi asosiy fikr nima edi?");
      followUps.push("Keyingi postlarda shu mavzuga yana qaytdingizmi?");
    }
    if (isYouth) {
      followUps.push("Bu yerda yoshlar uchun eng amaliy xulosa nima bo'ladi?");
      followUps.push("Buni hududlardagi yoshlar hayotida qanday ko'rasiz?");
    }
    if (isEducation) {
      followUps.push("Bu masalada ta'lim tizimi nimani yaxshiroq qilishi kerak?");
      followUps.push("Yoshlar bunga amalda qayerdan kirib borishi kerak?");
    }
    if (isStartup) {
      followUps.push("Founderlar buni amalda birinchi bo'lib qanday sinab ko'rishi kerak?");
      followUps.push("Bu bo'yicha eng katta xatoni nimada ko'rasiz?");
    }
    if (isChess) {
      followUps.push("Shaxmat bu yerda yoshlar tarbiyasiga qanday yordam beradi?");
    }
    if (isPolicy) {
      followUps.push("Bu tashabbus amalda qayerda eng katta farq qilishi kerak?");
    }

    if (topic) {
      followUps.push(`${topic} bo'yicha aniqroq misol bera olasizmi?`);
      followUps.push(`${topic} haqidagi fikringiz vaqt o'tishi bilan qanday o'zgargan?`);
    } else {
      followUps.push("Bunga yaqin yana bitta aniq misol bera olasizmi?");
      followUps.push("Keyin bu mavzu bo'yicha fikringiz o'zgardimi?");
    }
  } else {
    if (isTelegram) {
      followUps.push("What else were you posting around that time on Telegram?");
      followUps.push("What was the main point behind that Telegram post?");
      followUps.push("Did you come back to that topic in later Telegram posts?");
    }
    if (isYouth) {
      followUps.push("What's the most practical takeaway here for young people?");
      followUps.push("How does this show up in the lives of youth outside the capital?");
    }
    if (isEducation) {
      followUps.push("What should the education system do better on this?");
      followUps.push("What's the best practical entry point for young people here?");
    }
    if (isStartup) {
      followUps.push("What's the first practical step a founder should take on this?");
      followUps.push("What's the biggest mistake founders make on this topic?");
    }
    if (isChess) {
      followUps.push("How does chess help shape young people in practice?");
    }
    if (isPolicy) {
      followUps.push("Where should this initiative make the biggest real-world difference?");
    }

    if (topic) {
      followUps.push(`Can you give a more specific example about ${topic}?`);
      followUps.push(`How has your thinking on ${topic} changed over time?`);
    } else {
      followUps.push("Can you give one more specific example?");
      followUps.push("Did your view on this change later?");
    }
  }

  return dedupeQuestions(followUps, count);
}
