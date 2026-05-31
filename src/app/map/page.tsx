"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Minimal typings for the CDN-loaded Leaflet global (we only use a few calls).
interface LeafletMap {
  setView(center: [number, number], zoom: number): LeafletMap;
  remove(): void;
}
interface LeafletLayer {
  addTo(map: LeafletMap): LeafletLayer;
  bindPopup(html: string): LeafletLayer;
}
interface Leaflet {
  map(el: HTMLElement, opts?: Record<string, unknown>): LeafletMap;
  tileLayer(url: string, opts?: Record<string, unknown>): LeafletLayer;
  circleMarker(latlng: [number, number], opts?: Record<string, unknown>): LeafletLayer;
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<Leaflet> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { L?: Leaflet };
    if (w.L) return resolve(w.L);

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve((window as unknown as { L: Leaflet }).L));
      existing.addEventListener("error", () => reject(new Error("Failed to load Leaflet")));
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve((window as unknown as { L: Leaflet }).L);
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });
}

interface MapPoint {
  city: string;
  state: string | null;
  count: number;
  interested: number;
  replied: number;
  lat: number;
  lng: number;
}

interface MapData {
  points: MapPoint[];
  totalLeads: number;
  totalCities: number;
  totalStates: number;
}

// Colors mirror the mockup legend: best sentiment per city.
const COLOR_INTERESTED = "#7cb842"; // green — has an interested lead
const COLOR_CONTACTED = "#e8a020"; // amber — contacted, no reply yet
const COLOR_UNCONTACTED = "#888"; // gray — not yet contacted

function markerColor(p: MapPoint): string {
  if (p.interested > 0) return COLOR_INTERESTED;
  if (p.replied > 0) return COLOR_CONTACTED;
  return COLOR_UNCONTACTED;
}

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch("/api/map")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Failed to load map data"));
  }, []);

  useEffect(() => {
    if (!data || !containerRef.current || error) return;
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = L.map(containerRef.current, {
          scrollWheelZoom: true,
          attributionControl: false,
        }).setView([39.5, -96], 4);
        mapRef.current = map;

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
        }).addTo(map);

        for (const p of data.points) {
          const color = markerColor(p);
          const radius = Math.max(6, Math.min(20, Math.sqrt(p.count) * 2.4));
          const best =
            p.interested > 0
              ? `${p.interested} interested`
              : p.replied > 0
                ? "contacted"
                : "queued";
          L.circleMarker([p.lat, p.lng], {
            radius,
            color,
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.35,
          })
            .addTo(map)
            .bindPopup(
              `<div class="map-pop-name">${p.city}</div>` +
                `<div class="map-pop-meta">${p.count} lead${p.count === 1 ? "" : "s"} · ${best}</div>`
            );
        }
      })
      .catch(() => setError("Could not load the map library (needs internet access)."));

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [data, error]);

  // Derive the top market and untapped (not-contacted) count from the points.
  const { topMarket, untapped } = useMemo(() => {
    const points = data?.points ?? [];
    let top: MapPoint | null = null;
    let notContacted = 0;
    for (const p of points) {
      if (!top || p.count > top.count) top = p;
      if (p.interested === 0 && p.replied === 0) notContacted += 1;
    }
    return { topMarket: top, untapped: notContacted };
  }, [data]);

  return (
    <div>
      <div className="stat-row cols4">
        <div className="stat">
          <div className="stat-l">States covered</div>
          <div className="stat-v">{data?.totalStates ?? "—"}</div>
          <div className="stat-s">of 50</div>
        </div>
        <div className="stat">
          <div className="stat-l">Cities</div>
          <div className="stat-v">{data?.totalCities ?? "—"}</div>
          <div className="stat-s">with ≥1 lead</div>
        </div>
        {topMarket ? (
          <div className="stat featured">
            <div className="stat-l">Top market</div>
            <div className="stat-v" style={{ fontSize: 18 }}>
              {topMarket.city}
            </div>
            <div className="stat-s">
              {topMarket.count} lead{topMarket.count === 1 ? "" : "s"}
            </div>
          </div>
        ) : (
          <div className="stat">
            <div className="stat-l">Top market</div>
            <div className="stat-v">—</div>
            <div className="stat-s">no leads yet</div>
          </div>
        )}
        <div className="stat">
          <div className="stat-l">Untapped metros</div>
          <div className="stat-v">{data ? untapped : "—"}</div>
          <div className="stat-s">not contacted yet</div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <div>
            <div className="card-t">National coverage</div>
            <div className="card-s">
              every lead pinned by city · color = best sentiment in that city
            </div>
          </div>
        </div>
        {error ? (
          <div
            style={{
              height: 340,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: "var(--ink-3)",
              background: "var(--surface-2)",
            }}
          >
            {error}
          </div>
        ) : (
          <div
            id="coverage-map"
            ref={containerRef}
            style={{
              height: 340,
              borderRadius: 8,
              overflow: "hidden",
              background: "var(--surface-2)",
            }}
          />
        )}
        <div className="map-legend">
          <div className="map-legend-item">
            <div className="legend-dot" style={{ background: "var(--green)" }} /> Has interested lead
          </div>
          <div className="map-legend-item">
            <div className="legend-dot" style={{ background: "var(--amber)" }} /> Contacted, no reply yet
          </div>
          <div className="map-legend-item">
            <div className="legend-dot" style={{ background: "var(--ink-3)" }} /> Not yet contacted
          </div>
        </div>
      </div>
    </div>
  );
}
