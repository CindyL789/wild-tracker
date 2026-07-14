/**
 * ========================================================================
 * SUPERPOWER 3: WEATHER OVERLAY
 * ========================================================================
 * 
 * Using bountywarz Weather System patterns:
 * - Real-time weather at animal GPS coordinates
 * - Weather impact on animal movement predictions
 * - Visual overlays (rain, wind, temperature)
 */

import { useState, useEffect } from 'react';
import type { TaggedAnimal, TrackingEvent } from '../types';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  pressure: number;
  visibility: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
}

interface WeatherOverlayProps {
  animals: TaggedAnimal[];
  events: TrackingEvent[];
  selectedAnimalId: string | null;
}

// Simulated weather API (replace with OpenWeatherMap or similar)
async function fetchWeatherAtLocation(lat: number, lng: number): Promise<WeatherData> {
  // In production: const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=YOUR_KEY`);
  
  // Simulate realistic weather based on location
  const hash = Math.sin(lat * 100 + lng * 100) * 10000;
  const conditions: WeatherData['condition'][] = ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
  
  return {
    temperature: Math.round(10 + Math.sin(hash) * 20),
    humidity: Math.round(40 + Math.cos(hash) * 50),
    windSpeed: Math.round(Math.abs(Math.sin(hash * 2)) * 30),
    windDirection: Math.round(Math.abs(Math.cos(hash)) * 360),
    precipitation: Math.max(0, Math.sin(hash * 3) * 10),
    pressure: Math.round(1000 + Math.sin(hash) * 30),
    visibility: Math.round(5 + Math.cos(hash * 2) * 10),
    condition: conditions[Math.floor(Math.abs(Math.sin(hash)) * conditions.length)],
  };
}

// Get weather impact on animal movement
function getMovementImpact(weather: WeatherData): { impact: string; severity: 'low' | 'medium' | 'high'; description: string } {
  if (weather.windSpeed > 40) {
    return { impact: 'High Wind', severity: 'high', description: 'Strong winds may alter migration paths. Birds may seek shelter.' };
  }
  if (weather.precipitation > 5) {
    return { impact: 'Heavy Rain', severity: 'medium', description: 'Reduced visibility. Animals may slow down or seek cover.' };
  }
  if (weather.temperature < -10) {
    return { impact: 'Extreme Cold', severity: 'high', description: 'Animals may enter torpor or seek thermal shelter.' };
  }
  if (weather.temperature > 35) {
    return { impact: 'Heat Stress', severity: 'medium', description: 'Animals may reduce activity during peak heat.' };
  }
  if (weather.visibility < 2) {
    return { impact: 'Poor Visibility', severity: 'low', description: 'Fog may affect hunting/predation patterns.' };
  }
  return { impact: 'Favorable', severity: 'low', description: 'Conditions are optimal for normal movement patterns.' };
}

function getWeatherIcon(condition: WeatherData['condition']): string {
  const icons: Record<string, string> = {
    clear: '☀️',
    cloudy: '☁️',
    rain: '🌧️',
    storm: '⛈️',
    snow: '❄️',
    fog: '🌫️',
  };
  return icons[condition] || '🌤️';
}

export default function WeatherOverlay({ animals, events, selectedAnimalId }: WeatherOverlayProps) {
  const [weatherData, setWeatherData] = useState<Map<string, WeatherData>>(new Map());
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch weather for selected animal or all animals
  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      const newWeatherData = new Map(weatherData);

      const targetAnimals = selectedAnimalId
        ? animals.filter(a => a.id === selectedAnimalId)
        : animals;

      for (const animal of targetAnimals) {
        if (!animal.latestLat || !animal.latestLng) continue;
        
        // Only fetch if not already cached or older than 10 minutes
        const cached = weatherData.get(animal.id);
        if (cached && lastUpdated && Date.now() - lastUpdated.getTime() < 600000) {
          continue;
        }

        try {
          const weather = await fetchWeatherAtLocation(animal.latestLat, animal.latestLng);
          newWeatherData.set(animal.id, weather);
        } catch (error) {
          console.error(`Failed to fetch weather for ${animal.name}:`, error);
        }
      }

      setWeatherData(newWeatherData);
      setLastUpdated(new Date());
      setLoading(false);
    };

    fetchWeather();

    // Refresh every 15 minutes
    const interval = setInterval(fetchWeather, 900000);
    return () => clearInterval(interval);
  }, [selectedAnimalId, animals]);

  const selectedAnimal = animals.find(a => a.id === selectedAnimalId);
  const selectedWeather = selectedAnimalId ? weatherData.get(selectedAnimalId) : null;

  return (
    <div className="bg-[#1a1a2e] border border-[#12e0ff]/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#12e0ff]/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌤️</span>
          <div>
            <h3 className="text-xs font-bold text-[#e2ebd9] uppercase tracking-wider">
              Live Weather
            </h3>
            <p className="text-[9px] text-gray-500">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
        </div>
        {loading && (
          <div className="w-4 h-4 border-2 border-[#12e0ff] border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Selected animal weather */}
      {selectedAnimal && selectedWeather ? (
        <div className="p-4 space-y-3">
          {/* Main weather display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getWeatherIcon(selectedWeather.condition)}</span>
              <div>
                <div className="text-2xl font-bold text-[#e2ebd9]">
                  {selectedWeather.temperature}°C
                </div>
                <div className="text-[10px] text-gray-400 capitalize">
                  {selectedWeather.condition}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-gray-500">Location</div>
              <div className="text-xs text-[#ffcf4d] font-bold">
                {selectedAnimal.latestLat?.toFixed(2)}, {selectedAnimal.latestLng?.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Impact warning */}
          {(() => {
            const impact = getMovementImpact(selectedWeather);
            const colors = {
              low: 'border-[#3dff9a] text-[#3dff9a]',
              medium: 'border-[#ffcf4d] text-[#ffcf4d]',
              high: 'border-[#ff3b5c] text-[#ff3b5c]',
            };
            return (
              <div className={`border ${colors[impact.severity]} bg-opacity-10 bg-[#000011] p-3 rounded-lg`}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">⚠️ {impact.impact}</span>
                  <span className={`text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                    impact.severity === 'high' ? 'bg-[#ff3b5c]/20 text-[#ff3b5c]' :
                    impact.severity === 'medium' ? 'bg-[#ffcf4d]/20 text-[#ffcf4d]' :
                    'bg-[#3dff9a]/20 text-[#3dff9a]'
                  }`}>
                    {impact.severity} impact
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">{impact.description}</p>
              </div>
            );
          })()}

          {/* Detailed metrics */}
          <div className="grid grid-cols-2 gap-2">
            <WeatherMetric label="Wind" value={`${selectedWeather.windSpeed} km/h`} icon="💨" />
            <WeatherMetric label="Direction" value={`${selectedWeather.windDirection}°`} icon="🧭" />
            <WeatherMetric label="Humidity" value={`${selectedWeather.humidity}%`} icon="💧" />
            <WeatherMetric label="Pressure" value={`${selectedWeather.pressure} hPa`} icon="📊" />
            <WeatherMetric label="Visibility" value={`${selectedWeather.visibility} km`} icon="👁️" />
            <WeatherMetric label="Precipitation" value={`${selectedWeather.precipitation} mm`} icon="🌧️" />
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className="text-3xl mb-2">🌍</div>
          <p className="text-xs text-gray-400">
            {selectedAnimalId
              ? 'Loading weather data...'
              : 'Select an animal to see live weather at their location'}
          </p>
        </div>
      )}

      {/* All animals weather summary */}
      {!selectedAnimalId && weatherData.size > 0 && (
        <div className="border-t border-[#12e0ff]/10 p-3">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            All Locations
          </div>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {animals.map(animal => {
              const weather = weatherData.get(animal.id);
              if (!weather) return null;
              return (
                <div
                  key={animal.id}
                  className="flex items-center justify-between bg-[#0b0f0c] px-3 py-2 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span>{getWeatherIcon(weather.condition)}</span>
                    <span className="text-[10px] text-[#e2ebd9]">{animal.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#12e0ff]">
                    {weather.temperature}°C
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherMetric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-[#0b0f0c] border border-gray-800 px-3 py-2 rounded-lg">
      <div className="flex items-center gap-1 text-[9px] text-gray-500 uppercase tracking-wider">
        <span>{icon}</span> {label}
      </div>
      <div className="text-xs font-bold text-[#e2ebd9] mt-0.5">{value}</div>
    </div>
  );
}
