import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";

/* ------------------------------------------------------------------ */
/*  Content tables — shapes mirror the types in src/content/site.ts.  */
/*  Array fields are stored as JSON text columns (parsed in lib).     */
/* ------------------------------------------------------------------ */

/** Singleton (id = 1). */
export const trainer = sqliteTable("trainer", {
  id: integer("id").primaryKey(),
  fullName: text("full_name").notNull(),
  brand: text("brand").notNull(),
  tagline: text("tagline").notNull(),
  shortBio: text("short_bio").notNull(),
  bioJson: text("bio_json").notNull(), // string[] paragraphs
  philosophy: text("philosophy").notNull(),
  yearsExperience: integer("years_experience").notNull(),
  location: text("location").notNull(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp").notNull(),
  /** Master switch: hides the number, chat buttons and JSON-LD phone when false. */
  showWhatsapp: integer("show_whatsapp", { mode: "boolean" }).notNull().default(false),
  certificationsJson: text("certifications_json").notNull(), // string[]
  /** Optional scan/photo of the certificate, shown on the About page. */
  certificateImage: text("certificate_image"),
  profileImage: text("profile_image").notNull(),
  galleryImagesJson: text("gallery_images_json").notNull(), // string[]
});

export const stats = sqliteTable("stats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  value: integer("value").notNull(),
  suffix: text("suffix"),
  prefix: text("prefix"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const programs = sqliteTable("programs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  durationLabel: text("duration_label").notNull(),
  shortDescription: text("short_description").notNull(),
  fullDescription: text("full_description").notNull(),
  featuresJson: text("features_json").notNull(), // string[]
  goalTagsJson: text("goal_tags_json").notNull(), // Goal[]
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("INR"),
  billingPeriod: text("billing_period").notNull().default("one-time"),
  popular: integer("popular", { mode: "boolean" }).notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  image: text("image").notNull(),
});

export const testimonials = sqliteTable("testimonials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientName: text("client_name").notNull(),
  image: text("image"),
  quote: text("quote").notNull(),
  rating: integer("rating").notNull().default(5),
  result: text("result"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  placeholder: integer("placeholder", { mode: "boolean" }).notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
});

export const faqs = sqliteTable("faqs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const socials = sqliteTable("socials", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  handle: text("handle").notNull(),
  followers: integer("followers"),
  displayOrder: integer("display_order").notNull().default(0),
});

export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(),
  coverImage: text("cover_image"),
  category: text("category"),
  tagsJson: text("tags_json").notNull().default("[]"), // string[]
  readTimeMin: integer("read_time_min"),
  publishedAt: text("published_at").notNull(),
  isPublished: integer("is_published", { mode: "boolean" }).notNull().default(false),
  bodyMd: text("body_md").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Singleton (id = 1). */
export const consultation = sqliteTable("consultation", {
  id: integer("id").primaryKey(),
  price: integer("price").notNull(),
  currency: text("currency").notNull().default("INR"),
  durationLabel: text("duration_label").notNull(),
  note: text("note").notNull(),
});

/** Singleton (id = 1). */
export const siteSettings = sqliteTable("site_settings", {
  id: integer("id").primaryKey(),
  siteUrl: text("site_url"),
  keywordsJson: text("keywords_json").notNull().default("[]"), // string[]
  /** Label used by every call-booking button across the site. */
  ctaLabel: text("cta_label").notNull().default("Book a Consultation"),
  /** Home-page headlines — *word* renders in the accent colour. */
  heroHeadline: text("hero_headline").notNull().default("Build Better *Health* — Inside and Out."),
  aboutHeading: text("about_heading")
    .notNull()
    .default("Coaching that's personalized, *science-based* & sustainable."),
  /** First-visit popup on the home page. */
  popupEnabled: integer("popup_enabled", { mode: "boolean" }).notNull().default(true),
  popupTitle: text("popup_title").notNull().default("Your transformation starts with a call"),
  popupBody: text("popup_body")
    .notNull()
    .default(
      "One-on-one with Coach Satya — we go through your goals, lifestyle and blood work, then map the exact plan that gets you there.",
    ),
  popupNote: text("popup_note")
    .notNull()
    .default("Strictly one-on-one. Your goals, your plan — undivided attention."),
  /** @deprecated free-text slots — superseded by the structured fields below. */
  popupSlots: text("popup_slots").notNull().default(""),
  /** Structured availability — composed into "Mon–Sat, 4:00 PM – 8:00 PM (IST)". */
  popupDayFrom: text("popup_day_from").notNull().default("Mon"),
  popupDayTo: text("popup_day_to").notNull().default("Sat"),
  popupTimeFrom: text("popup_time_from").notNull().default("16:00"), // 24h HH:MM
  popupTimeTo: text("popup_time_to").notNull().default("20:00"),
  /** Seconds to wait after the page finishes loading before the popup appears. */
  popupDelaySeconds: integer("popup_delay_seconds").notNull().default(2),
  /** Page keys hidden from nav/sitemap (their URLs 404). See HIDEABLE_PAGES. */
  hiddenPagesJson: text("hidden_pages_json").notNull().default("[]"),
  /** Public Calendly scheduling link — embedded on /contact, used by booking CTAs. */
  calendlyUrl: text("calendly_url"),
  /** Admin toggle: allow skipping payment for testing (even on the deployed site). */
  testPaymentEnabled: integer("test_payment_enabled", { mode: "boolean" }).notNull().default(false),
  /*
   * Which push notifications the phone actually gets. Separate columns rather
   * than a JSON blob so a new kind is a migration, not a silently-missing key.
   * Payment defaults off: it fires at the same moment as the booking alert on a
   * normal paid booking, which is what made every notification look alike.
   */
  pushOnBooking: integer("push_on_booking", { mode: "boolean" }).notNull().default(true),
  pushOnPayment: integer("push_on_payment", { mode: "boolean" }).notNull().default(false),
  pushOnReminder: integer("push_on_reminder", { mode: "boolean" }).notNull().default(true),
  /** How long before a call the reminder fires. */
  pushReminderMinutes: integer("push_reminder_minutes").notNull().default(10),
  /** Brand assets and visual identity, editable from the admin settings page. */
  logoPath: text("logo_path"),
  /** Wide logo/wordmark rendered in newsletter and notification headers. */
  notificationLogoPath: text("notification_logo_path"),
  iconPath: text("icon_path"),
  socialImagePath: text("social_image_path"),
  accentColor: text("accent_color").notNull().default("#ff5a0a"),
  backgroundColor: text("background_color").notNull().default("#0a0a0b"),
  foregroundColor: text("foreground_color").notNull().default("#f4f4f5"),
  emailSenderName: text("email_sender_name").notNull().default("Boring Basics"),
});

/* ------------------------------------------------------------------ */
/*  Newsletter subscribers                                             */
/* ------------------------------------------------------------------ */

export const subscribers = sqliteTable("subscribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  /** Per-subscriber secret used in the unsubscribe link. */
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("subscribed"), // subscribed|unsubscribed
  source: text("source").notNull().default("site"), // consultation|footer
  createdAt: text("created_at").notNull(),
  unsubscribedAt: text("unsubscribed_at"),
});

/* ------------------------------------------------------------------ */
/*  Leads / consultation enquiries                                     */
/* ------------------------------------------------------------------ */

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull(),
  email: text("email"),
  goal: text("goal"),
  level: text("level"),
  preferredDatetime: text("preferred_datetime"),
  message: text("message"),
  status: text("status").notNull().default("new"), // new|contacted|closed (trainer follow-up)
  /**
   * When the trainer last reached out. Without this, "contacted" can't tell a
   * message sent an hour ago from one sent last week, which is the whole
   * question when deciding whether to chase again.
   */
  contactedAt: text("contacted_at"),
  /** Booking funnel stage — details → paid → booked. */
  stage: text("stage").notNull().default("details"),
  amountPaise: integer("amount_paise"),
  currency: text("currency"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  paidAt: text("paid_at"),
  bookedAt: text("booked_at"),
  /** Calendly event URI captured when the client schedules a slot. */
  calendlyEventUri: text("calendly_event_uri"),
  /**
   * What Calendly last told us about the slot: "active", "canceled", or
   * "unverified" when we could not reach the API. Null for pre-sync rows.
   * Calendly is the source of truth — a cancellation there is invisible to us
   * until we re-read it, so this is refreshed rather than written once.
   */
  calendlyStatus: text("calendly_status"),
  /** When we last asked Calendly. Throttles the automatic re-check. */
  calendlyCheckedAt: text("calendly_checked_at"),
  /**
   * ISO start of the booked consultation, read back from the Calendly API.
   * This is the appointment itself — `bookedAt` only records when the client
   * completed the form.
   */
  scheduledAt: text("scheduled_at"),
  /**
   * When the pre-call reminder was sent. The marker is what makes the reminder
   * safe to run on a timer *and* from a cron endpoint: whoever gets there first
   * claims it, and a restart mid-window cannot double-buzz the phone.
   */
  reminderSentAt: text("reminder_sent_at"),
  createdAt: text("created_at").notNull(),
});

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
    /**
     * Last request this session served, throttled to one write an hour. Drives
     * the sliding idle window (see sessionCore.ts) and the "last used" column
     * on the signed-in devices list. Null for sessions created before 0019.
     */
    lastUsedAt: text("last_used_at"),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [primaryKey({ columns: [t.tokenHash] })],
);

/**
 * Web Push endpoints for the installable admin app, one row per browser.
 *
 * Deliberately keyed to the user rather than the session: a session going
 * idle-cold must not stop the phone buzzing, or the trainer silently stops
 * hearing about bookings a month after they last opened the app. Only an
 * explicit sign-out, a revoke, or a dead endpoint removes a row.
 */
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  /** Push service URL — unique so re-subscribing upserts instead of duplicating. */
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  /**
   * Which login registered this device, so revoking a lost phone's session can
   * take its notifications with it. Nullable with NO cascade on purpose:
   * login() prunes expired sessions, and a cascade there would delete the
   * subscription on exactly the idle-expiry case this table exists to survive.
   */
  sessionTokenHash: text("session_token_hash"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull(),
  lastSeenAt: text("last_seen_at"),
  failureCount: integer("failure_count").notNull().default(0),
});

/* ------------------------------------------------------------------ */
/*  Audit log — append-only; no update/delete code paths exist.        */
/* ------------------------------------------------------------------ */

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  at: text("at").notNull(),
  actor: text("actor").notNull(), // admin email | 'public' | 'system'
  action: text("action").notNull(), // create|update|delete|login|login_failed|logout|payment_*|register|lead
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  ip: text("ip"),
  userAgent: text("user_agent"),
});
