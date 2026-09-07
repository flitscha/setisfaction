ALTER TABLE "exercises" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wants_calisthenics" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "wants_gym" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Every existing standard exercise is one of the original calisthenics
-- catalog — backfill them all before adding the new gym ones below, so the
-- category filter (profiles.wants_calisthenics/wants_gym) has something to
-- go on for exercises that already existed.
UPDATE "exercises" SET "category" = 'calisthenics' WHERE "user_id" IS NULL;--> statement-breakpoint

-- New standard (shared) gym exercises — kept in sync with scripts/seed.mjs's
-- GYM_EXERCISES list and standard-groups.ts's grouping map; update all three
-- when adding another one.
INSERT INTO "exercises" ("user_id", "name", "description", "tracks_reps", "tracks_time", "tracks_weight", "category") VALUES
(NULL, 'Bench Press (Barbell)', 'Barbell bench press: lower the bar to the chest, then press back up to full arm extension.', true, false, true, 'gym'),
(NULL, 'Incline Bench Press (Barbell)', 'Bench press on an incline bench, emphasizing the upper chest.', true, false, true, 'gym'),
(NULL, 'Dumbbell Bench Press', 'Bench press performed with a dumbbell in each hand instead of a barbell.', true, false, true, 'gym'),
(NULL, 'Chest Press (Machine)', 'Seated chest press on a machine, pressing the handles forward to full extension.', true, false, true, 'gym'),
(NULL, 'Cable Fly', 'Standing between two cable stacks, bring the handles together in front of the chest with a slight elbow bend.', true, false, true, 'gym'),
(NULL, 'Overhead Press (Barbell)', 'Standing barbell press from shoulder height to full overhead lockout.', true, false, true, 'gym'),
(NULL, 'Dumbbell Shoulder Press', 'Overhead press performed with a dumbbell in each hand, seated or standing.', true, false, true, 'gym'),
(NULL, 'Lateral Raises (Dumbbell)', 'Raise a dumbbell in each hand out to the sides until roughly shoulder height, then lower with control.', true, false, true, 'gym'),
(NULL, 'Tricep Pushdown (Cable)', 'Standing at a cable stack, push the bar or rope down to full elbow extension, keeping the upper arms still.', true, false, true, 'gym'),
(NULL, 'Skull Crushers (EZ-Bar)', 'Lying down, lower an EZ-bar toward the forehead by bending the elbows, then extend back up.', true, false, true, 'gym'),
(NULL, 'Deadlift (Barbell)', 'Lift a loaded barbell from the floor to hip level by extending the hips and knees, keeping the back straight.', true, false, true, 'gym'),
(NULL, 'Barbell Row', 'Bent-over row with a barbell, pulling it toward the lower chest/upper abdomen.', true, false, true, 'gym'),
(NULL, 'Seated Cable Row', 'Seated at a low cable row station, pull the handle toward the torso, squeezing the shoulder blades together.', true, false, true, 'gym'),
(NULL, 'Lat Pulldown', 'Seated at a cable machine, pull a wide bar down toward the upper chest.', true, false, true, 'gym'),
(NULL, 'T-Bar Row', 'Bent-over row using a T-bar/landmine setup, pulling the handles toward the torso.', true, false, true, 'gym'),
(NULL, 'Face Pull (Cable)', 'Using a rope attachment at head height, pull toward the face while flaring the elbows out — targets the rear shoulders.', true, false, true, 'gym'),
(NULL, 'Bicep Curl (Barbell)', 'Standing barbell curl: curl the bar up toward the shoulders, then lower with control.', true, false, true, 'gym'),
(NULL, 'Bicep Curl (Dumbbell)', 'Standing or seated dumbbell curl, one or both arms at a time.', true, false, true, 'gym'),
(NULL, 'Hammer Curl (Dumbbell)', 'Dumbbell curl performed with a neutral (palms-facing-in) grip throughout.', true, false, true, 'gym'),
(NULL, 'Back Squat (Barbell)', 'Barbell resting across the upper back, squat down until the thighs are at least parallel to the ground, then stand back up.', true, false, true, 'gym'),
(NULL, 'Front Squat (Barbell)', 'Barbell resting across the front of the shoulders, squat down and stand back up.', true, false, true, 'gym'),
(NULL, 'Romanian Deadlift (Barbell)', 'Hinge at the hips with a slight knee bend, lowering a barbell along the legs, then return to standing — targets the hamstrings and glutes.', true, false, true, 'gym'),
(NULL, 'Leg Press (Machine)', 'Seated or reclined on a leg press machine, push the platform away by extending the legs.', true, false, true, 'gym'),
(NULL, 'Leg Extension (Machine)', 'Seated on a machine, extend the legs against resistance to work the quads in isolation.', true, false, true, 'gym'),
(NULL, 'Leg Curl (Machine)', 'Lying, seated, or standing on a machine, curl the heels toward the glutes to work the hamstrings in isolation.', true, false, true, 'gym'),
(NULL, 'Hip Thrust (Barbell)', 'Upper back braced on a bench, barbell across the hips, drive the hips upward to full extension.', true, false, true, 'gym'),
(NULL, 'Calf Raise (Machine)', 'Standing or seated on a calf raise machine, rise onto the balls of the feet, then lower with control.', true, false, true, 'gym');
