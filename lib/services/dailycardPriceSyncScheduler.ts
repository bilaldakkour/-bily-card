const FIVE_MINUTES_MS = 5 * 60 * 1000
const INITIAL_DELAY_MS = 15 * 1000

type SchedulerState = {
  started?: boolean
  timer?: NodeJS.Timeout
  running?: boolean
}

const globalState = globalThis as typeof globalThis & {
  __dailycardPriceSyncScheduler?: SchedulerState
}

function normalizeBaseUrl(value: string): string {
  return String(value || '').replace(/\/$/, '')
}

function getBaseUrlCandidates(): string[] {
  const candidates: string[] = []

  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) candidates.push(normalizeBaseUrl(appUrl))

  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) candidates.push(`https://${normalizeBaseUrl(vercelUrl)}`)

  const port = process.env.PORT || '3000'
  candidates.push(`http://localhost:${port}`)

  // In development, Next may move to 3001/3002 if 3000 is occupied.
  candidates.push('http://localhost:3000')
  candidates.push('http://localhost:3001')
  candidates.push('http://localhost:3002')

  return Array.from(new Set(candidates))
}

async function triggerSync(): Promise<void> {
  const state = (globalState.__dailycardPriceSyncScheduler ||= {})
  if (state.running) return

  state.running = true

  try {
    const baseUrls = getBaseUrlCandidates()
    let lastStatus: number | null = null
    let lastError: unknown = null

    for (const baseUrl of baseUrls) {
      try {
        const response = await fetch(`${baseUrl}/api/sync/dailycard-prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        })

        if (response.ok) {
          return
        }

        lastStatus = response.status

        // If this host is wrong for current runtime, try the next candidate.
        if (response.status === 404) {
          continue
        }

        // For non-404 failures, stop trying and report the status.
        break
      } catch (error: any) {
        lastError = error
      }
    }

    if (lastStatus !== null) {
      console.warn('DailyCard auto price sync failed with status:', lastStatus)
    } else if (lastError) {
      console.warn(
        'DailyCard auto price sync request failed:',
        (lastError as any)?.message || lastError
      )
    }
  } catch (error: any) {
    console.warn('DailyCard auto price sync request failed:', error?.message || error)
  } finally {
    state.running = false
  }
}

export function startDailycardPriceSyncScheduler(): void {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  const state = (globalState.__dailycardPriceSyncScheduler ||= {})
  if (state.started) return

  state.started = true

  // Warm-up run shortly after server boot, then continue every 5 minutes.
  setTimeout(() => {
    void triggerSync()
  }, INITIAL_DELAY_MS)

  state.timer = setInterval(() => {
    void triggerSync()
  }, FIVE_MINUTES_MS)

  console.info('DailyCard price sync scheduler started (every 5 minutes).')
}
