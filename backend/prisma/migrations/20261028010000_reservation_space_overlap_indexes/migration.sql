CREATE INDEX IF NOT EXISTS "reservation_spaces_space_id_idx"
ON "reservation_spaces"("space_id");

CREATE INDEX IF NOT EXISTS "reservations_status_start_time_idx"
ON "reservations"("status", "start_time");
