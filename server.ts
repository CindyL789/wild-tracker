/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import AdmZip from "adm-zip";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

// Curated public studies list
const STUDIES = [
  {
    id: "29110",
    name: "White Stork Migration (Europe-Africa)",
    species: "White Stork",
    taxon: "Ciconia ciconia",
    description: "Multi-year tracking of White Storks migrating across the Mediterranean, Sahara Desert, and Sahel region from nesting grounds in Europe to overwintering areas in Africa.",
    defaultCenter: [25.0, 15.0],
    defaultZoom: 3,
  },
  {
    id: "2126",
    name: "Galapagos Albatross Oceanic Foraging",
    species: "Waved Albatross",
    taxon: "Phoebastria irrorata",
    description: "GPS tracking of critically endangered Waved Albatrosses during foraging flights from their breeding colonies in Española Island (Galapagos) to the nutrient-rich Humboldt Current along the Peruvian shelf.",
    defaultCenter: [-6.0, -84.0],
    defaultZoom: 5,
  },
  {
    id: "wolves-voyageurs",
    name: "Voyageurs Wolf Project (Borderlands Patrol)",
    species: "Gray Wolf",
    taxon: "Canis lupus",
    description: "Summer territorial movements and predation behavior of Gray Wolves in and around Voyageurs National Park, northern Minnesota, near the US-Canada border.",
    defaultCenter: [48.4, -92.8],
    defaultZoom: 10,
  },
  {
    id: "grizzlies-rockies",
    name: "Grizzly Range (Banff & Greater Yellowstone)",
    species: "Grizzly Bear",
    taxon: "Ursus arctos horribilis",
    description: "Territorial roaming, seasonal foraging elevation shifts, and denning runs of Grizzly Bears in the high-elevation ecosystems of the Rocky Mountains.",
    defaultCenter: [44.5, -110.5],
    defaultZoom: 7,
  }
];

// High-quality offline fallback animals and GPS tracking events
const FALLBACK_ANIMALS: Record<string, any[]> = {
  "29110": [
    { id: "stork-jonas", name: "Jonas the Wanderer", species: "White Stork", sex: "M", taxonCanonical: "Ciconia ciconia" },
    { id: "stork-bella", name: "Bella", species: "White Stork", sex: "F", taxonCanonical: "Ciconia ciconia" },
    { id: "stork-albert", name: "Albert", species: "White Stork", sex: "M", taxonCanonical: "Ciconia ciconia" }
  ],
  "2126": [
    { id: "albatross-espanola", name: "Española Explorer", species: "Waved Albatross", sex: "M", taxonCanonical: "Phoebastria irrorata" },
    { id: "albatross-humboldt", name: "Humboldt Glider", species: "Waved Albatross", sex: "F", taxonCanonical: "Phoebastria irrorata" }
  ],
  "wolves-voyageurs": [
    { id: "wolf-v089", name: "Wolf V089 (Shoepack Pack)", species: "Gray Wolf", sex: "M", taxonCanonical: "Canis lupus" },
    { id: "wolf-v110", name: "Wolf V110 (Ash River Pack)", species: "Gray Wolf", sex: "F", taxonCanonical: "Canis lupus" },
    { id: "wolf-v093", name: "Wolf V093 (Half-Moon Pack)", species: "Gray Wolf", sex: "M", taxonCanonical: "Canis lupus" }
  ],
  "grizzlies-rockies": [
    { id: "grizzly-399", name: "Grizzly 399 (Grand Teton Legend)", species: "Grizzly Bear", sex: "F", taxonCanonical: "Ursus arctos horribilis" },
    { id: "grizzly-m7", name: "Grizzly M7 (Sundance Grizzly)", species: "Grizzly Bear", sex: "M", taxonCanonical: "Ursus arctos horribilis" }
  ]
};

// Generates high-quality paths with temporal tracking coordinate lists
const generateFallbackEvents = (studyId: string): any[] => {
  const events: any[] = [];
  const baseDate = new Date();

  if (studyId === "29110") {
    // Jonas migration from Germany -> Gibraltar -> West Africa -> South Africa
    const jonasRoute = [
      { lat: 51.1, lng: 10.4 }, // Germany Nest
      { lat: 48.8, lng: 8.5 },
      { lat: 45.7, lng: 4.8 },  // Lyon, France
      { lat: 41.3, lng: 2.1 },  // Barcelona, Spain
      { lat: 37.3, lng: -5.9 }, // Seville, Spain
      { lat: 36.1, lng: -5.3 }, // Gibraltar Strait Crossing
      { lat: 33.5, lng: -7.5 }, // Casablanca, Morocco
      { lat: 27.1, lng: -13.2 }, // Western Sahara
      { lat: 20.5, lng: -13.0 }, // Mauritania
      { lat: 14.4, lng: -12.1 }, // Senegal River
      { lat: 12.6, lng: -8.0 },  // Bamako, Mali Overwintering Ground
    ];

    // Bella migration through Eastern Europe -> Turkey -> Sinai -> East Africa
    const bellaRoute = [
      { lat: 52.2, lng: 21.0 }, // Warsaw, Poland
      { lat: 48.1, lng: 23.3 }, // Carpathians
      { lat: 42.6, lng: 23.3 }, // Bulgaria
      { lat: 41.0, lng: 28.9 }, // Bosphorus Strait (Turkey)
      { lat: 37.0, lng: 35.3 }, // Adana, Turkey
      { lat: 32.0, lng: 35.5 }, // Jordan Valley
      { lat: 28.0, lng: 34.0 }, // Sinai Peninsula Crossing
      { lat: 24.0, lng: 32.8 }, // Nile near Aswan
      { lat: 15.6, lng: 32.5 }, // Khartoum, Sudan
      { lat: 9.0, lng: 38.7 },  // Addis Ababa, Ethiopia
      { lat: -1.2, lng: 36.8 }, // Nairobi, Kenya Overwintering
    ];

    // Albert local foraging in Spain / Europe
    const albertRoute = [
      { lat: 39.4, lng: -6.3 }, // Cáceres nesting ground, Spain
      { lat: 39.5, lng: -6.1 },
      { lat: 39.2, lng: -6.5 },
      { lat: 39.7, lng: -6.4 },
      { lat: 39.3, lng: -6.0 },
      { lat: 39.1, lng: -6.2 },
      { lat: 39.5, lng: -6.3 },
    ];

    const routes = { "stork-jonas": jonasRoute, "stork-bella": bellaRoute, "stork-albert": albertRoute };

    Object.entries(routes).forEach(([animalId, coords]) => {
      coords.forEach((coord, i) => {
        const time = new Date(baseDate.getTime() - (coords.length - 1 - i) * 12 * 60 * 60 * 1000);
        events.push({
          id: `${animalId}-ev-${i}`,
          individualId: animalId,
          lat: coord.lat + (Math.random() - 0.5) * 0.02, // Add tiny jitter
          lng: coord.lng + (Math.random() - 0.5) * 0.02,
          timestamp: time.toISOString(),
          altitude: 120 + i * 45,
          speed: 40 + Math.random() * 20
        });
      });
    });
  } else if (studyId === "2126") {
    // Albatrosses leave Galapagos Española island towards the Humboldt current in Peru
    const espanolaRoute = [
      { lat: -1.38, lng: -89.65 }, // Española Nesting colony
      { lat: -2.1, lng: -88.5 },
      { lat: -3.5, lng: -86.2 },
      { lat: -5.0, lng: -84.1 },
      { lat: -6.8, lng: -82.5 },
      { lat: -8.5, lng: -81.2 }, // Oceanic foraging
      { lat: -10.2, lng: -79.8 }, // Approaching Humboldt Trench
      { lat: -12.1, lng: -78.5 }, // Off Lima, Peru
      { lat: -11.9, lng: -78.1 },
      { lat: -11.5, lng: -78.4 }
    ];

    const humboldtRoute = [
      { lat: -1.38, lng: -89.65 }, // Española
      { lat: -1.1, lng: -87.8 },
      { lat: -1.8, lng: -85.5 },
      { lat: -2.8, lng: -83.2 },
      { lat: -4.5, lng: -81.8 },
      { lat: -6.2, lng: -80.5 },
      { lat: -7.8, lng: -79.9 }, // Peru shelf
      { lat: -9.5, lng: -79.2 },
      { lat: -9.1, lng: -79.5 }
    ];

    const routes = { "albatross-espanola": espanolaRoute, "albatross-humboldt": humboldtRoute };

    Object.entries(routes).forEach(([animalId, coords]) => {
      coords.forEach((coord, i) => {
        const time = new Date(baseDate.getTime() - (coords.length - 1 - i) * 6 * 60 * 60 * 1000);
        events.push({
          id: `${animalId}-ev-${i}`,
          individualId: animalId,
          lat: coord.lat + (Math.random() - 0.5) * 0.05,
          lng: coord.lng + (Math.random() - 0.5) * 0.05,
          timestamp: time.toISOString(),
          altitude: 15 + Math.random() * 10,
          speed: 55 + Math.random() * 30
        });
      });
    });
  } else if (studyId === "wolves-voyageurs") {
    // Wolves patrolling tight, highly structured loops (home territories)
    // Wolf V089: Shoepack Lake region
    const v089Base = { lat: 48.45, lng: -92.85 };
    const v110Base = { lat: 48.35, lng: -92.70 };
    const v093Base = { lat: 48.50, lng: -93.05 };

    const packBases = { "wolf-v089": v089Base, "wolf-v110": v110Base, "wolf-v093": v093Base };

    Object.entries(packBases).forEach(([animalId, base]) => {
      // Create a randomized closed loop patrol path
      const pointsCount = 15;
      for (let i = 0; i < pointsCount; i++) {
        const angle = (i / pointsCount) * Math.PI * 2;
        const radius = 0.04 + Math.sin(angle * 3) * 0.015; // irregular territory shape
        const lat = base.lat + Math.sin(angle) * radius;
        const lng = base.lng + Math.cos(angle) * radius;
        const time = new Date(baseDate.getTime() - (pointsCount - 1 - i) * 4 * 60 * 60 * 1000);

        events.push({
          id: `${animalId}-ev-${i}`,
          individualId: animalId,
          lat: lat + (Math.random() - 0.5) * 0.005,
          lng: lng + (Math.random() - 0.5) * 0.005,
          timestamp: time.toISOString(),
          altitude: 340 + Math.random() * 40,
          speed: 4 + Math.random() * 12
        });
      }
    });
  } else if (studyId === "grizzlies-rockies") {
    // Roaming mountains in Western Wyoming/Montana
    // Grizzly 399 roaming around Oxbow Bend and Teton wilderness
    const base399 = { lat: 43.87, lng: -110.58 };
    // Grizzly M7 roaming south in Yellowstone
    const baseM7 = { lat: 44.45, lng: -110.82 };

    const bears = { "grizzly-399": base399, "grizzly-m7": baseM7 };

    Object.entries(bears).forEach(([animalId, base]) => {
      const pointsCount = 12;
      for (let i = 0; i < pointsCount; i++) {
        // Meandering alpine trail wanderings
        const lat = base.lat + (i * 0.008) * Math.sin(i * 1.5) + (Math.random() - 0.5) * 0.005;
        const lng = base.lng + (i * 0.012) * Math.cos(i * 1.1) + (Math.random() - 0.5) * 0.005;
        const time = new Date(baseDate.getTime() - (pointsCount - 1 - i) * 8 * 60 * 60 * 1000);

        events.push({
          id: `${animalId}-ev-${i}`,
          individualId: animalId,
          lat: lat,
          lng: lng,
          timestamp: time.toISOString(),
          altitude: 2100 + (Math.sin(i) * 350) + Math.random() * 50, // mountain elevation changes
          speed: 2 + Math.random() * 8
        });
      }
    });
  }

  return events;
};

// Safely parse JSON from Response, returning null on empty or malformed text
const parseResponseJson = async (response: Response): Promise<any> => {
  try {
    const text = await response.text();
    if (!text || text.trim() === "") {
      return null;
    }
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
};

// Memory cache for dynamically imported studies from Movebank Data Repository
const IMPORTED_STUDIES: Record<string, {
  metadata: {
    id: string;
    name: string;
    species: string;
    taxon: string;
    description: string;
    defaultCenter: [number, number];
    defaultZoom: number;
  };
  individuals: any[];
  events: any[];
}> = {};

const isGpsBitstream = (name: string): boolean => {
  const n = name.toLowerCase();
  return (n.endsWith(".csv") || n.endsWith(".csv.zip")) &&
         !n.includes("reference") &&
         !n.includes("readme") &&
         !n.includes("-acc") &&
         !n.includes("acc-") &&
         !n.includes("acceleration");
};

// Parse CSV Telemetry
const parseCsvTelemetry = (csvText: string, studyId: string, customSpecies: string, customTaxon: string) => {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return { individuals: [], events: [] };

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  
  const latIdx = headers.findIndex(h => h === "location-lat" || h === "location_lat" || h === "latitude" || h === "lat");
  const lngIdx = headers.findIndex(h => h === "location-long" || h === "location_long" || h === "longitude" || h === "lng" || h === "lon");
  const timeIdx = headers.findIndex(h => h === "timestamp" || h === "time" || h === "date");
  const indIdx = headers.findIndex(h => h === "individual-local-identifier" || h === "individual_local_identifier" || h === "individual-id" || h === "individual_id" || h === "individual-local-id");
  const taxonIdx = headers.findIndex(h => h === "individual-taxon-canonical-name" || h === "individual_taxon_canonical_name" || h === "taxon" || h === "species");
  const altIdx = headers.findIndex(h => h === "height-above-ellipsoid" || h === "altitude" || h === "alt");
  const speedIdx = headers.findIndex(h => h === "speed" || h === "ground-speed" || h === "ground_speed");
  const visibleIdx = headers.findIndex(h => h === "visible");

  if (latIdx === -1 || lngIdx === -1) {
    console.log("CSV missing lat/long columns. Found headers:", headers);
    return { individuals: [], events: [] };
  }

  const individualsMap: Record<string, any> = {};
  const events: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const char = line[c];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(current.trim().replace(/^"|"$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }
    cols.push(current.trim().replace(/^"|"$/g, ""));

    if (cols.length <= Math.max(latIdx, lngIdx)) continue;

    if (visibleIdx !== -1 && cols[visibleIdx] === "false") continue;

    const latStr = cols[latIdx];
    const lngStr = cols[lngIdx];
    if (!latStr || !lngStr) continue;

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) continue;

    let rawIndId = indIdx !== -1 ? cols[indIdx] : "Animal-1";
    if (!rawIndId) rawIndId = "Animal-1";
    const indId = String(rawIndId);

    let timestamp = timeIdx !== -1 ? cols[timeIdx] : new Date().toISOString();
    if (timestamp.endsWith("S") || timestamp.endsWith("s")) {
      timestamp = timestamp.slice(0, -1) + "0";
    }

    const indTaxon = taxonIdx !== -1 && cols[taxonIdx] ? cols[taxonIdx] : customTaxon || "Various";
    const indSpecies = indTaxon;

    const altitude = altIdx !== -1 && cols[altIdx] ? parseFloat(cols[altIdx]) : undefined;
    const speed = speedIdx !== -1 && cols[speedIdx] ? parseFloat(cols[speedIdx]) : undefined;

    if (!individualsMap[indId]) {
      individualsMap[indId] = {
        id: indId,
        studyId: studyId,
        name: indId,
        species: indSpecies,
        sex: "U",
        taxonCanonical: indTaxon
      };
    }

    events.push({
      id: `${indId}-ev-${i}`,
      individualId: indId,
      lat,
      lng,
      timestamp,
      altitude,
      speed
    });
  }

  const groupedEvents: Record<string, any[]> = {};
  events.forEach(ev => {
    if (!groupedEvents[ev.individualId]) {
      groupedEvents[ev.individualId] = [];
    }
    groupedEvents[ev.individualId].push(ev);
  });

  const finalEvents: any[] = [];
  Object.keys(groupedEvents).forEach(indId => {
    const sorted = groupedEvents[indId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    finalEvents.push(...sorted.slice(-80));
  });

  return {
    individuals: Object.values(individualsMap),
    events: finalEvents
  };
};

const resolveAndImportHandle = async (handleInput: string): Promise<any> => {
  const match = handleInput.match(/move\.\d+/i);
  if (!match) return null;

  const handle = match[0].toLowerCase();
  const cachedId = `imported-${handle.replace(".", "-")}`;

  if (IMPORTED_STUDIES[cachedId]) {
    return IMPORTED_STUDIES[cachedId].metadata;
  }

  console.log(`Resolving handle ${handle} via DSpace REST API...`);
  const discoverUrl = `https://datarepository.movebank.org/server/api/discover/search/objects?query=${handle}`;
  const dRes = await fetch(discoverUrl, { headers: { "Accept": "application/json" } });
  if (!dRes.ok) {
    throw new Error(`Failed to query DSpace search for handle ${handle}`);
  }
  const dData = await dRes.json();
  const objects = dData._embedded?.searchResult?._embedded?.objects || [];
  if (objects.length === 0) {
    throw new Error(`Handle ${handle} not found in Movebank Data Repository`);
  }

  const item = objects[0]._embedded?.indexableObject;
  if (!item) {
    throw new Error(`Failed to parse item from handle search results for ${handle}`);
  }

  const title = item.metadata["dc.title"]?.[0]?.value || `Imported Study ${handle}`;
  const uuid = item.uuid;
  const species = item.metadata["dwc.ScientificName"]?.[0]?.value || "Multiple Species";
  const taxon = species;
  const description = item.metadata["dc.description.abstract"]?.[0]?.value || 
                      item.metadata["dc.description"]?.[0]?.value || 
                      `Telemetry tracking study imported from Movebank Data Repository handle ${handle}.`;

  // Fetch bundles
  const bRes = await fetch(`https://datarepository.movebank.org/server/api/core/items/${uuid}/bundles`, { headers: { "Accept": "application/json" } });
  if (!bRes.ok) {
    throw new Error(`Failed to fetch bundles for item ${uuid}`);
  }
  const bData = await bRes.json();
  const originalBundle = bData._embedded?.bundles?.find((b: any) => b.name === "ORIGINAL");
  if (!originalBundle) {
    throw new Error(`No ORIGINAL tracking data bundle found for handle ${handle}`);
  }

  // Fetch bitstreams
  const bitRes = await fetch(`https://datarepository.movebank.org/server/api/core/bundles/${originalBundle.uuid}/bitstreams?size=100`, { headers: { "Accept": "application/json" } });
  if (!bitRes.ok) {
    throw new Error(`Failed to fetch bitstreams for bundle ${originalBundle.uuid}`);
  }
  const bitData = await bitRes.json();
  const bitstreams = bitData._embedded?.bitstreams || [];

  const gpsBitstream = bitstreams.find((b: any) => isGpsBitstream(b.name));
  if (!gpsBitstream) {
    throw new Error(`No compatible GPS tracking CSV file found in dataset for handle ${handle}`);
  }

  console.log(`Downloading telemetry file: ${gpsBitstream.name}...`);
  const contentRes = await fetch(gpsBitstream._links.content.href);
  if (!contentRes.ok) {
    throw new Error(`Failed to download tracking data from ${gpsBitstream.name}`);
  }

  const buffer = await contentRes.arrayBuffer();
  let csvText = "";

  if (gpsBitstream.name.endsWith(".zip")) {
    console.log(`Decompressing zip archive...`);
    const zip = new AdmZip(Buffer.from(buffer));
    const entry = zip.getEntries().find(e => e.entryName.endsWith(".csv"));
    if (!entry) {
      throw new Error(`No CSV file found inside the zip archive ${gpsBitstream.name}`);
    }
    csvText = entry.getData().toString("utf8");
  } else {
    csvText = Buffer.from(buffer).toString("utf8");
  }

  console.log(`Parsing telemetry CSV (${csvText.length} bytes)...`);
  const parsed = parseCsvTelemetry(csvText, cachedId, species, taxon);

  if (parsed.individuals.length === 0 || parsed.events.length === 0) {
    throw new Error(`No valid individual animal telemetry tracks could be parsed from the CSV.`);
  }

  let latSum = 0;
  let lngSum = 0;
  parsed.events.forEach(ev => {
    latSum += ev.lat;
    lngSum += ev.lng;
  });
  const defaultCenter: [number, number] = [
    latSum / parsed.events.length,
    lngSum / parsed.events.length
  ];

  const metadata = {
    id: cachedId,
    name: title.replace(/^Data from:\s*/i, ""),
    species,
    taxon,
    description,
    defaultCenter,
    defaultZoom: 9
  };

  IMPORTED_STUDIES[cachedId] = {
    metadata,
    individuals: parsed.individuals,
    events: parsed.events
  };

  console.log(`Successfully imported study ${cachedId} (${parsed.individuals.length} animals, ${parsed.events.length} coordinates)`);
  return metadata;
};

// Helper to resolve handle IDs (e.g. 3629 / move.3629) or shortened IDs to actual Movebank API study IDs
const resolveRealStudyId = (studyId: string): string => {
  if (!studyId) return "";
  let cleanId = studyId.trim().toLowerCase();

  // Handle URL paths
  if (cleanId.includes("/")) {
    const parts = cleanId.split("/");
    cleanId = parts[parts.length - 1];
  }

  // Handle "move." prefix (e.g. move.3629)
  if (cleanId.startsWith("move.")) {
    cleanId = cleanId.substring(5);
  }

  // Strip anything that is not alphanumeric
  cleanId = cleanId.replace(/[^a-z0-9-]/g, "");

  // Known study ID redirects / mappings
  // - White Stork Migration handle 3629 (move.3629) maps to Movebank study 2911040
  // - White Stork Migration UI ID 29110 maps to Movebank study 2911040
  if (cleanId === "29110" || cleanId === "3629") {
    return "2911040";
  }

  // Map 2126 to 2911040 on Movebank for live public data
  if (cleanId === "2126") {
    return "2911040";
  }

  return cleanId;
};

// Robust helper to fetch study data from Movebank using different sensor types in parallel
const fetchMovebankPublicJson = async (realStudyId: string): Promise<any> => {
  // Support all major location sensor types from Movebank's catalog
  const sensorTypes = ["gps", "argos-doppler-shift", "solar-geolocator", "radio-transmitter", "bird-ring", "natural-mark", ""];
  
  const promises = sensorTypes.map(async (sensorType) => {
    try {
      const url = sensorType 
        ? `https://www.movebank.org/movebank/service/public/json?study_id=${realStudyId}&sensor_type=${sensorType}`
        : `https://www.movebank.org/movebank/service/public/json?study_id=${realStudyId}`;
        
      const response = await fetch(url, { headers: { "Accept": "application/json" } });
      if (!response.ok) return null;
      const data = await parseResponseJson(response);
      if (data && Array.isArray(data.individuals) && data.individuals.length > 0) {
        return data;
      }
    } catch (e) {
      // Ignore and let other concurrent fetches proceed
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.find((r) => r !== null) || null;
};

// ===================== API ENDPOINTS =====================

// Get all studies
app.get("/api/studies", (req, res) => {
  const allStudies = [...STUDIES, ...Object.values(IMPORTED_STUDIES).map(s => s.metadata)];
  res.json(allStudies);
});

// Proxy Movebank study individuals or fallback
app.get("/api/movebank/study/:studyId/individuals", async (req, res) => {
  const { studyId } = req.params;

  if (IMPORTED_STUDIES[studyId]) {
    return res.json(IMPORTED_STUDIES[studyId].individuals);
  }

  // Check if study is a customized offline-only study
  if (studyId === "wolves-voyageurs" || studyId === "grizzlies-rockies") {
    return res.json(FALLBACK_ANIMALS[studyId] || []);
  }

  const realStudyId = resolveRealStudyId(studyId);

  try {
    const data = await fetchMovebankPublicJson(realStudyId);

    if (data && Array.isArray(data.individuals) && data.individuals.length > 0) {
      const individuals = data.individuals.map((ind: any) => ({
        id: String(ind.individual_id || ind.individual_local_identifier || ind.id),
        studyId: studyId, // return original studyId
        name: ind.individual_local_identifier || ind.nickname || `Animal ${ind.individual_id || ind.id}`,
        species: ind.individual_taxon_canonical_name || ind.taxon_canonical_name || "Unknown Species",
        sex: ind.sex || "U",
        taxonCanonical: ind.individual_taxon_canonical_name || ind.taxon_canonical_name || "",
      }));
      return res.json(individuals);
    }

    console.log(`No public individuals found for study ${realStudyId}. Using fallback.`);
    return res.json(FALLBACK_ANIMALS[studyId] || []);
  } catch (error: any) {
    console.log(`Failed to fetch from Movebank API for study ${realStudyId}: ${error.message}. Using fallback.`);
    return res.json(FALLBACK_ANIMALS[studyId] || []);
  }
});

// Proxy Movebank study events or fallback
app.get("/api/movebank/study/:studyId/events", async (req, res) => {
  const { studyId } = req.params;

  if (IMPORTED_STUDIES[studyId]) {
    return res.json(IMPORTED_STUDIES[studyId].events);
  }

  if (studyId === "wolves-voyageurs" || studyId === "grizzlies-rockies") {
    return res.json(generateFallbackEvents(studyId));
  }

  const realStudyId = resolveRealStudyId(studyId);

  try {
    const data = await fetchMovebankPublicJson(realStudyId);

    const mappedEvents: any[] = [];

    if (data && Array.isArray(data.individuals)) {
      data.individuals.forEach((ind: any) => {
        const individualId = String(ind.individual_id || ind.individual_local_identifier || ind.id);
        if (Array.isArray(ind.locations)) {
          ind.locations.forEach((loc: any) => {
            if (loc.location_lat != null && loc.location_long != null) {
              let isoTimestamp = new Date().toISOString();
              if (loc.timestamp != null) {
                isoTimestamp = new Date(loc.timestamp).toISOString();
              }
              mappedEvents.push({
                id: String(loc.id || `${individualId}-${loc.timestamp}-${Math.random()}`),
                individualId: individualId,
                lat: Number(loc.location_lat),
                lng: Number(loc.location_long),
                timestamp: isoTimestamp,
                altitude: loc.height_above_ellipsoid != null ? Number(loc.height_above_ellipsoid) : undefined,
                speed: loc.ground_speed != null ? Number(loc.ground_speed) : undefined
              });
            }
          });
        }
      });
    }

    if (mappedEvents.length > 0) {
      // Group and sort to return max 80 events per animal to keep response fast & clean
      const groupedByAnimal: Record<string, any[]> = {};
      mappedEvents.forEach((ev: any) => {
        if (!groupedByAnimal[ev.individualId]) {
          groupedByAnimal[ev.individualId] = [];
        }
        groupedByAnimal[ev.individualId].push(ev);
      });

      const limitedEvents: any[] = [];
      Object.keys(groupedByAnimal).forEach((animalId) => {
        const sorted = groupedByAnimal[animalId].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const subset = sorted.slice(-60);
        limitedEvents.push(...subset);
      });

      return res.json(limitedEvents);
    }

    console.log(`No valid public events found for study ${realStudyId}. Using fallback.`);
    return res.json(generateFallbackEvents(studyId));
  } catch (error: any) {
    console.log(`Failed to fetch events from Movebank API for study ${realStudyId}: ${error.message}. Using fallback.`);
    return res.json(generateFallbackEvents(studyId));
  }
});

// Get study metadata from Movebank or fallback
app.get("/api/movebank/study-metadata/:studyId", async (req, res) => {
  const { studyId } = req.params;

  // Check if study is in our memory cached imported studies
  if (IMPORTED_STUDIES[studyId]) {
    return res.json(IMPORTED_STUDIES[studyId].metadata);
  }

  // Check if studyId looks like a DSpace handle suffix, handle URL, or similar
  if (studyId.toLowerCase().includes("move.") || studyId.includes("/")) {
    try {
      const metadata = await resolveAndImportHandle(studyId);
      if (metadata) {
        return res.json(metadata);
      }
    } catch (error: any) {
      console.log(`Failed to resolve handle ${studyId}: ${error.message}`);
      return res.status(400).json({ error: error.message || `Failed to resolve handle ${studyId}` });
    }
  }

  const realStudyId = resolveRealStudyId(studyId);

  try {
    if (studyId === "wolves-voyageurs") {
      return res.json({
        id: "wolves-voyageurs",
        name: "Voyageurs Wolf Project (Minnesota)",
        species: "Gray Wolf",
        taxon: "Canis lupus",
        description: "Study tracking the summer ecology and predation behavior of wolves in and around Voyageurs National Park, Northern Minnesota.",
        defaultCenter: [48.4, -92.8],
        defaultZoom: 9
      });
    }
    if (studyId === "grizzlies-rockies") {
      return res.json({
        id: "grizzlies-rockies",
        name: "Rocky Mountain Grizzly Bear Tracking",
        species: "Grizzly Bear",
        taxon: "Ursus arctos horribilis",
        description: "GPS tracking database studying home range overlap, habitat selection, and highway crossings of Grizzly Bears in the Canadian Rockies.",
        defaultCenter: [51.5, -116.0],
        defaultZoom: 8
      });
    }

    const foundStudy = STUDIES.find(s => s.id === studyId || s.id === realStudyId || (realStudyId === "2911040" && s.id === "29110"));
    if (foundStudy) {
      return res.json({
        ...foundStudy,
        id: studyId
      });
    }

    let name = `Movebank Study ${studyId}`;
    let description = `Dynamically imported telemetry tracking study from Movebank database using study ID ${studyId}.`;
    let species = "Multiple Species";
    let taxon = "Various";

    const data = await fetchMovebankPublicJson(realStudyId);
    if (data && Array.isArray(data.individuals) && data.individuals.length > 0) {
      const firstInd = data.individuals[0];
      name = `Movebank Study ${realStudyId}`;
      description = `Telemetry tracking study containing ${data.individuals.length} tagged individuals from the Movebank database.`;
      if (firstInd.individual_taxon_canonical_name || firstInd.taxon_canonical_name) {
        species = firstInd.individual_taxon_canonical_name || firstInd.taxon_canonical_name;
        taxon = firstInd.individual_taxon_canonical_name || firstInd.taxon_canonical_name;
      }
    }

    res.json({
      id: studyId,
      name,
      species,
      taxon,
      description,
      defaultCenter: [20.0, 10.0],
      defaultZoom: 3
    });
  } catch (error: any) {
    console.log(`Error fetching study metadata for ${realStudyId}: ${error.message}. Using default.`);
    const foundStudy = STUDIES.find(s => s.id === studyId || s.id === realStudyId || (realStudyId === "2911040" && s.id === "29110"));
    if (foundStudy) {
      return res.json({
        ...foundStudy,
        id: studyId
      });
    }
    res.json({
      id: studyId,
      name: `Movebank Study ${studyId}`,
      species: "Multiple Species",
      taxon: "Various",
      description: "Fallback telemetry study metadata.",
      defaultCenter: [20.0, 10.0],
      defaultZoom: 3
    });
  }
});

interface WildlifeCacheEntry {
  content: string;
  citations: { title: string; uri: string }[];
  timestamp: number;
}

const aiCache = new Map<string, WildlifeCacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache duration

function getOfflineFallback(animalName: string, speciesName: string, reason: string) {
  const name = animalName || "this animal";
  const species = speciesName || "this species";
  let details = "";

  if (
    species.toLowerCase().includes("stork") ||
    name.toLowerCase().includes("stork") ||
    name.toLowerCase().includes("jonas") ||
    name.toLowerCase().includes("bella")
  ) {
    details = `
### 🦅 Species Profile: White Stork (*Ciconia ciconia*)
White Storks are renowned for their long-distance migrations, nesting across Europe and overwintering in tropical Africa.

#### 📍 Telemetry & Migration Corridors
* **Western Route:** Storks nesting in Western Europe fly south through France and Spain, crossing the **Strait of Gibraltar** to reach West Africa (Mali, Senegal, Niger).
* **Eastern Route:** Storks from Eastern Europe migrate across the **Bosphorus Strait** (Turkey), flying down the Levant and the **Jordan Rift Valley**, crossing the Sinai Peninsula to overwinter in East and South Africa.
* **Flight Strategy:** They rely heavily on **thermal updrafts** over land. Because thermals do not form over deep water, storks rarely cross the Mediterranean Sea directly, instead funneling through narrow land bridges.

#### 🌍 Current Landmarks & Observations
The current telemetry track indicates active foraging and migratory movement over agricultural wetlands and grassy savannas. They are seeking locusts, frogs, and small rodents to sustain their high-energy journeys.

#### ⚠️ Conservation Status & Threats
* **Power Lines:** Collisions with power lines and electrocution represent significant hazards along their migration corridors.
* **Habitat Loss:** Drainage of wetlands and conversion of wet meadows to intensive agriculture reduces crucial foraging grounds.
* **Climate Shift:** Changing weather patterns can alter the timing of insect hatches and thermals, disrupting ancestral migration schedules.
`;
  } else if (species.toLowerCase().includes("albatross") || name.toLowerCase().includes("albatross")) {
    details = `
### 🌊 Species Profile: Waved Albatross (*Phoebastria irrorata*)
The Waved Albatross is a critically endangered seabird, nesting almost exclusively on Española Island in the Galápagos archipelago.

#### 📍 Telemetry & Oceanic Foraging Routes
* **Humboldt Current:** During foraging trips, breeding adults execute long, sweeping flights across the Pacific Ocean toward the nutrient-rich **Humboldt Current upwelling zone** along the Peruvian continental shelf.
* **Dynamic Soaring:** Using their immense wingspan, they perform dynamic soaring—extracting kinetic energy from the wind shear above ocean waves. This allows them to travel thousands of kilometers with minimal wing-flapping.
* **Española Colony:** Telemetry tracks show loops departing from the cliffs of Española, reaching depths of the Peruvian shelf, and returning with food for their chicks.

#### 🌍 Current Landmarks & Observations
Telemetry coordinates position this individual glider over the deep waters of the Peru-Chile Trench, utilizing strong coastal offshore winds to forage for squid and schooling fish.

#### ⚠️ Conservation Status & Threats
* **Bycatch:** Accidental capture by longline and gillnet fisheries operating in the Humboldt Current is the primary cause of adult mortality.
* **El Niño (ENSO):** Severe warming of surface waters decreases marine productivity, occasionally leading to widespread breeding failure.
* **Plastic Pollution:** Ingestion of floating marine plastics mistaken as food remains a threat to both adults and developing chicks.
`;
  } else if (
    species.toLowerCase().includes("wolf") ||
    name.toLowerCase().includes("wolf") ||
    name.toLowerCase().includes("v089") ||
    name.toLowerCase().includes("v110")
  ) {
    details = `
### 🐺 Species Profile: Gray Wolf (*Canis lupus*)
Gray Wolves in the Great Lakes region are apex predators that play a vital role in maintaining the health of forest ecosystems.

#### 📍 Telemetry & Territorial Patrols
* **Territorial Boundaries:** GPS collar data shows tight, highly structured loops. Packs actively patrol and defend territories averaging 100 to 150 square kilometers, avoiding contact with neighboring packs.
* **Seasonal Behaviors:** During summer, movements focus on specialized summer foraging—hunting beaver kits in ponds, stalking white-tailed deer fawns, and searching for wild berries.
* **Voyageurs Region:** The borderlands forest features a complex network of lakes, rivers, and dense boreal forests, which wolves traverse using frozen waterways, game trails, and logging roads.

#### 🌍 Current Landmarks & Observations
The tracking nodes depict meticulous territorial checks and hunting loops around the lakeshores and dense mixed-wood forests, with short rest stops along remote ridgelines.

#### ⚠️ Conservation Status & Threats
* **Human-Wildlife Conflict:** Encroachment and livestock interactions occasionally lead to lethal management or illegal take.
* **Habitat Fragmentation:** High densities of active roads increase vehicle collisions and segment contiguous pack territories.
* **Disease:** Exposure to canine parvovirus, sarcoptic mange, and heartworm can impact pack pup survival rates.
`;
  } else if (
    species.toLowerCase().includes("bear") ||
    species.toLowerCase().includes("grizzly") ||
    name.toLowerCase().includes("grizzly")
  ) {
    details = `
### 🐻 Species Profile: Grizzly Bear (*Ursus arctos horribilis*)
Grizzly Bears are majestic keystone omnivores of the mountain ecosystems of Western North America.

#### 📍 Telemetry & Seasonal Home Ranges
* **Seasonal Elevation Shifts:** Tracking shows significant seasonal migration. In spring, grizzlies descend to low-elevation valley bottoms for early green vegetation. In summer and autumn, they climb to alpine areas to forage on berries, roots, and army cutworm moths.
* **Hyperphagia:** During late summer and autumn, bears enter hyperphagia—a period of intense eating to build fat reserves required for the long winter denning season.
* **Yellowstone/Rockies:** GPS tracking highlights critical corridors, highway crossings, and habitat choices in Banff, Grand Teton, and Yellowstone ecosystems.

#### 🌍 Current Landmarks & Observations
Telemetry coordinates record this individual navigating subalpine slopes and scree fields, actively foraging for wild huckleberries and high-fat insects before winter hibernation.

#### ⚠️ Conservation Status & Threats
* **Habitat Fragmentation:** Highway corridors and residential expansion fragment their expansive home ranges, isolating subpopulations.
* **Human-Bear Conflict:** Attractants (unsecured garbage, fruit trees, carcasses) can lead to management removals.
* **Food Source Decline:** Climate pressures on key food sources, such as whitebark pine seeds and cutthroat trout, force bears to seek alternative, potentially high-risk food sources.
`;
  } else {
    details = `
### 🐾 Species Profile: Telemetry Subject (*${species}*)
This individual, designated as **${name}**, is tracked using advanced high-frequency GPS biotelemetry to study movement ecology and habitat use.

#### 📍 Telemetry & Movement Strategy
* **Space Use:** Wild animals optimize their energy expenditure by establishing core home ranges, migrating seasonally, or dispersing to find new territories.
* **Biotelemetry Benefits:** Tracking provides biologists with precise location coordinates, altitudes, speeds, and activity signatures, enabling data-driven conservation planning.

#### 🌍 Current Landmarks & Observations
The GPS track highlights active use of key ecological corridors, with movements influenced by local topography, water sources, and vegetation cover.

#### ⚠️ Conservation Status & Threats
* **Habitat Fragmentation:** Division of wild lands by human infrastructure blocks natural migration paths and reduces genetic diversity.
* **Climate Extremes:** Shifts in precipitation and temperature affect food and water availability.
* **Anthropogenic Disturbance:** Urban expansion and resource extraction increase encounters with human activity.
`;
  }

  let alertHeader = "";
  if (reason === "no_key") {
    alertHeader = "⚠️ **Note: The Gemini API key is not configured. Showing curated species insights from our offline conservation database.**";
  } else if (reason === "quota") {
    alertHeader = "⚠️ **Note: The live Wildlife AI has temporarily reached its quota limit. Showing curated species insights from our offline conservation database.**";
  } else {
    alertHeader = `⚠️ **Note: The live Wildlife AI is currently experiencing high demand. Showing curated species insights from our offline conservation database.**`;
  }

  const content = `${alertHeader}\n\n${details}\n\n***\n\n*For custom live queries with Google Maps grounding, please check or re-apply your API key in **Settings > Secrets**.*`;

  return {
    content,
    citations: [
      { title: "Movebank Global Wildlife Database", uri: "https://www.movebank.org" },
      { title: "IUCN Red List of Threatened Species", uri: "https://www.iucnredlist.org" }
    ]
  };
}

// Gemini Wildlife Intelligence Chat with Google Maps Grounding
app.post("/api/wildlife-ai", async (req, res) => {
  const { query, animalName, speciesName } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  // 1. Check in-memory Cache first to save quota
  const cacheKey = `${animalName || ""}:${speciesName || ""}:${query.trim().toLowerCase()}`;
  const cached = aiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    console.log(`[Cache Hit] Returning cached response for: "${query}"`);
    return res.json({
      content: cached.content,
      citations: cached.citations
    });
  }

  // 2. Check if Gemini client is initialized
  if (!ai) {
    console.warn("Gemini API key is missing. Using offline curated fallback.");
    const fallback = getOfflineFallback(animalName, speciesName, "no_key");
    return res.json(fallback);
  }

  const contextualPrompt = `
You are the Wildlife Tracking Assistant. You provide professional conservation, biogeography, and ecological telemetry insights about tagged wild animals.
Contextual subject: ${animalName || "Unknown Wildlife"} (${speciesName || "Various Species"}).

User's Query: ${query}

Use your geographic knowledge and search grounding to answer. List any relevant migration corridors, geographical landmarks, coordinates, or conservation threats.
If Google Maps retrieves coordinates or locations, share them accurately.
Always write in clear, engaging, professional conservationist prose.
`;

  try {
    // Query Gemini 3.5 Flash with the Google Maps tool (enabling Maps Grounding)
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contextualPrompt,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    const aiText = response.text || "No response generated.";

    // Extract citations from the grounding metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const citations = groundingChunks
      .map((chunk: any) => {
        const title = chunk.web?.title || chunk.maps?.title || "Geographic Source";
        const uri = chunk.web?.uri || chunk.maps?.uri || "";
        return { title, uri };
      })
      .filter((cit: any) => cit.uri !== "");

    // Cache the successful response
    aiCache.set(cacheKey, {
      content: aiText,
      citations: citations,
      timestamp: Date.now()
    });

    res.json({
      content: aiText,
      citations: citations,
    });
  } catch (error: any) {
    console.warn("Gemini API Error, falling back to curated conservation facts database:", error.message);

    const isQuotaError = error.message?.includes("quota") || error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED");
    const reason = isQuotaError ? "quota" : error.message || "error";
    
    const fallback = getOfflineFallback(animalName, speciesName, reason);
    
    // Cache the fallback response for a shorter duration (e.g. 5 mins) so we don't spam the failing API immediately
    aiCache.set(cacheKey, {
      content: fallback.content,
      citations: fallback.citations,
      timestamp: Date.now() - (CACHE_TTL - 5 * 60 * 1000) // expires in 5 minutes
    });

    res.json(fallback);
  }
});

// Vite & Static Handlers
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
