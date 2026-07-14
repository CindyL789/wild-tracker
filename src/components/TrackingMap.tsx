/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Compass, MapPin } from "lucide-react";
import { TaggedAnimal, TrackingEvent } from "../types";

declare const L: any;

interface TrackingMapProps {
  animals: TaggedAnimal[];
  events: TrackingEvent[];
  selectedAnimalId: string | null;
  onSelectAnimal: (id: string | null) => void;
  onAskAIAboutAnimal: (animal: TaggedAnimal) => void;
}

// Visual color palette for animal trails
const TRAIL_COLORS = [
  "#9ebd91", // Sage Green
  "#426e4e", // Fern Green
  "#f0eae1", // Sand Sand
  "#ff7675", // Coral Red
  "#74b9ff", // Sky Blue
  "#a29bfe"  // Soft Purple
];

export default function TrackingMap({
  animals,
  events,
  selectedAnimalId,
  onSelectAnimal,
  onAskAIAboutAnimal
}: TrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersGroupRef = useRef<any>(null);
  const activeMarkersRef = useRef<Record<string, any>>({});

  // Animation Replay state
  const [isPlaying, setIsPlaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(100); // percentage (0 - 100)
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 4x
  const timerRef = useRef<any>(null);

  // Group events by animal
  const eventsByAnimal = useRef<Record<string, TrackingEvent[]>>({});
  useEffect(() => {
    const grouped: Record<string, TrackingEvent[]> = {};
    events.forEach(ev => {
      if (!grouped[ev.individualId]) {
        grouped[ev.individualId] = [];
      }
      grouped[ev.individualId].push(ev);
    });

    // Sort events inside each animal group by timestamp ascending
    Object.keys(grouped).forEach(id => {
      grouped[id].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });

    eventsByAnimal.current = grouped;
  }, [events]);

  // 1. Initialize map once
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use default center (Europe/Africa region coordinates)
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([20.0, 10.0], 3);

    // Dark high-fidelity conservation map style
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd"
    }).addTo(map);

    // Add zoom control at bottom-right
    L.control.zoom({
      position: "bottomright"
    }).addTo(map);

    layersGroupRef.current = L.featureGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Clear & Draw layers when animals, events, or replay progress change
  useEffect(() => {
    const map = mapRef.current;
    const layersGroup = layersGroupRef.current;
    if (!map || !layersGroup) return;

    // Clear existing polylines, circles, etc.
    layersGroup.clearLayers();
    activeMarkersRef.current = {};

    if (events.length === 0) return;

    const bounds = L.latLngBounds([]);
    let colorIndex = 0;

    animals.forEach(animal => {
      const animalEvents = eventsByAnimal.current[animal.id] || [];
      if (animalEvents.length === 0) return;

      // Slice events depending on current replay progress (enables migration trail animation)
      const visibleCount = Math.max(1, Math.ceil((animalEvents.length * replayProgress) / 100));
      const visibleEvents = animalEvents.slice(0, visibleCount);

      if (visibleEvents.length === 0) return;

      const trailColor = TRAIL_COLORS[colorIndex % TRAIL_COLORS.length];
      colorIndex++;

      // Create polyline pathway coords
      const latlngs = visibleEvents.map(ev => [ev.lat, ev.lng]);

      // Draw Polyline trail
      const isSelected = selectedAnimalId === animal.id;
      const polyline = L.polyline(latlngs, {
        color: trailColor,
        weight: isSelected ? 4 : 2,
        opacity: isSelected ? 0.9 : 0.5,
        lineJoin: "round",
        dashArray: isSelected ? undefined : "4, 6"
      }).addTo(layersGroup);

      // Add popup to trail
      polyline.bindPopup(`
        <div class="p-1">
          <p class="font-bold text-brand-sage text-sm">${animal.name}</p>
          <p class="text-xs text-gray-400 font-mono">${animal.species}</p>
          <p class="text-xs text-gray-400 mt-1">Trail length: ${latlngs.length} tracking points</p>
        </div>
      `);

      // Record points to boundaries
      latlngs.forEach(ll => bounds.extend(ll));

      // Draw past coordinates as micro circles if selected
      if (isSelected) {
        visibleEvents.forEach((ev, idx) => {
          if (idx === visibleEvents.length - 1) return; // skip latest
          L.circleMarker([ev.lat, ev.lng], {
            radius: 3,
            fillColor: trailColor,
            fillOpacity: 0.6,
            color: "#0f1411",
            weight: 1
          })
            .bindPopup(`<p class="text-xs font-mono">Telemetry Pt #${idx + 1}<br/>${new Date(ev.timestamp).toLocaleString()}</p>`)
            .addTo(layersGroup);
        });
      }

      // Draw Pulse Active Marker at current head position
      const currentHead = visibleEvents[visibleEvents.length - 1];
      const isLatestHeader = replayProgress === 100;

      // Custom HTML DivIcon to prevent default Leaflet image 404 assets
      const customMarkerHtml = `
        <div class="relative w-7 h-7 flex items-center justify-center rounded-full bg-[#121914] border-2 border-[${trailColor}] shadow-lg active-marker-pulse ${isSelected ? 'scale-125 z-50' : 'z-20'}" style="border-color: ${trailColor}">
          <span class="text-[10px] font-bold" style="color: ${trailColor}">${animal.name.charAt(0)}</span>
          ${isSelected ? `<div class="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400"></div>` : ""}
        </div>
      `;

      const customIcon = L.divIcon({
        html: customMarkerHtml,
        className: "", // Clear defaults
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([currentHead.lat, currentHead.lng], { icon: customIcon }).addTo(layersGroup);

      // Save marker ref to open popup programmatically
      activeMarkersRef.current[animal.id] = marker;

      // Generate rich descriptive popup HTML
      const popupHtml = `
        <div class="p-2 font-sans select-none min-w-[200px]">
          <div class="flex items-center justify-between border-b border-brand-moss pb-2 mb-2">
            <span class="font-bold text-brand-sand text-base">${animal.name}</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${animal.sex === 'M' ? 'bg-blue-900/30 text-blue-300' : animal.sex === 'F' ? 'bg-pink-900/30 text-pink-300' : 'bg-gray-800 text-gray-300'}">${animal.sex || 'Unknown'}</span>
          </div>
          <p class="text-xs text-brand-sage font-medium italic mb-1">${animal.taxonCanonical}</p>
          <div class="space-y-1 font-mono text-[11px] text-gray-300">
            <p class="flex justify-between"><span>Lat/Lng:</span> <span class="text-brand-sage font-bold">${currentHead.lat.toFixed(4)}, ${currentHead.lng.toFixed(4)}</span></p>
            <p class="flex justify-between"><span>Date/Time:</span> <span>${new Date(currentHead.timestamp).toLocaleDateString()} ${new Date(currentHead.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></p>
            ${currentHead.altitude ? `<p class="flex justify-between"><span>Altitude:</span> <span class="text-[#dfd5c6]">${currentHead.altitude.toFixed(0)} m</span></p>` : ""}
            ${currentHead.speed ? `<p class="flex justify-between"><span>Speed:</span> <span class="text-[#dfd5c6]">${currentHead.speed.toFixed(1)} km/h</span></p>` : ""}
          </div>
          <div class="flex gap-2 mt-3 pt-2 border-t border-brand-moss">
            <button id="btn-select-${animal.id}" class="flex-1 bg-brand-moss border border-brand-fern hover:bg-brand-fern text-brand-sage hover:text-white transition text-[10px] font-bold py-1 px-1.5 rounded flex items-center justify-center gap-1 cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg> Focus
            </button>
            <button id="btn-ai-${animal.id}" class="flex-1 bg-brand-fern hover:bg-brand-sage hover:text-brand-bg text-[#e2ebd9] transition text-[10px] font-bold py-1 px-1.5 rounded flex items-center justify-center gap-1 cursor-pointer">
              ✨ Ask Gemini
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      // Handle popup interactions after popup is appended to DOM
      marker.on("popupopen", () => {
        setTimeout(() => {
          const selectBtn = document.getElementById(`btn-select-${animal.id}`);
          const aiBtn = document.getElementById(`btn-ai-${animal.id}`);

          if (selectBtn) {
            selectBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              onSelectAnimal(animal.id);
            });
          }
          if (aiBtn) {
            aiBtn.addEventListener("click", (e) => {
              e.stopPropagation();
              onAskAIAboutAnimal(animal);
            });
          }
        }, 50);
      });
    });

    // Fit map bounds to encompass all plotting trajectories
    if (bounds.isValid() && selectedAnimalId == null) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [animals, events, selectedAnimalId, replayProgress]);

  // 3. Zoom/pan to specifically focused animal
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedAnimalId || events.length === 0) return;

    const animalEvents = eventsByAnimal.current[selectedAnimalId] || [];
    if (animalEvents.length === 0) return;

    // Head position coordinate
    const visibleCount = Math.max(1, Math.ceil((animalEvents.length * replayProgress) / 100));
    const headEvent = animalEvents[visibleCount - 1];

    if (headEvent) {
      map.setView([headEvent.lat, headEvent.lng], 9, { animate: true, duration: 1 });

      // Trigger popup open automatically
      const marker = activeMarkersRef.current[selectedAnimalId];
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 800);
      }
    }
  }, [selectedAnimalId, replayProgress]);

  // 4. Timer replay logic
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setReplayProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 100;
          }
          const increment = 1 * playbackSpeed;
          return Math.min(100, prev + increment);
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const handlePlayPause = () => {
    if (replayProgress >= 100) {
      setReplayProgress(2); // start over
    }
    setIsPlaying(!isPlaying);
  };

  const handleResetReplay = () => {
    setIsPlaying(false);
    setReplayProgress(100);
  };

  return (
    <div className="flex flex-col h-full bg-brand-panel border border-brand-moss rounded-2xl overflow-hidden relative group shadow-2xl">
      {/* Top Map Headers */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 pointer-events-auto">
        <div className="bg-brand-bg/90 backdrop-blur-md border border-brand-moss px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xl select-none">
          <MapPin className="w-4 h-4 text-brand-sage animate-bounce" />
          <div>
            <p className="text-xs font-semibold text-brand-sand leading-none">Global Track Network</p>
            <p className="text-[10px] text-gray-400 font-mono mt-0.5">
              {events.length} Data Coordinates active
            </p>
          </div>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2 pointer-events-auto">
        {selectedAnimalId && (
          <button
            onClick={() => onSelectAnimal(null)}
            className="bg-brand-bg/90 backdrop-blur-md border border-brand-moss hover:bg-brand-panel text-brand-sage hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xl cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5" /> Show All Paths
          </button>
        )}
      </div>

      {/* Map Canvas div */}
      <div ref={mapContainerRef} className="flex-1 w-full" style={{ minHeight: "380px" }} />

      {/* Temporal Replay Timeline Controls */}
      <div className="bg-brand-bg/90 backdrop-blur-md border-t border-brand-moss px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full bg-brand-moss border border-brand-fern text-brand-sage hover:bg-brand-fern hover:text-white transition flex items-center justify-center shadow-md cursor-pointer"
            title={isPlaying ? "Pause replay" : "Replay migration pathway"}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
          </button>

          {/* Reset */}
          <button
            onClick={handleResetReplay}
            disabled={replayProgress === 100 && !isPlaying}
            className="p-2 rounded-lg border border-brand-moss hover:border-brand-fern text-gray-400 hover:text-brand-sage transition disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            title="Reset to latest coordinates"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="text-xs font-mono text-gray-400">
            <span className="text-brand-sage font-bold">REPLAY TIMELINE:</span>{" "}
            {replayProgress === 100 ? "LATEST FIX" : `${replayProgress}% TRACK`}
          </div>
        </div>

        {/* Replay Slider */}
        <div className="flex-1 flex items-center gap-3 w-full">
          <input
            type="range"
            min="2"
            max="100"
            value={replayProgress}
            onChange={(e) => {
              setIsPlaying(false);
              setReplayProgress(parseInt(e.target.value));
            }}
            className="w-full h-1.5 bg-brand-moss rounded-lg appearance-none cursor-pointer accent-brand-sage border-none outline-none"
          />
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1.5 self-end md:self-auto">
          <span className="text-[10px] font-mono text-gray-500 uppercase">Speed:</span>
          {[1, 2, 4].map(speed => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition border cursor-pointer ${
                playbackSpeed === speed
                  ? "bg-brand-sage text-brand-bg border-brand-sage"
                  : "bg-brand-panel-light border-brand-moss text-gray-400 hover:text-white"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
