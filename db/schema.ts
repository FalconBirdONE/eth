// Provisional schema for A's tables. D owns the final seven-table schema; when
// it lands, keep these columns (or tell A what changed). ingest_state is extra:
// it holds the X search cursor and the last successful sync time.
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  Classification,
  EntryCondition,
  Evidence,
  ReviewStatus,
  SetupStatus,
  SourceAvailability,
  VerificationStatus,
  VersionKind,
} from "../lib/shared/types";

export const sourcePosts = pgTable(
  "source_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    xPostId: text("x_post_id").notNull(),
    authorId: text("author_id").notNull(),
    authorUsername: text("author_username").notNull(),
    text: text("text").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
    conversationId: text("conversation_id"),
    inReplyToPostId: text("in_reply_to_post_id"),
    raw: jsonb("raw").notNull(),
    availability: text("availability").$type<SourceAvailability>().notNull().default("available"),
    availabilityCheckedAt: timestamp("availability_checked_at", { withTimezone: true }),
    // Extraction bookkeeping: pending and failed rows are retried by ingest.
    extractionStatus: text("extraction_status")
      .$type<"pending" | "done" | "failed">()
      .notNull()
      .default("pending"),
    extractionAttempts: integer("extraction_attempts").notNull().default(0),
    extractionError: text("extraction_error"),
    classification: text("classification").$type<Classification>(),
    zeroGRequestId: text("zerog_request_id"),
    zeroGModel: text("zerog_model"),
    zeroGVerificationStatus: text("zerog_verification_status").$type<VerificationStatus>(),
    // Every 0G request ID used on this post, including failed attempts.
    zeroGRequestIds: jsonb("zerog_request_ids").$type<string[]>().notNull().default([]),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("source_posts_x_post_id_key").on(t.xPostId),
    index("source_posts_extraction_status_idx").on(t.extractionStatus),
  ],
);

export const setups = pgTable(
  "setups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourcePostId: uuid("source_post_id")
      .notNull()
      .references(() => sourcePosts.id),
    creatorXId: text("creator_x_id").notNull(),
    creatorUsername: text("creator_username").notNull(),
    // Moves only on an accepted revision, inside the same transaction.
    currentVersionId: uuid("current_version_id"),
    status: text("status").$type<SetupStatus>().notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("setups_source_post_id_key").on(t.sourcePostId)],
);

export const setupVersions = pgTable(
  "setup_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    setupId: uuid("setup_id")
      .notNull()
      .references(() => setups.id),
    // Assigned when accepted; null while a candidate is pending review.
    versionNumber: integer("version_number"),
    kind: text("kind").$type<VersionKind>().notNull(),
    reviewStatus: text("review_status").$type<ReviewStatus>().notNull(),
    // The post that produced this version: the original, or the creator's reply.
    sourcePostId: uuid("source_post_id")
      .notNull()
      .references(() => sourcePosts.id),
    classification: text("classification").$type<Classification>().notNull(),
    asset: text("asset"),
    side: text("side").$type<"buy" | "sell">(),
    entryCondition: text("entry_condition").$type<EntryCondition>(),
    entryPrice: text("entry_price"),
    referenceCurrency: text("reference_currency"),
    target: text("target"),
    invalidation: text("invalidation"),
    evidence: jsonb("evidence").$type<Evidence>().notNull(),
    zeroGModel: text("zerog_model").notNull(),
    zeroGRequestId: text("zerog_request_id").notNull(),
    zeroGChatId: text("zerog_chat_id"),
    zeroGProvider: text("zerog_provider"),
    verificationStatus: text("verification_status").$type<VerificationStatus>().notNull(),
    validationErrors: jsonb("validation_errors").$type<string[]>().notNull(),
    copyable: boolean("copyable").notNull(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("setup_versions_setup_version_key").on(t.setupId, t.versionNumber),
    // One candidate per creator reply, so a re-ingested reply is not duplicated.
    uniqueIndex("setup_versions_setup_source_post_key").on(t.setupId, t.sourcePostId),
  ],
);

export const ingestState = pgTable("ingest_state", {
  key: text("key").primaryKey(),
  sinceId: text("since_id"),
  lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
