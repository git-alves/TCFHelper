-- User.isAdmin is intentionally a single-owner capability, not a role list.
-- PostgreSQL partial uniqueness permits any number of ordinary false rows but
-- atomically prevents a second true row, including concurrent promotion
-- scripts or an accidental direct database update.
DO $$
BEGIN
  IF (SELECT count(*) FROM "User" WHERE "isAdmin" = true) > 1 THEN
    RAISE EXCEPTION 'Cannot enforce one MyTCFLab owner: more than one User row is already marked isAdmin. Resolve the duplicate owner records before rerunning this migration.';
  END IF;
END $$;

CREATE UNIQUE INDEX "User_single_admin_key"
  ON "User" ("isAdmin")
  WHERE "isAdmin" = true;
