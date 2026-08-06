/**
 * BORING BASICS — single source of truth for all site content.
 *
 * Everything the marketing site renders comes from this file so the trainer (or
 * a future CMS) can edit copy in one place. Types mirror the data model in
 * docs/requirement.md §5. Replace placeholder content (marked PLACEHOLDER) once
 * the client supplies final bio text, testimonials and before/after pairs.
 */

export type Goal = "fat-loss" | "muscle-gain" | "recomp" | "lifestyle";

export interface Trainer {
  fullName: string;
  brand: string;
  tagline: string;
  shortBio: string;
  bio: string[]; // paragraphs
  philosophy: string;
  yearsExperience: number;
  location: string;
  email: string;
  /** Digits only, no +, used for wa.me and tel: links */
  whatsapp: string;
  /** When false the number, chat buttons and JSON-LD phone are hidden site-wide. */
  showWhatsapp: boolean;
  certifications: string[];
  /** Optional scan/photo of the certificate, shown on the About page. */
  certificateImage?: string;
  profileImage: string;
  galleryImages: string[];
}

export interface Stat {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
}

export interface Program {
  slug: string;
  title: string;
  durationLabel: string;
  shortDescription: string;
  fullDescription: string;
  features: string[];
  goalTags: Goal[];
  /** Real price in INR — hidden from the public UI per client request, kept for later. */
  price: number;
  currency: string;
  billingPeriod: "monthly" | "quarterly" | "one-time";
  popular: boolean;
  displayOrder: number;
  image: string;
}

export interface Testimonial {
  id: string;
  clientName: string;
  image?: string;
  quote: string;
  rating: number; // 1..5
  result?: string;
  featured: boolean;
  placeholder?: boolean;
}

export interface Faq {
  question: string;
  answer: string;
  category: string;
}

export interface SocialLink {
  platform: string;
  url: string;
  handle: string;
  followers?: number;
}

/** Blog — card/listing shape. */
export interface PostListItem {
  slug: string;
  title: string;
  excerpt: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  readTimeMin?: number;
  publishedAt: string;
}

/** Blog — full article (adds the markdown body). */
export interface Post extends PostListItem {
  body: string;
}

/* ------------------------------------------------------------------ */
/*  Trainer profile                                                    */
/* ------------------------------------------------------------------ */
export const trainer: Trainer = {
  fullName: "Satya Muddena",
  brand: "Boring Basics",
  tagline: "Stop Looking for Magic.",
  shortBio:
    "INFS-Certified Nutrition & Fitness Consultant providing evidence-based online coaching to help you lose fat, build muscle and improve your health — personalized to your goals, lifestyle and blood work.",
  bio: [
    "I'm Satya Muddena, an INFS-certified Nutrition and Fitness Consultant and online coach based in Hyderabad. With over 10 years of personal strength training experience and more than 5 years of coaching clients, I help people lose fat, build muscle, improve their health and create habits that deliver lasting results.",
    "My coaching combines evidence-based nutrition, resistance training, targeted supplementation and behaviour change to create a personalized, science-based approach. Every nutrition plan, training program and supplement protocol is tailored to your goals, lifestyle, food preferences, training experience, recovery capacity and blood work — never generic, templated or copy-pasted.",
    "I've worked with individuals pursuing fat loss, muscle gain, body recomposition and photoshoot-ready physiques, as well as those managing lifestyle-related conditions such as PCOS, prediabetes, type 2 diabetes, high blood pressure and abnormal cholesterol or lipid levels.",
    "My coaching goes far beyond providing a plan to follow. I help you build habits that fit your lifestyle, overcome the behaviours holding you back and understand the principles behind nutrition, training, recovery and long-term health. The goal is not just to help you achieve great results during our time together, but to equip you with the knowledge, skills and confidence to maintain those results long after the coaching ends.",
  ],
  philosophy:
    "I believe the best coaching is simple, practical and backed by science. My focus isn't on restrictive diets or quick fixes — it's on helping you build habits that lead to lasting health and fitness.\n\nEvery nutrition plan, training program and recommendation is tailored to your goals, lifestyle, food preferences, health and individual needs. There are no generic templates or one-size-fits-all approaches.\n\nBeyond giving you a plan to follow, I'll help you understand the why behind nutrition, training, recovery and lifestyle habits, so you can make informed decisions and maintain your results long after our coaching journey ends.",
  yearsExperience: 10,
  location: "Hyderabad, Telangana",
  email: "satya.muddena@gmail.com",
  whatsapp: "919949191359",
  showWhatsapp: false,
  certifications: ["INFS-Certified Nutrition & Fitness Consultant"],
  certificateImage: "/images/infs-certificate.jpeg",
  profileImage: "/images/image1.jpeg",
  galleryImages: [
    "/images/image1.jpeg",
    "/images/image2.jpeg",
    "/images/image3.jpeg",
    "/images/image4.jpeg",
    "/images/gallery-satya-1.jpg",
    "/images/gallery-satya-2.jpg",
    "/images/gallery-satya-3.jpg",
    "/images/gallery-satya-4.jpg",
    "/images/gallery-satya-5.jpg",
  ],
};

/* ------------------------------------------------------------------ */
/*  Stats / trust bar                                                  */
/* ------------------------------------------------------------------ */
export const stats: Stat[] = [
  { label: "Years of Experience", value: 10, suffix: "+" },
  { label: "Clients Coached", value: 500, suffix: "+" },
  { label: "Transformations", value: 100, suffix: "+" },
  { label: "Followers", value: 75, suffix: "K" },
];

/* ------------------------------------------------------------------ */
/*  Programs / coaching packages                                       */
/*  Prices are hidden in the UI (client request) but stored here.      */
/* ------------------------------------------------------------------ */
const SHARED_FEATURES: string[] = [
  "Customized nutrition plan tailored to your eating habits, food preferences, lifestyle and individual goals",
  "Personalized training program designed around your experience level, fitness goals, recovery capacity, equipment availability and weekly schedule",
  "Daily workout video reviews with individualized feedback to improve exercise technique, movement quality and lifting performance",
  "Comprehensive progress tracking — daily body weight, step count, sleep, hydration and digestion, plus monthly body measurements and progress-photo assessments",
  "Personalized supplement protocol based on a full review of your blood work — vitamin and mineral status, complete blood count (CBC), lipid profile, glucose markers and other clinically relevant biomarkers",
  "Weekly 1-on-1 coaching call to review progress, address challenges and refine your nutrition, training and recovery plan",
  "Ongoing WhatsApp support throughout the week, with responses during IST business hours",
];

const ONLINE_NOTE =
  "Please note this is a fully online coaching service and does not include 1-on-1 video consultations or in-person personal training sessions.";

export const programs: Program[] = [
  {
    slug: "12-weeks",
    title: "12 Weeks Package",
    durationLabel: "12 Weeks",
    shortDescription:
      "A focused 12-week online coaching block to kick-start your transformation.",
    fullDescription:
      "A comprehensive 12-week online coaching program designed to establish sustainable habits, build a strong foundation and deliver measurable results. Throughout the program you'll receive structured guidance, personalized support and accountability to help you achieve your goals. " +
      ONLINE_NOTE,
    features: SHARED_FEATURES,
    goalTags: ["fat-loss", "muscle-gain", "lifestyle"],
    price: 45000,
    currency: "INR",
    billingPeriod: "one-time",
    popular: false,
    displayOrder: 1,
    image: "/images/programs/transformation-12wk-card.jpg",
  },
  {
    slug: "24-weeks",
    title: "24 Weeks Package",
    durationLabel: "24 Weeks",
    shortDescription:
      "Our most popular plan — six months of personalized coaching designed to help you achieve a complete, lasting transformation.",
    fullDescription:
      "The ideal coaching duration for most clients. Six months provides the time needed to achieve meaningful body composition, build sustainable habits, and create results that last. It's the option I recommend most often — and where the majority of clients see their best outcomes. " +
      ONLINE_NOTE,
    features: SHARED_FEATURES,
    goalTags: ["fat-loss", "muscle-gain", "recomp", "lifestyle"],
    price: 80000,
    currency: "INR",
    billingPeriod: "one-time",
    popular: true,
    displayOrder: 2,
    image: "/images/programs/transformation-24wk-card.jpg",
  },
  {
    slug: "52-weeks",
    title: "52 Weeks Package",
    durationLabel: "52 Weeks",
    shortDescription:
      "A full year of dedicated coaching for the most ambitious, life-changing goals — ideal for those with significant weight to lose, individuals requiring long-term support, or anyone seeking a complete transformation.",
    fullDescription:
      "A full year of dedicated online coaching designed for those with significant weight-loss goals, individuals requiring long-term support, or anyone committed to a complete transformation. This package is ideal for achieving substantial, sustainable weight loss, improving overall health, and building lifelong habits through personalized coaching and accountability. " +
      ONLINE_NOTE,
    features: SHARED_FEATURES,
    goalTags: ["fat-loss", "muscle-gain", "recomp", "lifestyle"],
    price: 120000,
    currency: "INR",
    billingPeriod: "one-time",
    popular: false,
    displayOrder: 3,
    image: "/images/programs/transformation-52wk-card.jpg",
  },
];

/* ------------------------------------------------------------------ */
/*  Consultation (paid discovery call)                                 */
/* ------------------------------------------------------------------ */
export const consultation = {
  price: 3000,
  currency: "INR",
  durationLabel: "30–45 min",
  note: "If you choose to enrol afterwards, your entire consultation fee is deducted from your coaching package, so you only pay the remaining balance.",
};

/* ------------------------------------------------------------------ */
/*  Testimonials — real client quotes with before/after collages.      */
/*  Names withheld until the client supplies them (edit in /admin).    */
/* ------------------------------------------------------------------ */
export const testimonials: Testimonial[] = [
  {
    id: "q1",
    clientName: "Boring Basics Client",
    image: "/images/testimonials/transformation-26kg.jpg",
    quote:
      "Satya helped me achieve what I couldn't on my own — consistent progress. His personalized guidance, accountability, and unwavering support kept me motivated throughout my transformation. If you're serious about changing your physique and building lasting habits, I can't recommend him enough.",
    rating: 5,
    result: "Lost 26 kg",
    featured: true,
  },
  {
    id: "q2",
    clientName: "Boring Basics Client",
    image: "/images/testimonials/transformation-11kg-13wk.jpg",
    quote:
      "I found Satya through Instagram, and working with him has been one of the best decisions for my fitness journey. His personalized plans, regular check-ins, and consistent accountability kept me on track and motivated throughout. His knowledge, patience, and genuine commitment helped me build confidence and make real progress. I highly recommend Satya to anyone looking for a coach who truly cares about their long-term success.",
    rating: 5,
    result: "Lost 11 kg in 13 weeks",
    featured: true,
  },
  {
    id: "q3",
    clientName: "Boring Basics Client",
    image: "/images/testimonials/transformation-13kg-24wk.jpg",
    quote:
      "Over the past six months, Satya helped me lose 13 kg and completely transform my confidence. His personalized coaching, regular accountability, and timely adjustments to my training and nutrition made the journey sustainable and enjoyable. I've learned so much throughout the process, and it's incredibly rewarding to inspire others with my own transformation. I highly recommend Satya to anyone looking for lasting results and a coach who genuinely supports you every step of the way.",
    rating: 5,
    result: "Lost 13 kg in 24 weeks",
    featured: true,
  },
  {
    id: "q4",
    clientName: "Boring Basics Client",
    image: "/images/testimonials/transformation-27kg-36wk.jpg",
    quote:
      "With Satya's coaching, I went from 96 kg to 69 kg through a practical, sustainable approach to fitness. His deep knowledge, personalized guidance, and ability to make complex concepts easy to understand kept me motivated every step of the way. If you're looking for a coach who genuinely cares about your long-term success, he's the right choice.",
    rating: 5,
    result: "96 kg → 69 kg in 36 weeks",
    featured: true,
  },
  {
    id: "q5",
    clientName: "Boring Basics Client",
    image: "/images/testimonials/transformation-16kg-18wk.jpg",
    quote:
      "Working with Satya has been truly transformative. Beyond personalized nutrition and training, he helped me build sustainable habits, understand my body, and make better long-term decisions. His regular check-ins, thoughtful plan adjustments, and constant guidance made the journey achievable and led to noticeable, lasting changes. I highly recommend him to anyone looking for real, sustainable results.",
    rating: 5,
    result: "Lost 16 kg in 18 weeks",
    featured: true,
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ                                                                */
/* ------------------------------------------------------------------ */
export const faqs: Faq[] = [
  {
    question: "How does the consultation call work?",
    answer:
      "Start with a 30–45-minute consultation call for ₹3,000 to discuss your fitness goals, health history, lifestyle and the best strategy to help you achieve lasting results. If you choose to enrol afterwards, your entire consultation fee is deducted from your coaching package, so you only pay the remaining balance.",
    category: "Consultation Call",
  },
  {
    question: "What's included in the coaching?",
    answer:
      "Every package includes a customized nutrition plan, a personalized training program, daily workout video reviews with individualized feedback, comprehensive progress tracking (daily weight, steps, sleep, hydration and digestion, plus monthly measurements and photos), a personalized supplement protocol based on a full review of your blood work, a weekly 1-on-1 coaching call and ongoing WhatsApp support during IST business hours.",
    category: "Services Provided",
  },
  {
    question: "Is this online or in-person coaching?",
    answer:
      "Coaching is fully online and does not include 1-on-1 video consultations or in-person personal training sessions. Everything is delivered through your custom plans, daily tracking, ongoing WhatsApp support and your weekly 1-on-1 coaching call.",
    category: "Services Provided",
  },
  {
    question: "What packages do you offer?",
    answer:
      "Three online coaching packages: 12 Weeks, 24 Weeks (our most popular) and 52 Weeks. Each carries the same comprehensive support — the longer plans simply give you more time for a complete, lasting transformation. Book a consultation to find the right fit and pricing.",
    category: "Package Details",
  },
  {
    question: "Who do you work with?",
    answer:
      "People chasing fat loss, muscle building and photoshoot-ready physiques, as well as those managing lifestyle disorders like diabetes, high blood pressure and PCOS. Beginners are very welcome.",
    category: "Package Details",
  },
  {
    question: "Do you need my blood work?",
    answer:
      "Yes — your nutrition plan and supplement protocol are built around your latest blood work so everything is tailored and safe for you. We'll guide you on exactly what's needed during your consultation.",
    category: "Services Provided",
  },
];

/* ------------------------------------------------------------------ */
/*  Social links                                                       */
/* ------------------------------------------------------------------ */
export const socials: SocialLink[] = [
  {
    platform: "Instagram",
    url: "https://www.instagram.com/satya_muddena",
    handle: "@satya_muddena",
    followers: 75000,
  },
];

/* ------------------------------------------------------------------ */
/*  Site-wide constants                                                */
/* ------------------------------------------------------------------ */
export const site = {
  name: trainer.brand,
  title: `${trainer.brand} — ${trainer.tagline} | ${trainer.fullName}`,
  description: trainer.shortBio,
  /** Update to the live domain before launch. */
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.boringbasics.fit",
  ogImage: "/brand/boring-basics-primary.jpeg",
  logoPath: "/brand/boring-basics-mark-client.png",
  notificationLogoPath: "/brand/boring-basics-logo.svg",
  iconPath: "/brand/boring-basics-mark-client.png",
  accentColor: "#ff5a0a",
  backgroundColor: "#0a0a0b",
  foregroundColor: "#f4f4f5",
  emailSenderName: "Boring Basics",
  keywords: [
    "online fitness trainer",
    "personal trainer Hyderabad",
    "fat loss coach",
    "muscle building",
    "online nutrition coach",
    "PCOS fitness",
    "diabetes lifestyle coaching",
    "Boring Basics",
    "Satya Muddena",
  ],
  whatsappLink: `https://wa.me/${trainer.whatsapp}`,
  /** Label used by every call-booking button — editable in /admin/settings. */
  ctaLabel: "Book a Consultation",
  /** Calendly scheduling link — embedded on /contact; editable in /admin/settings. */
  calendlyUrl: "https://calendly.com/satya-muddena/consultationcall",
  /** Home-page headlines — *word* renders in the accent colour; editable in /admin/settings. */
  heroHeadline: "Build Better *Health* — Inside and Out.",
  aboutHeading: "Coaching that's personalized, *science-based* & sustainable.",
  /** Page keys hidden from nav/sitemap — editable in /admin/settings. */
  hiddenPages: [] as string[],
  /** First-visit popup on the home page — editable in /admin/settings. */
  popup: {
    enabled: true,
    title: "Your transformation starts with a call",
    body: "One-on-one with Coach Satya — we go through your goals, lifestyle and blood work, then map the exact plan that gets you there.",
    slots: "Mon–Sat, 4:00 PM – 8:00 PM (IST)",
    note: "Strictly one-on-one. Your goals, your plan — undivided attention.",
    delaySeconds: 2,
  },
};

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Programs", href: "/programs" },
  { label: "Testimonials", href: "/testimonials" },
  { label: "Tools", href: "/tools" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

/** Helpers */
export const goalLabels: Record<Goal, string> = {
  "fat-loss": "Fat Loss",
  "muscle-gain": "Muscle Gain",
  recomp: "Recomposition",
  lifestyle: "Lifestyle / Health",
};
