function isTrue(value: unknown): boolean {
  return String(value || '').trim().toLowerCase() === 'true'
}

export function isTestModeEnabled(): boolean {
  // Never allow test-mode shortcuts in production requests.
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  return isTrue(process.env.BILYCARD_TEST_MODE) || isTrue(process.env.NEXT_PUBLIC_TEST_MODE)
}

export function logTestMode(scope: string, payload?: unknown) {
  if (!isTestModeEnabled()) return
  void scope
  void payload
}
