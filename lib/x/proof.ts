// Day-one X proof: fetch one post by ID and run one Recent Search for the
// demo creator, printing the IDs we store.
//
//   npx tsx --env-file=.env.local lib/x/proof.ts <postId or link> [username]

import { getPost, parsePostUrl, searchRecentByAuthor } from "./client";

async function main() {
  const [arg, usernameArg] = process.argv.slice(2);
  if (!arg) throw new Error("usage: proof.ts <postId or link> [username]");
  const id = /^\d+$/.test(arg) ? arg : parsePostUrl(arg);
  if (!id) throw new Error(`not a post ID or x.com link: ${arg}`);

  const post = await getPost(id);
  if (!post) throw new Error(`post ${id} is unavailable`);
  console.log("Post lookup");
  console.log({ ...post, raw: undefined });

  const username = usernameArg ?? post.authorUsername;
  const { posts, newestId } = await searchRecentByAuthor(username, null, 1);
  console.log(`\nRecent Search from:${username}: ${posts.length} posts, newest_id ${newestId}`);
  for (const p of posts.slice(0, 10)) {
    const reply = p.inReplyToPostId ? ` (reply to ${p.inReplyToPostId})` : "";
    console.log(`  ${p.id} ${p.createdAt}${reply}  ${p.text.replace(/\s+/g, " ").slice(0, 80)}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
