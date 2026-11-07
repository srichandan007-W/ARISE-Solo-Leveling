import { parseId, run } from "@/lib/api";
import { buyReward, deleteReward } from "@/lib/engine";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST = buy this reward */
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  return run(req, (today) => buyReward(parseId(id), today));
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  return run(req, () => deleteReward(parseId(id)));
}
