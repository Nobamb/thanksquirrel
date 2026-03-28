import { supabase } from './supabase';

function buildLettersEndpoint() {
  const configuredBaseUrl = import.meta.env.VITE_LETTERS_API_URL?.trim();

  if (configuredBaseUrl) {
    return `${configuredBaseUrl.replace(/\/$/, '')}/letters?mode=all`;
  }

  return '/letters?mode=all';
}

function normalizeLetters(payload) {
  const rawLetters = Array.isArray(payload) ? payload : payload?.letters;

  if (!Array.isArray(rawLetters)) {
    return [];
  }

  return rawLetters
    .map((item, index) => {
      const normalizedId = Number(item?.id ?? index + 1);
      const normalizedMessage = typeof item?.message === 'string' ? item.message.trim() : '';

      if (!Number.isFinite(normalizedId) || !normalizedMessage) {
        return null;
      }

      return {
        id: normalizedId,
        message: normalizedMessage,
      };
    })
    .filter(Boolean);
}

function toDateKey(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

async function fetchAllLetters() {
  const response = await fetch(buildLettersEndpoint(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`letters fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  return normalizeLetters(payload);
}

export async function prepareDailyLetter(userId) {
  const todayKey = toDateKey(new Date());

  const [{ data: history, error: historyError }, letters] = await Promise.all([
    supabase
      .from('user_letters')
      .select('letter_id, created_at')
      .eq('user_id', userId),
    fetchAllLetters(),
  ]);

  if (historyError) {
    throw historyError;
  }

  if (!letters.length) {
    return null;
  }

  const hasReceivedToday = (history ?? []).some((entry) => toDateKey(entry.created_at) === todayKey);

  if (hasReceivedToday) {
    return null;
  }

  const receivedLetterIds = new Set(
    (history ?? [])
      .map((entry) => Number(entry.letter_id))
      .filter((letterId) => Number.isFinite(letterId)),
  );

  const unseenLetters = letters.filter((letter) => !receivedLetterIds.has(letter.id));
  const candidateLetters = unseenLetters.length ? unseenLetters : letters;
  const selectedLetter = candidateLetters[Math.floor(Math.random() * candidateLetters.length)];

  const { error: insertError } = await supabase.from('user_letters').insert([
    {
      user_id: userId,
      letter_id: selectedLetter.id,
    },
  ]);

  if (insertError) {
    throw insertError;
  }

  return selectedLetter;
}
