import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Ask Alisher shared answer card";
export const contentType = "image/png";
export const size = {
  width: 1200,
  height: 630,
};

function cleanQuestion(value: string) {
  return value.replace(/\s+/gu, " ").trim().slice(0, 300);
}

function cleanAnswer(value: string) {
  return value
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/\n{3,}/gu, "\n\n")
    .trim()
    .slice(0, 1200);
}

function truncate(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(maxLength - 1, 0)).trimEnd()}...`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const question = cleanQuestion(searchParams.get("q") || "");
  const answer = cleanAnswer(searchParams.get("a") || "");

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
              Shared answer
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
                Question
              </div>
              <div
                style={{
                  fontSize: 46,
                  lineHeight: 1.12,
                  fontWeight: 700,
                  maxWidth: "960px",
                }}
              >
                {question || "Ask Alisher"}
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
                Answer
              </div>
              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1.35,
                  color: "rgba(255,255,255,0.9)",
                }}
              >
                {truncate(answer || "Shared answer preview", 260)}
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
                Youth, education, entrepreneurship, chess
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
              Ask your own question
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
