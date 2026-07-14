/**
 * Supabase client for Wild Tracker
 * Optional persistence layer — the app works without it (fail-open).
 *
 * Set these env vars to enable:
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * Or hardcode in .env.local for local dev.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

export function isSupabaseEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// ── Types ──────────────────────────────────────────────────────────

export interface SavedStudy {
  id: string;
  user_id: string;
  movebank_study_id: string;
  study_name: string;
  species?: string;
  taxon?: string;
  description?: string;
  default_center?: { lat: number; lng: number };
  default_zoom?: number;
  notes?: string;
  created_at: string;
}

export interface WatchlistAnimal {
  id: string;
  user_id: string;
  movebank_study_id: string;
  animal_id: string;
  animal_name?: string;
  species?: string;
  last_known_lat?: number;
  last_known_lng?: number;
  last_seen?: string;
  notes?: string;
  created_at: string;
}

export interface GeofenceAlert {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  fence_type: 'circle' | 'polygon';
  center_lat?: number;
  center_lng?: number;
  radius_km?: number;
  polygon_geojson?: any;
  movebank_study_id?: string;
  animal_id?: string | null;
  trigger: 'enter' | 'leave' | 'both';
  is_active: boolean;
  last_triggered?: string;
  trigger_count: number;
  notify_in_app: boolean;
  notify_email: boolean;
  notify_webhook?: string;
  created_at: string;
  updated_at: string;
}

export interface AlertEvent {
  id: string;
  alert_id: string;
  user_id: string;
  animal_id: string;
  animal_name?: string;
  lat: number;
  lng: number;
  trigger_type: 'enter' | 'leave';
  triggered_at: string;
  acknowledged: boolean;
  acknowledged_at?: string;
}

// ── API helpers (fail-open: return empty/null if Supabase not configured) ──

export async function getSavedStudies(userId: string): Promise<SavedStudy[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('saved_studies').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.warn('[supabase] getSavedStudies:', error.message); return []; }
  return data || [];
}

export async function saveStudy(study: Omit<SavedStudy, 'id' | 'created_at'>): Promise<SavedStudy | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('saved_studies').upsert(study).select().single();
  if (error) { console.warn('[supabase] saveStudy:', error.message); return null; }
  return data;
}

export async function removeSavedStudy(userId: string, movebankStudyId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('saved_studies').delete().eq('user_id', userId).eq('movebank_study_id', movebankStudyId);
  return !error;
}

export async function getWatchlist(userId: string): Promise<WatchlistAnimal[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('watchlist_animals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.warn('[supabase] getWatchlist:', error.message); return []; }
  return data || [];
}

export async function addToWatchlist(animal: Omit<WatchlistAnimal, 'id' | 'created_at'>): Promise<WatchlistAnimal | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('watchlist_animals').upsert(animal).select().single();
  if (error) { console.warn('[supabase] addToWatchlist:', error.message); return null; }
  return data;
}

export async function removeFromWatchlist(userId: string, movebankStudyId: string, animalId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('watchlist_animals').delete().eq('user_id', userId).eq('movebank_study_id', movebankStudyId).eq('animal_id', animalId);
  return !error;
}

export async function getGeofenceAlerts(userId: string): Promise<GeofenceAlert[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('geofence_alerts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (error) { console.warn('[supabase] getGeofenceAlerts:', error.message); return []; }
  return data || [];
}

export async function createGeofenceAlert(alert: Omit<GeofenceAlert, 'id' | 'created_at' | 'updated_at' | 'last_triggered' | 'trigger_count'>): Promise<GeofenceAlert | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('geofence_alerts').insert({ ...alert, trigger_count: 0 }).select().single();
  if (error) { console.warn('[supabase] createGeofenceAlert:', error.message); return null; }
  return data;
}

export async function deleteGeofenceAlert(userId: string, alertId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('geofence_alerts').delete().eq('user_id', userId).eq('id', alertId);
  return !error;
}

export async function getUnacknowledgedAlerts(userId: string): Promise<AlertEvent[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('alert_events').select('*').eq('user_id', userId).eq('acknowledged', false).order('triggered_at', { ascending: false });
  if (error) { console.warn('[supabase] getUnacknowledgedAlerts:', error.message); return []; }
  return data || [];
}

export async function acknowledgeAlert(userId: string, alertEventId: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('alert_events').update({ acknowledged: true, acknowledged_at: new Date().toISOString() }).eq('user_id', userId).eq('id', alertEventId);
  return !error;
}
