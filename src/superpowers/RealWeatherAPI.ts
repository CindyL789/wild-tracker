/**
 * ========================================================================
 * SUPERPOWER 5: REAL WEATHER API
 * ========================================================================
 * 
 * Production-ready OpenWeatherMap integration with caching,
 rate limiting, and fallback to simulation.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TaggedAnimal } from '../types';

interface RealWeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  pressure: number;
  visibility: number;
  cloudCover: number;
  uvIndex: number;
  precipitation: number;
  precipitationProbability: number;
  condition: string;
  conditionIcon: string;
  sunrise: string;
  sunset: string;
  timezone: string;
  timestamp: number;
}

interface WeatherAPIConfig {
  apiKey: string;
  units: 'metric' | 'imperial';
  language: string;
}

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_DELAY = 1000; // 1 second between calls

class WeatherCache {
  private cache = new Map<string, { data: RealWeatherData; timestamp: number }>();

  get(key: string): RealWeatherData | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: RealWeatherData): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

const globalCache = new WeatherCache();

export async function fetchRealWeather(
  lat: number,
  lng: number,
  config: WeatherAPIConfig
): Promise<RealWeatherData> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  const cached = globalCache.get(cacheKey);
  if (cached) return cached;

  // OpenWeatherMap Current Weather API
  const url = new URL('https://api.openweathermap.org/data/2.5/weather');
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lng.toString());
  url.searchParams.set('appid', config.apiKey);
  url.searchParams.set('units', config.units);
  url.searchParams.set('lang', config.language);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const weather: RealWeatherData = {
    temperature: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity: data.main.humidity,
    windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
    windDirection: data.wind.deg || 0,
    windGust: data.wind.gust ? Math.round(data.wind.gust * 3.6) : 0,
    pressure: data.main.pressure,
    visibility: Math.round((data.visibility || 10000) / 1000), // m to km
    cloudCover: data.clouds?.all || 0,
    uvIndex: data.uvi || 0,
    precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
    precipitationProbability: 0, // Not in current weather, need forecast
    condition: data.weather[0]?.main || 'Unknown',
    conditionIcon: `https://openweathermap.org/img/wn/${data.weather[0]?.icon}@2x.png`,
    sunrise: new Date(data.sys.sunrise * 1000).toLocaleTimeString(),
    sunset: new Date(data.sys.sunset * 1000).toLocaleTimeString(),
    timezone: data.timezone,
    timestamp: Date.now(),
  };

  globalCache.set(cacheKey, weather);
  return weather;
}

// Forecast API for precipitation probability
export async function fetchWeatherForecast(
  lat: number,
  lng: number,
  config: WeatherAPIConfig
): Promise<Array<{ time: string; temp: number; pop: number; condition: string }>> {
  const url = new URL('https://api.openweathermap.org/data/2.5/forecast');
  url.searchParams.set('lat', lat.toString());
  url.searchParams.set('lon', lng.toString());
  url.searchParams.set('appid', config.apiKey);
  url.searchParams.set('units', config.units);
  url.searchParams.set('lang', config.language);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error('Forecast API error');

  const data = await response.json();
  return data.list.slice(0, 8).map((item: any) => ({
    time: new Date(item.dt * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    temp: Math.round(item.main.temp),
    pop: Math.round((item.pop || 0) * 100),
    condition: item.weather[0]?.main || 'Unknown',
  }));
}

// React hook for weather
export function useAnimalWeather(animal: TaggedAnimal | null, apiKey: string) {
  const [weather, setWeather] = useState<RealWeatherData | null>(null);
  const [forecast, setForecast] = useState<Array<{ time: string; temp: number; pop: number; condition: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetch = useRef<number>(0);

  const fetchWeather = useCallback(async () => {
    if (!animal?.latestLat || !animal?.latestLng || !apiKey) return;

    // Rate limiting
    const now = Date.now();
    if (now - lastFetch.current < RATE_LIMIT_DELAY) return;
    lastFetch.current = now;

    setLoading(true);
    setError(null);

    try {
      const config: WeatherAPIConfig = { apiKey, units: 'metric', language: 'en' };
      const [current, forecastData] = await Promise.all([
        fetchRealWeather(animal.latestLat, animal.latestLng, config),
        fetchWeatherForecast(animal.latestLat, animal.latestLng, config).catch(() => []),
      ]);
      setWeather(current);
      setForecast(forecastData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather');
      // Fallback to simulation
      const fallback = await simulateWeather(animal.latestLat, animal.latestLng);
      setWeather(fallback);
    } finally {
      setLoading(false);
    }
  }, [animal, apiKey]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Refresh every 10 minutes
    return () => clearInterval(interval);
  }, [fetchWeather]);

  return { weather, forecast, loading, error, refetch: fetchWeather };
}

// Fallback simulation
async function simulateWeather(lat: number, lng: number): Promise<RealWeatherData> {
  const hash = Math.sin(lat * 100 + lng * 100) * 10000;
  return {
    temperature: Math.round(10 + Math.sin(hash) * 20),
    feelsLike: Math.round(10 + Math.sin(hash) * 20),
    humidity: Math.round(40 + Math.cos(hash) * 50),
    windSpeed: Math.round(Math.abs(Math.sin(hash * 2)) * 30),
    windDirection: Math.round(Math.abs(Math.cos(hash)) * 360),
    windGust: Math.round(Math.abs(Math.sin(hash * 2)) * 40),
    pressure: Math.round(1000 + Math.sin(hash) * 30),
    visibility: Math.round(5 + Math.cos(hash * 2) * 10),
    cloudCover: Math.round(Math.abs(Math.sin(hash * 1.5)) * 100),
    uvIndex: Math.round(Math.abs(Math.cos(hash * 0.5)) * 10),
    precipitation: Math.max(0, Math.sin(hash * 3) * 10),
    precipitationProbability: Math.round(Math.abs(Math.sin(hash * 2)) * 100),
    condition: ['Clear', 'Clouds', 'Rain', 'Storm', 'Snow', 'Fog'][Math.floor(Math.abs(Math.sin(hash)) * 6)],
    conditionIcon: '',
    sunrise: '06:30',
    sunset: '19:45',
    timezone: 'UTC',
    timestamp: Date.now(),
  };
}

// Enhanced Weather Overlay Component with real API
export { default as EnhancedWeatherOverlay } from './WeatherOverlay';
