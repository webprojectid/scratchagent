export interface GenerationFailure {
  attempts: number;
  paused: boolean;
  retryAt: number;
  message: string;
}

export function nextGenerationFailure(previous?: GenerationFailure, now = Date.now()): GenerationFailure {
  const attempts = (previous?.attempts ?? 0) + 1;
  return {
    attempts,
    paused: attempts >= 3,
    retryAt: now + Math.min(60_000, 10_000 * 2 ** (attempts - 1)),
    message: "This section could not be completed. Accepted sections are saved.",
  };
}

export function canResumeGeneration(failure?: GenerationFailure, now = Date.now()): boolean {
  return !failure || (!failure.paused && now >= failure.retryAt);
}
