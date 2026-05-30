"use client";

import { useEffect, useRef, useState } from "react";

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
    if (!data || !containerRef.current) return;
    let cancelled = false;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView([39.5, -98.35], 4);
        mapRef.current = map;

        L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
          attribution: "&copy; OpenStreetMap &copy; CARTO",
          maxZoom: 19,
        }).addTo(map);

        for (const p of data.points) {
          const hasInterest = p.interested > 0;
          const color = hasInterest ? "#22C55E" : p.replied > 0 ? "#F59E0B" : "#3B82F6";
          const radius = Math.min(26, 6 + p.count * 2);
          L.circleMarker([p.lat, p.lng], {
            radius,
            color,
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.35,
          })
            .addTo(map)
            .bindPopup(
              `<strong>${p.city}</strong><br/>${p.count} lead${p.count === 1 ? "" : "s"}` +
                `<br/>${p.replied} replied · ${p.interested} interested`
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
  }, [data]);

  const labelClass = "text-[10px] font-medium text-txt-muted uppercase tracking-widest";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Leads mapped", value: data?.totalLeads ?? "—" },
          { label: "Cities", value: data?.totalCities ?? "—" },
          { label: "States", value: data?.totalStates ?? "—" },
        ].map((s) => (
          <div key={s.label} className="bg-bg-card border border-border-subtle rounded-xl p-4 shadow-card">
            <div className={`${labelClass} mb-2`}>{s.label}</div>
            <div className="text-2xl font-semibold font-mono tracking-tight text-txt-primary">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-bg-card border border-border-subtle rounded-xl p-3 shadow-card">
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className={labelClass}>National coverage</div>
          <div className="flex items-center gap-3 text-[11px] text-txt-tertiary">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green inline-block" /> Interested</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber inline-block" /> Replied</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-accent inline-block" /> Contacted</span>
          </div>
        </div>
        {error ? (
          <div className="h-[520px] flex items-center justify-center text-[13px] text-txt-tertiary">{error}</div>
        ) : (
          <div ref={containerRef} className="h-[520px] w-full rounded-lg overflow-hidden bg-bg-elevated" />
        )}
      </div>
    </div>
  );
}
