import { getDb } from "./db";

const sampleLeads = [
  { name: "Oleana", city: "Cambridge MA", cuisine: "Mediterranean", price_level: "$$", rating: 4.1, score: 82, tier: "hot", hook_type: "Mid price", hook_text: "Mid-price angle — room to raise cold brew price", email_address: "ana@oleanarestaurant.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-22 07:30:00" },
  { name: "Waypoint", city: "Cambridge MA", cuisine: "American", price_level: "$$", rating: 3.8, score: 78, tier: "hot", hook_type: "Low rating", hook_text: "Low rating — inconsistent stock causing bad reviews", email_address: "info@waypoint.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-22 05:00:00" },
  { name: "Little Donkey", city: "Cambridge MA", cuisine: "American", price_level: "$$$", rating: 4.3, score: 71, tier: "hot", hook_type: "High price", hook_text: "High price — signature dish stockout risk", email_address: "chef@littledonkey.com", status: "needs_info", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-21 10:00:00" },
  { name: "Area Four", city: "Cambridge MA", cuisine: "Italian", price_level: "$$", rating: 3.9, score: 76, tier: "hot", hook_type: "Low rating", hook_text: "Low rating — wait times and stockouts", email_address: "jeff@areafour.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-20 14:00:00" },
  { name: "Tatte Bakery", city: "Boston MA", cuisine: "Mediterranean", price_level: "$$", rating: 4.2, score: 68, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — competitor pricing gap", email_address: "hello@tattebakery.com", status: "needs_info", emailed_at: "2026-05-17 09:00:00", replied_at: "2026-05-19 11:00:00" },
  { name: "Harvest", city: "Cambridge MA", cuisine: "American", price_level: "$$$", rating: 4.4, score: 52, tier: "warm", hook_type: "High price", hook_text: "High price angle", email_address: "info@harvestcambridge.com", status: "not_interested", emailed_at: "2026-05-16 09:00:00", replied_at: "2026-05-18 09:00:00", opted_out: true },
  { name: "Giulia", city: "Cambridge MA", cuisine: "Italian", price_level: "$$$", rating: 4.3, score: 64, tier: "warm", hook_type: "High price", hook_text: "High price — consistency angle", email_address: "info@giuliarestaurant.com", status: "not_interested", emailed_at: "2026-05-15 09:00:00", replied_at: "2026-05-17 09:00:00", opted_out: true },
  { name: "Sarma", city: "Somerville MA", cuisine: "Mediterranean", price_level: "$$", rating: 4.5, score: 60, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — popular meze items running low", email_address: "hi@sarmarestaurant.com", status: "emailed", emailed_at: "2026-05-18 09:00:00" },
  { name: "Loyal Nine", city: "Cambridge MA", cuisine: "American", price_level: "$$", rating: 4.0, score: 55, tier: "warm", hook_type: "Low rating", hook_text: "Low rating — menu consistency issues", email_address: "info@loyalnine.com", status: "emailed", emailed_at: "2026-05-18 09:00:00" },
  { name: "Pammy's", city: "Cambridge MA", cuisine: "Italian", price_level: "$$$", rating: 4.4, score: 74, tier: "hot", hook_type: "High price", hook_text: "High price — pasta import costs rising", email_address: "hello@pammyscambridge.com", status: "not_emailed" },
  { name: "The Smoke Shop", city: "Cambridge MA", cuisine: "BBQ", price_level: "$$", rating: 4.1, score: 58, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — brisket sourcing costs", email_address: "info@thesmokeshopbbq.com", status: "not_emailed" },
  { name: "Alden & Harlow", city: "Cambridge MA", cuisine: "American", price_level: "$$$", rating: 4.2, score: 70, tier: "hot", hook_type: "High price", hook_text: "High price — craft cocktail ingredient costs", email_address: "info@aldenharlow.com", status: "not_emailed" },
  { name: "Bondir", city: "Cambridge MA", cuisine: "French", price_level: "$$$$", rating: 4.5, score: 45, tier: "cold", hook_type: "High price", hook_text: "High price — seasonal sourcing", email_address: "info@bondircambridge.com", status: "not_emailed" },
  { name: "Café Sushi", city: "Cambridge MA", cuisine: "Japanese", price_level: "$$", rating: 3.7, score: 72, tier: "hot", hook_type: "Low rating", hook_text: "Low rating — wait time and fish freshness concerns", email_address: "owner@cafesushi.com", status: "interested", emailed_at: "2026-05-19 09:00:00", replied_at: "2026-05-22 09:13:00" },
  { name: "Park Restaurant", city: "Brookline MA", cuisine: "American", price_level: "$$", rating: 4.0, score: 50, tier: "warm", hook_type: "Mid price", hook_text: "Mid-price — brunch demand exceeding supply", email_address: "info@parkrestaurant.com", status: "emailed", emailed_at: "2026-05-20 09:00:00" },
];

export function seed() {
  const db = getDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM leads").get() as { c: number }).c;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO leads (name, city, cuisine, price_level, rating, score, tier, hook_type, hook_text, email_address, status, emailed_at, replied_at, opted_out, email_body)
    VALUES (@name, @city, @cuisine, @price_level, @rating, @score, @tier, @hook_type, @hook_text, @email_address, @status, @emailed_at, @replied_at, @opted_out, @email_body)
  `);

  const insertMany = db.transaction((leads: typeof sampleLeads) => {
    for (const lead of leads) {
      insert.run({
        ...lead,
        emailed_at: lead.emailed_at || null,
        replied_at: lead.replied_at || null,
        opted_out: ("opted_out" in lead && lead.opted_out) ? 1 : 0,
        email_body: `Hi ${lead.name} team,\n\nI noticed your restaurant has been getting great traction in ${lead.city}. Based on our analysis, we identified an opportunity around ${lead.hook_text?.toLowerCase() || "pricing optimization"}.\n\nStockSense helps restaurants like yours reduce waste and optimize inventory using AI-driven demand forecasting.\n\nWould you be open to a quick 10-minute call this week?\n\nBest,\nArav`,
      });
    }
  });

  insertMany(sampleLeads);
}
