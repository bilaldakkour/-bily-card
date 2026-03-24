'use client'

import CloseBackButton from '@/components/ui/CloseBackButton'
import { useLanguage } from '@/hooks/useLanguage'

type Section = { title: string; body: string }

export default function TermsPage() {
  const { language, isRTL } = useLanguage()

  const copy: {
    eyebrow: string
    title: string
    sections: Section[]
  } = {
    ar: {
      eyebrow: 'قانوني',
      title: 'شروط الخدمة',
      sections: [
        {
          title: '1. شروط الاستخدام',
          body: 'باستخدام منصة Bily Card فإنك توافق على الالتزام بشروط الخدمة والأحكام المعمول بها داخل الموقع. يجب استخدام المنصة بطريقة قانونية ومسؤولة وعدم إساءة استخدامها.',
        },
        {
          title: '2. مسؤولية المستخدم',
          body: 'أنت مسؤول عن إدخال البيانات المطلوبة بشكل صحيح والتأكد من صحة معلومات الطلب قبل إتمامه.',
        },
        {
          title: '3. الطلبات والمدفوعات',
          body: 'جميع الطلبات والمدفوعات تخضع لسياسات التشغيل والتوفر والمراجعة داخل المنصة. تحتفظ Bily Card بحق مراجعة أو رفض أي طلب عند وجود أسباب تشغيلية أو أمنية.',
        },
        {
          title: '4. توفر الخدمات',
          body: 'نوفر منتجات وخدمات رقمية حسب المعروض داخل المنصة، وقد تختلف آلية التنفيذ أو التوفر بحسب نوع المنتج.',
        },
        {
          title: '5. تعديلات الشروط',
          body: 'تحتفظ المنصة بحق تعديل أو تحديث هذه الشروط في أي وقت، ويعد استمرار استخدامك للموقع موافقة على النسخة الأحدث.',
        },
        {
          title: '6. حدود المسؤولية',
          body: 'نسعى لتقديم خدمة مستقرة وموثوقة، لكننا لا نتحمل المسؤولية عن الأضرار الناتجة عن سوء الاستخدام أو الإدخال الخاطئ للبيانات أو ظروف خارجة عن السيطرة.',
        },
      ],
    },
    en: {
      eyebrow: 'Legal',
      title: 'Terms of Service',
      sections: [
        {
          title: '1. Use of the Service',
          body: 'By using Bily Card, you agree to follow these Terms of Service and applicable platform policies. You must use the platform legally and responsibly.',
        },
        {
          title: '2. User Responsibility',
          body: 'You are responsible for entering accurate order details and reviewing all information before confirming any order.',
        },
        {
          title: '3. Orders and Payments',
          body: 'All orders and payments are subject to operational checks, availability, and internal review. Bily Card may review or reject orders for operational or security reasons.',
        },
        {
          title: '4. Service Availability',
          body: 'Digital products and services are provided based on current platform availability. Fulfillment method and timing may vary by product type.',
        },
        {
          title: '5. Changes to Terms',
          body: 'We may update these Terms at any time. Continued use of the platform means you accept the latest version.',
        },
        {
          title: '6. Limitation of Liability',
          body: 'We aim to provide a stable and reliable service, but we are not liable for misuse, incorrect user-provided data, or events outside our control.',
        },
      ],
    },
    fr: {
      eyebrow: 'Juridique',
      title: 'Conditions d’utilisation',
      sections: [
        {
          title: '1. Utilisation du service',
          body: 'En utilisant Bily Card, vous acceptez ces conditions et les politiques applicables. La plateforme doit être utilisée de manière légale et responsable.',
        },
        {
          title: '2. Responsabilité de l’utilisateur',
          body: 'Vous êtes responsable de la saisie correcte des informations et de la vérification des détails avant validation de toute commande.',
        },
        {
          title: '3. Commandes et paiements',
          body: 'Toutes les commandes et paiements sont soumis à des contrôles opérationnels, à la disponibilité et à la revue interne. Bily Card peut refuser une commande pour des raisons opérationnelles ou de sécurité.',
        },
        {
          title: '4. Disponibilité des services',
          body: 'Les produits et services numériques sont fournis selon la disponibilité de la plateforme. Le mode et le délai de livraison peuvent varier selon le produit.',
        },
        {
          title: '5. Modifications des conditions',
          body: 'Nous pouvons modifier ces conditions à tout moment. L’utilisation continue de la plateforme vaut acceptation de la dernière version.',
        },
        {
          title: '6. Limitation de responsabilité',
          body: 'Nous faisons de notre mieux pour offrir un service fiable, mais nous ne sommes pas responsables d’un mauvais usage, de données incorrectes fournies par l’utilisateur, ou d’événements hors de notre contrôle.',
        },
      ],
    },
  }[language]

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="relative min-h-screen bg-[linear-gradient(180deg,#020617,#030f24_55%,#020617)] px-4 pb-16 pt-20 sm:px-6 md:pt-16"
    >
      <CloseBackButton />
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.18),transparent_62%)]" />

      <main className="relative mx-auto max-w-4xl rounded-[26px] border border-white/10 bg-white/[0.03] p-6 shadow-[0_20px_54px_rgba(2,6,23,0.28)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">{copy.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-black text-white sm:text-4xl">{copy.title}</h1>

        <div className="mt-6 space-y-6 text-sm leading-8 text-slate-200 sm:text-base">
          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-white">{section.title}</h2>
              <p className="mt-2">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
