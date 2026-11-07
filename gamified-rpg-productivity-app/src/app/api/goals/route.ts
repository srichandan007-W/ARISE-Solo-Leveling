import { readBody, run } from "@/lib/api";
import { createGoal } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody(req);
  return run(req, () => createGoal(body));
}
