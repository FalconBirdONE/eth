import { eq } from "drizzle-orm";
import { z } from "zod";
import { sourcePosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import type { AnalyzeResponse } from "@/lib/shared/types";
import { getSetupCard } from "@/lib/setups/cards";
import { processPost, upsertSourcePost } from "@/lib/setups/pipeline";
import { getPost, parsePostUrl, postUrl, XApiError } from "@/lib/x/client";
import { ZeroGError } from "@/lib/zerog/client";

export const maxDuration = 60;

const bodySchema = z.object({ url: z.string().min(1).max(500) });

// Runs a pasted X link through the same pipeline as ingest. Posts already
// analyzed return their stored result without spending 0G credits again.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "body must be { url }" }, { status: 400 });

  const postId = parsePostUrl(parsed.data.url);
  if (!postId) return Response.json({ error: "not an x.com post link" }, { status: 400 });

  try {
    const [stored] = await getDb().select().from(sourcePosts).where(eq(sourcePosts.xPostId, postId));
    let row = stored;
    if (!row) {
      const post = await getPost(postId);
      if (!post) return Response.json({ error: "post is unavailable on X" }, { status: 404 });
      row = await upsertSourcePost(post);
    }

    const result = await processPost(row);
    const setup = result.setupId ? await getSetupCard(result.setupId) : null;

    const response: AnalyzeResponse = {
      postId,
      postUrl: postUrl(row.authorUsername, postId),
      classification: result.classification,
      setup,
      note: result.note,
      zeroG: result.trace ?? setup?.currentVersion.zeroG ?? null,
    };
    return Response.json(response);
  } catch (err) {
    if (err instanceof XApiError) {
      return Response.json({ error: "X lookup failed", detail: err.message }, { status: 502 });
    }
    if (err instanceof ZeroGError) {
      return Response.json(
        { error: "0G extraction failed", detail: err.message, requestId: err.requestId },
        { status: 502 },
      );
    }
    console.error("analyze failed", err);
    return Response.json(
      { error: "analysis failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
