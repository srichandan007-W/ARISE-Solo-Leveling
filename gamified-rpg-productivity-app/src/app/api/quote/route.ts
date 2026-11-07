import { QUOTES, randomQuoteIndex } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("exclude");
  const exclude = raw !== null && raw !== "" && Number.isInteger(Number(raw)) ? Number(raw) : undefined;
  const index = randomQuoteIndex(exclude);
  return Response.json({ index, ...QUOTES[index] });
}
