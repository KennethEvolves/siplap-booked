ALTER TYPE "reservation_status" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "reservation_status" ADD VALUE IF NOT EXISTS 'reserved';

CREATE TABLE "external_locations" (
    "location_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "google_place_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "formatted_address" VARCHAR(1000),
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "external_locations_pkey" PRIMARY KEY ("location_id")
);

CREATE TABLE "activity_external_locations" (
    "activity_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_external_locations_pkey" PRIMARY KEY ("activity_id", "location_id")
);

CREATE UNIQUE INDEX "external_locations_google_place_id_key" ON "external_locations"("google_place_id");
CREATE INDEX "activity_external_locations_location_id_idx" ON "activity_external_locations"("location_id");

ALTER TABLE "activity_external_locations"
ADD CONSTRAINT "activity_external_locations_activity_id_fkey"
FOREIGN KEY ("activity_id") REFERENCES "activities"("activity_id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "activity_external_locations"
ADD CONSTRAINT "activity_external_locations_location_id_fkey"
FOREIGN KEY ("location_id") REFERENCES "external_locations"("location_id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "external_locations"
ADD CONSTRAINT "external_locations_latitude_check" CHECK ("latitude" >= -90 AND "latitude" <= 90);

ALTER TABLE "external_locations"
ADD CONSTRAINT "external_locations_longitude_check" CHECK ("longitude" >= -180 AND "longitude" <= 180);
