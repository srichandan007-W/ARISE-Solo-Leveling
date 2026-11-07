import { parseId, readBody, run } from "@/lib/api";
import { deleteGoal, updateGoal } from "@/lib/engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const body = await readBody(req);
  const { id } = await params;
  return run(req, (today) => updateGoal(parseId(id), body, today));
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return run(req, () => deleteGoal(parseId(id)));
}
