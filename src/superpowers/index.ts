/**
 * ========================================================================
 * SUPERPOWERS INDEX — ALL bountywarz + bountywarz-booster enhancements
 * ========================================================================
 * 
 * 12 SUPERPOwERS total — from BOTH repos
 */

// ORIGINAL 4 (from booster patterns)
export { default as TerrainView3D } from './TerrainView3D';
export { default as MultiplayerSync } from './MultiplayerSync';
export { default as WeatherOverlay } from './WeatherOverlay';
export { default as AnalyticsDashboard } from './AnalyticsDashboard';

// API & Server
export { fetchRealWeather, fetchWeatherForecast, useAnimalWeather } from './RealWeatherAPI';
export { WildlifeSyncServer } from './WebSocketServer';

// 3D & Audio
export { AnimalModelManager, detectAnimalType, ANIMAL_CONFIGS } from './AnimalModels3D';
export { WildlifeAudioEngine, useWildlifeAudio, DEFAULT_SOUND_BANK } from './WildlifeAudio';

// REAL BOUNTYWARZ ADAPTATIONS
export { default as AthelgardWildlifeCore } from './AthelgardWildlifeCore';
export { default as WildlifeDroneModels } from './WildlifeDroneModels';
export { default as WildlifeTerritorySystem } from './WildlifeTerritorySystem';
export { ConservationArsenal, CONSERVATION_TOOLS } from './ConservationArsenal';
