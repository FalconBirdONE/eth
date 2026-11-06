// X API v2 client: Post lookup and Recent Search. Server-only; needs
// X_BEARER_TOKEN. Every ID stays a string.

const X_API = "https://api.x.com/2";

const TWEET_FIELDS = [
  "author_id",
  "created_at",
  "conversation_id",
  "in_reply_to_user_id",
  "referenced_tweets",
  "note_tweet",
].join(",");

export interface XPost {
  id: string;
  authorId: string;
  authorUsername: string;
  text: string;
  createdAt: string;
  conversationId: string | null;
  /** ID of the post this one replies to, when it is a reply. */
  inReplyToPostId: string | null;
  raw: unknown;
}

interface RawTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  conversation_id?: string;
  referenced_tweets?: { type: "replied_to" | "quoted" | "retweeted"; id: string }[];
  note_tweet?: { text: string };
}

interface RawUser {
  id: string;
  username: string;
}

interface RawError {
  resource_id?: string;
  value?: string;
  title: string;
  detail?: string;
  type?: string;
}

interface RawResponse<T> {
  data?: T;
  includes?: { users?: RawUser[] };
  errors?: RawError[];
  meta?: { newest_id?: string; oldest_id?: string; result_count?: number; next_token?: string };
}

export class XApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function xGet<T>(path: string, params: Record<string, string>): Promise<RawResponse<T>> {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) throw new Error("X_BEARER_TOKEN is not set");

  const url = `${X_API}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new XApiError(`X API ${res.status} on ${path}: ${body.slice(0, 300)}`, res.status);
  }
  return res.json();
}

function toPost(tweet: RawTweet, users: RawUser[]): XPost {
  const author = users.find((u) => u.id === tweet.author_id);
  return {
    id: tweet.id,
    authorId: tweet.author_id,
    authorUsername: author?.username ?? "",
    // Long posts carry the full text in note_tweet; text is truncated.
    text: tweet.note_tweet?.text ?? tweet.text,
    createdAt: tweet.created_at,
    conversationId: tweet.conversation_id ?? null,
    inReplyToPostId: tweet.referenced_tweets?.find((r) => r.type === "replied_to")?.id ?? null,
    raw: tweet,
  };
}

const LOOKUP_PARAMS = {
  "tweet.fields": TWEET_FIELDS,
  expansions: "author_id",
  "user.fields": "username",
};

/** Looks up one post. Returns null when X reports it deleted or unavailable. */
export async function getPost(id: string): Promise<XPost | null> {
  const res = await xGet<RawTweet>(`/tweets/${encodeURIComponent(id)}`, LOOKUP_PARAMS);
  if (!res.data) return null;
  return toPost(res.data, res.includes?.users ?? []);
}

/**
 * Looks up to 100 posts at once. Posts X cannot return (deleted, protected,
 * suspended author) come back in `unavailable`.
 */
export async function getPosts(
  ids: string[],
): Promise<{ posts: XPost[]; unavailable: string[] }> {
  if (ids.length === 0) return { posts: [], unavailable: [] };
  if (ids.length > 100) throw new Error("getPosts takes at most 100 IDs");

  const res = await xGet<RawTweet[]>("/tweets", { ids: ids.join(","), ...LOOKUP_PARAMS });
  const users = res.includes?.users ?? [];
  const posts = (res.data ?? []).map((t) => toPost(t, users));
  const returned = new Set(posts.map((p) => p.id));
  return { posts, unavailable: ids.filter((id) => !returned.has(id)) };
}

/**
 * Recent Search for one creator's original posts and replies, newest first,
 * following next_token until exhausted. `newestId` is the cursor to store
 * once the batch has been saved.
 */
export async function searchRecentByAuthor(
  username: string,
  sinceId: string | null,
  maxPages = 5,
): Promise<{ posts: XPost[]; newestId: string | null }> {
  const posts: XPost[] = [];
  let newestId: string | null = null;
  let nextToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const params: Record<string, string> = {
      query: `from:${username} -is:retweet`,
      max_results: "100",
      ...LOOKUP_PARAMS,
    };
    if (sinceId) params.since_id = sinceId;
    if (nextToken) params.next_token = nextToken;

    const res = await xGet<RawTweet[]>("/tweets/search/recent", params);
    const users = res.includes?.users ?? [];
    posts.push(...(res.data ?? []).map((t) => toPost(t, users)));
    // newest_id on the first page is the newest of the whole result set.
    if (page === 0) newestId = res.meta?.newest_id ?? null;
    nextToken = res.meta?.next_token;
    if (!nextToken) break;
  }

  return { posts, newestId };
}

/** Pulls the post ID out of an x.com or twitter.com status link. */
export function parsePostUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www\.|mobile\.)/, "");
  if (host !== "x.com" && host !== "twitter.com") return null;
  const match = parsed.pathname.match(/^\/(?:[A-Za-z0-9_]+|i\/web)\/status\/(\d+)/);
  return match?.[1] ?? null;
}

export function postUrl(username: string, id: string): string {
  return `https://x.com/${username || "i/web"}/status/${id}`;
}
