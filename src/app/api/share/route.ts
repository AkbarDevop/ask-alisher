import { createShareRecord, type SharePayload } from "@/lib/share";

export const maxDuration = 10;

export async function POST(req: Request) {
  let body: Partial<SharePayload>;

  try {
    body = (await req.json()) as Partial<SharePayload>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const record = await createShareRecord({
      question: body.question || "",
      answer: body.answer || "",
      lang: body.lang === "uz" ? "uz" : "en",
    });

    return Response.json(
      {
        id: record.id,
        url: `/share/${record.id}`,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to create share record",
      },
      { status: 400 }
    );
  }
}
