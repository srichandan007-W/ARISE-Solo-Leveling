import { readBody, run } from "@/lib/api";
import { completePomodoro } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody(req);
  return run(req, (today) => completePomodoro(body, today));
}
