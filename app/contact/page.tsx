import MobileUserShell from '@/components/shared/MobileUserShell'
import { Mail, MessageCircle, Phone, ShieldCheck, Clock3, Headphones } from 'lucide-react'
import { getSupportContactSettings, getWhatsappUrl } from '@/lib/supportContact'

const supportNotes = [
  {
    title: 'Fast Response',
    description: 'We usually answer quickly, especially for orders and payment confirmations.',
    icon: Clock3,
  },
  {
    title: 'Trusted Support',
    description: 'Questions about wallet, orders, and account access are handled with care.',
    icon: ShieldCheck,
  },
  {
    title: 'Real Assistance',
    description: 'Choose the channel that suits you best and we will guide you clearly.',
    icon: Headphones,
  },
]

export default async function ContactPage() {
  const supportContact = await getSupportContactSettings()
  const whatsappUrl = getWhatsappUrl(supportContact)
  const contactCards = [
    {
      href: whatsappUrl,
      label: 'WhatsApp',
      title: 'Chat With Support',
      description: 'Fast help for orders, wallet top-ups, and urgent account issues.',
      value: 'Open WhatsApp',
      icon: MessageCircle,
      className:
        'border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/50 hover:bg-emerald-500/15',
      iconWrap: 'bg-emerald-500/15 text-emerald-300',
      external: true,
    },
    {
      href: `mailto:${supportContact.email}`,
      label: 'Mail',
      title: 'Send An Email',
      description: 'Best for detailed issues, screenshots, and longer requests.',
      value: supportContact.email,
      icon: Mail,
      className:
        'border-cyan-500/25 bg-cyan-500/10 text-cyan-100 hover:border-cyan-400/50 hover:bg-cyan-500/15',
      iconWrap: 'bg-cyan-500/15 text-cyan-300',
    },
    {
      href: `tel:${supportContact.phoneTel}`,
      label: 'Phone',
      title: 'Call Directly',
      description: 'Reach us quickly if you prefer direct voice support.',
      value: supportContact.phoneDisplay,
      icon: Phone,
      className:
        'border-amber-500/25 bg-amber-500/10 text-amber-100 hover:border-amber-400/50 hover:bg-amber-500/15',
      iconWrap: 'bg-amber-500/15 text-amber-300',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1480px] px-4 pb-0 pt-3 sm:px-5 md:hidden">
        <MobileUserShell title="Contact" />
      </div>

      <div className="mx-auto max-w-[1480px] px-4 pb-28 pt-0 sm:px-5 lg:px-6 lg:pb-12 lg:pt-3">
        <div className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(155deg,rgba(8,15,29,0.98),rgba(4,10,22,0.98))] p-5 shadow-[0_28px_90px_rgba(2,6,23,0.28)] sm:p-6 lg:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_28%)]" />

          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_380px]">
            <section className="space-y-5">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[0_18px_50px_rgba(2,6,23,0.18)] sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.26em] text-cyan-300">Support Hub</p>
                <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                  Contact us through the channel that fits you best.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                  Whether you need help with wallet deposits, order follow-up, or account questions,
                  we kept the contact page simple, clean, and fast to use.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {contactCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <a
                      key={card.label}
                      href={card.href}
                      target={card.external ? '_blank' : undefined}
                      rel={card.external ? 'noreferrer' : undefined}
                      className={`group rounded-[28px] border p-5 shadow-[0_18px_48px_rgba(2,6,23,0.2)] transition ${card.className}`}
                    >
                      <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 ${card.iconWrap}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">{card.label}</p>
                      <h2 className="mt-2 text-xl font-bold text-white">{card.title}</h2>
                      <p className="mt-2 min-h-[66px] text-sm leading-6 text-slate-300">{card.description}</p>
                      <div className="mt-5 break-words rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm font-semibold text-white">
                        {card.value}
                      </div>
                    </a>
                  )
                })}
              </div>
            </section>

            <aside className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(9,17,31,0.98),rgba(5,10,22,1))] p-5 shadow-[0_22px_60px_rgba(2,6,23,0.22)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-300">Why Reach Us</p>
              <h2 className="mt-3 text-2xl font-black text-white">Clear help, same premium experience.</h2>

              <div className="mt-5 space-y-3">
                {supportNotes.map((note) => {
                  const Icon = note.icon
                  return (
                    <div
                      key={note.title}
                      className="rounded-[24px] border border-white/8 bg-white/[0.04] p-4"
                    >
                      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-cyan-300">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-base font-semibold text-white">{note.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{note.description}</p>
                    </div>
                  )
                })}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
