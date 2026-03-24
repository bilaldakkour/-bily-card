import { Star, Quote } from 'lucide-react'
import { SectionTitle } from './SectionTitle'
import type { Testimonial } from '@/lib/data'

interface TestimonialsSectionProps {
  testimonials: Testimonial[];
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  return (
    <section className="py-14 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <SectionTitle
          title="What Our Customers Say"
          subtitle="Trusted by thousands of gamers worldwide"
        />

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="relative rounded-2xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur transition-all duration-300 hover:scale-105 hover:border-white/20 hover:shadow-xl hover:shadow-white/5"
            >
              <Quote className="mb-4 h-8 w-8 text-blue-400 opacity-50" />

              <div className="mb-4 flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>

              <blockquote className="mb-4 leading-relaxed text-slate-300">
                &ldquo;{testimonial.review}&rdquo;
              </blockquote>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-slate-400">{testimonial.product}</div>
                </div>
                {testimonial.verified && (
                  <div className="text-xs font-medium text-green-400">Verified</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
