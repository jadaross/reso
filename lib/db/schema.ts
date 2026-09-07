import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** Low, Medium, High. Every Pick has one; every Outing has one. */
export const priceTier = pgEnum("price_tier", ["low", "medium", "high"]);

/**
 * open       — Members are tapping their Availability.
 * announced  — Close Day has run: Availability is locked, the Chosen Date and
 *              the Drawn Pick are settled.
 * done       — The dinner has happened; the Outing is now a Visit.
 */
export const outingStatus = pgEnum("outing_status", [
  "open",
  "announced",
  "done",
]);

/** Which service a Pick's raw link came from. */
export const linkSource = pgEnum("link_source", ["apple", "google", "unknown"]);

/**
 * none       — no link was pasted.
 * resolved   — we got at least a name and coordinates out of it.
 * unresolved — the paste failed to parse; the raw link is kept for a later retry.
 */
export const linkStatus = pgEnum("link_status", [
  "none",
  "resolved",
  "unresolved",
]);

/**
 * The Group's settings. Exactly one row, id 1 — there is one Group and multi-group
 * is out of scope. The Admin PIN is Group-wide, not per Admin.
 */
export const groupSettings = pgTable("group_settings", {
  id: integer("id").primaryKey().default(1),
  /**
   * DEAD. The Admin PIN was removed — being an Admin is now the flag on the Member
   * and nothing else. Kept only because dropping a column needs a migration for no
   * behavioural gain. Nothing reads or writes this.
   */
  adminPinHash: text("admin_pin_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Group Links. Plural, and with a revoked flag, because the secret is only a
 * bootstrap credential: a Device that has already claimed a name carries its
 * identity cookie, so revoking a leaked secret does not lock it out.
 */
export const groupSecrets = pgTable("group_secrets", {
  id: uuid("id").primaryKey().defaultRandom(),
  secret: text("secret").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/**
 * Members. Created by an Admin typing a name; there is no self-add. A name sits
 * unclaimed until some Device taps it — `firstClaimedAt` records when, and is
 * shown to the Admin as a "not opened yet" marker but never enforces anything.
 *
 * Removal sets `archivedAt`. It is an archive, not a delete: past Ratings keep
 * their attribution and their Picks stay in the pool.
 */
export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  firstClaimedAt: timestamp("first_claimed_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One row per Device that has granted push permission, keyed by endpoint. */
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("push_subscriptions_member_idx").on(t.memberId)],
);

/**
 * A Pick: one Member saying "I want to go here". Two Members wanting the same
 * place make two Picks and the site does not merge them — by design, since that
 * makes the place twice as likely in the Draw.
 *
 * `rawLink` is stored verbatim whatever happens, so a failed parse can be retried
 * later without asking the Member to paste again.
 */
export const picks = pgTable(
  "picks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    tier: priceTier("tier").notNull(),
    rawLink: text("raw_link"),
    linkSource: linkSource("link_source").notNull().default("unknown"),
    linkStatus: linkStatus("link_status").notNull().default("none"),
    resolvedName: text("resolved_name"),
    address: text("address"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    externalPlaceId: text("external_place_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("picks_tier_idx").on(t.tier)],
);

/**
 * One Outing per calendar month. `month` is the first day of the month the
 * dinner falls in; it opens on the 1st of the month before and closes on the 15th
 * of the month before (Close Day).
 */
export const outings = pgTable("outings", {
  id: uuid("id").primaryKey().defaultRandom(),
  month: date("month").notNull().unique(),
  tier: priceTier("tier").notNull(),
  tierOverridden: boolean("tier_overridden").notNull().default(false),
  status: outingStatus("status").notNull().default("open"),
  chosenDate: date("chosen_date"),
  chosenDateOverridden: boolean("chosen_date_overridden")
    .notNull()
    .default(false),
  drawnPickId: uuid("drawn_pick_id").references(() => picks.id, {
    onDelete: "set null",
  }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * One row per day a Member has tapped as free. Whole days, dinner implied.
 * A Member with no rows counts as unavailable all month.
 */
export const availability = pgTable(
  "availability",
  {
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.outingId, t.memberId, t.day] }),
    index("availability_outing_day_idx").on(t.outingId, t.day),
  ],
);

/** Presence of a row means that Member is bringing one guest to that Outing. */
export const plusOnes = pgTable(
  "plus_ones",
  {
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.outingId, t.memberId] })],
);

/**
 * Every Draw that has run for an Outing, in order. An Admin may reroll once, and
 * the reroll has to stay visible in the month's history — so this is an append-only
 * log rather than a column on the Outing.
 */
export const draws = pgTable(
  "draws",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    pickId: uuid("pick_id")
      .notNull()
      .references(() => picks.id, { onDelete: "restrict" }),
    isReroll: boolean("is_reroll").notNull().default(false),
    candidateCount: integer("candidate_count").notNull(),
    drawnAt: timestamp("drawn_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("draws_outing_idx").on(t.outingId)],
);

/** Presence of a row means that Member came to the dinner. */
export const attendance = pgTable(
  "attendance",
  {
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.outingId, t.memberId] })],
);

/** A Member's score out of five for a Visit, with an optional short Note. */
export const ratings = pgTable(
  "ratings",
  {
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    score: smallint("score").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.outingId, t.memberId] })],
);

/**
 * Idempotency ledger for the daily cron. Hobby's cron fires within the hour, has
 * no retries and may double-fire, so every message the job sends is claimed here
 * first and never sent twice for the same Outing.
 *
 * `kind` is deliberately open text: the message calendar itself is still an open
 * decision (wayfinder ticket 05).
 */
export const sentMessages = pgTable(
  "sent_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outingId: uuid("outing_id")
      .notNull()
      .references(() => outings.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("sent_messages_outing_kind_key").on(t.outingId, t.kind)],
);

export const membersRelations = relations(members, ({ many }) => ({
  picks: many(picks),
  availability: many(availability),
  pushSubscriptions: many(pushSubscriptions),
  ratings: many(ratings),
}));

export const picksRelations = relations(picks, ({ one }) => ({
  member: one(members, { fields: [picks.memberId], references: [members.id] }),
}));

export const outingsRelations = relations(outings, ({ one, many }) => ({
  drawnPick: one(picks, {
    fields: [outings.drawnPickId],
    references: [picks.id],
  }),
  availability: many(availability),
  plusOnes: many(plusOnes),
  draws: many(draws),
  attendance: many(attendance),
  ratings: many(ratings),
}));

export const availabilityRelations = relations(availability, ({ one }) => ({
  outing: one(outings, {
    fields: [availability.outingId],
    references: [outings.id],
  }),
  member: one(members, {
    fields: [availability.memberId],
    references: [members.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  outing: one(outings, { fields: [ratings.outingId], references: [outings.id] }),
  member: one(members, { fields: [ratings.memberId], references: [members.id] }),
}));

export type Member = typeof members.$inferSelect;
export type Pick = typeof picks.$inferSelect;
export type Outing = typeof outings.$inferSelect;
export type PriceTier = (typeof priceTier.enumValues)[number];
export type OutingStatus = (typeof outingStatus.enumValues)[number];
