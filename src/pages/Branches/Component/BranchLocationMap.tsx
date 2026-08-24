import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L, { type LeafletMouseEvent } from "leaflet";

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 13;

type BranchLocationMapProps = {
  latitude: string;
  longitude: string;
  onLocationSelect?: (lat: number, lng: number) => void | Promise<void>;
  height?: string;
  center?: [number, number];
  /** When true, map is view-only (no click handler, no hint text) */
  readOnly?: boolean;
};

function LocationClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (lat: number, lng: number) => void | Promise<void>;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });
  return null;
}

function OpenInGoogleMapsHandler({ lat, lng }: { lat: number; lng: number }) {
  useMapEvents({
    click() {
      const url = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
  });
  return null;
}

export default function BranchLocationMap({
  latitude,
  longitude,
  onLocationSelect,
  height = "220px",
  center,
  readOnly = false,
}: BranchLocationMapProps) {
  const { t } = useTranslation("branches");
  const lat = latitude ? parseFloat(String(latitude).trim()) : NaN;
  const lng = longitude ? parseFloat(String(longitude).trim()) : NaN;
  const hasPosition = !Number.isNaN(lat) && !Number.isNaN(lng);
  const position: [number, number] = hasPosition ? [lat, lng] : (center ?? DEFAULT_CENTER);

  const markerIcon = useRef(
    L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    })
  );

  return (
    // Geographic/map content never mirrors, even in an RTL app.
    <div dir="ltr" className="rounded-md border overflow-hidden" style={{ height }}>
      <MapContainer
        key={`${latitude}-${longitude}-${center?.[0] ?? ""}-${center?.[1] ?? ""}`}
        center={position}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!readOnly && onLocationSelect && <LocationClickHandler onLocationSelect={onLocationSelect} />}
        {readOnly && hasPosition && <OpenInGoogleMapsHandler lat={lat} lng={lng} />}
        {hasPosition && <Marker position={position} icon={markerIcon.current} />}
      </MapContainer>
      {!readOnly && (
        <p className="text-xs text-muted-foreground px-2 py-1 bg-muted/50">
          {t("map.clickToSetHint")}
        </p>
      )}
      {readOnly && hasPosition && (
        <p className="text-xs text-muted-foreground px-2 py-1 bg-muted/50">
          {t("map.clickToOpenGoogleMapsHint")}
        </p>
      )}
    </div>
  );
}
