import { API_BASE_URL } from "../api/client";
import type { Exercise, ExerciseListResponse } from "../App";

export const normalizeExerciseName = (value: string) =>
  value.replace(/[^a-z0-9]+/gi, "").toLowerCase();

const tokenizeExerciseName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/\bbb\b/g, "barbell")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

const scoreExerciseMatch = (targetName: string, candidateName: string) => {
  const target = normalizeExerciseName(targetName);
  const candidate = normalizeExerciseName(candidateName);

  if (!target || !candidate) return 0;
  if (target === candidate) return 100;
  if (candidate.includes(target)) return 85;
  if (target.includes(candidate)) return 75;

  const targetTokens = new Set(tokenizeExerciseName(targetName));
  const candidateTokens = new Set(tokenizeExerciseName(candidateName));
  const overlap = Array.from(targetTokens).filter((token) =>
    candidateTokens.has(token),
  ).length;

  if (!overlap) return 0;

  const union = new Set([...targetTokens, ...candidateTokens]).size || 1;
  return Math.round((overlap / union) * 70);
};

export const getBestExerciseMatch = (
  targetName: string,
  candidates: Exercise[],
) => {
  const usable = candidates.filter((item) => item.id && (item.has_demo || item.gif_url));
  if (!usable.length) return null;

  return usable
    .map((item, index) => ({
      item,
      index,
      score: scoreExerciseMatch(targetName, item.name),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.item ?? null;
};

const buildExerciseSearchQueries = (name: string) => {
  const cleaned = name.replace(/\s+/g, " ").trim();
  const tokens = tokenizeExerciseName(cleaned);
  const queries = [cleaned];

  for (let index = 0; index < tokens.length - 1; index += 1) {
    queries.push(`${tokens[index]} ${tokens[index + 1]}`);
  }

  if (tokens.length) {
    queries.push(tokens.slice(-2).join(" "));
    queries.push(tokens.sort((a, b) => b.length - a.length)[0]);
  }

  return Array.from(new Set(queries.filter(Boolean))).slice(0, 5);
};

export const loadExerciseDemoIds = async (
  names: string[],
): Promise<Record<string, string>> => {
  const uniqueNames = Array.from(
    new Set(names.map((name) => name.trim()).filter(Boolean)),
  );
  if (!uniqueNames.length) return {};

  const entries = await Promise.all(
    uniqueNames.map(async (name) => {
      const candidates: Exercise[] = [];

      for (const query of buildExerciseSearchQueries(name)) {
        const response = await fetch(
          `${API_BASE_URL}/exercises/?limit=12&search=${encodeURIComponent(query)}`,
        );
        if (!response.ok) continue;

        const json = (await response.json()) as ExerciseListResponse;
        candidates.push(...json.results);
      }

      const match = getBestExerciseMatch(name, candidates);
      if (!match?.id || !(match.has_demo || match.gif_url)) return null;

      return [name, match.id] as const;
    }),
  );

  return entries.reduce<Record<string, string>>((acc, entry) => {
    if (entry) {
      acc[entry[0]] = entry[1];
    }
    return acc;
  }, {});
};
