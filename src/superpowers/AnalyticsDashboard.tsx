/**
 * ========================================================================
 * SUPERPOWER 4: ANALYTICS DASHBOARD
 * ========================================================================
 * 
 * Using bountywarz Analytics patterns:
 * - Privacy-first event tracking
 * - Performance monitoring
 * - User engagement metrics
 * - Animal popularity tracking
 */

import { useEffect, useState, useRef } from 'react';
import type { TaggedAnimal, TrackingEvent } from '../types';

interface AnalyticsDashboardProps {
  animals: TaggedAnimal[];
  events: TrackingEvent[];
  selectedAnimalId: string | null;
}

interface EngagementMetrics {
  totalSessions: number;
  avgSessionDuration: number;
  mostViewedAnimal: string | null;
  totalDataPoints: number;
  uniqueStudies: number;
  activeUsers: number;
}

interface AnimalStats {
  animalId: string;
  name: string;
  viewCount: number;
  avgTimeViewed: number;
  lastViewed: number;
  popularity: number;
}

export default function AnalyticsDashboard({ animals, events, selectedAnimalId }: AnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<EngagementMetrics>({
    totalSessions: 0,
    avgSessionDuration: 0,
    mostViewedAnimal: null,
    totalDataPoints: events.length,
    uniqueStudies: new Set(animals.map(a => a.studyId)).size,
    activeUsers: 1,
  });

  const [animalStats, setAnimalStats] = useState<AnimalStats[]>([]);
  const [sessionStart] = useState(Date.now());
  const [currentDuration, setCurrentDuration] = useState(0);
  const viewCounts = useRef<Map<string, { count: number; totalTime: number; lastViewed: number }>>(new Map());
  const viewStartTime = useRef<number | null>(null);

  // Track session duration
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDuration(Math.floor((Date.now() - sessionStart) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  // Track animal views
  useEffect(() => {
    if (selectedAnimalId) {
      const now = Date.now();
      
      if (viewStartTime.current) {
        const duration = now - viewStartTime.current;
        const prev = viewCounts.current.get(selectedAnimalId);
        if (prev) {
          prev.totalTime += duration;
        }
      }

      viewStartTime.current = now;
      const existing = viewCounts.current.get(selectedAnimalId);
      if (existing) {
        existing.count++;
        existing.lastViewed = now;
      } else {
        viewCounts.current.set(selectedAnimalId, {
          count: 1,
          totalTime: 0,
          lastViewed: now,
        });
      }

      updateAnimalStats();
    }

    return () => {
      if (viewStartTime.current && selectedAnimalId) {
        const duration = Date.now() - viewStartTime.current;
        const prev = viewCounts.current.get(selectedAnimalId);
        if (prev) {
          prev.totalTime += duration;
        }
        viewStartTime.current = null;
      }
    };
  }, [selectedAnimalId]);

  const updateAnimalStats = () => {
    const stats: AnimalStats[] = [];
    let maxViews = 0;
    let mostViewed = null;

    for (const [animalId, data] of viewCounts.current) {
      const animal = animals.find(a => a.id === animalId);
      if (!animal) continue;

      if (data.count > maxViews) {
        maxViews = data.count;
        mostViewed = animal.name;
      }

      stats.push({
        animalId,
        name: animal.name,
        viewCount: data.count,
        avgTimeViewed: Math.floor(data.totalTime / data.count / 1000),
        lastViewed: data.lastViewed,
        popularity: Math.min(100, (data.count / Math.max(1, maxViews)) * 100),
      });
    }

    stats.sort((a, b) => b.viewCount - a.viewCount);
    setAnimalStats(stats);
    setMetrics(prev => ({
      ...prev,
      mostViewedAnimal: mostViewed,
      totalDataPoints: events.length,
    }));
  };

  // Track events count changes
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      totalDataPoints: events.length,
      uniqueStudies: new Set(animals.map(a => a.studyId)).size,
    }));
  }, [events.length, animals]);

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const selectedAnimal = animals.find(a => a.id === selectedAnimalId);
  const selectedStats = selectedAnimalId ? viewCounts.current.get(selectedAnimalId) : null;

  return (
    <div className="bg-[#1a1a2e] border border-[#12e0ff]/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#12e0ff]/10">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <h3 className="text-xs font-bold text-[#e2ebd9] uppercase tracking-wider">
              Analytics
            </h3>
            <p className="text-[9px] text-gray-500">
              Session: {formatDuration(currentDuration)}
            </p>
          </div>
        </div>
      </div>

      {/* Current Session Metrics */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label="Data Points"
            value={metrics.totalDataPoints.toLocaleString()}
            icon="📍"
            color="#12e0ff"
          />
          <MetricCard
            label="Studies"
            value={metrics.uniqueStudies.toString()}
            icon="📚"
            color="#ffcf4d"
          />
          <MetricCard
            label="Animals"
            value={animals.length.toString()}
            icon="🦅"
            color="#3dff9a"
          />
          <MetricCard
            label="Session Time"
            value={formatDuration(currentDuration)}
            icon="⏱️"
            color="#ff3b5c"
          />
        </div>

        {/* Selected animal stats */}
        {selectedAnimal && selectedStats && (
          <div className="bg-[#0b0f0c] border border-[#ffcf4d]/20 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#ffcf4d]" />
              <span className="text-[10px] font-bold text-[#ffcf4d] uppercase tracking-wider">
                {selectedAnimal.name}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[9px] text-gray-500">Views</div>
                <div className="text-sm font-bold text-[#e2ebd9]">{selectedStats.count}</div>
              </div>
              <div>
                <div className="text-[9px] text-gray-500">Time Viewed</div>
                <div className="text-sm font-bold text-[#e2ebd9]">
                  {formatDuration(Math.floor(selectedStats.totalTime / 1000))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Animal popularity ranking */}
        {animalStats.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Most Viewed Animals
            </div>
            <div className="space-y-1.5">
              {animalStats.slice(0, 5).map((stat, index) => (
                <div key={stat.animalId} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-500 w-4">
                    {index + 1}
                  </span>
                  <div className="flex-1 bg-[#0b0f0c] rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-2 py-1.5">
                      <span className="text-[10px] text-[#e2ebd9]">{stat.name}</span>
                      <span className="text-[9px] text-gray-500">{stat.viewCount} views</span>
                    </div>
                    <div
                      className="h-0.5 bg-gradient-to-r from-[#12e0ff] to-[#ffcf4d]"
                      style={{ width: `${stat.popularity}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Telemetry coverage map (simplified) */}
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Telemetry Coverage
          </div>
          <div className="bg-[#0b0f0c] rounded-lg p-3">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 28 }).map((_, i) => {
                const hasData = i < (events.length / 100);
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-sm ${
                      hasData
                        ? 'bg-[#12e0ff] opacity-60'
                        : 'bg-gray-800'
                    }`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-2 text-[8px] text-gray-500">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        </div>

        {/* Export analytics */}
        <button
          onClick={() => {
            const data = {
              sessionDuration: currentDuration,
              animalsViewed: Array.from(viewCounts.current.entries()).map(([id, stats]) => {
                const animal = animals.find(a => a.id === id);
                return {
                  name: animal?.name || id,
                  views: stats.count,
                  time: stats.totalTime,
                };
              }),
              totalEvents: events.length,
              timestamp: new Date().toISOString(),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `wildtrack_analytics_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="w-full bg-[#12e0ff]/10 border border-[#12e0ff]/20 hover:bg-[#12e0ff]/20 text-[#12e0ff] text-[10px] font-bold py-2 rounded-lg transition"
        >
          📥 Export Session Analytics
        </button>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="bg-[#0b0f0c] border border-gray-800 p-3 rounded-lg">
      <div className="flex items-center gap-1 text-[9px] text-gray-500 uppercase tracking-wider">
        <span>{icon}</span> {label}
      </div>
      <div className="text-lg font-bold mt-1" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
