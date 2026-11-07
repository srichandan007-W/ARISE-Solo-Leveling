import { readBody, run } from "@/lib/api";
import { updatePlayer } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const body = await readBody(req);
  return run(req, () => updatePlayer(body));
}
