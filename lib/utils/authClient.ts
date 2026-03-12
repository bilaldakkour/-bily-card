type CachedUser = {
  data: any;
  expiresAt: number;
};

const USER_CACHE_TTL_MS = 15_000;
const userCache = new Map<string, CachedUser>();
const inflight = new Map<string, Promise<any>>();

function extractUserPayload(payload: any) {
  return payload?.data || payload?.user || null;
}

export function clearAuthUserCache(token?: string) {
  if (token) {
    userCache.delete(token);
    inflight.delete(token);
    return;
  }

  userCache.clear();
  inflight.clear();
}

export async function fetchAuthUser(token: string, force = false) {
  const now = Date.now();

  if (!force) {
    const cached = userCache.get(token);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  const pending = inflight.get(token);
  if (pending && !force) {
    return pending;
  }

  const request = fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })
    .then(async (res) => {
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.message || 'Unauthorized');
      }

      const user = extractUserPayload(payload);
      userCache.set(token, {
        data: user,
        expiresAt: Date.now() + USER_CACHE_TTL_MS,
      });

      return user;
    })
    .finally(() => {
      inflight.delete(token);
    });

  inflight.set(token, request);
  return request;
}
