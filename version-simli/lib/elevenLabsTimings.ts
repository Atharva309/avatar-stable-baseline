/**
 * Maps ElevenLabs `with-timestamps` alignment payload to TalkingHead-friendly arrays.
 */

export type LipSyncTiming = {
  words: string[];
  wtimes: number[];
  wdurations: number[];
  chars: string[];
  ctimes: number[];
  cdurations: number[];
};

const emptyTiming = (): LipSyncTiming => ({
  words: [],
  wtimes: [],
  wdurations: [],
  chars: [],
  ctimes: [],
  cdurations: [],
});

export function timingsFromAlignment(alignment: unknown): LipSyncTiming {
  const words: string[] = [];
  const wtimes: number[] = [];
  const wdurations: number[] = [];
  const chars: string[] = [];
  const ctimes: number[] = [];
  const cdurations: number[] = [];

  if (!alignment || typeof alignment !== "object") {
    return emptyTiming();
  }

  const a = alignment as {
    characters?: string[];
    character_start_times_seconds?: number[];
    character_end_times_seconds?: number[];
  };

  const { characters, character_start_times_seconds, character_end_times_seconds } = a;

  if (
    !characters?.length ||
    !character_start_times_seconds?.length ||
    !character_end_times_seconds?.length ||
    characters.length !== character_start_times_seconds.length ||
    characters.length !== character_end_times_seconds.length
  ) {
    return emptyTiming();
  }

  let currentWord = "";
  let wordStartSec = -1;

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const startSec = character_start_times_seconds[i];
    const endSec = character_end_times_seconds[i];

    chars.push(char);
    ctimes.push(Math.round(startSec * 1000));
    cdurations.push(Math.round((endSec - startSec) * 1000));

    if (char.match(/[^a-zA-Z0-9']/)) {
      if (currentWord.length > 0) {
        words.push(currentWord);
        wtimes.push(Math.round(wordStartSec * 1000));
        wdurations.push(
          Math.round((character_end_times_seconds[i - 1] - wordStartSec) * 1000)
        );
        currentWord = "";
        wordStartSec = -1;
      }
    } else {
      if (wordStartSec === -1) {
        wordStartSec = startSec;
      }
      currentWord += char;
    }
  }

  if (currentWord.length > 0) {
    words.push(currentWord);
    wtimes.push(Math.round(wordStartSec * 1000));
    const lastEnd = character_end_times_seconds[character_end_times_seconds.length - 1];
    wdurations.push(Math.round((lastEnd - wordStartSec) * 1000));
  }

  return { words, wtimes, wdurations, chars, ctimes, cdurations };
}
