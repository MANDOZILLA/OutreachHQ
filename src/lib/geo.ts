// Lightweight geocoder for the national coverage map.
//
// Lead "city" fields look like "Cambridge MA". We resolve them to lat/lng with
// a small built-in lookup of common US cities, falling back to a state-centroid
// table when the exact city isn't known. No network calls — good enough to drop
// a pin in roughly the right place on a Leaflet map.

export type LatLng = { lat: number; lng: number };

// State (or DC) centroids — fallback when the city isn't in CITY_COORDS.
const STATE_CENTROIDS: Record<string, LatLng> = {
  AL: { lat: 32.806, lng: -86.791 }, AK: { lat: 61.370, lng: -152.404 },
  AZ: { lat: 33.729, lng: -111.431 }, AR: { lat: 34.970, lng: -92.373 },
  CA: { lat: 36.116, lng: -119.682 }, CO: { lat: 39.060, lng: -105.311 },
  CT: { lat: 41.598, lng: -72.756 }, DE: { lat: 39.319, lng: -75.507 },
  FL: { lat: 27.766, lng: -81.687 }, GA: { lat: 33.040, lng: -83.643 },
  HI: { lat: 21.094, lng: -157.498 }, ID: { lat: 44.240, lng: -114.479 },
  IL: { lat: 40.350, lng: -88.986 }, IN: { lat: 39.849, lng: -86.258 },
  IA: { lat: 42.011, lng: -93.210 }, KS: { lat: 38.526, lng: -96.726 },
  KY: { lat: 37.668, lng: -84.670 }, LA: { lat: 31.169, lng: -91.867 },
  ME: { lat: 44.693, lng: -69.381 }, MD: { lat: 39.064, lng: -76.802 },
  MA: { lat: 42.230, lng: -71.530 }, MI: { lat: 43.326, lng: -84.536 },
  MN: { lat: 45.694, lng: -93.900 }, MS: { lat: 32.741, lng: -89.678 },
  MO: { lat: 38.456, lng: -92.288 }, MT: { lat: 46.921, lng: -110.454 },
  NE: { lat: 41.125, lng: -98.268 }, NV: { lat: 38.313, lng: -117.055 },
  NH: { lat: 43.452, lng: -71.564 }, NJ: { lat: 40.298, lng: -74.521 },
  NM: { lat: 34.840, lng: -106.248 }, NY: { lat: 42.165, lng: -74.948 },
  NC: { lat: 35.630, lng: -79.806 }, ND: { lat: 47.528, lng: -99.784 },
  OH: { lat: 40.388, lng: -82.764 }, OK: { lat: 35.565, lng: -96.928 },
  OR: { lat: 44.572, lng: -122.071 }, PA: { lat: 40.590, lng: -77.209 },
  RI: { lat: 41.680, lng: -71.511 }, SC: { lat: 33.856, lng: -80.945 },
  SD: { lat: 44.299, lng: -99.438 }, TN: { lat: 35.747, lng: -86.692 },
  TX: { lat: 31.054, lng: -97.563 }, UT: { lat: 40.150, lng: -111.862 },
  VT: { lat: 44.045, lng: -72.710 }, VA: { lat: 37.769, lng: -78.170 },
  WA: { lat: 47.400, lng: -121.490 }, WV: { lat: 38.491, lng: -80.954 },
  WI: { lat: 44.268, lng: -89.616 }, WY: { lat: 42.756, lng: -107.302 },
  DC: { lat: 38.897, lng: -77.026 },
};

// Common cities (lowercased "city st" key).
const CITY_COORDS: Record<string, LatLng> = {
  "cambridge ma": { lat: 42.3736, lng: -71.1097 },
  "boston ma": { lat: 42.3601, lng: -71.0589 },
  "somerville ma": { lat: 42.3876, lng: -71.0995 },
  "brookline ma": { lat: 42.3318, lng: -71.1212 },
  "new york ny": { lat: 40.7128, lng: -74.006 },
  "brooklyn ny": { lat: 40.6782, lng: -73.9442 },
  "san francisco ca": { lat: 37.7749, lng: -122.4194 },
  "los angeles ca": { lat: 34.0522, lng: -118.2437 },
  "chicago il": { lat: 41.8781, lng: -87.6298 },
  "austin tx": { lat: 30.2672, lng: -97.7431 },
  "seattle wa": { lat: 47.6062, lng: -122.3321 },
  "portland or": { lat: 45.5152, lng: -122.6784 },
  "denver co": { lat: 39.7392, lng: -104.9903 },
  "miami fl": { lat: 25.7617, lng: -80.1918 },
  "philadelphia pa": { lat: 39.9526, lng: -75.1652 },
  "washington dc": { lat: 38.9072, lng: -77.0369 },
  "atlanta ga": { lat: 33.749, lng: -84.388 },
  "nashville tn": { lat: 36.1627, lng: -86.7816 },
};

/** Parse a trailing 2-letter state code out of a "City ST" string. */
export function parseState(city: string | null | undefined): string | null {
  if (!city) return null;
  const m = city.trim().match(/\b([A-Za-z]{2})$/);
  if (!m) return null;
  const st = m[1].toUpperCase();
  return STATE_CENTROIDS[st] ? st : null;
}

/**
 * Resolve a "City ST" string to coordinates. Adds a small deterministic jitter
 * for state-centroid fallbacks so multiple cities in one state don't stack on a
 * single pixel.
 */
export function geocodeCity(city: string | null | undefined): LatLng | null {
  if (!city) return null;
  const key = city.trim().toLowerCase();
  if (CITY_COORDS[key]) return CITY_COORDS[key];

  const st = parseState(city);
  if (!st) return null;
  const base = STATE_CENTROIDS[st];

  // Deterministic jitter from the city string so the pin is stable.
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const jLat = ((hash % 100) / 100 - 0.5) * 0.8;
  const jLng = (((hash >> 8) % 100) / 100 - 0.5) * 0.8;
  return { lat: base.lat + jLat, lng: base.lng + jLng };
}
