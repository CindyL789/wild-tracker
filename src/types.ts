/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WildlifeStudy {
  id: string;
  name: string;
  species: string;
  taxon: string;
  description: string;
  defaultCenter: [number, number];
  defaultZoom: number;
}

export interface TaggedAnimal {
  id: string;
  studyId: string;
  name: string;
  species: string;
  sex: string;
  taxonCanonical: string;
  latestLat?: number;
  latestLng?: number;
  latestTimestamp?: string;
}

export interface TrackingEvent {
  id: string;
  individualId: string;
  lat: number;
  lng: number;
  timestamp: string;
  altitude?: number; // if available
  speed?: number; // if available
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{
    title: string;
    uri: string;
  }>;
  isLoading?: boolean;
}
