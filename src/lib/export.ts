/**
 * Data export utilities for Wild Tracker
 * Export tracking data as GPX, KML, or GeoJSON.
 */

import type { TrackingEvent, TaggedAnimal } from '../types';

// ── GPX Export ─────────────────────────────────────────────────────

export function exportGPX(animal: TaggedAnimal, events: TrackingEvent[]): string {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const trkpts = sorted
    .map(
      (ev) =>
        `      <trkpt lat="${ev.lat}" lon="${ev.lng}">${
          ev.altitude != null ? `\n        <ele>${ev.altitude}</ele>` : ''
        }\n        <time>${ev.timestamp}</time>${
          ev.speed != null ? `\n        <speed>${ev.speed}</speed>` : ''
        }\n      </trkpt>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Wild Tracker"
     xmlns="http://www.topografix.com/GPX/1/1"
     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${animal.name} - ${animal.species}</name>
    <desc>Tracking data for ${animal.name} (${animal.species}) from Wild Tracker</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${animal.name}</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

// ── KML Export ─────────────────────────────────────────────────────

export function exportKML(animal: TaggedAnimal, events: TrackingEvent[]): string {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const coordinates = sorted
    .map((ev) => `${ev.lng},${ev.lat}${ev.altitude != null ? `,${ev.altitude}` : ''}`)
    .join(' ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${animal.name} - ${animal.species}</name>
    <description>Tracking data for ${animal.name} (${animal.species}) from Wild Tracker</description>
    <Style id="trailStyle">
      <LineStyle>
        <color>ff00aaff</color>
        <width>3</width>
      </LineStyle>
    </Style>
    <Placemark>
      <name>${animal.name} Track</name>
      <styleUrl>#trailStyle</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>${coordinates}</coordinates>
      </LineString>
    </Placemark>
    ${
      sorted.length > 0
        ? `<Placemark>
      <name>${animal.name} - Latest Position</name>
      <Point>
        <coordinates>${sorted[sorted.length - 1].lng},${sorted[sorted.length - 1].lat}</coordinates>
      </Point>
    </Placemark>`
        : ''
    }
  </Document>
</kml>`;
}

// ── GeoJSON Export ─────────────────────────────────────────────────

export function exportGeoJSON(
  animals: TaggedAnimal[],
  eventsByAnimal: Record<string, TrackingEvent[]>
): string {
  const features: any[] = [];

  for (const animal of animals) {
    const events = (eventsByAnimal[animal.id] || []).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (events.length === 0) continue;

    // LineString for the trail
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: events.map((ev) => [ev.lng, ev.lat, ev.altitude || 0]),
      },
      properties: {
        animalId: animal.id,
        animalName: animal.name,
        species: animal.species,
        sex: animal.sex,
        eventType: 'trail',
        pointCount: events.length,
        firstSeen: events[0].timestamp,
        lastSeen: events[events.length - 1].timestamp,
      },
    });

    // Point for latest position
    const latest = events[events.length - 1];
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [latest.lng, latest.lat],
      },
      properties: {
        animalId: animal.id,
        animalName: animal.name,
        species: animal.species,
        sex: animal.sex,
        eventType: 'latest',
        timestamp: latest.timestamp,
        altitude: latest.altitude || null,
        speed: latest.speed || null,
      },
    });
  }

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      metadata: {
        generator: 'Wild Tracker',
        generated: new Date().toISOString(),
        animalCount: animals.length,
      },
      features,
    },
    null,
    2
  );
}

// ── CSV Export ─────────────────────────────────────────────────────

export function exportCSV(events: TrackingEvent[]): string {
  const header = 'animal_id,latitude,longitude,timestamp,altitude,speed\n';
  const rows = events
    .map(
      (ev) =>
        `${ev.individualId},${ev.lat},${ev.lng},${ev.timestamp},${ev.altitude ?? ''},${ev.speed ?? ''}`
    )
    .join('\n');
  return header + rows;
}

// ── Download helper ────────────────────────────────────────────────

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadGPX(animal: TaggedAnimal, events: TrackingEvent[]): void {
  downloadFile(
    exportGPX(animal, events),
    `${animal.id}-track.gpx`,
    'application/gpx+xml'
  );
}

export function downloadKML(animal: TaggedAnimal, events: TrackingEvent[]): void {
  downloadFile(
    exportKML(animal, events),
    `${animal.id}-track.kml`,
    'application/vnd.google-earth.kml+xml'
  );
}

export function downloadGeoJSON(
  animals: TaggedAnimal[],
  eventsByAnimal: Record<string, TrackingEvent[]>
): void {
  downloadFile(
    exportGeoJSON(animals, eventsByAnimal),
    'wild-tracker-export.geojson',
    'application/geo+json'
  );
}

export function downloadCSV(events: TrackingEvent[]): void {
  downloadFile(exportCSV(events), 'wild-tracker-events.csv', 'text/csv');
}
