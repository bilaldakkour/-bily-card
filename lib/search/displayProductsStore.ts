'use client'

import type { ProductListItem } from '@/lib/data'

type Listener = () => void

let snapshot: ProductListItem[] = []
const listeners = new Set<Listener>()

export function getDisplayProductsSnapshot() {
  return snapshot
}

export function setDisplayProductsSnapshot(products: ProductListItem[]) {
  snapshot = Array.isArray(products) ? products : []
  listeners.forEach((listener) => listener())
}

export function subscribeDisplayProducts(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

