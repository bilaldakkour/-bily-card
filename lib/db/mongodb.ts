import mongoose from 'mongoose';
import { promises as dns } from 'node:dns';

const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_URI_FALLBACK = String(process.env.MONGODB_URI_FALLBACK || '').trim();

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

const isSrvDnsError = (error: unknown) => {
  const code = String((error as { code?: string })?.code || '').toUpperCase();
  const message = String((error as { message?: string })?.message || '').toLowerCase();
  return (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEOUT' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    message.includes('querysrv')
  );
};

async function buildStandardMongoUriFromSrv(uri: string): Promise<string | null> {
  if (!uri.startsWith('mongodb+srv://')) return null;

  try {
    const normalized = uri.replace('mongodb+srv://', 'https://');
    const parsed = new URL(normalized);
    const host = parsed.hostname;
    const auth = parsed.username
      ? `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password)}@`
      : '';
    const dbName = parsed.pathname?.replace(/^\//, '') || '';

    const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${host}`);
    if (!srvRecords.length) return null;

    const hosts = srvRecords
      .sort((a, b) => (a.priority - b.priority) || (b.weight - a.weight))
      .map((record) => `${record.name}:${record.port}`)
      .join(',');

    const txtRecords = await dns.resolveTxt(host).catch(() => [] as string[][]);
    const txtQuery = txtRecords.flat().join('&').trim();

    const query = new URLSearchParams(parsed.searchParams);
    if (txtQuery) {
      const extra = new URLSearchParams(txtQuery);
      extra.forEach((value, key) => {
        if (!query.has(key)) query.set(key, value);
      });
    }

    if (!query.has('tls') && !query.has('ssl')) {
      query.set('tls', 'true');
    }

    const qs = query.toString();
    return `mongodb://${auth}${hosts}/${dbName}${qs ? `?${qs}` : ''}`;
  } catch {
    return null;
  }
}

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = (async () => {
      const shouldPreferFallbackInProduction =
        process.env.NODE_ENV === 'production' &&
        Boolean(MONGODB_URI_FALLBACK) &&
        MONGODB_URI.startsWith('mongodb+srv://');

      if (shouldPreferFallbackInProduction) {
        try {
          return await mongoose.connect(MONGODB_URI_FALLBACK, opts);
        } catch {
          // Try primary URI next.
        }
      }

      try {
        return await mongoose.connect(MONGODB_URI, opts);
      } catch (error) {
        if (!isSrvDnsError(error)) throw error;

        const fallbackUri =
          MONGODB_URI_FALLBACK || (await buildStandardMongoUriFromSrv(MONGODB_URI));
        if (!fallbackUri) throw error;

        return mongoose.connect(fallbackUri, opts);
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
