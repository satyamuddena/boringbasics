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
  /** Page keys hidden from nav/sitemap (their URLs 404). See HIDEABLE_PAGES. */
  hiddenPagesJson: text("hidden_pages_json").notNull().default("[]"),
  /** Public Calendly scheduling link — embedded on /contact, used by booking CTAs. */
  calendlyUrl: text("calendly_url"),
  /** Admin toggle: allow skipping payment for testing (even on the deployed site). */
  testPaymentEnabled: integer("test_payment_enabled", { mode: "boolean" }).notNull().default(false),
  /** Brand assets and visual identity, editable from the admin settings page. */
  logoPath: text("logo_path"),
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
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [primaryKey({ columns: [t.tokenHash] })],
);

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
