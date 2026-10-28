import { z } from 'zod';

export const externalLocationSchema = z.strictObject({
  googlePlaceId: z.string().trim().min(1).max(255),
  name: z.string().trim().min(1).max(255),
  formattedAddress: z.string().trim().max(1000).nullable().optional(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const attachExternalLocationsSchema = z.strictObject({
  locations: z.array(externalLocationSchema).min(1).max(20),
}).refine(
  ({ locations }) =>
    new Set(locations.map(({ googlePlaceId }) => googlePlaceId)).size ===
    locations.length,
  'No repitas ubicaciones en la misma actividad',
);

export type ExternalLocationInput = z.infer<typeof externalLocationSchema>;
export type AttachExternalLocations = z.infer<typeof attachExternalLocationsSchema>;

export interface ExternalLocation {
  locationId: string;
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  latitude: number;
  longitude: number;
}
