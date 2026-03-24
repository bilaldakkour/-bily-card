type CachedUser = {
  data: any;
  expiresAt: number;
};

type CachedUserActivity = {
  data: {
    orders: any[];
    transactions: any[];
  };
  expiresAt: number;
};

const USER_CACHE_TTL_MS = 15_000;
const USER_ACTIVITY_CACHE_TTL_MS = 5_000;
const userCache = new Map<string, CachedUser>();
const inflight = new Map<string, Promise<any>>();
const userActivityCache = new Map<string, CachedUserActivity>();
const userActivityInflight = new Map<string, Promise<{ orders: any[]; transactions: any[] }>>();

function extractUserPayload(payload: any) {
  return payload?.data || payload?.user || null;
}

function clearStoredCustomerTokens() {
  if (typeof window === 'undefined') return

  clearAuthUserCache()
  localStorage.removeItem('token')
  localStorage.removeItem('bilycard_token')
  localStorage.removeItem('bilycard_user_name')
  localStorage.removeItem('bilycard_user_email')
  localStorage.removeItem('bilycard_user_avatar')
  window.dispatchEvent(new Event('bilycard-auth-changed'))
}

export function clearAuthUserCache(token?: string) {
  if (token) {
    userCache.delete(token);
    inflight.delete(token);
    userActivityCache.delete(token);
    userActivityInflight.delete(token);
    return;
  }

  userCache.clear();
  inflight.clear();
  userActivityCache.clear();
  userActivityInflight.clear();
}

export async function fetchAuthUser(token?: string, force = false) {
  const cacheKey = token || '__cookie_session__'
  const now = Date.now();

  if (!force) {
    const cached = userCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  const pending = inflight.get(cacheKey);
  if (pending && !force) {
    return pending;
  }

  const request = fetch('/api/auth/me', {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    cache: 'no-store',
  })
    .then(async (res) => {
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        if (
          payload?.requiresVerification &&
          String(payload?.verificationType || '').toLowerCase() === 'reauth'
        ) {
          const email = encodeURIComponent(String(payload?.data?.email || ''))
          clearStoredCustomerTokens()

          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = `/login?email=${email}&reauth=1`
          }
        }

        if ((res.status === 401 || res.status === 403) && token) {
          clearStoredCustomerTokens()
        }

        throw new Error(payload?.message || 'Unauthorized');
      }

      const user = extractUserPayload(payload);
      userCache.set(cacheKey, {
        data: user,
        expiresAt: Date.now() + USER_CACHE_TTL_MS,
      });

      return user;
    })
    .finally(() => {
      inflight.delete(cacheKey);
    });

  inflight.set(cacheKey, request);
  return request;
}

export async function fetchUserActivitySnapshot(token: string, force = false) {
  const now = Date.now();

  if (!force) {
    const cached = userActivityCache.get(token);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }
  }

  const pending = userActivityInflight.get(token);
  if (pending && !force) {
    return pending;
  }

  const request = Promise.all([
    fetch('/api/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }),
    fetch('/api/wallet/transactions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }),
  ])
    .then(async ([ordersRes, txRes]) => {
      const [ordersPayload, txPayload] = await Promise.all([
        ordersRes.json().catch(() => ({})),
        txRes.json().catch(() => ({})),
      ]);

      const reauthPayload = ordersPayload?.requiresVerification ? ordersPayload : txPayload;
      if (reauthPayload?.requiresVerification) {
        const email = encodeURIComponent(String(reauthPayload?.data?.email || ''))
        clearStoredCustomerTokens()

        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = `/login?email=${email}&reauth=1`
        }

        throw new Error(reauthPayload?.message || 'Unauthorized');
      }

      if (
        ordersRes.status === 401 ||
        ordersRes.status === 403 ||
        txRes.status === 401 ||
        txRes.status === 403
      ) {
        clearStoredCustomerTokens()
        throw new Error(
          ordersPayload?.message || txPayload?.message || 'Unauthorized'
        );
      }

      const data = {
        orders: Array.isArray(ordersPayload?.data) ? ordersPayload.data : [],
        transactions: Array.isArray(txPayload?.transactions) ? txPayload.transactions : [],
      };

      userActivityCache.set(token, {
        data,
        expiresAt: Date.now() + USER_ACTIVITY_CACHE_TTL_MS,
      });

      return data;
    })
    .finally(() => {
      userActivityInflight.delete(token);
    });

  userActivityInflight.set(token, request);
  return request;
}
