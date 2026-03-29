import { supabase } from './supabase';

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const inFlightPreparations = new Map();

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
  const rawLetters = Array.isArray(payload)
    ? payload
    : payload?.all_letter ?? payload?.letters ?? payload?.data?.all_letter ?? payload?.data?.letters;

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

function toTimestamp(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

function isSameMoment(leftValue, rightValue) {
  const leftTimestamp = toTimestamp(leftValue);
  const rightTimestamp = toTimestamp(rightValue);

  return leftTimestamp !== null && rightTimestamp !== null && leftTimestamp === rightTimestamp;
}

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

async function resolveUserId(profileIdentifier) {
  if (isUuid(profileIdentifier)) {
    return profileIdentifier;
  }

  const normalizedProfileId = Number(profileIdentifier);

  if (!Number.isFinite(normalizedProfileId)) {
    const error = new Error('profile id is invalid.');
    error.code = 'invalid_profile_id';
    throw error;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', normalizedProfileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.user_id || !isUuid(data.user_id)) {
    const lookupError = new Error('profile user id could not be resolved.');
    lookupError.code = 'missing_profile_user_id';
    throw lookupError;
  }

  return data.user_id;
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

async function markProfileCheckedIn(userId) {
  const { error } = await supabase
    .from('profiles')
    .update({
      last_check_in_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Profile last_check_in_at update error:', error);
  }
}

export async function prepareDailyLetter(profileIdentifier) {
  if (!profileIdentifier) {
    const error = new Error('profile id is required.');
    error.code = 'missing_profile_id';
    throw error;
  }

  const userId = await resolveUserId(profileIdentifier);
  const todayKstKey = toKstDateKey(new Date());
  const preparationKey = `${userId}:${todayKstKey}`;

  if (inFlightPreparations.has(preparationKey)) {
    return inFlightPreparations.get(preparationKey);
  }

  const preparationPromise = (async () => {
    const [{ data: profile, error: profileError }, { data: history, error: historyError }, letters] = await Promise.all([
      supabase
        .from('profiles')
        .select('created_at, last_check_in_at')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('user_letters')
        .select('letter_id, created_at')
        .eq('user_id', userId),
      fetchAllLetters(),
    ]);

    if (profileError) {
      throw profileError;
    }

    if (historyError) {
      throw historyError;
    }

    if (!letters.length) {
      return null;
    }

    const hasReceivedToday = (history ?? []).some(
      (entry) => toKstDateKey(entry.created_at) === todayKstKey,
    );

    const checkedInToday = toKstDateKey(profile?.last_check_in_at) === todayKstKey;
    const isInitialProfileCheckIn =
      checkedInToday &&
      !hasReceivedToday &&
      isSameMoment(profile?.created_at, profile?.last_check_in_at);

    if (hasReceivedToday || (checkedInToday && !isInitialProfileCheckIn)) {
      await markProfileCheckedIn(userId);

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
        user_id: userId,
        letter_id: selectedLetter.id,
      },
    ]);

    if (insertError) {
      throw insertError;
    }

    await markProfileCheckedIn(userId);

    return {
      status: 'ready',
      letter: selectedLetter,
    };
  })();

  inFlightPreparations.set(preparationKey, preparationPromise);

  try {
    return await preparationPromise;
  } finally {
    inFlightPreparations.delete(preparationKey);
  }
}
