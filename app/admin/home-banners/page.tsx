'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import NextImage from 'next/image'
import { useRouter } from 'next/navigation'
import { buildAdminAuthHeaders, getAdminTokenOptional, isUnauthorizedStatus } from '@/lib/utils/adminAuth'

type LoadResponse = {
  success?: boolean
  message?: string
  data?: {
    slides?: string[]
    useDefaultFallback?: boolean
    defaults?: string[]
    limits?: {
      maxSlides?: number
      maxImageDataUrlLength?: number
    }
  }
}

const DEFAULT_MAX_SLIDES = 8
const DEFAULT_MAX_IMAGE_DATA_URL_LENGTH = 350_000

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new window.Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to decode image'))
    }
    image.src = objectUrl
  })
}

async function fileToOptimizedDataUrl(file: File): Promise<string> {
  const image = await loadImageFromFile(file)
  const maxWidth = 1280
  const maxHeight = 720

  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1)
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to initialize image canvas')
  }

  context.drawImage(image, 0, 0, width, height)

  const webp = canvas.toDataURL('image/webp', 0.65)
  if (webp.startsWith('data:image/webp;base64,')) {
    return webp
  }

  return canvas.toDataURL('image/jpeg', 0.7)
}

export default function AdminHomeBannersPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [slides, setSlides] = useState<string[]>([])
  const [defaults, setDefaults] = useState<string[]>([])
  const [maxSlides, setMaxSlides] = useState(DEFAULT_MAX_SLIDES)
  const [maxImageDataUrlLength, setMaxImageDataUrlLength] = useState(DEFAULT_MAX_IMAGE_DATA_URL_LENGTH)
  const [useDefaultFallback, setUseDefaultFallback] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const storedToken = getAdminTokenOptional()
    setToken(storedToken)

    const load = async () => {
      try {
        const res = await fetch('/api/admin/home-banners', {
          headers: buildAdminAuthHeaders(storedToken),
          cache: 'no-store',
        })
        if (isUnauthorizedStatus(res.status)) {
          router.push('/admin/login')
          return
        }
        const data: LoadResponse = await res.json()

        if (!res.ok || !data?.success) {
          throw new Error(data?.message || 'Failed to load home banners')
        }

        setSlides(Array.isArray(data?.data?.slides) ? data.data.slides : [])
        setUseDefaultFallback(data?.data?.useDefaultFallback !== false)
        setDefaults(Array.isArray(data?.data?.defaults) ? data.data.defaults : [])
        setMaxSlides(Number(data?.data?.limits?.maxSlides || DEFAULT_MAX_SLIDES))
        setMaxImageDataUrlLength(
          Number(data?.data?.limits?.maxImageDataUrlLength || DEFAULT_MAX_IMAGE_DATA_URL_LENGTH)
        )
      } catch (error: any) {
        setMessage(error?.message || 'Failed to load home banners')
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [router])

  const effectivePreview = useMemo(() => {
    if (slides.length > 0) return slides
    return defaults
  }, [slides, defaults])

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    try {
      setMessage('')
      const picked = Array.from(files).filter((file) => file.type.startsWith('image/'))
      const readResults = await Promise.all(picked.map((file) => fileToOptimizedDataUrl(file)))
      const validResults = readResults.filter((item) => item.length <= maxImageDataUrlLength)
      const combinedSize = validResults.reduce((sum, item) => sum + item.length, 0)
      if (combinedSize > 800_000) {
        setMessage('Selected images are still too large after compression. Please upload fewer/smaller images.')
        return
      }

      setSlides((prev) => {
        const next = [...prev, ...validResults].slice(0, maxSlides)
        if (readResults.length !== validResults.length) {
          setMessage('Some images were too large after optimization and were skipped.')
        } else if (prev.length + validResults.length > maxSlides) {
          setMessage(`Only ${maxSlides} images are allowed.`)
        } else {
          setMessage(`${validResults.length} image(s) added. Click Save Changes to apply.`)
        }
        return next
      })
    } catch {
      setMessage('Failed to process selected image files')
    } finally {
      event.target.value = ''
    }
  }

  const removeSlide = (index: number) => {
    setSlides((prev) => prev.filter((_, idx) => idx !== index))
  }

  const moveSlide = (index: number, direction: 'left' | 'right') => {
    setSlides((prev) => {
      const target = direction === 'left' ? index - 1 : index + 1
      if (target < 0 || target >= prev.length) return prev
      const next = [...prev]
      const current = next[index]
      next[index] = next[target]
      next[target] = current
      return next
    })
  }

  const saveSlides = async (resetToDefault = false) => {
    try {
      setSaving(true)
      setMessage('')

      const res = await fetch('/api/admin/home-banners', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({
          slides: resetToDefault ? [] : slides,
          useDefaultFallback,
          resetToDefault,
        }),
      })

      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data: LoadResponse = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Failed to save home banners (HTTP ${res.status})`)
      }

      setSlides(Array.isArray(data?.data?.slides) ? data.data.slides : [])
      setMessage(resetToDefault ? 'Default home banners restored.' : 'Home banners saved successfully.')
    } catch (error: any) {
      setMessage(error?.message || 'Failed to save home banners')
    } finally {
      setSaving(false)
    }
  }

  const hideDefaultBannersNow = async () => {
    try {
      setSaving(true)
      setMessage('')

      const res = await fetch('/api/admin/home-banners', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(buildAdminAuthHeaders(token) || {}),
        },
        body: JSON.stringify({
          slides,
          useDefaultFallback: false,
          resetToDefault: false,
        }),
      })

      if (isUnauthorizedStatus(res.status)) {
        router.push('/admin/login')
        return
      }
      const data: LoadResponse = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || `Failed to hide default banners (HTTP ${res.status})`)
      }

      setUseDefaultFallback(false)
      setSlides(Array.isArray(data?.data?.slides) ? data.data.slides : [])
      setMessage('Default banners are now hidden.')
    } catch (error: any) {
      setMessage(error?.message || 'Failed to hide default banners')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-slate-300">Loading home banners...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Home Banners</h1>
          <p className="text-sm text-slate-400">
            Upload and manage images shown in the top homepage promo panel.
          </p>
          <p className="text-xs text-slate-500">
            Tip: use landscape images. Large files are auto-compressed and strict size limits apply.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="cursor-pointer rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10">
            Upload Images
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() => saveSlides(false)}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            type="button"
            onClick={() => saveSlides(true)}
            disabled={saving}
            className="rounded-lg border border-amber-300/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={hideDefaultBannersNow}
            disabled={saving}
            className="rounded-lg border border-rose-300/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
          >
            Hide Default Banners
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-slate-200">
          {message}
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-300">
            Custom images: <span className="font-semibold text-white">{slides.length}</span> / {maxSlides}
          </p>
          <p className="text-xs text-slate-500">Only admin can change these banners.</p>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={useDefaultFallback}
            onChange={(e) => setUseDefaultFallback(e.target.checked)}
          />
          Use default banners when custom list is empty
        </label>

        {slides.length === 0 ? (
          useDefaultFallback ? (
            <p className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              You are using default homepage banners. Upload images then save to apply custom banners.
            </p>
          ) : (
            <p className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              Default fallback is disabled and no custom images exist. Home panel will not show banner images.
            </p>
          )
        ) : null}
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Active Preview</h2>

        {effectivePreview.length === 0 ? (
          <p className="text-sm text-slate-400">No banners available.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {effectivePreview.map((slide, index) => (
              <div key={`${index}-${String(slide).slice(0, 24)}`} className="rounded-xl border border-white/10 bg-slate-950/60 p-3">
                <div className="relative h-36 w-full overflow-hidden rounded-lg border border-white/10 sm:h-40">
                  <NextImage
                    src={slide}
                    alt={`Banner ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    unoptimized={slide.startsWith('data:image/')}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-300">
                    Position #{index + 1}
                  </span>
                  {slides.length > 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 'left')}
                        disabled={index === 0}
                        className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-200 disabled:opacity-40"
                      >
                        Move Left
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 'right')}
                        disabled={index === slides.length - 1}
                        className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-200 disabled:opacity-40"
                      >
                        Move Right
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlide(index)}
                        className="rounded-md border border-red-400/40 bg-red-500/10 px-2 py-1 text-xs text-red-200 hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
