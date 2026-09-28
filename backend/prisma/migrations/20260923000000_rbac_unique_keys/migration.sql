-- Resolve pre-existing duplicates before applying; this migration never deletes data.
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX "permissions_slug_key" ON "permissions"("slug");
