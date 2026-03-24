'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

type DashboardRow = {
  internalSlug: string
  productName: string
  category: string
  providers: string[]
  dailycardStatus?: 'linked' | 'missing'
  go4cardStatus?: 'linked' | 'missing'
  coverageStatus?: 'both' | 'missing_go4card' | 'missing_dailycard' | 'missing_all'
  activeProviderCount: number
  routeCount: number
  status: 'ready_multi' | 'ready_single' | 'missing_all'
  routingMode: 'cheapest' | 'priority' | 'forced'
  forcedProviderKey?: string
  updatedAt?: string | null
}

type MatrixRow = {
  providerKey: string
  providerProductId: string
  providerProductName?: string
  active: boolean
  fallbackEnabled: boolean
  priority: number
  fixedUnitCost?: number
}

type MatrixDoc = {
  internalSlug: string
  productName?: string
  category?: string
  routingMode: 'cheapest' | 'priority' | 'forced'
  forcedProviderKey?: string
  routes: MatrixRow[]
}

type RegistryRow = {
  providerKey: string
  displayName: string
  adapterKind: string
  slotPreference: 'primary' | 'secondary' | 'any'
  enabled: boolean
  priority: number
  financial?: {
    landingRate?: number
    fixedFeePerOrder?: number
    variableFeePercent?: number
    topupSentUsd?: number
    topupReceivedUsd?: number
    notes?: string
  }
}

type ProviderSearchResult = {
  providerProductId: string
  providerProductName: string
  source: 'review' | 'live'
  confidence?: number
  score?: number
  matchType?: 'exact' | 'contains' | 'fuzzy'
  variantSafe?: boolean
}

type ProviderSearchDebug = {
  rawCount: number
  filteredCount: number
  adapterAvailable?: boolean
  slot?: string
  go4cardFullCount?: number
  go4cardFilteredCount?: number
  apiRawReviewCount?: number
  apiRawLiveCount?: number
  apiMergedCount?: number
  apiDedupCount?: number
  apiReturnedCount?: number
}

export default function AdminProviderMatrixPage() {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [loadingMatrix, setLoadingMatrix] = useState(false)
  const [loadingRegistry, setLoadingRegistry] = useState(false)
  const [bulkRunning, setBulkRunning] = useState<'none' | 'import_legacy' | 'auto_secondary'>('none')
  const [autoConfidence, setAutoConfidence] = useState(0.9)

  const [statusFilter, setStatusFilter] = useState<'all' | 'ready_multi' | 'ready_single' | 'missing_all'>('all')
  const [search, setSearch] = useState('')
  const [dashboardRows, setDashboardRows] = useState<DashboardRow[]>([])
  const [summary, setSummary] = useState({
    totalProducts: 0,
    readyMulti: 0,
    readySingle: 0,
    missingAll: 0,
  })

  const [slugInput, setSlugInput] = useState('')
  const [matrixDoc, setMatrixDoc] = useState<MatrixDoc | null>(null)
  const [routeForm, setRouteForm] = useState<MatrixRow>({
    providerKey: 'dailycard',
    providerProductId: '',
    providerProductName: '',
    active: true,
    fallbackEnabled: true,
    priority: 100,
    fixedUnitCost: undefined,
  })
  const [quickProviderKey, setQuickProviderKey] = useState('dailycard')
  const [quickQuery, setQuickQuery] = useState('')
  const [quickSearching, setQuickSearching] = useState(false)
  const [quickResults, setQuickResults] = useState<ProviderSearchResult[]>([])
  const [quickResultsByProvider, setQuickResultsByProvider] = useState<Record<string, ProviderSearchResult[]>>({})
  const [quickDebugByProvider, setQuickDebugByProvider] = useState<Record<string, ProviderSearchDebug>>({})
  const [simpleSelection, setSimpleSelection] = useState<Record<string, boolean>>({})
  const [simpleSaving, setSimpleSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showBulkTools, setShowBulkTools] = useState(false)
  const [showRegistry, setShowRegistry] = useState(false)
  const [prefillHandled, setPrefillHandled] = useState(false)

  const [registryRows, setRegistryRows] = useState<RegistryRow[]>([])
  const [registryForm, setRegistryForm] = useState<RegistryRow>({
    providerKey: '',
    displayName: '',
    adapterKind: '',
    slotPreference: 'any',
    enabled: true,
    priority: 100,
    financial: {
      landingRate: 1,
      fixedFeePerOrder: 0,
      variableFeePercent: 0,
      topupSentUsd: 0,
      topupReceivedUsd: 0,
      notes: '',
    },
  })

  const getHeaders = () => buildAdminAuthHeaders(getAdminTokenOptional())

  const filterSuggestionRows = (rows: ProviderSearchResult[]) =>
    (Array.isArray(rows) ? rows : [])
      .filter((row) => String(row?.providerProductId || '').trim() && String(row?.providerProductName || '').trim())
      .slice(0, 20)

  const loadDashboard = async () => {
    setLoadingDashboard(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/providers/matrix?action=dashboard', { headers: getHeaders() })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (!data?.success) {
        setMessage(data?.message || 'Failed to load matrix dashboard')
        return
      }
      setDashboardRows(Array.isArray(data?.data?.rows) ? data.data.rows : [])
      setSummary({
        totalProducts: Number(data?.data?.summary?.totalProducts || 0),
        readyMulti: Number(data?.data?.summary?.readyMulti || 0),
        readySingle: Number(data?.data?.summary?.readySingle || 0),
        missingAll: Number(data?.data?.summary?.missingAll || 0),
      })
    } catch {
      setMessage('Failed to load matrix dashboard')
    } finally {
      setLoadingDashboard(false)
    }
  }

  const loadRegistry = async () => {
    setLoadingRegistry(true)
    try {
      const res = await fetch('/api/admin/providers/registry', { headers: getHeaders() })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setRegistryRows(Array.isArray(data?.data) ? data.data : [])
      }
    } catch {
      setMessage('Failed to load provider registry')
    } finally {
      setLoadingRegistry(false)
    }
  }

  useEffect(() => {
    void Promise.all([loadDashboard(), loadRegistry()])
  }, [])

  useEffect(() => {
    if (prefillHandled || typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search || '')
    const slugFromUrl = String(params.get('slug') || '').trim().toLowerCase()
    if (!slugFromUrl) return
    setSlugInput(slugFromUrl)
    setPrefillHandled(true)
    void loadBySlug(slugFromUrl)
  }, [prefillHandled])

  const loadBySlug = async (slugOverride?: string) => {
    const slug = String(slugOverride || slugInput || '').trim().toLowerCase()
    if (!slug) {
      setMessage('Enter product slug first')
      return
    }
    setLoadingMatrix(true)
    setMessage('')
    try {
      const res = await fetch(`/api/admin/providers/matrix?slug=${encodeURIComponent(slug)}`, {
        headers: getHeaders(),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (!data?.success) {
        setMessage(data?.message || 'Failed to load matrix product')
        return
      }
      const row = data?.data
      if (!row) {
        const seed = dashboardRows.find((item) => item.internalSlug === slug)
        const seedName = seed?.productName || ''
        setMatrixDoc({
          internalSlug: slug,
          productName: seedName,
          category: seed?.category || '',
          routingMode: 'cheapest',
          forcedProviderKey: '',
          routes: [],
        })
        setQuickQuery(seedName)
        setQuickResults([])
        setQuickResultsByProvider({})
        setQuickDebugByProvider({})
        if (seedName) {
          void loadSuggestionsForProvider('dailycard', seedName)
          void loadSuggestionsForProvider('go4card', seedName)
        }
        setMessage('No matrix found, creating a new one for this slug')
        return
      }
      setMatrixDoc({
        internalSlug: row.internalSlug,
        productName: row.productName || '',
        category: row.category || '',
        routingMode: row.routingMode || 'cheapest',
        forcedProviderKey: row.forcedProviderKey || '',
        routes: Array.isArray(row.routes) ? row.routes : [],
      })
      setQuickQuery(String(row.productName || '').trim())
      const keys = Array.from(
        new Set([
          ...registryRows.map((item) => String(item.providerKey || '').toLowerCase().trim()).filter(Boolean),
          ...((Array.isArray(row.routes) ? row.routes : [])
            .map((item: any) => String(item?.providerKey || '').toLowerCase().trim())
            .filter(Boolean)),
          'dailycard',
          'go4card',
        ])
      )
      const current = Array.isArray(row.routes) ? row.routes : []
      const nextSel: Record<string, boolean> = {}
      for (const key of keys) {
        nextSel[key] = current.some((route: any) => String(route?.providerKey || '').toLowerCase() === key && route?.active !== false)
      }
      setSimpleSelection(nextSel)
      setMessage('Matrix loaded')
      setQuickResults([])
      setQuickResultsByProvider({})
      setQuickDebugByProvider({})
      const seedQuery = String(row.productName || '').trim()
      if (seedQuery) {
        void loadSuggestionsForProvider('dailycard', seedQuery)
        void loadSuggestionsForProvider('go4card', seedQuery)
      }
    } catch {
      setMessage('Failed to load matrix product')
    } finally {
      setLoadingMatrix(false)
    }
  }

  const runQuickSearch = async () => {
    if (!matrixDoc?.internalSlug) {
      setMessage('Load product first')
      return
    }
    const q = String(quickQuery || '').trim()
    if (!q) {
      setMessage('Type product name first')
      return
    }
    setQuickSearching(true)
    setMessage('')
    try {
      const params = new URLSearchParams({
        action: 'search',
        slug: matrixDoc.internalSlug,
        providerKey: String(quickProviderKey || '').trim().toLowerCase(),
        q,
        limit: '20',
      })
      const res = await fetch(`/api/admin/providers/options?${params.toString()}`, {
        headers: getHeaders(),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (!data?.success) {
        setMessage(data?.message || 'Search failed')
        return
      }
      const rows = Array.isArray(data?.data) ? data.data : []
      const filteredRows = filterSuggestionRows(rows)
      setQuickResults(filteredRows)
      setQuickResultsByProvider((prev) => ({
        ...prev,
        [String(quickProviderKey || '').trim().toLowerCase()]: filteredRows,
      }))
      setQuickDebugByProvider((prev) => ({
        ...prev,
        [String(quickProviderKey || '').trim().toLowerCase()]: {
          rawCount: rows.length,
          filteredCount: filteredRows.length,
          adapterAvailable: Boolean(data?.meta?.adapterAvailable),
          slot: String(data?.meta?.slot || ''),
          go4cardFullCount: Number(data?.meta?.go4cardFullCount || 0),
          go4cardFilteredCount: Number(data?.meta?.go4cardFilteredCount || 0),
          apiRawReviewCount: Number(data?.meta?.rawReviewCount || 0),
          apiRawLiveCount: Number(data?.meta?.rawLiveCount || 0),
          apiMergedCount: Number(data?.meta?.mergedCount || 0),
          apiDedupCount: Number(data?.meta?.dedupCount || 0),
          apiReturnedCount: Number(data?.meta?.returnedCount || 0),
        },
      }))
      setMessage(`Found ${filteredRows.length} result(s)`)
    } catch {
      setMessage('Search failed')
    } finally {
      setQuickSearching(false)
    }
  }

  const loadSuggestionsForProvider = async (providerKey: string, queryOverride?: string) => {
    if (!matrixDoc?.internalSlug) return
    const q = String(queryOverride || quickQuery || matrixDoc.productName || '').trim()
    if (!q) return
    try {
      const params = new URLSearchParams({
        action: 'search',
        slug: matrixDoc.internalSlug,
        providerKey: String(providerKey || '').trim().toLowerCase(),
        q,
        limit: '20',
      })
      const res = await fetch(`/api/admin/providers/options?${params.toString()}`, {
        headers: getHeaders(),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (!data?.success) return
      const rows = Array.isArray(data?.data) ? data.data : []
      const filteredRows = filterSuggestionRows(rows)
      setQuickResultsByProvider((prev) => ({ ...prev, [providerKey]: filteredRows }))
      setQuickDebugByProvider((prev) => ({
        ...prev,
        [providerKey]: {
          rawCount: rows.length,
          filteredCount: filteredRows.length,
          adapterAvailable: Boolean(data?.meta?.adapterAvailable),
          slot: String(data?.meta?.slot || ''),
          go4cardFullCount: Number(data?.meta?.go4cardFullCount || 0),
          go4cardFilteredCount: Number(data?.meta?.go4cardFilteredCount || 0),
          apiRawReviewCount: Number(data?.meta?.rawReviewCount || 0),
          apiRawLiveCount: Number(data?.meta?.rawLiveCount || 0),
          apiMergedCount: Number(data?.meta?.mergedCount || 0),
          apiDedupCount: Number(data?.meta?.dedupCount || 0),
          apiReturnedCount: Number(data?.meta?.returnedCount || 0),
        },
      }))
    } catch {
      // keep UI resilient
    }
  }

  const importMissingFromSuggestion = async (providerKey: string, item: ProviderSearchResult) => {
    if (!matrixDoc?.internalSlug) return
    try {
      const res = await fetch('/api/admin/providers/matrix', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({
          action: 'import_missing_product',
          internalSlug: matrixDoc.internalSlug,
          providerKey,
          providerProductId: item.providerProductId,
          providerProductName: item.providerProductName,
          category: matrixDoc.category || 'digital-services',
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage(
          data?.data?.createdProduct
            ? `Imported new product and linked ${providerKey}`
            : `Linked ${providerKey} to existing product`
        )
        await loadBySlug(matrixDoc.internalSlug)
        await loadDashboard()
      } else {
        setMessage(data?.message || 'Import failed')
      }
    } catch {
      setMessage('Import failed')
    }
  }

  const runImportLegacyAll = async () => {
    setBulkRunning('import_legacy')
    setMessage('')
    try {
      const res = await fetch('/api/admin/providers/matrix', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({ action: 'import_legacy_all' }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage(data?.message || 'Legacy import completed')
        await loadDashboard()
      } else {
        setMessage(data?.message || 'Legacy import failed')
      }
    } catch {
      setMessage('Legacy import failed')
    } finally {
      setBulkRunning('none')
    }
  }

  const runAutoLinkSecondarySafe = async () => {
    setBulkRunning('auto_secondary')
    setMessage('')
    try {
      const res = await fetch('/api/admin/providers/matrix', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({
          action: 'auto_link_secondary_reviews',
          minConfidence: autoConfidence,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        const d = data?.data || {}
        setMessage(
          `Auto-link secondary done. scanned=${Number(d.scanned || 0)}, linked=${Number(d.linked || 0)}, skipped=${Number(d.skipped || 0)}${
            d.firstSkipReason ? `, first_skip_reason=${String(d.firstSkipReason)}` : ''
          }`
        )
        await loadDashboard()
      } else {
        setMessage(data?.message || 'Auto-link secondary failed')
      }
    } catch {
      setMessage('Auto-link secondary failed')
    } finally {
      setBulkRunning('none')
    }
  }

  const quickLinkResult = async (item: ProviderSearchResult, providerOverride?: string) => {
    if (item.variantSafe === false || item.matchType === 'fuzzy') {
      setMessage('Variant-safe guard: this match is ambiguous. Use another exact/contains suggestion.')
      return
    }
    const targetProvider = String(providerOverride || quickProviderKey || '').trim().toLowerCase()
    setRouteForm((prev) => ({
      ...prev,
      providerKey: targetProvider,
      providerProductId: item.providerProductId,
      providerProductName: item.providerProductName,
    }))
    if (!matrixDoc?.internalSlug) return
    try {
      const res = await fetch('/api/admin/providers/matrix', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({
          internalSlug: matrixDoc.internalSlug,
          providerKey: targetProvider,
          providerProductId: item.providerProductId,
          providerProductName: item.providerProductName,
          active: true,
          fallbackEnabled: true,
          priority: 100,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage(`Linked ${targetProvider} -> ${item.providerProductName}`)
        await loadBySlug(matrixDoc.internalSlug)
        await loadDashboard()
      } else {
        setMessage(data?.message || 'Failed to link provider')
      }
    } catch {
      setMessage('Failed to link provider')
    }
  }

  const saveSimpleProviders = async () => {
    if (!matrixDoc?.internalSlug) {
      setMessage('Load product first')
      return
    }
    setSimpleSaving(true)
    setMessage('')
    try {
      const slug = matrixDoc.internalSlug
      const currentRoutes = Array.isArray(matrixDoc.routes) ? matrixDoc.routes : []
      const keys = Object.keys(simpleSelection)
      const selectedKeys = keys.filter((key) => simpleSelection[key] === true)
      let enabled = 0
      let disabled = 0
      let autoLinked = 0
      const unresolvedKeys: string[] = []

      for (const key of selectedKeys) {
        const hasRoute = currentRoutes.some((row) => String(row.providerKey || '').toLowerCase() === key)
        if (!hasRoute) {
          const linkRes = await fetch('/api/admin/providers/matrix', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...(getHeaders() || {}),
            },
            body: JSON.stringify({
              action: 'auto_link_provider_by_name',
              internalSlug: slug,
              providerKey: key,
              minScore: 0.86,
            }),
          })
          if (isUnauthorizedStatus(linkRes.status)) {
            router.push('/admin/login')
            return
          }
          const linkData = await linkRes.json()
          if (linkData?.success && linkData?.data?.linked) autoLinked += 1
          else unresolvedKeys.push(key)
        }
      }

      // Reload latest matrix after auto-link attempts so we never toggle against stale routes.
      const latestRes = await fetch(`/api/admin/providers/matrix?slug=${encodeURIComponent(slug)}`, {
        headers: getHeaders(),
      })
      if (isUnauthorizedStatus(latestRes.status)) {
        router.push('/admin/login')
        return
      }
      const latestData = await latestRes.json()
      const latestRoutes = Array.isArray(latestData?.data?.routes) ? latestData.data.routes : []
      const routeProviders = new Set(
        latestRoutes
          .map((row: any) => String(row?.providerKey || '').toLowerCase().trim())
          .filter(Boolean)
      )

      for (const key of keys) {
        const wantEnabled = simpleSelection[key] === true
        if (wantEnabled && !routeProviders.has(key)) {
          if (!unresolvedKeys.includes(key)) unresolvedKeys.push(key)
          continue
        }
        const toggleRes = await fetch('/api/admin/providers/matrix', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(getHeaders() || {}),
          },
          body: JSON.stringify({
            action: 'set_provider_enabled',
            internalSlug: slug,
            providerKey: key,
            enabled: wantEnabled,
          }),
        })
        if (isUnauthorizedStatus(toggleRes.status)) {
          router.push('/admin/login')
          return
        }
        const toggleData = await toggleRes.json()
        if (!toggleData?.success) continue
        if (wantEnabled) enabled += 1
        else disabled += 1
      }

      await loadBySlug(slug)
      await loadDashboard()
      setMessage(
        `Simple save done. enabled=${enabled}, disabled=${disabled}, autoLinked=${autoLinked}, unresolved=${unresolvedKeys.length}${
          unresolvedKeys.length ? ` (${unresolvedKeys.join(', ')})` : ''
        }`
      )
    } catch {
      setMessage('Simple save failed')
    } finally {
      setSimpleSaving(false)
    }
  }

  const savePolicy = async () => {
    if (!matrixDoc?.internalSlug) return
    try {
      const res = await fetch('/api/admin/providers/matrix', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({
          action: 'set_policy',
          internalSlug: matrixDoc.internalSlug,
          routingMode: matrixDoc.routingMode,
          forcedProviderKey: matrixDoc.forcedProviderKey,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage('Policy saved')
        await loadBySlug()
        await loadDashboard()
      } else {
        setMessage(data?.message || 'Failed to save policy')
      }
    } catch {
      setMessage('Failed to save policy')
    }
  }

  const addOrUpdateRoute = async () => {
    if (!matrixDoc?.internalSlug) return
    if (!String(routeForm.providerKey || '').trim() || !String(routeForm.providerProductId || '').trim()) {
      setMessage('providerKey and providerProductId are required')
      return
    }
    try {
      const res = await fetch('/api/admin/providers/matrix', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({
          internalSlug: matrixDoc.internalSlug,
          providerKey: routeForm.providerKey,
          providerProductId: routeForm.providerProductId,
          providerProductName: routeForm.providerProductName,
          active: routeForm.active,
          fallbackEnabled: routeForm.fallbackEnabled,
          priority: routeForm.priority,
          fixedUnitCost: routeForm.fixedUnitCost,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage('Route saved')
        setRouteForm((prev) => ({ ...prev, providerProductId: '', providerProductName: '', fixedUnitCost: undefined }))
        await loadBySlug()
        await loadDashboard()
      } else {
        setMessage(data?.message || 'Failed to save route')
      }
    } catch {
      setMessage('Failed to save route')
    }
  }

  const removeRoute = async (row: MatrixRow) => {
    if (!matrixDoc?.internalSlug) return
    try {
      const res = await fetch('/api/admin/providers/matrix', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({
          action: 'remove_route',
          internalSlug: matrixDoc.internalSlug,
          providerKey: row.providerKey,
          providerProductId: row.providerProductId,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage('Route removed')
        await loadBySlug()
        await loadDashboard()
      } else {
        setMessage(data?.message || 'Failed to remove route')
      }
    } catch {
      setMessage('Failed to remove route')
    }
  }

  const saveRegistry = async () => {
    const providerKey = String(registryForm.providerKey || '').trim().toLowerCase()
    if (!providerKey) {
      setMessage('providerKey is required')
      return
    }
    try {
      const res = await fetch('/api/admin/providers/registry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({
          providerKey,
          displayName: registryForm.displayName,
          adapterKind: registryForm.adapterKind || providerKey,
          slotPreference: registryForm.slotPreference,
          enabled: registryForm.enabled,
          priority: registryForm.priority,
          financial: registryForm.financial,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage('Provider registry saved')
        await loadRegistry()
      } else {
        setMessage(data?.message || 'Failed to save provider registry')
      }
    } catch {
      setMessage('Failed to save provider registry')
    }
  }

  const toggleProvider = async (row: RegistryRow) => {
    try {
      const res = await fetch('/api/admin/providers/registry', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(getHeaders() || {}),
        },
        body: JSON.stringify({
          action: 'toggle_enabled',
          providerKey: row.providerKey,
          enabled: !row.enabled,
        }),
      })
      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data = await res.json()
      if (data?.success) {
        setMessage('Provider state updated')
        await loadRegistry()
      } else {
        setMessage(data?.message || 'Failed to update provider state')
      }
    } catch {
      setMessage('Failed to update provider state')
    }
  }

  const filteredDashboard = useMemo(() => {
    const term = search.trim().toLowerCase()
    return dashboardRows.filter((row) => {
      const okStatus = statusFilter === 'all' ? true : row.status === statusFilter
      const okSearch =
        !term ||
        String(row.internalSlug || '').includes(term) ||
        String(row.productName || '').toLowerCase().includes(term) ||
        String(row.category || '').toLowerCase().includes(term)
      return okStatus && okSearch
    })
  }, [dashboardRows, search, statusFilter])

  const providerKeys = useMemo(() => {
    const keys = Array.from(
      new Set(
        [
          ...registryRows.map((item) => String(item.providerKey || '').toLowerCase().trim()),
          ...Object.keys(simpleSelection).map((key) => String(key || '').toLowerCase().trim()),
          'dailycard',
          'go4card',
        ].filter(Boolean)
      )
    )
    return keys.sort((a, b) => a.localeCompare(b))
  }, [registryRows, simpleSelection])

  const providerLabel = (key: string) => {
    const found = registryRows.find((item) => String(item.providerKey || '').toLowerCase() === key)
    if (found?.displayName) return found.displayName
    if (key === 'dailycard') return 'DailyCard'
    if (key === 'go4card') return 'Go4Card'
    return key
  }

  const refreshSuggestionsForAll = async () => {
    const query = String(quickQuery || matrixDoc?.productName || '').trim()
    if (!query) {
      setMessage('Type product name first')
      return
    }
    await Promise.all(providerKeys.map((key) => loadSuggestionsForProvider(key, query)))
    setMessage('Suggestions refreshed')
  }

  const getSafeTopSuggestion = (providerKey: string) => {
    const items = Array.isArray(quickResultsByProvider[providerKey]) ? quickResultsByProvider[providerKey] : []
    return items.find((item) => item.variantSafe !== false && item.matchType !== 'fuzzy') || null
  }

  const linkBestForProvider = async (providerKey: string) => {
    const top = getSafeTopSuggestion(providerKey)
    if (!top) {
      setMessage(`No safe suggestion for ${providerLabel(providerKey)}. Use Search All first.`)
      return
    }
    await quickLinkForProvider(providerKey, top)
  }

  const importBestForProvider = async (providerKey: string) => {
    const top = getSafeTopSuggestion(providerKey)
    if (!top) {
      setMessage(`No importable suggestion for ${providerLabel(providerKey)}. Use Search All first.`)
      return
    }
    await importMissingFromSuggestion(providerKey, top)
  }

  const linkBothPrimaryProviders = async () => {
    await linkBestForProvider('dailycard')
    await linkBestForProvider('go4card')
    await loadBySlug(matrixDoc?.internalSlug || slugInput)
    await loadDashboard()
  }

  const quickLinkForProvider = async (providerKey: string, item: ProviderSearchResult) => {
    if (item.variantSafe === false || item.matchType === 'fuzzy') {
      setMessage('Variant-safe guard: this match is ambiguous. Pick a safer exact/contains result.')
      return
    }
    setQuickProviderKey(providerKey)
    await quickLinkResult(item, providerKey)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:p-5">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Provider Matrix Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Control product-provider routing from one place (single / multi provider).
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-200">Total: <span className="text-cyan-300">{summary.totalProducts}</span></div>
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">Multi-ready: <span className="font-semibold">{summary.readyMulti}</span></div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">Single-only: <span className="font-semibold">{summary.readySingle}</span></div>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">Missing: <span className="font-semibold">{summary.missingAll}</span></div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-white">Bulk Safe Tools</h2>
          <button
            onClick={() => setShowBulkTools((prev) => !prev)}
            className="rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-xs text-slate-200"
          >
            {showBulkTools ? 'Hide Advanced Bulk Tools' : 'Show Advanced Bulk Tools'}
          </button>
        </div>
        {showBulkTools ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={runImportLegacyAll}
              disabled={bulkRunning !== 'none'}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {bulkRunning === 'import_legacy' ? 'Importing...' : 'Import Legacy Links'}
            </button>
            <div className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-xs text-slate-300">
              Copies old provider mappings into this new matrix automatically.
            </div>
            <input
              type="number"
              min={0.5}
              max={1}
              step={0.01}
              value={autoConfidence}
              onChange={(e) => setAutoConfidence(Number(e.target.value || 0.9))}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
            />
            <button
              onClick={runAutoLinkSecondarySafe}
              disabled={bulkRunning !== 'none'}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {bulkRunning === 'auto_secondary' ? 'Auto-linking...' : 'Auto-Link Secondary (Safe)'}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400">Hidden by default to keep daily workflow clean.</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search slug/name/category"
            className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
          >
            <option value="all">All</option>
            <option value="ready_multi">ready_multi</option>
            <option value="ready_single">ready_single</option>
            <option value="missing_all">missing_all</option>
          </select>
          <button onClick={loadDashboard} disabled={loadingDashboard} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {loadingDashboard ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-xs">
            <thead className="border-b border-white/10 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">Slug</th>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">DailyCard</th>
                <th className="px-3 py-2 text-left">Go4Card</th>
                <th className="px-3 py-2 text-left">Coverage</th>
                <th className="px-3 py-2 text-left">Routing</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDashboard.map((row) => (
                <tr key={row.internalSlug} className="border-b border-white/5">
                  <td className="px-3 py-2 font-mono text-cyan-300">{row.internalSlug}</td>
                  <td className="px-3 py-2 text-slate-200">
                    <div>{row.productName}</div>
                    <div className="text-[11px] text-slate-400">{row.category || 'uncategorized'}</div>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{row.dailycardStatus === 'linked' ? 'linked' : 'missing'}</td>
                  <td className="px-3 py-2 text-slate-300">{row.go4cardStatus === 'linked' ? 'linked' : 'missing'}</td>
                  <td className="px-3 py-2 text-slate-300">{row.coverageStatus || row.status}</td>
                  <td className="px-3 py-2 text-slate-300">{row.routingMode}{row.forcedProviderKey ? ` (${row.forcedProviderKey})` : ''}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => {
                        setSlugInput(row.internalSlug)
                        void loadBySlug(row.internalSlug)
                      }}
                      className="rounded border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-cyan-200"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {!filteredDashboard.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-400">No rows</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <h2 className="mb-3 text-base font-semibold text-white">Product Matrix Editor</h2>
        <div className="mb-3 grid gap-2 sm:grid-cols-4">
          <input
            value={slugInput}
            onChange={(e) => setSlugInput(e.target.value)}
            placeholder="internalSlug (e.g. hala-me)"
            className="sm:col-span-3 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <button onClick={() => void loadBySlug()} disabled={loadingMatrix} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">
            {loadingMatrix ? 'Loading...' : 'Load Product'}
          </button>
        </div>

        {matrixDoc ? (
          <>
            <div className="mb-3 rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
              <div className="mb-2 text-sm font-semibold text-cyan-100">
                Simple Provider Control (Recommended)
              </div>
              <p className="mb-2 text-xs text-cyan-100/80">
                Choose 1 / 2 / 3 providers for this product. Save once. We auto-link by name when possible.
              </p>
              <div className="mb-2 flex flex-wrap gap-2">
                {Object.keys(simpleSelection).map((key) => (
                  <label key={key} className="flex items-center gap-2 rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-slate-100">
                    <input
                      type="checkbox"
                      checked={simpleSelection[key] === true}
                      onChange={(e) => setSimpleSelection((prev) => ({ ...prev, [key]: e.target.checked }))}
                    />
                    {key}
                  </label>
                ))}
              </div>
              <button
                onClick={saveSimpleProviders}
                disabled={simpleSaving}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {simpleSaving ? 'Saving...' : 'Save Simple Providers'}
              </button>
            </div>

            <div className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
              <div className="mb-2 text-sm font-semibold text-emerald-100">Smart Match Suggestions (Variant-safe)</div>
              <p className="mb-2 text-xs text-emerald-100/80">
                Main workflow: search once, then link/import safely. Manual provider IDs are optional in Advanced only.
              </p>
              <div className="grid gap-2 sm:grid-cols-4">
                <select
                  value={quickProviderKey}
                  onChange={(e) => setQuickProviderKey(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                >
                  {providerKeys.map((key) => (
                    <option key={key} value={key}>
                      {providerLabel(key)}
                    </option>
                  ))}
                </select>
                <input
                  value={quickQuery}
                  onChange={(e) => setQuickQuery(e.target.value)}
                  placeholder="Type product name"
                  className="sm:col-span-2 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={runQuickSearch}
                    disabled={quickSearching}
                    className="rounded-lg bg-emerald-600 px-2 py-2 text-xs text-white disabled:opacity-50"
                  >
                    {quickSearching ? 'Searching...' : 'Search One'}
                  </button>
                  <button
                    onClick={() => void refreshSuggestionsForAll()}
                    className="rounded-lg bg-cyan-600 px-2 py-2 text-xs text-white"
                  >
                    Search All
                  </button>
                </div>
              </div>

              {quickResults.length ? (
                <div className="mt-2 rounded border border-white/10 bg-slate-900/50 px-3 py-2 text-xs text-slate-200">
                  Last direct search on {providerLabel(quickProviderKey)} returned {quickResults.length} result(s).
                </div>
              ) : null}

              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => void linkBestForProvider('dailycard')}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white"
                >
                  Link DailyCard
                </button>
                <button
                  onClick={() => void linkBestForProvider('go4card')}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs text-white"
                >
                  Link Go4Card
                </button>
                <button
                  onClick={() => void linkBothPrimaryProviders()}
                  className="rounded-lg bg-cyan-600 px-3 py-2 text-xs text-white"
                >
                  Link Both
                </button>
                <button
                  onClick={() => void importBestForProvider(quickProviderKey)}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white"
                >
                  Import from provider
                </button>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {providerKeys.map((key) => {
                  const linked = matrixDoc.routes.some(
                    (row) => String(row.providerKey || '').toLowerCase() === key && row.active !== false
                  )
                  const items = (quickResultsByProvider[key] || []).slice(0, 6)
                  const debug = quickDebugByProvider[key]
                  return (
                    <div key={key} className="rounded-lg border border-white/10 bg-slate-900/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-white">{providerLabel(key)}</div>
                        <span className={`rounded px-2 py-1 text-[11px] ${linked ? 'bg-emerald-500/20 text-emerald-100' : 'bg-amber-500/20 text-amber-100'}`}>
                          {linked ? 'linked' : 'missing'}
                        </span>
                      </div>
                      <div className="mb-2 rounded border border-white/10 bg-slate-950/40 px-2 py-1 text-[11px] text-slate-300">
                        raw results: {debug?.rawCount ?? 0} | after filter: {debug?.filteredCount ?? 0}
                        {' | '}review: {debug?.apiRawReviewCount ?? 0}, live: {debug?.apiRawLiveCount ?? 0}, dedup: {debug?.apiDedupCount ?? 0}
                        {' | '}adapter: {debug?.adapterAvailable ? 'on' : 'off'} {debug?.slot ? `(${debug.slot})` : ''}
                        {key === 'go4card' ? ` | fullCount: ${debug?.go4cardFullCount ?? 0}, filteredCount: ${debug?.go4cardFilteredCount ?? 0}` : ''}
                      </div>
                      {items.length ? (
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={`${key}-${item.providerProductId}-${item.providerProductName}`} className="rounded border border-white/10 bg-slate-950/60 p-2">
                              <div className="text-xs text-white">{item.providerProductName}</div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                                <span className="font-mono text-cyan-300">#{item.providerProductId}</span>
                                <span>{item.source}</span>
                                <span>{item.matchType || 'fuzzy'}</span>
                                <span>score {Number(item.score || 0).toFixed(2)}</span>
                                <span className={item.variantSafe === false ? 'text-rose-300' : 'text-emerald-300'}>
                                  {item.variantSafe === false ? 'variant-risk' : 'variant-safe'}
                                </span>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  onClick={() => void quickLinkForProvider(key, item)}
                                  className="rounded border border-emerald-400/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200"
                                >
                                  Link
                                </button>
                                <button
                                  onClick={() => void importMissingFromSuggestion(key, item)}
                                  className="rounded border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200"
                                >
                                  Import Missing
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No suggestions yet. Use Search All.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              <select
                value={matrixDoc.routingMode}
                onChange={(e) => setMatrixDoc((prev) => (prev ? { ...prev, routingMode: e.target.value as MatrixDoc['routingMode'] } : prev))}
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
              >
                <option value="cheapest">cheapest</option>
                <option value="priority">priority</option>
                <option value="forced">forced</option>
              </select>
              <input
                value={matrixDoc.forcedProviderKey || ''}
                onChange={(e) => setMatrixDoc((prev) => (prev ? { ...prev, forcedProviderKey: e.target.value } : prev))}
                placeholder="forcedProviderKey"
                className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
              />
              <button onClick={savePolicy} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">Save Policy</button>
            </div>

            <div className="mb-3">
              <button
                onClick={() => setShowAdvanced((prev) => !prev)}
                className="rounded-lg border border-white/20 bg-slate-800 px-3 py-2 text-xs text-slate-100"
              >
                {showAdvanced ? 'Hide Advanced Manual Edit' : 'Show Advanced Manual Edit'}
              </button>
            </div>

            {showAdvanced ? (
            <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input value={routeForm.providerKey} onChange={(e) => setRouteForm((p) => ({ ...p, providerKey: e.target.value }))} placeholder="providerKey" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <input value={routeForm.providerProductId} onChange={(e) => setRouteForm((p) => ({ ...p, providerProductId: e.target.value }))} placeholder="providerProductId" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <input value={routeForm.providerProductName || ''} onChange={(e) => setRouteForm((p) => ({ ...p, providerProductName: e.target.value }))} placeholder="providerProductName" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <input type="number" value={routeForm.priority} onChange={(e) => setRouteForm((p) => ({ ...p, priority: Number(e.target.value || 100) }))} placeholder="priority" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <input type="number" step="0.000001" value={routeForm.fixedUnitCost ?? ''} onChange={(e) => setRouteForm((p) => ({ ...p, fixedUnitCost: e.target.value === '' ? undefined : Number(e.target.value) }))} placeholder="fixedUnitCost optional" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={routeForm.active} onChange={(e) => setRouteForm((p) => ({ ...p, active: e.target.checked }))} />Active</label>
              <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={routeForm.fallbackEnabled} onChange={(e) => setRouteForm((p) => ({ ...p, fallbackEnabled: e.target.checked }))} />Fallback</label>
              <button onClick={addOrUpdateRoute} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">Add / Update Route</button>
            </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="border-b border-white/10 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-3 py-2 text-left">Product ID</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Priority</th>
                    <th className="px-3 py-2 text-left">Active</th>
                    <th className="px-3 py-2 text-left">Fallback</th>
                    <th className="px-3 py-2 text-left">Fixed Cost</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixDoc.routes.map((row) => (
                    <tr key={`${row.providerKey}-${row.providerProductId}`} className="border-b border-white/5">
                      <td className="px-3 py-2 text-slate-200">{row.providerKey}</td>
                      <td className="px-3 py-2 font-mono text-cyan-300">{row.providerProductId}</td>
                      <td className="px-3 py-2 text-slate-200">{row.providerProductName || ''}</td>
                      <td className="px-3 py-2 text-slate-200">{row.priority}</td>
                      <td className="px-3 py-2 text-slate-200">{row.active ? 'yes' : 'no'}</td>
                      <td className="px-3 py-2 text-slate-200">{row.fallbackEnabled ? 'yes' : 'no'}</td>
                      <td className="px-3 py-2 text-slate-200">{row.fixedUnitCost ?? '-'}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => void removeRoute(row)} className="rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-rose-200">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {!matrixDoc.routes.length ? (
                    <tr><td colSpan={8} className="px-3 py-4 text-center text-slate-400">No routes yet</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-white">Provider Registry (Advanced)</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRegistry((prev) => !prev)}
              className="rounded-lg border border-white/15 bg-slate-800 px-3 py-2 text-xs text-slate-200"
            >
              {showRegistry ? 'Hide Registry' : 'Show Registry'}
            </button>
            <button onClick={loadRegistry} disabled={loadingRegistry} className="rounded-lg bg-slate-700 px-3 py-2 text-xs text-white disabled:opacity-50">
              {loadingRegistry ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {showRegistry ? (
          <>
            <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input value={registryForm.providerKey} onChange={(e) => setRegistryForm((p) => ({ ...p, providerKey: e.target.value }))} placeholder="providerKey (dailycard)" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <input value={registryForm.displayName} onChange={(e) => setRegistryForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="displayName" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <input value={registryForm.adapterKind} onChange={(e) => setRegistryForm((p) => ({ ...p, adapterKind: e.target.value }))} placeholder="adapterKind" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <select value={registryForm.slotPreference} onChange={(e) => setRegistryForm((p) => ({ ...p, slotPreference: e.target.value as RegistryRow['slotPreference'] }))} className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white">
                <option value="any">any</option>
                <option value="primary">primary</option>
                <option value="secondary">secondary</option>
              </select>
              <input type="number" step="0.0001" value={registryForm.financial?.landingRate ?? 1} onChange={(e) => setRegistryForm((p) => ({ ...p, financial: { ...(p.financial || {}), landingRate: Number(e.target.value || 1) } }))} placeholder="landingRate" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <input type="number" step="0.0001" value={registryForm.financial?.fixedFeePerOrder ?? 0} onChange={(e) => setRegistryForm((p) => ({ ...p, financial: { ...(p.financial || {}), fixedFeePerOrder: Number(e.target.value || 0) } }))} placeholder="fixedFeePerOrder" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <input type="number" step="0.0001" value={registryForm.financial?.variableFeePercent ?? 0} onChange={(e) => setRegistryForm((p) => ({ ...p, financial: { ...(p.financial || {}), variableFeePercent: Number(e.target.value || 0) } }))} placeholder="variableFeePercent" className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white" />
              <button onClick={saveRegistry} className="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm text-white">Save Provider</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-xs">
                <thead className="border-b border-white/10 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Provider</th>
                    <th className="px-3 py-2 text-left">Display</th>
                    <th className="px-3 py-2 text-left">Enabled</th>
                    <th className="px-3 py-2 text-left">Landing Rate</th>
                    <th className="px-3 py-2 text-left">Fixed Fee</th>
                    <th className="px-3 py-2 text-left">Var %</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {registryRows.map((row) => (
                    <tr key={row.providerKey} className="border-b border-white/5">
                      <td className="px-3 py-2 font-mono text-cyan-300">{row.providerKey}</td>
                      <td className="px-3 py-2 text-slate-200">{row.displayName}</td>
                      <td className="px-3 py-2 text-slate-200">{row.enabled ? 'yes' : 'no'}</td>
                      <td className="px-3 py-2 text-slate-200">{Number(row.financial?.landingRate || 1).toFixed(4)}</td>
                      <td className="px-3 py-2 text-slate-200">{Number(row.financial?.fixedFeePerOrder || 0).toFixed(4)}</td>
                      <td className="px-3 py-2 text-slate-200">{Number(row.financial?.variableFeePercent || 0).toFixed(4)}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => void toggleProvider(row)} className="rounded border border-white/20 px-2 py-1 text-slate-200">
                          {row.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!registryRows.length ? (
                    <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">No providers in registry yet</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-400">Registry controls are hidden to keep daily workflow simple.</p>
        )}
      </div>
    </div>
  )
}
