import { DEFAULT_SITE } from "@/lib/branches";

/**
 * Bundled defaults for the kiosk. These slides and purposes are the fallback
 * content the kiosk shows until the company's own records have loaded.
 */

export const FALLBACK_SETTINGS = {
  company_name: "Visitor Log Book",
  site_name: DEFAULT_SITE,
  logo_url: "",
  welcome_message: "Welcome, {name}",
  redirect_seconds: 5,
  idle_reset_seconds: 60,
  require_consent: true,
  privacy_notice_text:
    "We record your name, contact details and the purpose of your visit so that we always know who is on the premises, for fire safety and building security.\n\nYour details are used only for that visitor record and for anonymous visitor statistics. They are stored securely, are never shared with third parties, and are deleted once they are no longer required.\n\nYou may ask reception to view, correct or delete your record at any time.",
  retention_days: 730,
  contact_email: "",
  opening_hours: "Mon–Fri 08:00–17:00",
};

export const FALLBACK_REASONS = [
  { label: "Meeting", icon: "users", sort_order: 1, is_active: true },
  { label: "Interview", icon: "user", sort_order: 2, is_active: true },
  { label: "Delivery / courier", icon: "package", sort_order: 3, is_active: true },
  { label: "Maintenance / contractor", icon: "wrench", sort_order: 4, is_active: true },
  { label: "Site visit / tour", icon: "map", sort_order: 5, is_active: true },
  { label: "Event", icon: "calendar", sort_order: 6, is_active: true },
  { label: "Other", icon: "more", sort_order: 7, is_active: true },
];

export const FALLBACK_SLIDES = [
  {
    eyebrow: "Visitor Log Book",
    title: "Welcome to *our premises*",
    subtitle: "Please sign in at reception before you head through.",
    image_url:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Bright modern office reception lounge",
    credit: "Unsplash",
    sort_order: 1,
    is_active: true,
    duration_seconds: 6,
  },
  {
    eyebrow: "Health & safety",
    title: "Know your *nearest exit*",
    subtitle: "In an emergency, follow the green signs and assemble outside.",
    image_url:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Contemporary office interior with glass walls",
    credit: "Unsplash",
    sort_order: 2,
    is_active: true,
    duration_seconds: 6,
  },
  {
    eyebrow: "On site today",
    title: "Please *wear your badge*",
    subtitle: "Visitor badges stay visible for the whole visit.",
    image_url:
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Team working together in a bright meeting room",
    credit: "Unsplash",
    sort_order: 3,
    is_active: true,
    duration_seconds: 6,
  },
  {
    eyebrow: "Thank you",
    title: "Have a *productive visit*",
    subtitle: "Reception is here if you need anything at all.",
    image_url:
      "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1600&q=80",
    image_alt: "Open plan office with desks and natural light",
    credit: "Unsplash",
    sort_order: 4,
    is_active: true,
    duration_seconds: 6,
  },
];