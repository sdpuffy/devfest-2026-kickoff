/**
 * venue-finder.ts — Location-Based Map & Facility Finder for Athleet
 *
 * Scans the AI workout plan requirements (e.g. barbell racks, 400m track, turf, pull-up rigs)
 * and matches real-world training facilities in Santa Cruz, CA.
 *
 * Provides one-tap directions opening directly into Apple Maps / Google Maps.
 */

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

export interface TrainingVenue {
  id: string;
  name: string;
  category: 'gym' | 'track' | 'park' | 'climbing_fitness' | 'pool';
  address: string;
  distance: string;
  equipmentTags: string[];
  bestForCoaches: string[];
  recommendedFor: string;
  lat: number;
  lng: number;
}

export const SANTA_CRUZ_VENUES: TrainingVenue[] = [
  {
    id: 'ucsc-track',
    name: 'UCSC Track & East Field',
    category: 'track',
    address: 'East Field House, 1156 High St, Santa Cruz, CA 95064',
    distance: '1.4 miles',
    equipmentTags: ['400m Olympic Track', 'Sprint Straights', 'Turf Infield', 'Ocean View Bleachers'],
    bestForCoaches: ['blaze', 'vanguard', 'atlas', 'blitz', 'diamond'],
    recommendedFor: 'Sprint mechanics, bounding drills, agility ladders & stadium conditioning.',
    lat: 36.9958,
    lng: -122.0558,
  },
  {
    id: 'toadal-downtown',
    name: 'Toadal Fitness (Downtown Santa Cruz)',
    category: 'gym',
    address: '1200 Pacific Ave, Santa Cruz, CA 95060',
    distance: '0.8 miles',
    equipmentTags: ['Power Squat Racks', 'Dumbbells to 120lbs', 'Cable Crossover', 'Deadlift Platforms'],
    bestForCoaches: ['ironside', 'atlas', 'anvil', 'rally', 'blitz', 'tide'],
    recommendedFor: 'Heavy compound barbell mass, Romanian deadlifts & high-volume hypertrophy.',
    lat: 36.9723,
    lng: -122.0258,
  },
  {
    id: 'pacific-edge',
    name: 'Pacific Edge Climbing & Conditioning',
    category: 'climbing_fitness',
    address: '104 Bronson St, Santa Cruz, CA 95062',
    distance: '1.9 miles',
    equipmentTags: ['Pull-up Rigs', 'Grip Training Station', 'Kettlebells', 'Free Weights'],
    bestForCoaches: ['anvil', 'strike', 'apex'],
    recommendedFor: 'Strict pull-ups, posterior chain endurance & functional grip stamina.',
    lat: 36.9702,
    lng: -122.0084,
  },
  {
    id: 'harvey-west',
    name: 'Harvey West Park & Fitness Trail',
    category: 'park',
    address: '326 Evergreen St, Santa Cruz, CA 95060',
    distance: '1.2 miles',
    equipmentTags: ['Calisthenics Bars', 'Dip Stations', 'Hill Sprint Trails', 'Open Grass'],
    bestForCoaches: ['blaze', 'strike', 'atlas', 'apex', 'diamond'],
    recommendedFor: 'Bodyweight progressions, plyometric hops & outdoor HIIT circuits.',
    lat: 36.9839,
    lng: -122.0366,
  },
  {
    id: 'schs-track',
    name: 'Santa Cruz High Memorial Track',
    category: 'track',
    address: '415 Walnut Ave, Santa Cruz, CA 95060',
    distance: '0.5 miles',
    equipmentTags: ['All-Weather Track', 'Long Jump Pit', 'Bleachers', 'Stair Sprints'],
    bestForCoaches: ['blaze', 'vanguard', 'blitz'],
    recommendedFor: 'Top-end sprint acceleration, hurdle mobility & stair conditioning.',
    lat: 36.9735,
    lng: -122.0361,
  },
  {
    id: '24hr-fitness',
    name: '24 Hour Fitness Santa Cruz',
    category: 'gym',
    address: '900 River St, Santa Cruz, CA 95060',
    distance: '1.1 miles',
    equipmentTags: ['Full Gym Racks', 'Olympic Benches', 'Leg Press Sled', 'Sauna / Recovery'],
    bestForCoaches: ['ironside', 'rally', 'anvil', 'diamond', 'tide'],
    recommendedFor: 'Full body power days, pause squats, chest presses & post-workout heat recovery.',
    lat: 36.9806,
    lng: -122.0298,
  },
  {
    id: 'simpkins-pool',
    name: 'Simpkins Family Swim Center',
    category: 'pool',
    address: '979 17th Ave, Santa Cruz, CA 95062',
    distance: '3.2 miles',
    equipmentTags: ['Lap Pool', 'Lane Lines', 'Pace Clock', 'Kickboards & Pull Buoys'],
    bestForCoaches: ['tide'],
    recommendedFor: 'Lap swimming, stroke drills, kick sets and interval training.',
    lat: 36.9768,
    lng: -121.9677,
  },
];

/**
 * Matches facilities based on the current coach and plan equipment.
 */
export function getRecommendedVenues(coachId: string, equipment: string = 'full_gym'): TrainingVenue[] {
  const cid = coachId.toLowerCase();

  return [...SANTA_CRUZ_VENUES].sort((a, b) => {
    const aFitsCoach = a.bestForCoaches.includes(cid) ? 2 : 0;
    const bFitsCoach = b.bestForCoaches.includes(cid) ? 2 : 0;

    const aFitsEquip =
      equipment === 'court_or_track' && a.category === 'track' ? 3 :
        equipment === 'bodyweight' && a.category === 'park' ? 3 :
          equipment === 'full_gym' && a.category === 'gym' ? 3 : 0;

    const bFitsEquip =
      equipment === 'court_or_track' && b.category === 'track' ? 3 :
        equipment === 'bodyweight' && b.category === 'park' ? 3 :
          equipment === 'full_gym' && b.category === 'gym' ? 3 : 0;

    return (bFitsCoach + bFitsEquip) - (aFitsCoach + aFitsEquip);
  }).slice(0, 3);
}

/**
 * Generates direct Google Maps URL for directions or place search.
 */
export function getVenueMapUrl(venue: TrainingVenue): string {
  const query = encodeURIComponent(`${venue.name}, ${venue.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

/**
 * Opens Google Maps inside the app using Expo WebBrowser (Sheet on iOS / Custom Tabs on Android).
 * The user stays directly in Athleet and can dismiss the map back to their workout anytime.
 */
export async function openInAppMap(venue: TrainingVenue): Promise<void> {
  const url = getVenueMapUrl(venue);
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      toolbarColor: '#0d0d0f',
      controlsColor: '#00f0ff',
      showTitle: true,
      enableBarCollapsing: true,
    });
  } catch (err) {
    console.warn('[VenueFinder] In-app browser failed, falling back to Linking:', err);
    await Linking.openURL(url);
  }
}

/**
 * Opens the device's native navigation app (Apple Maps on iOS / Google Maps app on Android).
 */
export function openNativeMap(venue: TrainingVenue): void {
  const query = encodeURIComponent(`${venue.name}, ${venue.address}`);
  const url = Platform.select({
    ios: `maps:0,0?q=${query}`,
    android: `geo:0,0?q=${query}`,
    default: getVenueMapUrl(venue),
  });

  Linking.openURL(url).catch((err) => {
    console.warn('[VenueFinder] Could not open native maps:', err);
    Linking.openURL(getVenueMapUrl(venue));
  });
}

/**
 * Default directions opener — opens directly in the app.
 */
export function openVenueDirections(venue: TrainingVenue): void {
  openInAppMap(venue);
}
