import { Search, CreditCard, CheckCircle } from 'lucide-react'
import { SectionTitle } from './SectionTitle'

const steps = [
  {
    icon: Search,
    title: 'Choose Product',
    description: 'Browse our wide selection of gaming top-ups, gift cards, and digital products.',
    step: '01'
  },
  {
    icon: CreditCard,
    title: 'Enter Details & Pay',
    description: 'Provide the required information and complete your secure payment.',
    step: '02'
  },
  {
    icon: CheckCircle,
    title: 'Receive Instantly',
    description: 'Get your digital product or gift card delivered instantly via email or in-game.',
    step: '03'
  }
]

export function HowItWorks() {
  return (
    <section className="py-14">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle
          title="How It Works"
          subtitle="Get your digital products in just 3 simple steps"
        />

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center group">
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 transform -translate-x-8"></div>
              )}

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="h-8 w-8 text-white" />
                </div>

                <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 border-2 border-blue-500 text-blue-400 font-bold text-sm mb-4">
                  {step.step}
                </div>

                <h3 className="text-xl font-bold text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}