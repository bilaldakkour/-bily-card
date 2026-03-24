import Link from 'next/link'
import CloseBackButton from '@/components/ui/CloseBackButton'

export default function AboutPage() {
  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#020617,#030f24_55%,#020617)] px-4 pb-16 pt-20 sm:px-6 md:pt-16">
      <CloseBackButton />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_62%)]" />

      <main className="relative mx-auto max-w-4xl">
        <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_54px_rgba(2,6,23,0.28)] sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Bily Card</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">من نحن</h1>
          <p className="mt-5 text-sm leading-8 text-slate-200 sm:text-base">
            Bily Card هي منصة رقمية احترافية متخصصة في توفير المنتجات الرقمية، شحن الألعاب، والخدمات الإلكترونية بسرعة وموثوقية عالية. نعمل على تقديم تجربة استخدام حديثة وآمنة وسلسة، تتيح للمستخدم الوصول إلى ما يحتاجه بسهولة، مع واجهة واضحة، تنفيذ سريع، وتركيز دائم على الجودة والثقة.
          </p>
          <p className="mt-4 text-sm leading-8 text-slate-200 sm:text-base">
            نؤمن أن تجربة المستخدم لا تقل أهمية عن جودة الخدمة نفسها، لذلك نسعى إلى بناء منصة تجمع بين السرعة، الأمان، سهولة الاستخدام، والتصميم الاحترافي. هدفنا هو أن تكون Bily Card الخيار الموثوق لكل من يبحث عن متجر رقمي عملي، منظم، ومتطور يخدم احتياجات الألعاب والخدمات الرقمية بكفاءة عالية.
          </p>
        </section>

        <section className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_54px_rgba(2,6,23,0.24)] sm:p-8">
          <h2 className="text-xl font-bold text-white">قيمنا الأساسية</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-cyan-300/16 bg-cyan-500/10 p-4 text-sm font-semibold text-slate-100">السرعة في التنفيذ</div>
            <div className="rounded-2xl border border-emerald-300/16 bg-emerald-500/10 p-4 text-sm font-semibold text-slate-100">الثقة والأمان</div>
            <div className="rounded-2xl border border-violet-300/16 bg-violet-500/10 p-4 text-sm font-semibold text-slate-100">تجربة مستخدم احترافية</div>
          </div>
        </section>

        <div className="mt-6 text-center">
          <Link href="/products" className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-500/12 px-5 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/18">
            تصفح المنتجات
          </Link>
        </div>
      </main>
    </div>
  )
}
