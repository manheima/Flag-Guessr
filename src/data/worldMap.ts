import { feature, mesh } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry, MultiLineString } from 'geojson';
import worldTopoRaw from 'world-atlas/countries-50m.json';
import { COUNTRIES } from './countries';
import type { Continent, Country } from '../types/game';

interface CountryProperties {
  name?: string;
}

const worldTopo = worldTopoRaw as unknown as Topology<{
  countries: GeometryCollection<CountryProperties>;
  land: GeometryCollection;
}>;

export const LAND_GEOJSON = feature(worldTopo, worldTopo.objects.land);

export const COUNTRY_FEATURES: Feature<Geometry, CountryProperties>[] = (
  feature(worldTopo, worldTopo.objects.countries) as FeatureCollection<Geometry, CountryProperties>
).features;

export const COUNTRY_BORDERS: MultiLineString = mesh(
  worldTopo,
  worldTopo.objects.countries,
  (a, b) => a !== b
);

// Build fast lookup maps
const featureById = new Map<string, Feature<Geometry, CountryProperties>>();
const featureByName = new Map<string, Feature<Geometry, CountryProperties>>();

for (const f of COUNTRY_FEATURES) {
  if (f.id !== undefined && f.id !== null) {
    featureById.set(String(f.id).padStart(3, '0'), f);
    featureById.set(String(f.id), f);
  }
  if (f.properties?.name) {
    featureByName.set(f.properties.name.toLowerCase(), f);
  }
}

// Map each GeoJSON feature to its continent (for subtle continent shading in Phase 1)
const continentByFeature = new Map<Feature<Geometry, CountryProperties>, Continent>();
const featureByCountryCode = new Map<string, Feature<Geometry, CountryProperties>>();

for (const c of COUNTRIES) {
  let matched: Feature<Geometry, CountryProperties> | undefined;
  if (c.numericId) {
    matched = featureById.get(c.numericId);
  }
  if (!matched && c.mapName) {
    matched = featureByName.get(c.mapName.toLowerCase());
  }
  if (matched) {
    featureByCountryCode.set(c.code, matched);
    continentByFeature.set(matched, c.continent);
  }
}

// Also map major territories in world-atlas so continents look complete
const EXTRA_CONTINENT_IDS: Record<string, Continent> = {
  '304': 'North America', // Greenland
  '732': 'Africa', // Western Sahara
  '630': 'North America', // Puerto Rico
  '254': 'South America', // French Guiana
  '238': 'South America', // Falkland Islands
  '540': 'Oceania', // New Caledonia
  '258': 'Oceania', // French Polynesia
};

for (const [id, cont] of Object.entries(EXTRA_CONTINENT_IDS)) {
  const f = featureById.get(id);
  if (f && !continentByFeature.has(f)) {
    continentByFeature.set(f, cont);
  }
}

export function getCountryFeature(country: Country): Feature<Geometry, CountryProperties> | undefined {
  return featureByCountryCode.get(country.code);
}

export function getFeatureContinent(f: Feature<Geometry, CountryProperties>): Continent | undefined {
  return continentByFeature.get(f);
}

// Warm muted atlas tones per country feature (inspired by The Times World Map)
const ATLAS_PALETTE = [
  '#334155', // slate
  '#3b4a5e', // cool blue-slate
  '#374b4a', // muted teal-slate
  '#424858', // indigo-slate
  '#3e4c44', // sage-slate
  '#464454', // plum-slate
];

const featureColorMap = new Map<Feature<Geometry, CountryProperties>, string>();
COUNTRY_FEATURES.forEach((f, idx) => {
  featureColorMap.set(f, ATLAS_PALETTE[idx % ATLAS_PALETTE.length]);
});

export function getFeatureBaseColor(f: Feature<Geometry, CountryProperties>): string {
  return featureColorMap.get(f) ?? '#334155';
}
