import { parseId, run } from "@/lib/api";
import { markItemUsed } from "@/lib/engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH = mark an inventory item as used */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  return run(req, () => markItemUsed(parseId(id)));
}
