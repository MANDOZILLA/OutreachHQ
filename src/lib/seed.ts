import { getDb } from "./db";
import { computeLeadScore, mentionsCompetitorPos, type LeadSignals } from "./scoring";

interface SampleLead {
  name: string;
  city: string;
  state: string;
  cuisine: string;
  price_level: string;
  rating: number;
  score: number;
  tier: string;
  hook_type: string;
  hook_text: string;
  email_address: string;
  status: string;
  emailed_at?: string;
  replied_at?: string;
  opted_out?: boolean;
  // Lead-scoring signals (1–10 score derived from these)
  hasWebsite: boolean;
  hasPhone: boolean;
  hasReviews: boolean;
  usesCompetitorPos: boolean;
}

const sampleLeads: SampleLead[] = [
  { name: "Oleana", city: "Cambridge MA", state: "MA", cuisine: "Mediterranean", price_level: "$$", rating: 4.1, score: 82, tier: "hot", hook_type: "Mid price", hook_text: "Mid-price angle — room to raise cold brew price", email_address: "ana@oleanarestaurant.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-22 07:30:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Waypoint", city: "Cambridge MA", state: "MA", cuisine: "American", price_level: "$$", rating: 3.8, score: 78, tier: "hot", hook_type: "Low rating", hook_text: "Low rating — inconsistent stock causing bad reviews", email_address: "info@waypoint.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-22 05:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Little Donkey", city: "Cambridge MA", state: "MA", cuisine: "American", price_level: "$$$", rating: 4.3, score: 71, tier: "hot", hook_type: "High price", hook_text: "High price — signature dish stockout risk", email_address: "chef@littledonkey.com", status: "needs_info", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-21 10:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: true },
  { name: "Area Four", city: "Cambridge MA", state: "MA", cuisine: "Italian", price_level: "$$", rating: 3.9, score: 76, tier: "hot", hook_type: "Low rating", hook_text: "Low rating — wait times and stockouts", email_address: "jeff@areafour.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-20 14:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Tatte Bakery", city: "Boston MA", state: "MA", cuisine: "Mediterranean", price_level: "$$", rating: 4.2, score: 68, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — competitor pricing gap", email_address: "hello@tattebakery.com", status: "needs_info", emailed_at: "2026-05-17 09:00:00", replied_at: "2026-05-19 11:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: true },
  { name: "Harvest", city: "Cambridge MA", state: "MA", cuisine: "American", price_level: "$$$", rating: 4.4, score: 52, tier: "warm", hook_type: "High price", hook_text: "High price angle", email_address: "info@harvestcambridge.com", status: "not_interested", emailed_at: "2026-05-16 09:00:00", replied_at: "2026-05-18 09:00:00", opted_out: true, hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Giulia", city: "Cambridge MA", state: "MA", cuisine: "Italian", price_level: "$$$", rating: 4.3, score: 64, tier: "warm", hook_type: "High price", hook_text: "High price — consistency angle", email_address: "info@giuliarestaurant.com", status: "not_interested", emailed_at: "2026-05-15 09:00:00", replied_at: "2026-05-17 09:00:00", opted_out: true, hasWebsite: true, hasPhone: false, hasReviews: true, usesCompetitorPos: true },
  { name: "Sarma", city: "Somerville MA", state: "MA", cuisine: "Mediterranean", price_level: "$$", rating: 4.5, score: 60, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — popular meze items running low", email_address: "hi@sarmarestaurant.com", status: "emailed", emailed_at: "2026-05-18 09:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Loyal Nine", city: "Cambridge MA", state: "MA", cuisine: "American", price_level: "$$", rating: 4.0, score: 55, tier: "warm", hook_type: "Low rating", hook_text: "Low rating — menu consistency issues", email_address: "info@loyalnine.com", status: "emailed", emailed_at: "2026-05-18 09:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Pammy's", city: "Cambridge MA", state: "MA", cuisine: "Italian", price_level: "$$$", rating: 4.4, score: 74, tier: "hot", hook_type: "High price", hook_text: "High price — pasta import costs rising", email_address: "hello@pammyscambridge.com", status: "not_emailed", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "The Smoke Shop", city: "Cambridge MA", state: "MA", cuisine: "BBQ", price_level: "$$", rating: 4.1, score: 58, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — brisket sourcing costs", email_address: "info@thesmokeshopbbq.com", status: "not_emailed", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: true },
  { name: "Alden & Harlow", city: "Cambridge MA", state: "MA", cuisine: "American", price_level: "$$$", rating: 4.2, score: 70, tier: "hot", hook_type: "High price", hook_text: "High price — craft cocktail ingredient costs", email_address: "info@aldenharlow.com", status: "not_emailed", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Bondir", city: "Cambridge MA", state: "MA", cuisine: "French", price_level: "$$$$", rating: 4.5, score: 45, tier: "cold", hook_type: "High price", hook_text: "High price — seasonal sourcing", email_address: "info@bondircambridge.com", status: "not_emailed", hasWebsite: true, hasPhone: false, hasReviews: true, usesCompetitorPos: false },
  { name: "Café Sushi", city: "Cambridge MA", state: "MA", cuisine: "Japanese", price_level: "$$", rating: 3.7, score: 72, tier: "hot", hook_type: "Low rating", hook_text: "Low rating — wait time and fish freshness concerns", email_address: "owner@cafesushi.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-22 09:13:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Park Restaurant", city: "Brookline MA", state: "MA", cuisine: "American", price_level: "$$", rating: 4.0, score: 50, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — brunch demand exceeding supply", email_address: "info@parkrestaurant.com", status: "emailed", emailed_at: "2026-05-20 09:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: true },

  // National coverage — leads across the US so the coverage map has spread.
  { name: "Gramercy Tavern", city: "New York NY", state: "NY", cuisine: "American", price_level: "$$$", rating: 4.4, score: 80, tier: "hot", hook_type: "High price", hook_text: "High price — premium ingredient stock control", email_address: "info@gramercytavern.com", status: "interested", emailed_at: "2026-05-21 09:00:00", replied_at: "2026-05-23 12:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Roberta's", city: "Brooklyn NY", state: "NY", cuisine: "Italian", price_level: "$$", rating: 4.3, score: 66, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — pizza flour cost swings", email_address: "hello@robertaspizza.com", status: "emailed", emailed_at: "2026-05-21 09:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: true },
  { name: "Zuni Café", city: "San Francisco CA", state: "CA", cuisine: "American", price_level: "$$$", rating: 4.2, score: 73, tier: "hot", hook_type: "High price", hook_text: "High price — roast chicken supply timing", email_address: "info@zunicafe.com", status: "needs_info", emailed_at: "2026-05-20 09:00:00", replied_at: "2026-05-22 16:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Tartine", city: "San Francisco CA", state: "CA", cuisine: "Mediterranean", price_level: "$$", rating: 4.5, score: 69, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — bakery waste at close", email_address: "hello@tartinebakery.com", status: "emailed", emailed_at: "2026-05-20 09:00:00", hasWebsite: true, hasPhone: false, hasReviews: true, usesCompetitorPos: true },
  { name: "Bestia", city: "Los Angeles CA", state: "CA", cuisine: "Italian", price_level: "$$$", rating: 4.4, score: 77, tier: "hot", hook_type: "High price", hook_text: "High price — house charcuterie inventory", email_address: "info@bestiala.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-21 18:30:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Girl & the Goat", city: "Chicago IL", state: "IL", cuisine: "American", price_level: "$$$", rating: 4.3, score: 71, tier: "hot", hook_type: "Mid price", hook_text: "Mid-price — shared plates portioning", email_address: "info@girlandthegoat.com", status: "emailed", emailed_at: "2026-05-18 09:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Franklin Barbecue", city: "Austin TX", state: "TX", cuisine: "BBQ", price_level: "$$", rating: 4.7, score: 63, tier: "warm", hook_type: "Low rating", hook_text: "Sells out daily — demand forecasting fit", email_address: "info@franklinbbq.com", status: "interested", emailed_at: "2026-05-18 09:00:00", replied_at: "2026-05-20 08:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Canlis", city: "Seattle WA", state: "WA", cuisine: "American", price_level: "$$$$", rating: 4.6, score: 59, tier: "warm", hook_type: "High price", hook_text: "High price — fine-dining waste reduction", email_address: "info@canlis.com", status: "not_emailed", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Pok Pok", city: "Portland OR", state: "OR", cuisine: "Thai", price_level: "$$", rating: 4.0, score: 54, tier: "warm", hook_type: "Low rating", hook_text: "Low rating — ingredient consistency", email_address: "info@pokpokpdx.com", status: "emailed", emailed_at: "2026-05-17 09:00:00", hasWebsite: true, hasPhone: false, hasReviews: true, usesCompetitorPos: true },
  { name: "Mizuna", city: "Denver CO", state: "CO", cuisine: "American", price_level: "$$$", rating: 4.2, score: 48, tier: "cold", hook_type: "High price", hook_text: "High price — tasting menu sourcing", email_address: "info@mizunadenver.com", status: "not_emailed", hasWebsite: true, hasPhone: true, hasReviews: false, usesCompetitorPos: false },
  { name: "Joe's Stone Crab", city: "Miami FL", state: "FL", cuisine: "American", price_level: "$$$", rating: 4.3, score: 67, tier: "warm", hook_type: "Mid price", hook_text: "Seasonal stone crab supply planning", email_address: "info@joesstonecrab.com", status: "not_interested", emailed_at: "2026-05-16 09:00:00", replied_at: "2026-05-18 13:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: true },
  { name: "Zahav", city: "Philadelphia PA", state: "PA", cuisine: "Mediterranean", price_level: "$$$", rating: 4.6, score: 75, tier: "hot", hook_type: "High price", hook_text: "High price — lamb sourcing costs", email_address: "info@zahavrestaurant.com", status: "interested", emailed_at: "2026-05-16 09:00:00", replied_at: "2026-05-19 09:30:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
  { name: "Rose's Luxury", city: "Washington DC", state: "DC", cuisine: "American", price_level: "$$$", rating: 4.4, score: 62, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — no-reservations demand swings", email_address: "info@rosesluxury.com", status: "emailed", emailed_at: "2026-05-15 09:00:00", hasWebsite: true, hasPhone: true, hasReviews: true, usesCompetitorPos: false },
];

// Map a reply status to a sentiment label (for seeded replied leads).
const STATUS_TO_SENTIMENT: Record<string, string> = {
  interested: "interested",
  needs_info: "not_now",
  not_interested: "hard_no",
};

export function seed() {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM leads").get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO leads (name, city, state, cuisine, price_level, rating, score, tier, hook_type, hook_text,
      email_address, status, emailed_at, replied_at, opted_out, email_body, sentiment,
      has_website, has_phone, has_reviews, uses_competitor_pos, lead_score, sequence_step, first_contacted_at)
    VALUES (@name, @city, @state, @cuisine, @price_level, @rating, @score, @tier, @hook_type, @hook_text,
      @email_address, @status, @emailed_at, @replied_at, @opted_out, @email_body, @sentiment,
      @has_website, @has_phone, @has_reviews, @uses_competitor_pos, @lead_score, @sequence_step, @first_contacted_at)
  `);

  const insertMany = db.transaction((leads: SampleLead[]) => {
    for (const lead of leads) {
      const signals: LeadSignals = {
        hasWebsite: lead.hasWebsite,
        hasPhone: lead.hasPhone,
        hasReviews: lead.hasReviews,
        usesCompetitorPos: lead.usesCompetitorPos || mentionsCompetitorPos(lead.hook_text),
      };
      const replied = !!lead.replied_at;
      insert.run({
        name: lead.name,
        city: lead.city,
        state: lead.state,
        cuisine: lead.cuisine,
        price_level: lead.price_level,
        rating: lead.rating,
        score: lead.score,
        tier: lead.tier,
        hook_type: lead.hook_type,
        hook_text: lead.hook_text,
        email_address: lead.email_address,
        status: lead.status,
        emailed_at: lead.emailed_at || null,
        replied_at: lead.replied_at || null,
        opted_out: lead.opted_out ? 1 : 0,
        sentiment: replied ? STATUS_TO_SENTIMENT[lead.status] || "not_now" : null,
        has_website: signals.hasWebsite ? 1 : 0,
        has_phone: signals.hasPhone ? 1 : 0,
        has_reviews: signals.hasReviews ? 1 : 0,
        uses_competitor_pos: signals.usesCompetitorPos ? 1 : 0,
        lead_score: computeLeadScore(signals),
        // A reply means at least the intro went out; mark step 1 so the
        // sequencer treats the intro as sent.
        sequence_step: lead.emailed_at ? 1 : 0,
        first_contacted_at: lead.emailed_at || null,
        email_body: `Hi ${lead.name} team,\n\nI noticed your restaurant has been getting great traction in ${lead.city}. Based on our analysis, we identified an opportunity around ${lead.hook_text?.toLowerCase() || "pricing optimization"}.\n\nStockSense helps restaurants like yours reduce waste and optimize inventory using AI-driven demand forecasting.\n\nWould you be open to a quick 10-minute call this week?\n\nBest,\nArav`,
      });
    }
  });

  insertMany(sampleLeads);

  seedSends(db);
  seedTodayQuota(db);
}

// Seed historical sends with A/B subject variants so the experiments view has
// data. Alternating variants; replied leads count as replies for their variant.
function seedSends(db: ReturnType<typeof getDb>) {
  const emailed = db
    .prepare("SELECT id, name, replied_at FROM leads WHERE emailed_at IS NOT NULL")
    .all() as Array<{ id: number; name: string; replied_at: string | null }>;

  const insertSend = db.prepare(
    "INSERT INTO sends (lead_id, step_index, variant, subject, sent_at, replied, replied_at) VALUES (?, ?, ?, ?, datetime('now', '-7 days'), ?, ?)"
  );
  const tx = db.transaction(() => {
    emailed.forEach((lead, i) => {
      const variant = i % 2 === 0 ? "A" : "B";
      const subject =
        variant === "A"
          ? `Quick question about ${lead.name}`
          : `Cutting food waste at ${lead.name}`;
      const replied = lead.replied_at ? 1 : 0;
      insertSend.run(lead.id, 0, variant, subject, replied, lead.replied_at || null);
    });
  });
  tx();
}

// Seed a realistic "sent today" number so the header quota tracker is non-empty.
function seedTodayQuota(db: ReturnType<typeof getDb>) {
  const day = new Date().toLocaleDateString("en-CA");
  db.prepare(
    "INSERT INTO email_quota (day, sent) VALUES (?, ?) ON CONFLICT(day) DO NOTHING"
  ).run(day, 128);
}
