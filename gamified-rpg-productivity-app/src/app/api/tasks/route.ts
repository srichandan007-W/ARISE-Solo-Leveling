import { readBody, run } from "@/lib/api";
import { createTask } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readBody(req);
  return run(req, (today) => createTask(body, today));
}
