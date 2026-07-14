/**
 * Geofencing utilities for Wild Tracker
 * Check if GPS coordinates fall inside defined geofence boundaries.
 */

import type { TrackingEvent } from '../types';

// ── Types ──────────────────────────────────────────────────────────

export interface CircleGeofence {
  type: 'circle';
  centerLat: number;
  centerLng: number;
  radiusKm: number;
}

export interface PolygonGeofence {
  type: 'polygon';
  coordinates: Array<{ lat: number; lng: number }>;
}

export type Geofence = CircleGeofence | PolygonGeofence;

export interface GeofenceCheckResult {
  inside: boolean;
  distanceKm?: number;  // for circle: distance from center
}

// ── Distance (Haversine) ───────────────────────────────────────────

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Point in Circle ────────────────────────────────────────────────

export function checkCircle(lat: number, lng: number, fence: CircleGeofence): GeofenceCheckResult {
  const dist = haversineKm(lat, lng, fence.centerLat, fence.centerLng);
  return { inside: dist <= fence.radiusKm, distanceKm: dist };
}

// ── Point in Polygon (ray casting) ─────────────────────────────────

export function checkPolygon(lat: number, lng: number, fence: PolygonGeofence): GeofenceCheckResult {
  const coords = fence.coordinates;
  if (coords.length < 3) return { inside: false };

  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i].lat, yi = coords[i].lng;
    const xj = coords[j].lat, yj = coords[j].lng;

    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return { inside };
}

// ── General check ──────────────────────────────────────────────────

export function checkGeofence(lat: number, lng: number, fence: Geofence): GeofenceCheckResult {
  if (fence.type === 'circle') return checkCircle(lat, lng, fence);
  return checkPolygon(lat, lng, fence);
}

// ── Detect crossings in a tracking event sequence ──────────────────

export interface CrossingEvent {
  animalId: string;
  type: 'enter' | 'leave';
  lat: number;
  lng: number;
  timestamp: string;
  eventIndex: number;
}

export function detectCrossings(
  events: TrackingEvent[],
  fence: Geofence
): CrossingEvent[] {
  if (events.length < 2) return [];

  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const crossings: CrossingEvent[] = [];
  let wasInside = checkGeofence(sorted[0].lat, sorted[0].lng, fence).inside;

  for (let i = 1; i < sorted.length; i++) {
    const isInside = checkGeofence(sorted[i].lat, sorted[i].lng, fence).inside;
    if (isInside && !wasInside) {
      crossings.push({
        animalId: sorted[i].individualId,
        type: 'enter',
        lat: sorted[i].lat,
        lng: sorted[i].lng,
        timestamp: sorted[i].timestamp,
        eventIndex: i,
      });
    } else if (!isInside && wasInside) {
      crossings.push({
        animalId: sorted[i].individualId,
        type: 'leave',
        lat: sorted[i].lat,
        lng: sorted[i].lng,
        timestamp: sorted[i].timestamp,
        eventIndex: i,
      });
    }
    wasInside = isInside;
  }

  return crossings;
}

// ── Migration distance calculator ──────────────────────────────────

export function totalDistanceKm(events: TrackingEvent[]): number {
  if (events.length < 2) return 0;
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += haversineKm(sorted[i - 1].lat, sorted[i - 1].lng, sorted[i].lat, sorted[i].lng);
  }
  return total;
}

// ── Bounding box for a set of events ───────────────────────────────

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  centerLat: number;
  centerLng: number;
}

export function getBoundingBox(events: TrackingEvent[]): BoundingBox | null {
  if (events.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const ev of events) {
    minLat = Math.min(minLat, ev.lat);
    maxLat = Math.max(maxLat, ev.lat);
    minLng = Math.min(minLng, ev.lng);
    maxLng = Math.max(maxLng, ev.lng);
  }
  return {
    minLat, maxLat, minLng, maxLng,
    centerLat: (minLat + maxLat) / 2,
    centerLng: (minLng + maxLng) / 2,
  };
}
