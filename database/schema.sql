-- ============================================================================
-- WILD TRACKER — DATABASE SCHEMA
-- Persistence layer for saved studies, animal watchlists, geofence alerts,
-- and user profiles. Uses Supabase with Row Level Security (RLS).
-- ============================================================================

-- User Profiles
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  favorite_species TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved Studies (users can bookmark Movebank studies for quick access)
CREATE TABLE IF NOT EXISTS saved_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movebank_study_id TEXT NOT NULL,
  study_name TEXT NOT NULL,
  species TEXT,
  taxon TEXT,
  description TEXT,
  default_center JSONB,
  default_zoom INTEGER DEFAULT 5,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movebank_study_id)
);

-- Animal Watchlist (users can follow specific tagged animals)
CREATE TABLE IF NOT EXISTS watchlist_animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  movebank_study_id TEXT NOT NULL,
  animal_id TEXT NOT NULL,
  animal_name TEXT,
  species TEXT,
  last_known_lat DOUBLE PRECISION,
  last_known_lng DOUBLE PRECISION,
  last_seen TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, movebank_study_id, animal_id)
);

-- Geofence Alerts (notify when an animal enters/leaves a defined area)
CREATE TABLE IF NOT EXISTS geofence_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',

  -- Geofence boundary (circle or polygon)
  fence_type TEXT DEFAULT 'circle' CHECK (fence_type IN ('circle', 'polygon')),
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION,  -- for circle type
  polygon_geojson JSONB,        -- for polygon type

  -- Which animals to monitor
  movebank_study_id TEXT,
  animal_id TEXT,  -- NULL means all animals in the study

  -- Alert configuration
  trigger TEXT DEFAULT 'enter' CHECK (trigger IN ('enter', 'leave', 'both')),
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,

  -- Notification settings
  notify_in_app BOOLEAN DEFAULT TRUE,
  notify_email BOOLEAN DEFAULT FALSE,
  notify_webhook TEXT,  -- URL to POST alert to

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert History (log of geofence trigger events)
CREATE TABLE IF NOT EXISTS alert_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES geofence_alerts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  animal_id TEXT NOT NULL,
  animal_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  trigger_type TEXT NOT NULL,  -- 'enter' or 'leave'
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ
);

-- Tracking Sessions (log of user viewing sessions for analytics)
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  study_id TEXT,
  animals_viewed TEXT[],
  session_start TIMESTAMPTZ DEFAULT NOW(),
  session_end TIMESTAMPTZ,
  ai_questions_asked INTEGER DEFAULT 0,
  events_loaded INTEGER DEFAULT 0
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_saved_studies_user ON saved_studies(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON watchlist_animals(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_animal ON watchlist_animals(movebank_study_id, animal_id);
CREATE INDEX IF NOT EXISTS idx_geofence_user ON geofence_alerts(user_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_alert_events_user ON alert_events(user_id) WHERE acknowledged = FALSE;
CREATE INDEX IF NOT EXISTS idx_alert_events_alert ON alert_events(alert_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON tracking_sessions(user_id);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofence_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can see all profiles, edit only their own
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE USING (auth.uid() = user_id);

-- Saved studies: only owner can access
CREATE POLICY "saved_studies_select_own" ON saved_studies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_studies_insert_own" ON saved_studies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_studies_update_own" ON saved_studies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "saved_studies_delete_own" ON saved_studies FOR DELETE USING (auth.uid() = user_id);

-- Watchlist: only owner can access
CREATE POLICY "watchlist_select_own" ON watchlist_animals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlist_insert_own" ON watchlist_animals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_update_own" ON watchlist_animals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "watchlist_delete_own" ON watchlist_animals FOR DELETE USING (auth.uid() = user_id);

-- Geofence alerts: only owner can access
CREATE POLICY "geofence_select_own" ON geofence_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "geofence_insert_own" ON geofence_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "geofence_update_own" ON geofence_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "geofence_delete_own" ON geofence_alerts FOR DELETE USING (auth.uid() = user_id);

-- Alert events: only owner can access
CREATE POLICY "alert_events_select_own" ON alert_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alert_events_insert_own" ON alert_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alert_events_update_own" ON alert_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alert_events_delete_own" ON alert_events FOR DELETE USING (auth.uid() = user_id);

-- Tracking sessions: only owner can access
CREATE POLICY "sessions_select_own" ON tracking_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON tracking_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON tracking_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON tracking_sessions FOR DELETE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS — auto-create profile on signup
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
