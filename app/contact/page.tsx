import { Mail, MessageCircle, Phone } from 'lucide-react'

const WHATSAPP_URL = 'https://wa.me/96171985887'
const SUPPORT_EMAIL = 'support@bilycard.com'
const SUPPORT_PHONE_DISPLAY = '+961 71 985 887'
const SUPPORT_PHONE_TEL = '+96171985887'

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Contact Us</h1>
          <p className="mt-2 text-slate-400">
            Choose your preferred support channel. We respond quickly.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 transition hover:border-emerald-400 hover:bg-emerald-500/20"
          >
            <MessageCircle className="mb-3 h-6 w-6 text-emerald-300" />
            <div className="text-lg font-semibold">WhatsApp</div>
            <div className="mt-1 text-sm text-slate-300">Chat with support now</div>
          </a>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 transition hover:border-blue-400 hover:bg-blue-500/20"
          >
            <Mail className="mb-3 h-6 w-6 text-blue-300" />
            <div className="text-lg font-semibold">Email</div>
            <div className="mt-1 text-sm text-slate-300">{SUPPORT_EMAIL}</div>
          </a>

          <a
            href={`tel:${SUPPORT_PHONE_TEL}`}
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 transition hover:border-amber-400 hover:bg-amber-500/20"
          >
            <Phone className="mb-3 h-6 w-6 text-amber-300" />
            <div className="text-lg font-semibold">Phone</div>
            <div className="mt-1 text-sm text-slate-300">{SUPPORT_PHONE_DISPLAY}</div>
          </a>
        </div>
      </div>
    </div>
  )
}