/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef } from "react";
import {
  Compass,
  Search,
  Activity,
  Globe,
  Loader,
  Sliders,
  Navigation,
  Database,
  Info,
  ChevronRight,
  TrendingUp,
  MapPin,
  Sparkles,
  Plus,
  Download
} from "lucide-react";
import { WildlifeStudy, TaggedAnimal, TrackingEvent, ChatMessage } from "./types";
import TrackingMap from "./components/TrackingMap";
import IntelligenceAssistant from "./components/IntelligenceAssistant";

// Haversine formula for coordinate-to-coordinate distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
}

export default function App() {
  // Studies & Animals state
  const [studies, setStudies] = useState<WildlifeStudy[]>([]);
  const [selectedStudyId, setSelectedStudyId] = useState<string>("");
  const [animals, setAnimals] = useState<TaggedAnimal[]>([]);
  const [events, setEvents] = useState<TrackingEvent[]>([]);

  // Selection states
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Loading states
  const [isLoadingStudies, setIsLoadingStudies] = useState(true);
  const [isLoadingAnimals, setIsLoadingAnimals] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Import Custom Study states
  const [importStudyId, setImportStudyId] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Date Filtering states
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [minDateBoundary, setMinDateBoundary] = useState<string>("");
  const [maxDateBoundary, setMaxDateBoundary] = useState<string>("");

  // User Geolocation state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Gemini Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // 1. Fetch studies and request user coordinates on mount
  useEffect(() => {
    async function loadStudies() {
      try {
        const res = await fetch("/api/studies");
        if (res.ok) {
          const data = await res.json();
          setStudies(data);
          if (data.length > 0) {
            setSelectedStudyId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tracking studies", err);
      } finally {
        setIsLoadingStudies(false);
      }
    }

    loadStudies();

    // Check navigator geolocation safely
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => console.log("User denied geolocation access.")
      );
    }
  }, []);

  // 2. Fetch individuals and tracking events when study selection changes
  useEffect(() => {
    if (!selectedStudyId) return;

    async function loadStudyTelemetry() {
      setIsLoadingAnimals(true);
      setIsLoadingEvents(true);
      setSelectedAnimalId(null);

      try {
        // Fetch individuals (animals in the study)
        const indRes = await fetch(`/api/movebank/study/${selectedStudyId}/individuals`);
        let fetchedAnimals: TaggedAnimal[] = [];
        if (indRes.ok) {
          fetchedAnimals = await indRes.json();
        }

        // Fetch events (GPS coordinates)
        const evRes = await fetch(`/api/movebank/study/${selectedStudyId}/events`);
        let fetchedEvents: TrackingEvent[] = [];
        if (evRes.ok) {
          fetchedEvents = await evRes.json();
        }

        // Sort events chronologically to compute statistics
        fetchedEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Attach latest coordinates directly to animals
        const updatedAnimals = fetchedAnimals.map((animal) => {
          const animalEvents = fetchedEvents.filter((e) => e.individualId === animal.id);
          if (animalEvents.length > 0) {
            const latest = animalEvents[animalEvents.length - 1];
            return {
              ...animal,
              latestLat: latest.lat,
              latestLng: latest.lng,
              latestTimestamp: latest.timestamp
            };
          }
          return animal;
        });

        setAnimals(updatedAnimals);
        setEvents(fetchedEvents);
      } catch (err) {
        console.error("Failed to load study telemetry", err);
      } finally {
        setIsLoadingAnimals(false);
        setIsLoadingEvents(false);
      }
    }

    loadStudyTelemetry();
  }, [selectedStudyId]);

  // 3. Clear chat messages when study changes to keep context clean
  useEffect(() => {
    setChatMessages([]);
  }, [selectedStudyId]);

  // 4. Update date range boundaries when events list changes
  useEffect(() => {
    if (events.length > 0) {
      const timestamps = events
        .map((e) => new Date(e.timestamp).getTime())
        .filter((t) => !isNaN(t));

      if (timestamps.length > 0) {
        const minT = Math.min(...timestamps);
        const maxT = Math.max(...timestamps);

        const formatDateStr = (timestamp: number) => {
          const d = new Date(timestamp);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const minStr = formatDateStr(minT);
        const maxStr = formatDateStr(maxT);

        setMinDateBoundary(minStr);
        setMaxDateBoundary(maxStr);
        setStartDate(minStr);
        setEndDate(maxStr);
      }
    } else {
      setMinDateBoundary("");
      setMaxDateBoundary("");
      setStartDate("");
      setEndDate("");
    }
  }, [events]);

  // 5. Compute filtered events based on start and end dates
  const filteredEvents = events.filter((e) => {
    if (!e.timestamp) return true;
    const itemDate = new Date(e.timestamp).getTime();
    if (isNaN(itemDate)) return true;

    const startLimit = startDate ? new Date(startDate + "T00:00:00").getTime() : 0;
    const endLimit = endDate ? new Date(endDate + "T23:59:59").getTime() : Infinity;

    return itemDate >= startLimit && itemDate <= endLimit;
  });

  // 6. Import Movebank Study dynamically by ID, handle, or URL
  const handleImportMovebankStudy = async () => {
    const rawInput = importStudyId.trim();
    if (!rawInput || isImporting) return;
    setIsImporting(true);
    setImportError(null);

    try {
      // Check if already in studies
      if (studies.some((s) => s.id === rawInput || s.id.toLowerCase().includes(rawInput.toLowerCase()))) {
        const found = studies.find((s) => s.id === rawInput || s.id.toLowerCase().includes(rawInput.toLowerCase()));
        if (found) {
          setSelectedStudyId(found.id);
          setImportStudyId("");
          return;
        }
      }

      const res = await fetch(`/api/movebank/study-metadata/${encodeURIComponent(rawInput)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to retrieve study details. Make sure the study exists, is public, and has GPS tracking datasets.");
      }

      const studyData: WildlifeStudy = await res.json();
      
      // Verify study has individual tracking nodes
      const indRes = await fetch(`/api/movebank/study/${studyData.id}/individuals`);
      if (indRes.ok) {
        const inds = await indRes.json();
        if (!Array.isArray(inds) || inds.length === 0) {
          throw new Error("This study does not have any active tracking individuals.");
        }
      }

      setStudies((prev) => [...prev, studyData]);
      setSelectedStudyId(studyData.id);
      setImportStudyId("");
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || "Failed to import. Please check study ID or try again.");
    } finally {
      setIsImporting(false);
    }
  };

  // 7. Export tracking telemetry data to CSV
  const handleExportCSV = () => {
    const targetEvents = selectedAnimalId
      ? filteredEvents.filter((e) => e.individualId === selectedAnimalId)
      : filteredEvents;

    if (targetEvents.length === 0) return;

    const csvRows = [
      ["Event ID", "Individual ID", "Animal Name", "Species", "Latitude", "Longitude", "Timestamp", "Altitude (m)", "Speed (km/h)"],
      ...targetEvents.map((ev) => {
        const animal = animals.find((a) => a.id === ev.individualId);
        return [
          ev.id,
          ev.individualId,
          animal ? animal.name : "Unknown",
          animal ? animal.species : "Unknown",
          ev.lat,
          ev.lng,
          ev.timestamp,
          ev.altitude != null ? ev.altitude : "",
          ev.speed != null ? ev.speed : ""
        ];
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wildtrack_${selectedAnimal ? selectedAnimal.name.replace(/\s+/g, '_') : 'study'}_telemetry.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeStudy = studies.find((s) => s.id === selectedStudyId);
  const selectedAnimal = animals.find((a) => a.id === selectedAnimalId);

  // Filter animals based on search text
  const filteredAnimals = animals.filter(
    (animal) =>
      animal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      animal.species.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute stats for selected animal or study-wide averages
  const calculateTelemetryStats = () => {
    const targetId = selectedAnimalId;
    const targetEvents = targetId
      ? filteredEvents.filter((e) => e.individualId === targetId)
      : filteredEvents;

    if (targetEvents.length < 2) {
      return { totalDistance: 0, avgAltitude: 0, maxSpeed: 0, pointsCount: targetEvents.length };
    }

    // Sort ascending by time
    const sorted = [...targetEvents].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Compute cumulative sequential distance
    let totalDistance = 0;
    let maxSpeed = 0;
    let sumAltitude = 0;
    let altCount = 0;

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) {
        totalDistance += calculateDistance(sorted[i - 1].lat, sorted[i - 1].lng, sorted[i].lat, sorted[i].lng);
      }
      if (sorted[i].speed && sorted[i].speed! > maxSpeed) {
        maxSpeed = sorted[i].speed!;
      }
      if (sorted[i].altitude != null) {
        sumAltitude += sorted[i].altitude!;
        altCount++;
      }
    }

    return {
      totalDistance: Math.round(totalDistance),
      avgAltitude: altCount > 0 ? Math.round(sumAltitude / altCount) : 0,
      maxSpeed: maxSpeed ? Number(maxSpeed.toFixed(1)) : 0,
      pointsCount: targetEvents.length
    };
  };

  const stats = calculateTelemetryStats();

  // Send message to Gemini AI API
  const handleSendChat = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/wildlife-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          animalName: selectedAnimal?.name || "",
          speciesName: selectedAnimal?.species || activeStudy?.species || ""
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Service encountered a processing error.");
      }

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.content,
        citations: data.citations
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **API Error:** ${err.message || "Failed to reach the Gemini Wildlife Intelligence service. Please make sure process.env.GEMINI_API_KEY is configured."}`
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Trigger automated AI summary about selected animal
  const handleAskAIAboutAnimal = (animal: TaggedAnimal) => {
    setSelectedAnimalId(animal.id);
    const text = `Summarize the recent track updates for ${animal.name} (${animal.species}). Describe their nesting habits, migration pattern, and what geographical landmarks they are flying over or traversing according to live data.`;
    handleSendChat(text);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-[#e2ebd9] bg-[#0b0f0c] select-none">
      {/* 1. Header Navbar */}
      <header className="bg-brand-panel border-b border-brand-moss px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-moss border border-brand-fern/40 flex items-center justify-center text-brand-sage shadow-md">
            <Compass className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-brand-sand tracking-wider uppercase font-sans">
                WildTrack
              </h1>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-brand-fern text-white font-bold uppercase tracking-widest font-mono">
                Telemetry
              </span>
            </div>
            <p className="text-xs text-gray-400 font-sans mt-0.5">
              Movebank Global Biotelemetry & Maps Grounding Ecosystem
            </p>
          </div>
        </div>

        {/* Current Study Info Summary */}
        <div className="flex items-center gap-4 bg-brand-panel-light border border-brand-moss px-4 py-2 rounded-xl">
          <div className="text-right hidden md:block">
            <p className="text-[10px] text-gray-500 font-mono uppercase">Telemetry Status</p>
            <p className="text-xs text-brand-sage font-bold font-sans">
              {isLoadingAnimals || isLoadingEvents ? "Syncing..." : "Fully Synced"}
            </p>
          </div>
          <div className="w-px h-8 bg-brand-moss hidden md:block"></div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-sage" />
            <div className="text-left">
              <p className="text-[10px] text-gray-400 font-mono uppercase">Local Time</p>
              <p className="text-xs font-mono text-brand-sand font-bold">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        
        {/* Left Column: Telemetry controls */}
        <section className="lg:col-span-1 flex flex-col gap-6 h-full min-h-[500px]">
          {/* Study Select Section */}
          <div className="bg-brand-panel border border-brand-moss p-4 rounded-2xl flex flex-col gap-3 shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-brand-moss pb-2">
              <Database className="w-4 h-4 text-brand-sage" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-sand font-sans">
                Select Telemetry Study
              </h2>
            </div>

            {isLoadingStudies ? (
              <div className="flex items-center justify-center py-6 text-brand-sage">
                <Loader className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {studies.map((study) => (
                  <button
                    key={study.id}
                    onClick={() => setSelectedStudyId(study.id)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition border cursor-pointer ${
                      selectedStudyId === study.id
                        ? "bg-brand-moss border-brand-fern text-brand-sage shadow-inner"
                        : "bg-brand-panel-light border-transparent text-gray-400 hover:text-white hover:border-brand-moss"
                    }`}
                  >
                    <div className="font-bold font-sans">{study.name}</div>
                    <div className="text-[10px] italic text-gray-500 font-sans mt-0.5">
                      {study.species} ({study.taxon})
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeStudy && (
              <p className="text-[11px] text-gray-400 leading-relaxed bg-brand-panel-light/30 p-2.5 rounded-lg border border-brand-moss/40 font-sans">
                {activeStudy.description}
              </p>
            )}

            {/* Import Custom Movebank Study ID Form */}
            <div className="border-t border-brand-moss/40 pt-3.5 mt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Import Movebank ID</span>
                <span className="text-[9px] text-brand-sage font-mono">Public Study Database</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Enter ID, handle, or URL..."
                  value={importStudyId}
                  onChange={(e) => {
                    setImportStudyId(e.target.value);
                    setImportError(null);
                  }}
                  disabled={isImporting}
                  className="flex-1 bg-brand-panel-light text-[11px] text-[#e2ebd9] border border-brand-moss focus:border-brand-fern focus:ring-1 focus:ring-brand-fern rounded-lg px-2.5 py-1.5 outline-none placeholder:text-gray-600 disabled:opacity-40 font-mono"
                />
                <button
                  type="button"
                  onClick={handleImportMovebankStudy}
                  disabled={isImporting || !importStudyId.trim()}
                  className="bg-brand-fern hover:bg-brand-sage hover:text-brand-bg text-[#e2ebd9] text-[11px] font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isImporting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Import
                </button>
              </div>
              {importError && (
                <p className="text-[10px] text-red-400 bg-red-950/25 border border-red-900/30 px-2 py-1.5 rounded-lg font-sans">
                  {importError}
                </p>
              )}
            </div>
          </div>

          {/* Tagged Animals Control List */}
          <div className="bg-brand-panel border border-brand-moss p-4 rounded-2xl flex-1 flex flex-col gap-3 shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-brand-moss pb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-brand-sage" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-brand-sand font-sans">
                  Tagged Individuals
                </h2>
              </div>
              <span className="text-[10px] bg-brand-moss text-brand-sage font-bold px-1.5 py-0.5 rounded border border-brand-fern/20 font-mono">
                {filteredAnimals.length} node{filteredAnimals.length !== 1 && "s"}
              </span>
            </div>

            {/* Animal Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name or species..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-brand-panel-light text-xs text-[#e2ebd9] border border-brand-moss focus:border-brand-fern focus:ring-1 focus:ring-brand-fern rounded-xl pl-9 pr-4 py-2 outline-none placeholder:text-gray-500"
              />
            </div>

            {/* Animal Scroll Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {isLoadingAnimals ? (
                <div className="flex flex-col items-center justify-center py-12 text-brand-sage gap-2">
                  <Loader className="w-6 h-6 animate-spin" />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500">Syncing node list...</span>
                </div>
              ) : filteredAnimals.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs font-sans">
                  No matching animals found.
                </div>
              ) : (
                filteredAnimals.map((animal) => {
                  const isSelected = selectedAnimalId === animal.id;
                  
                  // Compute distance if both animal latest lat/lng and user location exist
                  let userDistanceStr = "";
                  if (userLocation && animal.latestLat && animal.latestLng) {
                    const d = calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      animal.latestLat,
                      animal.latestLng
                    );
                    userDistanceStr = d > 1000 ? `${(d / 1000).toFixed(1)}k km` : `${d.toFixed(0)} km`;
                  }

                  return (
                    <div
                      key={animal.id}
                      onClick={() => setSelectedAnimalId(isSelected ? null : animal.id)}
                      className={`p-2.5 rounded-xl border transition cursor-pointer select-none relative overflow-hidden group flex flex-col gap-1 ${
                        isSelected
                          ? "bg-brand-panel-light border-brand-sage/60 text-[#e2ebd9]"
                          : "bg-brand-panel-light/30 border-transparent hover:border-brand-moss hover:bg-brand-panel-light/60 text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {/* Left color bar indicator */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 transition-transform ${
                          isSelected ? "bg-brand-sage" : "bg-transparent group-hover:bg-brand-moss"
                        }`}
                      />

                      <div className="flex items-center justify-between pl-1">
                        <div className="font-bold text-xs flex items-center gap-1 text-brand-sand">
                          {animal.name}
                          <span
                            className={`text-[9px] font-bold px-1 rounded uppercase ${
                              animal.sex === "M"
                                ? "bg-blue-900/40 text-blue-300"
                                : animal.sex === "F"
                                ? "bg-pink-900/40 text-pink-300"
                                : "bg-gray-800 text-gray-300"
                            }`}
                          >
                            {animal.sex || "U"}
                          </span>
                        </div>
                        {userDistanceStr && (
                          <div className="flex items-center gap-0.5 text-[10px] font-mono text-brand-sage">
                            <Navigation className="w-2.5 h-2.5 rotate-45" /> {userDistanceStr}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 pl-1 font-mono">
                        <span>{animal.species}</span>
                        {animal.latestLat && (
                          <span className="text-gray-400">
                            {animal.latestLat.toFixed(2)}, {animal.latestLng?.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Quick AI button when selected */}
                      {isSelected && (
                        <div className="mt-2 flex gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAskAIAboutAnimal(animal);
                            }}
                            className="flex-1 bg-brand-fern hover:bg-brand-sage hover:text-brand-bg text-[#e2ebd9] text-[9px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5" /> Analyze with AI
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Center Column: Interactive Map & Detailed Telemetry Metrics */}
        <section className="lg:col-span-2 flex flex-col gap-6 h-full min-h-[500px]">
          {/* Live Map wrapper */}
          <div className="flex-1 relative">
            {isLoadingEvents ? (
              <div className="absolute inset-0 bg-brand-panel/60 border border-brand-moss backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 rounded-2xl select-none">
                <Loader className="w-8 h-8 animate-spin text-brand-sage" />
                <span className="text-xs font-mono uppercase tracking-wider text-brand-sage font-bold">
                  Synchronizing GPS Trails...
                </span>
              </div>
            ) : null}

            <TrackingMap
              animals={animals}
              events={filteredEvents}
              selectedAnimalId={selectedAnimalId}
              onSelectAnimal={setSelectedAnimalId}
              onAskAIAboutAnimal={handleAskAIAboutAnimal}
            />
          </div>

          {/* Telemetry Metrics Board */}
          <div className="bg-brand-panel border border-brand-moss p-4 rounded-2xl shadow-lg select-none">
            <div className="flex items-center justify-between border-b border-brand-moss pb-2.5 mb-3">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-brand-sage" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand-sand font-sans">
                  Telemetry Analytics - {selectedAnimal ? selectedAnimal.name : "Study Wide"}
                </h3>
              </div>
              <div className="text-[10px] font-mono text-gray-500 uppercase">
                Active Sensor: <span className="text-brand-sage">GPS Multi-frequency</span>
              </div>
            </div>

            {/* Filter Date Range and Export CSV Panel */}
            <div className="bg-brand-panel-light/40 border border-brand-moss/30 p-3 rounded-xl mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide font-sans">
                  <Sliders className="w-3.5 h-3.5 text-brand-sage" /> Date Window:
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    min={minDateBoundary}
                    max={maxDateBoundary}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-brand-panel text-[11px] text-[#e2ebd9] border border-brand-moss/80 rounded-md px-2 py-1 outline-none focus:border-brand-fern"
                  />
                  <span className="text-gray-500 text-xs">to</span>
                  <input
                    type="date"
                    min={minDateBoundary}
                    max={maxDateBoundary}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-brand-panel text-[11px] text-[#e2ebd9] border border-brand-moss/80 rounded-md px-2 py-1 outline-none focus:border-brand-fern"
                  />
                </div>
                {(startDate !== minDateBoundary || endDate !== maxDateBoundary) && (
                  <button
                    onClick={() => {
                      setStartDate(minDateBoundary);
                      setEndDate(maxDateBoundary);
                    }}
                    className="text-[10px] text-brand-sage hover:underline cursor-pointer font-sans font-bold"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              <button
                onClick={handleExportCSV}
                disabled={filteredEvents.length === 0}
                className="bg-brand-moss border border-brand-fern/40 hover:border-brand-fern hover:bg-brand-fern text-brand-sage hover:text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export Data (CSV)
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-brand-panel-light border border-brand-moss/40 p-3 rounded-xl">
                <p className="text-[10px] text-gray-500 font-mono uppercase leading-none">Total Distance</p>
                <p className="text-lg font-bold text-brand-sand font-sans mt-1">
                  {stats.totalDistance.toLocaleString()} <span className="text-xs text-brand-sage font-normal">km</span>
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">Approx. cumulative path</p>
              </div>

              <div className="bg-brand-panel-light border border-brand-moss/40 p-3 rounded-xl">
                <p className="text-[10px] text-gray-500 font-mono uppercase leading-none">Telemetry Fixes</p>
                <p className="text-lg font-bold text-brand-sand font-sans mt-1">
                  {stats.pointsCount} <span className="text-xs text-brand-sage font-normal">points</span>
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">GPS coordinate pulses</p>
              </div>

              <div className="bg-brand-panel-light border border-brand-moss/40 p-3 rounded-xl">
                <p className="text-[10px] text-gray-500 font-mono uppercase leading-none">Peak Flight Speed</p>
                <p className="text-lg font-bold text-brand-sand font-sans mt-1">
                  {stats.maxSpeed ? `${stats.maxSpeed}` : "N/A"}{" "}
                  {stats.maxSpeed ? <span className="text-xs text-brand-sage font-normal">km/h</span> : ""}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">Max recorded speed</p>
              </div>

              <div className="bg-brand-panel-light border border-brand-moss/40 p-3 rounded-xl">
                <p className="text-[10px] text-gray-500 font-mono uppercase leading-none">Avg Elevation</p>
                <p className="text-lg font-bold text-brand-sand font-sans mt-1">
                  {stats.avgAltitude ? `${stats.avgAltitude.toLocaleString()}` : "Sea Level"}{" "}
                  {stats.avgAltitude ? <span className="text-xs text-brand-sage font-normal">m</span> : ""}
                </p>
                <p className="text-[9px] text-gray-400 mt-0.5">Height above ellipsoid</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Gemini Wildlife Assistant */}
        <section className="lg:col-span-1 h-full min-h-[500px]">
          <IntelligenceAssistant
            selectedAnimal={selectedAnimal || null}
            messages={chatMessages}
            onSendMessage={handleSendChat}
            isLoading={isChatLoading}
          />
        </section>

      </main>
    </div>
  );
}
