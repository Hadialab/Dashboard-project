/**
 * The domain model, in one place.
 *
 * Every type here describes something the API actually returns or accepts, not
 * an idealised version of it. Where the two differ, the type follows the API and
 * the comment says so, because a type that is more permissive than the server is
 * the kind of thing that lets a bad request through the front door.
 */

// ===== Primitives =====

/** Ids are opaque strings on purpose. Never parse these, never assume a length. */
export type ID = string;

/** A calendar day with no time and no zone: "2026-10-03". */
export type DateOnly = string;

/** A full ISO-8601 instant, e.g. "2026-10-03T14:30:00.000Z". */
export type Timestamp = string;

/**
 * A money amount.
 *
 * A union rather than `number`, because a NUMERIC column comes back from pg as a
 * string and has caught out `sum + deal.value` more than once — two deals worth
 * 100 and 250.5 summed to "0100250.5". Every consumer is expected to
 * `Number()` it; the type is here to make the hazard visible in review.
 */
export type Money = number | string;

// ===== Enumerations =====

export const DEAL_STAGES = [
  "Lead",
  "Qualified",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

/** Stages that mean the deal is still live. Won and Lost are not. */
export const OPEN_STAGES = ["Lead", "Qualified", "Proposal", "Negotiation"] as const;
export type OpenStage = (typeof OPEN_STAGES)[number];

export const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal",
  "Converted",
  "Lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "LinkedIn",
  "Facebook",
  "Google Ads",
  "Cold Call",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const CUSTOMER_STATUSES = ["Active", "Pending", "Inactive"] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export const FOLLOW_UP_TYPES = ["call", "email", "meeting", "task"] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number] | string;

export const FOLLOW_UP_STATUSES = ["pending", "done"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number] | string;

// ===== Permissions =====

export const USER_ROLES = ["admin", "rep"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * How much of a collection a user may see.
 *
 * `false` is the deny case and is why this is not a plain boolean: `leads.view`
 * has to express "nothing", "my own rows" and "every row".
 */
export type ViewScope = boolean | "own" | "all";

export type ResourcePermissions = {
  view: ViewScope;
  create?: boolean;
  edit?: boolean;
  delete?: boolean;
};

export type Permissions = {
  customers: ResourcePermissions;
  leads: ResourcePermissions;
  deals: ResourcePermissions;
  /** Reports has no rows of its own — it is a read-only aggregate. */
  reports: ResourcePermissions | boolean;
};

export const PERMISSION_RESOURCES = ["customers", "leads", "deals", "reports"] as const;
export type PermissionResource = (typeof PERMISSION_RESOURCES)[number];

// ===== Records =====

export type Customer = {
  id: ID;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: CustomerStatus | string;
  /** Server-stamped and read-only. Both names come back; see the repo layer. */
  createdAt?: Timestamp;
  createdDate?: DateOnly;
  updatedAt?: Timestamp;
};

export type Lead = {
  id: ID;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: LeadStatus | string;
  source: LeadSource | string;
  /** Display name for `ownerId`, derived server-side. */
  assignedRep?: string;
  ownerId?: ID | null;
  /** Set when the lead becomes a customer. Absent until then. */
  convertedCustomerId?: ID | null;
  createdDate?: DateOnly;
  createdAt?: DateOnly;
  updatedAt?: Timestamp;
};

export type Deal = {
  id: ID;
  title: string;
  /**
   * A customer *name*, not an id. A pre-existing gap: deal follow-ups therefore
   * have no email recipient. Widened to accept an id so the fix is additive when
   * it happens rather than a breaking change.
   */
  customer: string;
  stage: DealStage | string;
  value: Money;
  owner?: string;
  ownerId?: ID | null;
  createdDate?: DateOnly;
  createdAt?: DateOnly;
  expectedClose?: DateOnly | null;
  updatedAt?: Timestamp;
};

export type User = {
  id: ID;
  organizationId: number;
  name: string;
  email: string;
  role: UserRole | string;
  permissions: Permissions;
};

export type Organization = {
  id: number;
  name: string;
};

// ===== Activity =====

export const NOTE_ENTITY_TYPES = ["customer", "deal", "lead"] as const;
export type NoteEntityType = (typeof NOTE_ENTITY_TYPES)[number];

/**
 * `note` is something a person typed. `event` is history the server wrote, and
 * is not deletable — not even by an admin.
 */
export type NoteKind = "note" | "event";

export type Note = {
  id: ID;
  entityType: NoteEntityType;
  entityId: ID;
  body: string;
  kind: NoteKind;
  authorId?: ID | null;
  authorName?: string;
  createdAt?: Timestamp;
};

export type FollowUp = {
  id: ID;
  entityType?: NoteEntityType;
  entityId?: ID;
  title: string;
  type: FollowUpType;
  dueAt: DateOnly;
  details?: string;
  status: FollowUpStatus;
  /**
   * The author's user id. Nullable because the schema is ON DELETE SET NULL — a
   * deleted account leaves its follow-ups behind with nobody owning them.
   *
   * Present because the panel decides who may delete a follow-up by comparing
   * this to the signed-in user. It was missing from this type, which meant the
   * comparison compiled as an error rather than as the check it is.
   */
  createdBy?: ID | null;
  createdByName?: string;
  createdByEmail?: string;
};

// ===== Notifications =====

/**
 * `event` is pushed when something happens. `due` is derived from a deal closing
 * soon, and is deduplicated by key so a re-check cannot pile up copies.
 */
export type NotificationType = "event" | "due";

export type Notification = {
  /** Identity for deduplication, not a database id. */
  key: string;
  title: string;
  body: string;
  type: NotificationType;
  link: string | null;
  createdAt: Timestamp;
  read: boolean;
};

/**
 * What a drawer records when it opens. Only what the palette needs to render a
 * result and navigate back.
 *
 * `id` is the namespaced key (`customer:c041`) used as the store's dedupe key.
 * `recordId` is the bare id, because the palette builds a `?open=` param from it
 * and a namespaced key would not match what the list pages look for.
 *
 * The two cannot be merged: the palette splits the key back apart with
 * `split(":")[1]` elsewhere, and `?open=customer:c041` finds nothing.
 */
export type RecentlyViewed = {
  id: ID;
  /** The bare record id, without the `type:` prefix. */
  recordId: ID;
  type: "customer" | "lead" | "deal";
  label: string;
};

// ===== API envelopes =====

/**
 * List responses are wrapped when the API is asked to paginate with
 * `_page`/`_per_page`, and bare arrays otherwise. Both shapes are real and both
 * are read in the app, which is why this is a union rather than a guess.
 */
export type Paginated<T> = {
  data: T[];
  pages: number;
  items: number;
  page?: number;
  per_page?: number;
};

export type ListResponse<T> = T[] | Paginated<T>;

/** The error body every 4xx and 5xx carries. */
export type ApiErrorBody = {
  error: string;
  /** Field errors for validation, or a small structured payload otherwise. */
  details?: Record<string, string | unknown>;
};

// ===== Auth payloads =====

export type LoginRequest = { email: string; password: string };
export type RegisterRequest = LoginRequest & { name: string; organizationName: string };

export type AuthResponse = {
  token: string;
  user: User;
  organization?: Organization;
};

export type MeResponse = {
  user: User;
  organization: Organization;
};

/** What `POST /leads/:id/convert` answers with. */
export type ConvertLeadResponse = {
  customer: Customer;
  leadId: ID;
  leadStatus: LeadStatus;
  convertedCustomerId: ID;
};

// ===== Bulk =====

export type BulkFailure = { id: ID; name: string; message: string };

export type BulkResult = {
  ok: number;
  failed: number;
  errors: BulkFailure[];
};
