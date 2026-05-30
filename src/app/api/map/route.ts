import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { geocodeCity } from "@/lib/geo";

export const dynamic = "force-dynamic";

interface CityRow {
  city: string;
  state: string | null;
  count: number;
  interested: number;
  replied: number;
}

// Aggregate leads by city for the national coverage map. Each entry carries a
// resolved lat/lng so the client can drop a Leaflet pin.
export function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT city,
              state,
              COUNT(*) as count,
              SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) as interested,
              SUM(CASE WHEN replied_at IS NOT NULL THEN 1 ELSE 0 END) as replied
       FROM leads
       WHERE deleted_at IS NULL AND city IS NOT NULL
       GROUP BY city`
    )
    .all() as CityRow[];

  const points = rows
    .map((r) => {
      const coords = geocodeCity(r.city);
      if (!coords) return null;
      return {
        city: r.city,
        state: r.state,
        count: r.count,
        interested: r.interested,
        replied: r.replied,
        lat: coords.lat,
        lng: coords.lng,
      };
    })
    .filter(Boolean);

  const states = new Set(rows.map((r) => r.state).filter(Boolean));

  return NextResponse.json({
    points,
    totalLeads: rows.reduce((a, r) => a + r.count, 0),
    totalCities: points.length,
    totalStates: states.size,
  });
}
