/**
 * ========================================================================
 * CONSERVATION TOOLS SYSTEM — Adapted from Athelgard Weapons
 * ========================================================================
 * 
 * ADAPTED FROM: bountywarz/athelgard-weapons.js
 * 
 * Maps real conservation methods to tracking tools.
 * Each tool represents a real wildlife conservation technique.
 */

export interface ConservationTool {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  icon: string;
  effectiveness: number;    // 0-2.0 multiplier
  range: number;            // km
  duration: number;         // minutes
  method: string;           // Real conservation method
  description: string;
}

export const CONSERVATION_TOOLS: Record<string, ConservationTool> = {
  GPS_COLLAR: {
    id: 'GPS_COLLAR',
    name: 'Satellite Collar',
    color: '#3B82F6',
    secondaryColor: '#1E40AF',
    icon: 'satellite',
    effectiveness: 1.5,
    range: 500,
    duration: 1440, // 24 hours
    method: 'GPS Telemetry',
    description: 'Real-time GPS tracking collar for large mammals'
  },

  CAMERA_TRAP: {
    id: 'CAMERA_TRAP',
    name: 'Motion Camera Grid',
    color: '#10B981',
    secondaryColor: '#059669',
    icon: 'camera',
    effectiveness: 1.0,
    range: 0.05, // 50 meters
    duration: 43200, // 30 days
    method: 'Camera Trapping',
    description: 'Motion-activated cameras for population surveys'
  },

  ACOUSTIC_SENSOR: {
    id: 'ACOUSTIC_SENSOR',
    name: 'Bioacoustic Array',
    color: '#A855F7',
    secondaryColor: '#7C3AED',
    icon: 'audio',
    effectiveness: 0.8,
    range: 2,
    duration: 10080, // 1 week
    method: 'Acoustic Monitoring',
    description: 'Records animal calls for species identification'
  },

  DRONE_SURVEY: {
    id: 'DRONE_SURVEY',
    name: 'Aerial Survey Drone',
    color: '#F97316',
    secondaryColor: '#EA580C',
    icon: 'drone',
    effectiveness: 1.2,
    range: 10,
    duration: 120, // 2 hours
    method: 'UAV Survey',
    description: 'Thermal imaging drone for population counts'
  },

  GENETIC_SAMPLING: {
    id: 'GENETIC_SAMPLING',
    name: 'DNA Scanner',
    color: '#EF4444',
    secondaryColor: '#DC2626',
    icon: 'dna',
    effectiveness: 2.0,
    range: 0,
    duration: 0,
    method: 'eDNA Analysis',
    description: 'Environmental DNA sampling for species presence'
  },

  RADIO_TRACKING: {
    id: 'RADIO_TRACKING',
    name: 'VHF Radio Beacon',
    color: '#06B6D4',
    secondaryColor: '#0891B2',
    icon: 'radio',
    effectiveness: 1.0,
    range: 20,
    duration: 720, // 12 hours
    method: 'Radio Telemetry',
    description: 'VHF radio tracking for fine-scale movement'
  },

  SATELLITE_IMAGERY: {
    id: 'SATELLITE_IMAGERY',
    name: 'Satellite Monitor',
    color: '#6366F1',
    secondaryColor: '#4F46E5',
    icon: 'globe',
    effectiveness: 0.6,
    range: 1000,
    duration: 10080,
    method: 'Remote Sensing',
    description: 'Satellite imagery for habitat monitoring'
  },

  FOOTPRINT_ID: {
    id: 'FOOTPRINT_ID',
    name: 'Track Analyzer',
    color: '#8B5CF6',
    secondaryColor: '#7C3AED',
    icon: 'footprint',
    effectiveness: 0.9,
    range: 0,
    duration: 0,
    method: 'Track Identification',
    description: 'AI-powered footprint species identification'
  }
};

export class ConservationArsenal {
  private activeTools: Map<string, { tool: ConservationTool; deployedAt: number }> = new Map();

  /**
   * Deploy a conservation tool
   */
  deploy(toolId: string, targetLocation: { lat: number; lng: number }): boolean {
    const tool = CONSERVATION_TOOLS[toolId];
    if (!tool) {
      console.warn(`Unknown tool: ${toolId}`);
      return false;
    }

    const deployment = {
      tool,
      deployedAt: Date.now(),
      location: targetLocation
    };

    this.activeTools.set(toolId, deployment);
    console.log(`🔧 Deployed ${tool.name} at ${targetLocation.lat}, ${targetLocation.lng}`);
    console.log(`   Method: ${tool.method}`);
    console.log(`   Effectiveness: ${tool.effectiveness}x`);

    return true;
  }

  /**
   * Get active tools in range
   */
  getToolsInRange(lat: number, lng: number, rangeKm: number): ConservationTool[] {
    const tools: ConservationTool[] = [];
    
    for (const [, deployment] of this.activeTools) {
      const distance = this.haversine(
        lat, lng,
        deployment.location.lat, deployment.location.lng
      );
      if (distance <= rangeKm) {
        tools.push(deployment.tool);
      }
    }

    return tools;
  }

  /**
   * Calculate combined effectiveness for a location
   */
  getEffectiveness(lat: number, lng: number): number {
    const tools = this.getToolsInRange(lat, lng, 50);
    let effectiveness = 1.0;

    for (const tool of tools) {
      effectiveness *= tool.effectiveness;
    }

    return Math.min(effectiveness, 5.0); // Cap at 5x
  }

  /**
   * Recall a tool
   */
  recall(toolId: string): boolean {
    const had = this.activeTools.has(toolId);
    this.activeTools.delete(toolId);
    return had;
  }

  /**
   * Get all active deployments
   */
  getActiveDeployments() {
    return Array.from(this.activeTools.entries()).map(([id, deployment]) => ({
      id,
      tool: deployment.tool,
      deployedAt: deployment.deployedAt,
      location: deployment.location
    }));
  }

  private haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default ConservationArsenal;
