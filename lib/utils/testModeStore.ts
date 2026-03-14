import { DEFAULT_PAYMENT_METHODS } from '@/lib/wallet/paymentMethods'

type MockOrder = {
  _id: string
  orderId: string
  productId: string
  productSlug: string
  productName: string
  playerId: string
  quantity: number
  price: number
  total: number
  walletBalanceBefore: number
  walletBalanceAfter: number
  status: string
  providerStatus: string
  createdAt: string
  selectedPackageOption?: string
}

type MockTransaction = {
  _id: string
  type: string
  amount: number
  currency: string
  balanceBefore: number
  balanceAfter: number
  description?: string
  notes?: string
  createdAt: string
}

type MockDepositRequest = {
  _id: string
  amount: number
  currency: string
  paymentMethodKey: string
  paymentMethodName: string
  paymentAddress: string
  proofImage?: string
  status: string
  createdAt: string
}

type MockUser = {
  id: string
  email: string
  username: string
  displayName: string
  name: string
  role: 'customer' | 'admin' | 'seller'
  isVerified: boolean
  avatar: string
  walletBalance: {
    usd: number
    lbp: number
  }
}

type TestModeState = {
  user: MockUser
  orders: MockOrder[]
  transactions: MockTransaction[]
  depositRequests: MockDepositRequest[]
}

const globalStore = globalThis as typeof globalThis & {
  __bilycardTestModeState?: TestModeState
}

function createInitialState(): TestModeState {
  return {
    user: {
      id: 'test-user-001',
      email: 'test@bilycard.com',
      username: 'testuser',
      displayName: 'Test User',
      name: 'Test User',
      role: 'customer',
      isVerified: true,
      avatar: '',
      walletBalance: {
        usd: 250,
        lbp: 0,
      },
    },
    orders: [
      {
        _id: 'test-order-001',
        orderId: 'TEST-ORDER-001',
        productId: 'test-product-001',
        productSlug: 'jawaker',
        productName: 'Jawaker',
        playerId: '123456789',
        quantity: 1,
        price: 8.9,
        total: 8.9,
        walletBalanceBefore: 258.9,
        walletBalanceAfter: 250,
        status: 'completed',
        providerStatus: 'mock_completed',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
    transactions: [
      {
        _id: 'test-txn-001',
        type: 'deposit',
        amount: 200,
        currency: 'USD',
        balanceBefore: 50,
        balanceAfter: 250,
        description: 'Test mode mock deposit',
        notes: 'Auto credited in test mode',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
      {
        _id: 'test-txn-002',
        type: 'purchase',
        amount: -8.9,
        currency: 'USD',
        balanceBefore: 258.9,
        balanceAfter: 250,
        description: 'Purchase: Jawaker',
        notes: 'Mock order in test mode',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ],
    depositRequests: [],
  }
}

export function getTestModeState(): TestModeState {
  if (!globalStore.__bilycardTestModeState) {
    globalStore.__bilycardTestModeState = createInitialState()
  }

  return globalStore.__bilycardTestModeState
}

export function getTestModeUser() {
  return getTestModeState().user
}

export function updateTestModeAvatar(avatar: string) {
  const state = getTestModeState()
  state.user.avatar = avatar
  return state.user
}

export function getTestModeOrders() {
  return [...getTestModeState().orders].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function getTestModeTransactions() {
  return [...getTestModeState().transactions].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function getTestModePaymentMethods() {
  return DEFAULT_PAYMENT_METHODS.map((method) => ({
    ...method,
    address:
      method.address ||
      (method.key.includes('usdt')
        ? 'TXXX-TEST-WALLET-ADDRESS-001'
        : method.key === 'omt-wallet'
          ? 'OMT-TEST-71985887'
          : 'WHISH-TEST-71985887'),
  }))
}

export function createTestModeDeposit(params: {
  amount: number
  currency: 'USD' | 'LBP'
  paymentMethodKey: string
  paymentMethodName: string
  paymentAddress: string
  proofImage?: string
}) {
  const state = getTestModeState()
  const previousUsd = Number(state.user.walletBalance.usd || 0)
  const creditedUsd = params.currency === 'USD' ? params.amount : params.amount / 90000
  const nextUsd = Number((previousUsd + creditedUsd).toFixed(2))

  state.user.walletBalance.usd = nextUsd

  const createdAt = new Date().toISOString()
  const depositRequest: MockDepositRequest = {
    _id: `test-deposit-${Date.now()}`,
    amount: params.amount,
    currency: params.currency,
    paymentMethodKey: params.paymentMethodKey,
    paymentMethodName: params.paymentMethodName,
    paymentAddress: params.paymentAddress,
    proofImage: params.proofImage,
    status: 'approved',
    createdAt,
  }

  const transaction: MockTransaction = {
    _id: `test-txn-${Date.now()}`,
    type: 'deposit',
    amount: Number(creditedUsd.toFixed(2)),
    currency: 'USD',
    balanceBefore: previousUsd,
    balanceAfter: nextUsd,
    description: `Deposit via ${params.paymentMethodName}`,
    notes: 'Auto approved in test mode',
    createdAt,
  }

  state.depositRequests.unshift(depositRequest)
  state.transactions.unshift(transaction)

  return { depositRequest, transaction, balanceUsd: nextUsd }
}

export function createTestModeOrder(params: {
  productId: string
  slug: string
  name: string
  playerId: string
  quantity: number
  total: number
  packageOption?: string
}) {
  const state = getTestModeState()
  const previousUsd = Number(state.user.walletBalance.usd || 0)
  const nextUsd = Number((previousUsd - params.total).toFixed(2))

  state.user.walletBalance.usd = nextUsd

  const createdAt = new Date().toISOString()
  const orderId = `TEST-${Date.now()}`
  const order: MockOrder = {
    _id: `test-order-${Date.now()}`,
    orderId,
    productId: params.productId,
    productSlug: params.slug,
    productName: params.name,
    playerId: params.playerId,
    quantity: params.quantity,
    price: Number((params.total / Math.max(params.quantity, 1)).toFixed(6)),
    total: Number(params.total.toFixed(2)),
    walletBalanceBefore: previousUsd,
    walletBalanceAfter: nextUsd,
    status: 'completed',
    providerStatus: 'mock_completed',
    createdAt,
    selectedPackageOption: params.packageOption,
  }

  const transaction: MockTransaction = {
    _id: `test-txn-${Date.now() + 1}`,
    type: 'purchase',
    amount: Number((-params.total).toFixed(2)),
    currency: 'USD',
    balanceBefore: previousUsd,
    balanceAfter: nextUsd,
    description: `Purchase: ${params.name}`,
    notes: params.packageOption ? `Package: ${params.packageOption}` : 'Mock order in test mode',
    createdAt,
  }

  state.orders.unshift(order)
  state.transactions.unshift(transaction)

  return { order, transaction, balanceUsd: nextUsd }
}
