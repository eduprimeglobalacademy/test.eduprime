declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

let scriptPromise: Promise<void> | null = null

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout'))
    document.body.appendChild(script)
  })
  return scriptPromise
}

interface OpenCheckoutParams {
  subscriptionId: string
  razorpayKeyId: string
  orgName: string
  adminEmail: string
  planName: string
  themeColor?: string
  onSuccess: () => void
  onDismiss?: () => void
}

export async function openRazorpayCheckout(params: OpenCheckoutParams) {
  await loadCheckoutScript()
  if (!window.Razorpay) throw new Error('Razorpay checkout unavailable')

  const razorpay = new window.Razorpay({
    key: params.razorpayKeyId,
    subscription_id: params.subscriptionId,
    name: params.orgName,
    description: `${params.planName} plan`,
    prefill: { email: params.adminEmail },
    theme: { color: params.themeColor || '#4f46e5' },
    handler: () => params.onSuccess(),
    modal: { ondismiss: () => params.onDismiss?.() },
  })
  razorpay.open()
}

interface OpenOrderCheckoutParams {
  orderId: string
  razorpayKeyId: string
  amount: number
  orgName: string
  adminEmail: string
  description: string
  themeColor?: string
  onSuccess: () => void
  onDismiss?: () => void
}

// One-time payment (Razorpay Order), not a subscription — used for capacity
// bumps, which work even for orgs with no subscription/mandate on file yet.
export async function openRazorpayOrderCheckout(params: OpenOrderCheckoutParams) {
  await loadCheckoutScript()
  if (!window.Razorpay) throw new Error('Razorpay checkout unavailable')

  const razorpay = new window.Razorpay({
    key: params.razorpayKeyId,
    order_id: params.orderId,
    amount: params.amount,
    currency: 'INR',
    name: params.orgName,
    description: params.description,
    prefill: { email: params.adminEmail },
    theme: { color: params.themeColor || '#4f46e5' },
    handler: () => params.onSuccess(),
    modal: { ondismiss: () => params.onDismiss?.() },
  })
  razorpay.open()
}
