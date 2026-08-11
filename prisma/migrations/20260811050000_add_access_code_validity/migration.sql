-- Purely additive: a null validityDays means every existing code keeps its
-- current lifetime behavior. Only newly generated timed codes set it.
ALTER TABLE "AccessCode" ADD COLUMN "validityDays" INTEGER;
