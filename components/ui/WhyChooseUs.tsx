import { Truck, Shield, HeadphonesIcon, Clock } from 'lucide-react'
import { SectionTitle } from './SectionTitle'

const features = [
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Instant delivery for digital products. Physical cards delivered within 24 hours.',
    color: 'text-green-400'
  },
  {
    icon: Shield,
    title: '100% Secure',
    description: 'Bank-level security with SSL encryption. Your data and payments are always protected.',
    color: 'text-blue-400'
  },
  {
    icon: HeadphonesIcon,
    title: '24/7 Support',
    description: 'Round-the-clock customer support. Get help whenever you need it.',
    color: 'text-purple-400'
  },
  {
    icon: Clock,
    title: 'Easy Refunds',
    description: 'Hassle-free refund policy. Get your money back if you\'re not satisfied.',
    color: 'text-yellow-400'
  }
]

export function WhyChooseUs() {
  return (
    <section className="py-14 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle
          title="Why Choose Bily Card?"
          subtitle="Experience the best in digital gaming and entertainment purchases"
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group text-center p-5 rounded-2xl bg-slate-900/50 backdrop-blur border border-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20 hover:shadow-xl hover:shadow-white/5"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className={`h-8 w-8 ${feature.color}`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}