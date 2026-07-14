/**
 * ========================================================================
 * ATHELGARD WILDLIFE INTELLIGENCE CORE
 * ========================================================================
 * 
 * ADAPTED FROM: bountywarz/athelgard-core.ts
 * 
 * The ethical AI mentor system from bountywarz, repurposed for wildlife
 * conservation intelligence. Manages 24 observation agents, calculates
 * ecosystem equilibrium, tracks biodiversity stability.
 */

interface WildlifeAgent {
  id?: string;
  name: string;
  role: 'observer' | 'protector' | 'specialist';
  region: string;
  awareness: number;      // Was: aggression
  resilience: number;
  precision: number;
  currentAction?: string;
}

interface EcosystemScenario {
  id?: string;
  biome: string;          // Was: pillar
  name: string;
  threatLevel: string;    // Was: difficulty
  disturbanceBase: number; // Was: friction_base
}

interface WildlifeConstitution {
  reports: { first: string; second: string };
  agents: WildlifeAgent[];
  scenarios: EcosystemScenario[];
  phiTarget: number;
  heartbeatMs: number;
  stabilityThreshold: number;
}

interface IntelligenceConfig {
  supabaseUrl: string;
  supabaseKey: string;
  constitution: WildlifeConstitution;
  preserveId?: string | null;
}

export class AthelgardWildlifeCore {
  private supabaseUrl: string;
  private supabaseKey: string;
  private constitution: WildlifeConstitution;
  private preserveId: string | null;

  // Core state
  private agents: WildlifeAgent[] = [];
  private scenarios: EcosystemScenario[] = [];
  private currentScenarioIndex = 0;

  // Golden ratio equilibrium tracking
  private phi = 0.0;
  private phiTarget = 0.618;
  private stabilityCount = 0;
  private stabilityThreshold = 185; // 30s at 6.18Hz
  private cycleCount = 0;

  // Heartbeat
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatMs = 161.8; // 6.18Hz - the golden frequency

  // Callbacks
  private onEquilibriumReached: (() => void) | null = null;
  private onThreatDetected: ((threat: string) => void) | null = null;

  constructor(config: IntelligenceConfig) {
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
    this.constitution = config.constitution;
    this.preserveId = config.preserveId || null;
    this.phiTarget = config.constitution.phiTarget;
    this.heartbeatMs = config.constitution.heartbeatMs;
    this.stabilityThreshold = Math.floor(config.constitution.stabilityThreshold / this.heartbeatMs);
  }

  /**
   * Load observation agents from constitution
   */
  async loadAgents() {
    console.log('🌿 Athelgard Wildlife Intelligence loading...');

    for (const data of this.constitution.agents) {
      this.agents.push({ ...data });
    }

    console.log(`   ✓ Loaded ${this.agents.length} observation agents`);
    console.log(`     - ${this.agents.filter(a => a.role === 'observer').length} field observers`);
    console.log(`     - ${this.agents.filter(a => a.role === 'protector').length} protectors`);
    console.log(`     - ${this.agents.filter(a => a.role === 'specialist').length} specialists`);

    this.scenarios = this.constitution.scenarios;
    console.log(`   ✓ Loaded ${this.scenarios.length} ecosystem scenarios`);
  }

  /**
   * Start the golden ratio heartbeat
   */
  startHeartbeat() {
    if (this.heartbeatInterval) {
      throw new Error('Heartbeat already running');
    }

    this.heartbeatInterval = setInterval(() => {
      this.tick();
    }, this.heartbeatMs);

    console.log(`   ✓ Golden heartbeat started at ${(1000 / this.heartbeatMs).toFixed(2)}Hz (Φ-frequency)`);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('   ✓ Heartbeat stopped');
    }
  }

  /**
   * THE GOLDEN HEARTBEAT - Called every 161.8ms
   */
  private async tick() {
    this.cycleCount++;

    try {
      const scenario = this.scenarios[this.currentScenarioIndex];

      // Calculate ecosystem forces
      const observeForce = await this.calculateObservationForce(scenario);
      const protectForce = await this.calculateProtectionForce(scenario);

      // Calculate equilibrium (golden ratio)
      const totalForce = observeForce + protectForce;
      this.phi = totalForce > 0 ? protectForce / totalForce : 0.5;

      // Check stability
      const error = Math.abs(this.phi - this.phiTarget);
      if (error < 0.001) {
        this.stabilityCount++;
      } else {
        this.stabilityCount = 0;
      }

      // Log every 10 ticks (~1.6 seconds)
      if (this.cycleCount % 10 === 0) {
        console.log(`[Tick ${this.cycleCount}] Φ=${this.phi.toFixed(4)} | Stability=${this.stabilityCount}/${this.stabilityThreshold} | Scenario: ${scenario?.name}`);
      }

      // Check for ecosystem sprout (equilibrium reached)
      if (this.stabilityCount >= this.stabilityThreshold) {
        console.log('🌱 ECOSYSTEM EQUILIBRIUM REACHED! Φ = 0.618');
        this.stabilityCount = 0;
        this.onEquilibriumReached?.();
      }

      // Check for threats
      if (this.phi < 0.3) {
        const threat = `Low protection ratio detected in ${scenario?.biome}`;
        this.onThreatDetected?.(threat);
      }

    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  }

  private async calculateObservationForce(scenario: EcosystemScenario): Promise<number> {
    const observers = this.agents.filter(a => a.role === 'observer');
    let force = 0;
    for (const agent of observers) {
      force += agent.awareness * agent.precision * (1 - scenario.disturbanceBase);
    }
    return force;
  }

  private async calculateProtectionForce(scenario: EcosystemScenario): Promise<number> {
    const protectors = this.agents.filter(a => a.role === 'protector');
    let force = 0;
    for (const agent of protectors) {
      force += agent.resilience * agent.precision * (1 - scenario.disturbanceBase);
    }
    return force;
  }

  getCurrentPhi(): number {
    return this.phi;
  }

  getStabilityCount(): number {
    return this.stabilityCount;
  }

  onEquilibrium(callback: () => void) {
    this.onEquilibriumReached = callback;
  }

  onThreat(callback: (threat: string) => void) {
    this.onThreatDetected = callback;
  }

  getStatus() {
    return {
      phi: this.phi,
      stability: this.stabilityCount,
      threshold: this.stabilityThreshold,
      cycle: this.cycleCount,
      agents: this.agents.length,
      scenario: this.scenarios[this.currentScenarioIndex]?.name
    };
  }
}

export default AthelgardWildlifeCore;
