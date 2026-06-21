/**
 * Money is stored as BigInt paise. JSON.stringify cannot serialize BigInt, so
 * we recursively convert BigInt -> number at the response boundary. Paise fit
 * safely in a JS number up to ~₹90,000 crore, which exceeds any real contract.
 *
 * Applied globally by BigIntInterceptor.
 */
export function serializeBigInts<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return Number(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => serializeBigInts(v)) as unknown as T;
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializeBigInts(v);
    }
    return out as T;
  }
  return value;
}
