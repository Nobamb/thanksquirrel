import { supabase } from './supabase';

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function buildLettersEndpoint() {
  const configuredBaseUrl = import.meta.env.VITE_LETTERS_API_URL?.trim();

  if (!configuredBaseUrl) {
    const error = new Error('VITE_LETTERS_API_URL is not configured.');
    error.code = 'missing_letters_api_url';
    throw error;
  }

  return `${configuredBaseUrl.replace(/\/$/, '')}/letters?mode=all`;
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

function toKstDateKey(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return KST_DATE_FORMATTER.format(date);
}

async function fetchAllLetters() {
  const response = await fetch(buildLettersEndpoint(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error(`letters fetch failed: ${response.status}`);
    error.code = 'letters_api_failed';
    throw error;
  }

  const payload = await response.json();
  const letters = normalizeLetters(payload);

  if (!letters.length) {
    const error = new Error('letters payload is empty.');
    error.code = 'letters_payload_empty';
    throw error;
  }

  return letters;
}

export async function prepareDailyLetter(profileId) {
  if (!profileId) {
    const error = new Error('profile id is required.');
    error.code = 'missing_profile_id';
    throw error;
  }

  const todayKstKey = toKstDateKey(new Date());

  const [{ data: history, error: historyError }, letters] = await Promise.all([
    supabase
      .from('user_letters')
      .select('letter_id, created_at')
      .eq('user_id', profileId),
    fetchAllLetters(),
  ]);

  if (historyError) {
    throw historyError;
  }

  if (!letters.length) {
    return null;
  }

  const hasReceivedToday = (history ?? []).some(
    (entry) => toKstDateKey(entry.created_at) === todayKstKey,
  );

  if (hasReceivedToday) {
    return {
      status: 'already_received',
      letter: null,
    };
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
      user_id: profileId,
      letter_id: selectedLetter.id,
    },
  ]);

  if (insertError) {
    throw insertError;
  }

  return {
    status: 'ready',
    letter: selectedLetter,
  };
}
