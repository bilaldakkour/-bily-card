export function isTestModeEnabled(): boolean {
  return String(process.env.NEXT_PUBLIC_TEST_MODE || '').trim().toLowerCase() === 'true'
}

export function logTestMode(scope: string, payload?: unknown) {
  if (!isTestModeEnabled()) return

  if (typeof payload === 'undefined') {
    console.log(`[TEST_MODE] ${scope}`)
    return
  }

  console.log(`[TEST_MODE] ${scope}`, payload)
}
