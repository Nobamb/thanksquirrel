const PENDING_AUTH_FLOW_KEY = 'pending_auth_flow';
const PENDING_AUTH_FLOW_MAX_AGE_MS = 15 * 60 * 1000;

function getStorage() {
  return window.localStorage;
}

export function setPendingAuthFlow(type) {
  getStorage().setItem(
    PENDING_AUTH_FLOW_KEY,
    JSON.stringify({
      type,
      startedAt: Date.now(),
    }),
  );
}

export function getPendingAuthFlow() {
  const rawValue = getStorage().getItem(PENDING_AUTH_FLOW_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);

    if (!parsed?.type || typeof parsed.startedAt !== 'number') {
      getStorage().removeItem(PENDING_AUTH_FLOW_KEY);
      return null;
    }

    if (Date.now() - parsed.startedAt > PENDING_AUTH_FLOW_MAX_AGE_MS) {
      getStorage().removeItem(PENDING_AUTH_FLOW_KEY);
      return null;
    }

    return parsed.type;
  } catch {
    getStorage().removeItem(PENDING_AUTH_FLOW_KEY);
    return null;
  }
}

export function clearPendingAuthFlow() {
  getStorage().removeItem(PENDING_AUTH_FLOW_KEY);
}
