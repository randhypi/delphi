"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { CityItem } from "@/types";
import { formatIDR, formatNumber } from "@/lib/api";

// Hardcoded coordinates for Indonesian cities (lat, lon)
const CITY_COORDS: Record<string, [number, number]> = {
  // Sulawesi
  "KOTA MANADO": [-1.4748, 124.8421],
  "MANADO": [-1.4748, 124.8421],
  "KOTA MAKASSAR": [-5.1477, 119.4327],
  "MAKASSAR": [-5.1477, 119.4327],
  "KOTA KENDARI": [-3.9985, 122.5129],
  "KENDARI": [-3.9985, 122.5129],
  "KOTA PALU": [-0.8917, 119.8707],
  "PALU": [-0.8917, 119.8707],
  "KOTA GORONTALO": [0.5435, 123.0595],
  "GORONTALO": [0.5435, 123.0595],
  // Kalimantan
  "KOTA BALIKPAPAN": [-1.2379, 116.8529],
  "BALIKPAPAN": [-1.2379, 116.8529],
  "KOTA SAMARINDA": [-0.5022, 117.1536],
  "SAMARINDA": [-0.5022, 117.1536],
  "KOTA BANJARMASIN": [-3.3194, 114.5900],
  "BANJARMASIN": [-3.3194, 114.5900],
  "KOTA PONTIANAK": [-0.0263, 109.3425],
  "PONTIANAK": [-0.0263, 109.3425],
  "PASER": [-1.5833, 116.0833],
  "PENAJAM": [-1.5000, 116.3900],
  "KUTAI": [-0.5000, 116.7500],
  // Jawa
  "KOTA JAKARTA": [-6.2088, 106.8456],
  "JAKARTA": [-6.2088, 106.8456],
  "DKI JAKARTA": [-6.2088, 106.8456],
  "KOTA SURABAYA": [-7.2575, 112.7521],
  "SURABAYA": [-7.2575, 112.7521],
  "KOTA BANDUNG": [-6.9175, 107.6191],
  "BANDUNG": [-6.9175, 107.6191],
  "KOTA SEMARANG": [-7.0051, 110.4381],
  "SEMARANG": [-7.0051, 110.4381],
  "KOTA YOGYAKARTA": [-7.7956, 110.3695],
  "YOGYAKARTA": [-7.7956, 110.3695],
  "KOTA MALANG": [-7.9797, 112.6304],
  "MALANG": [-7.9797, 112.6304],
  // Sumatra
  "KOTA MEDAN": [3.5952, 98.6722],
  "MEDAN": [3.5952, 98.6722],
  "KOTA PALEMBANG": [-2.9761, 104.7754],
  "PALEMBANG": [-2.9761, 104.7754],
  "KOTA PEKANBARU": [0.5103, 101.4481],
  "PEKANBARU": [0.5103, 101.4481],
  "KOTA PADANG": [-0.9493, 100.3543],
  "PADANG": [-0.9493, 100.3543],
  // Bali & NTT
  "KOTA DENPASAR": [-8.6705, 115.2126],
  "DENPASAR": [-8.6705, 115.2126],
  "BALI": [-8.4095, 115.1889],
  // Papua
  "KOTA JAYAPURA": [-2.5337, 140.7181],
  "JAYAPURA": [-2.5337, 140.7181],
  // Maluku
  "KOTA AMBON": [-3.6954, 128.1814],
  "AMBON": [-3.6954, 128.1814],
};

function getColor(successRate: number): string {
  if (successRate >= 85) return "#10b981";
  if (successRate >= 70) return "#f59e0b";
  return "#ef4444";
}

function getRadius(totalTrx: number, maxTrx: number): number {
  const normalized = totalTrx / maxTrx;
  return Math.max(6, Math.min(40, normalized * 40));
}

interface Props {
  data: CityItem[];
}

export default function CityMap({ data }: Props) {
  const maxTrx = Math.max(...data.map((d) => d.total_trx), 1);

  const mappedCities = data
    .map((city) => {
      const coords = CITY_COORDS[city.city.toUpperCase()];
      if (!coords) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[CityMap] No coordinates for city: "${city.city}"`);
        }
        return null;
      }
      return { ...city, coords };
    })
    .filter(Boolean) as (CityItem & { coords: [number, number] })[];

  return (
    <MapContainer
      center={[-2.5, 118.0]}
      zoom={5}
      style={{ height: "100%", width: "100%", borderRadius: "16px" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {mappedCities.map((city) => (
        <CircleMarker
          key={city.city}
          center={city.coords}
          radius={getRadius(city.total_trx, maxTrx)}
          pathOptions={{
            color: getColor(city.success_rate),
            fillColor: getColor(city.success_rate),
            fillOpacity: 0.7,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm min-w-[180px]">
              <p className="font-semibold text-slate-800 mb-2">{city.city}</p>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Total Transaksi</span>
                  <span className="font-mono font-medium">{formatNumber(city.total_trx)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Revenue</span>
                  <span className="font-mono font-medium">{formatIDR(city.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Terminals</span>
                  <span className="font-mono font-medium">{formatNumber(city.terminal_count)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className={`font-mono font-semibold ${city.success_rate >= 85 ? "text-emerald-600" : city.success_rate >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {city.success_rate}%
                  </span>
                </div>
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
