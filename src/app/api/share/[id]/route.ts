import { fetchShareRecord } from "@/lib/share";

export const maxDuration = 10;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    const record = await fetchShareRecord(id);

    if (!record) {
      return Response.json({ error: "Share not found" }, { status: 404 });
    }

    return Response.json(record);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch share record",
      },
      { status: 500 }
    );
  }
}
