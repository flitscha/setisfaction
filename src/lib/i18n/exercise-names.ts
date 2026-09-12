import { useLocale, type Locale } from "./context";

// German display names for the shared standard catalog — only where a real,
// commonly-used German fitness term exists. Deliberately not exhaustive:
// calisthenics/gym jargon that German speakers use identically in English
// (Front Lever, Planche, Muscle Up, Dips, Hip Thrust, Skull Crushers, ...)
// is left as-is rather than forced into a literal translation nobody
// actually says. Keyed by the exact English name as stored in `exercises`
// (see scripts/seed.mjs) — never applied to a personal (user-owned)
// exercise, since those are user-authored in whatever language the user
// chose to name them.
const EXERCISE_NAME_DE: Record<string, string> = {
  "Push-Ups": "Liegestütze",
  "Push-Ups (Deep, Parallettes)": "Liegestütze (Tief, Parallettes)",
  "Diamond Push-Ups": "Diamant-Liegestütze",
  "Pull-Ups": "Klimmzüge",
  "Chin-Ups": "Klimmzüge (Untergriff)",
  "Handstand Push-Ups": "Handstand-Liegestütze",
  "Pike Push-Ups": "Pike-Liegestütze",
  "Calf Raises": "Wadenheben",

  "Bench Press (Barbell)": "Bankdrücken (Langhantel)",
  "Incline Bench Press (Barbell)": "Schrägbankdrücken (Langhantel)",
  "Dumbbell Bench Press": "Bankdrücken (Kurzhantel)",
  "Chest Press (Machine)": "Brustpresse (Maschine)",
  "Cable Fly": "Fliegende am Kabelzug",
  "Overhead Press (Barbell)": "Schulterdrücken (Langhantel)",
  "Dumbbell Shoulder Press": "Schulterdrücken (Kurzhantel)",
  "Lateral Raises (Dumbbell)": "Seitheben (Kurzhantel)",
  "Tricep Pushdown (Cable)": "Trizepsdrücken (Kabelzug)",
  "Deadlift (Barbell)": "Kreuzheben (Langhantel)",
  "Barbell Row": "Langhantelrudern",
  "Seated Cable Row": "Rudern am Kabelzug (sitzend)",
  "Lat Pulldown": "Latzug",
  "T-Bar Row": "T-Bar-Rudern",
  "Bicep Curl (Barbell)": "Bizeps-Curls (Langhantel)",
  "Bicep Curl (Dumbbell)": "Bizeps-Curls (Kurzhantel)",
  "Hammer Curl (Dumbbell)": "Hammercurls (Kurzhantel)",
  "Back Squat (Barbell)": "Kniebeuge (Langhantel)",
  "Front Squat (Barbell)": "Frontkniebeuge (Langhantel)",
  "Romanian Deadlift (Barbell)": "Rumänisches Kreuzheben (Langhantel)",
  "Leg Press (Machine)": "Beinpresse (Maschine)",
  "Leg Extension (Machine)": "Beinstrecker (Maschine)",
  "Leg Curl (Machine)": "Beinbeuger (Maschine)",
  "Calf Raise (Machine)": "Wadenheben (Maschine)",
};

// Reverse of the above, built once — a translated German name back to its
// English original, for otherLanguageExerciseName below.
const EXERCISE_NAME_EN: Record<string, string> = Object.fromEntries(
  Object.entries(EXERCISE_NAME_DE).map(([en, de]) => [de, en]),
);

type NamedExercise = { name: string; userId: string | null };

// The name actually shown to this viewer — the German term above when the
// exercise is standard, the app is in German, and a translation exists;
// the original name otherwise (including always, for a personal exercise).
export function translateExerciseName(exercise: NamedExercise, locale: Locale): string {
  if (exercise.userId !== null || locale !== "de") return exercise.name;
  return EXERCISE_NAME_DE[exercise.name] ?? exercise.name;
}

// The *other* language's name for this exercise, if one exists — used to
// widen a search that came up empty, so switching the app's language never
// hides an exercise you know by its other-language name. `exercise.name` is
// expected to already be the name as currently shown (i.e. already run
// through translateExerciseName with the same `locale`), not necessarily
// the raw English DB value — this looks it up in whichever direction
// matches that. Undefined when there's nothing more to try (a personal
// exercise, or a standard one with no distinct German term).
export function otherLanguageExerciseName(exercise: NamedExercise, locale: Locale): string | undefined {
  if (exercise.userId !== null) return undefined;
  return locale === "de" ? EXERCISE_NAME_EN[exercise.name] : EXERCISE_NAME_DE[exercise.name];
}

// Convenience for components: a function ref that stays stable in identity
// only insofar as `locale` does — fine here since nothing memoizes on it.
export function useExerciseName(): (exercise: NamedExercise) => string {
  const { locale } = useLocale();
  return (exercise) => translateExerciseName(exercise, locale);
}
