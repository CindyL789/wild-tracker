/**
 * ========================================================================
 * SUPERPOWERS INDEX — Export all bountywarz-booster enhancements
 * ========================================================================
 * 
 * 8 SUPERPOwERS total — applied from bountywarz-booster to wild-tracker
 */

// Original 4 superpowers
export { default as TerrainView3D } from './TerrainView3D';
export { default as MultiplayerSync } from './MultiplayerSync';
export { default as WeatherOverlay } from './WeatherOverlay';
export { default as AnalyticsDashboard } from './AnalyticsDashboard';

// NEW: 4 additional superpowers
export { fetchRealWeather, fetchWeatherForecast, useAnimalWeather } from './RealWeatherAPI';
export { WildlifeSyncServer } from './WebSocketServer';
export { AnimalModelManager, detectAnimalType, ANIMAL_CONFIGS } from './AnimalModels3D';
export { WildlifeAudioEngine, useWildlifeAudio, DEFAULT_SOUND_BANK } from './WildlifeAudio';
