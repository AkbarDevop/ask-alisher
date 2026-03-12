import { ImageResponse } from "next/og";
import { fetchShareRecord, truncateShareText } from "@/lib/share";

export const runtime = "edge";
export const alt = "Ask Alisher shared answer card";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

function getLabels(lang: string) {
  if (lang === "uz") {
    return {
      question: "Savol",
      answer: "Javob",
      cta: "O'zingiz ham savol bering",
      shared: "Ulashilgan javob",
      topics: "Yoshlar, ta'lim, tadbirkorlik, shaxmat",
    };
  }

  return {
    question: "Question",
    answer: "Answer",
    cta: "Ask your own question",
    shared: "Shared answer",
    topics: "Youth, education, entrepreneurship, chess",
  };
}

type ImageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OpenGraphImage({ params }: ImageProps) {
  const { id } = await params;
  const payload = await fetchShareRecord(id);
  const labels = getLabels(payload?.lang || "en");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background:
            "radial-gradient(circle at top left, rgba(34,197,94,0.3), transparent 28%), linear-gradient(135deg, #020617 0%, #0f172a 45%, #1d4ed8 100%)",
          color: "white",
          padding: "48px",
          position: "relative",
          overflow: "hidden",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-90px",
            top: "-90px",
            width: "340px",
            height: "340px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "64px",
            bottom: "-110px",
            width: "300px",
            height: "300px",
            borderRadius: "999px",
            background: "rgba(56,189,248,0.18)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "999px",
                padding: "12px 18px",
                fontSize: 18,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#dbeafe",
              }}
            >
              <div
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "999px",
                  background: "#86efac",
                }}
              />
              Ask Alisher
            </div>
            <div
              style={{
                fontSize: 18,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              {labels.shared}
            </div>
          </div>

          <div style={{ display: "flex", gap: "28px", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#bae6fd",
                }}
              >
                {labels.question}
              </div>
              <div
                style={{
                  fontSize: 46,
                  lineHeight: 1.12,
                  fontWeight: 700,
                  maxWidth: "960px",
                }}
              >
                {payload?.question || "Ask Alisher"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxWidth: "920px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: "32px",
                padding: "26px 28px",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#bfdbfe",
                }}
              >
                {labels.answer}
              </div>
              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1.35,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {truncateShareText(payload?.answer || "Shared answer preview", 260)}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                }}
              >
                Alisher Sadullaev
              </div>
              <div
                style={{
                  fontSize: 18,
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                {labels.topics}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "white",
                color: "#0f172a",
                borderRadius: "999px",
                padding: "12px 18px",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {labels.cta}
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
