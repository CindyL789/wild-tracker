/**
 * ========================================================================
 * WILDLIFE TERRITORY TRACKER — Adapted from bountywarz CTF System
 * ========================================================================
 * 
 * ADAPTED FROM: bountywarz/scenes/ctf.jsx
 * 
 * Territory control system for wildlife conservation.
 * Tracks competing species territories, migration corridors, safe zones.
 */

interface TerritoryPoint {
  id: string;
  lat: number;
  lng: number;
  species: string;
  control: number;        // 0-100% control
  controller: string | null; // Which species controls it
  lastUpdated: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface SpeciesNation {
  id: string;
  name: string;
  color: string;
  population: number;
  territories: number;
  migratory: boolean;
}

interface TerritoryMatch {
  id: string;
  name: string;
  startTime: number;
  duration: number;       // ms
  active: boolean;
  territories: TerritoryPoint[];
  species: SpeciesNation[];
  winner: string | null;
}

export class WildlifeTerritorySystem {
  private match: TerritoryMatch | null = null;
  private observers: Set<(state: any) => void> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Constants (from CTF: 8min rounds, 5 flags, etc.)
  private readonly ROUND_MS = 480000;      // 8 minutes
  private readonly CAP_RADIUS_KM = 2;      // 2km capture radius
  private readonly BASE_TERRITORY_SCORE = 100;

  constructor() {}

  /**
   * Start a territory tracking session
   */
  startTracking(name: string, territories: TerritoryPoint[], species: SpeciesNation[]): TerritoryMatch {
    this.match = {
      id: `territory_${Date.now()}`,
      name,
      startTime: Date.now(),
      duration: this.ROUND_MS,
      active: true,
      territories: territories.map(t => ({ ...t, control: 0, controller: null })),
      species,
      winner: null
    };

    console.log(`🌍 Territory tracking started: ${name}`);
    console.log(`   ${territories.length} territories`);
    console.log(`   ${species.length} competing species`);

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => this.tick(), 1000);

    return this.match;
  }

  stopTracking() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.match) {
      this.match.active = false;
      console.log(`   ✓ Territory tracking ended: ${this.match.name}`);
    }
  }

  /**
   * Record animal sighting at a territory
   */
  recordSighting(territoryId: string, speciesId: string, lat: number, lng: number): boolean {
    if (!this.match || !this.match.active) return false;

    const territory = this.match.territories.find(t => t.id === territoryId);
    if (!territory) return false;

    // Check if within capture radius
    const distance = this.haversine(lat, lng, territory.lat, territory.lng);
    if (distance > this.CAP_RADIUS_KM) return false;

    // Increase control
    const species = this.match.species.find(s => s.id === speciesId);
    if (!species) return false;

    // If controlled by another species, decrease their control first
    if (territory.controller && territory.controller !== speciesId) {
      territory.control -= 10;
      if (territory.control <= 0) {
        territory.controller = null;
        territory.control = 0;
      }
    } else {
      // Increase control
      territory.control = Math.min(100, territory.control + 5);
      if (territory.control >= 50) {
        territory.controller = speciesId;
      }
    }

    territory.lastUpdated = Date.now();

    // Notify observers
    this.notifyObservers();

    return true;
  }

  /**
   * Get current territory state
   */
  getState() {
    if (!this.match) return null;

    const elapsed = Date.now() - this.match.startTime;
    const remaining = Math.max(0, this.match.duration - elapsed);

    // Count territories per species
    const counts: Record<string, number> = {};
    for (const t of this.match.territories) {
      if (t.controller) {
        counts[t.controller] = (counts[t.controller] || 0) + 1;
      }
    }

    // Check for winner
    const totalTerritories = this.match.territories.length;
    const winThreshold = Math.ceil(totalTerritories * 0.6); // 60% to win

    let winner = null;
    for (const [speciesId, count] of Object.entries(counts)) {
      if (count >= winThreshold) {
        winner = speciesId;
        break;
      }
    }

    // Time's up
    if (remaining === 0 && !winner) {
      // Most territories wins
      let maxCount = 0;
      for (const [speciesId, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count;
          winner = speciesId;
        }
      }
    }

    return {
      match: this.match,
      elapsed,
      remaining,
      territoryCounts: counts,
      winner,
      leader: winner ? this.match.species.find(s => s.id === winner) : null
    };
  }

  /**
   * Subscribe to territory updates
   */
  subscribe(callback: (state: any) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers() {
    const state = this.getState();
    for (const observer of this.observers) {
      observer(state);
    }
  }

  private tick() {
    if (!this.match || !this.match.active) return;

    const elapsed = Date.now() - this.match.startTime;
    if (elapsed >= this.match.duration) {
      this.match.active = false;
      this.match.winner = this.getState()?.winner || null;
    }

    this.notifyObservers();
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Create default territories for a region
   */
  static createDefaultTerritories(region: string): TerritoryPoint[] {
    const territories: Record<string, TerritoryPoint[]> = {
      'serengeti': [
        { id: 't1', lat: -2.154, lng: 34.6857, species: 'lion', control: 0, controller: null, lastUpdated: 0, priority: 'critical' },
        { id: 't2', lat: -2.123, lng: 34.7123, species: 'elephant', control: 0, controller: null, lastUpdated: 0, priority: 'critical' },
        { id: 't3', lat: -2.198, lng: 34.6543, species: 'zebra', control: 0, controller: null, lastUpdated: 0, priority: 'high' },
        { id: 't4', lat: -2.087, lng: 34.7234, species: 'gazelle', control: 0, controller: null, lastUpdated: 0, priority: 'medium' },
        { id: 't5', lat: -2.176, lng: 34.6987, species: 'hyena', control: 0, controller: null, lastUpdated: 0, priority: 'high' },
      ],
      'yellowstone': [
        { id: 't1', lat: 44.428, lng: -110.588, species: 'wolf', control: 0, controller: null, lastUpdated: 0, priority: 'critical' },
        { id: 't2', lat: 44.460, lng: -110.500, species: 'bison', control: 0, controller: null, lastUpdated: 0, priority: 'critical' },
        { id: 't3', lat: 44.412, lng: -110.620, species: 'grizzly', control: 0, controller: null, lastUpdated: 0, priority: 'high' },
        { id: 't4', lat: 44.480, lng: -110.550, species: 'elk', control: 0, controller: null, lastUpdated: 0, priority: 'medium' },
        { id: 't5', lat: 44.395, lng: -110.510, species: 'eagle', control: 0, controller: null, lastUpdated: 0, priority: 'medium' },
      ]
    };

    return territories[region] || territories['serengeti'];
  }
}

export default WildlifeTerritorySystem;
export type { TerritoryPoint, SpeciesNation, TerritoryMatch };
