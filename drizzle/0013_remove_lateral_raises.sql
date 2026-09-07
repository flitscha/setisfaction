-- Removes the bodyweight "Lateral Raises" standard exercise now that a gym
-- "Lateral Raises (Dumbbell)" entry covers the same movement with a dumbbell.
-- Cascades to every set ever logged against it (sets.exercise_id ON DELETE
-- CASCADE) — confirmed with the app owner before running: felix, user1, and
-- user2 all had a handful of sets on it, and that history is intentionally
-- and irreversibly gone after this.
DELETE FROM "exercises" WHERE "user_id" IS NULL AND lower("name") = 'lateral raises';
