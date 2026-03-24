'use client'

import CloseBackButton from '@/components/ui/CloseBackButton'
import { useLanguage } from '@/hooks/useLanguage'

type Section = { title: string; body: string }

export default function PrivacyPolicyPage() {
  const { language, isRTL } = useLanguage()

  const copy: {
    eyebrow: string
    title: string
    sections: Section[]
  } = {
    ar: {
      eyebrow: 'قانوني',
      title: 'سياسة الخصوصية',
      sections: [
        {
          title: '1. جمع البيانات',
          body: 'في Bily Card نولي خصوصية المستخدمين أهمية كبيرة. نجمع الحد الأدنى من البيانات اللازمة لتشغيل الخدمة وتنفيذ الطلبات وتحسين التجربة.',
        },
        {
          title: '2. استخدام البيانات',
          body: 'نستخدم البيانات فقط لتقديم الخدمة، دعم المستخدم، تحسين الأداء، وحماية المنصة من الاستخدام غير المشروع.',
        },
        {
          title: '3. حماية البيانات',
          body: 'نطبق إجراءات تقنية وتنظيمية مناسبة لحماية البيانات من الوصول غير المصرح به أو التعديل أو الفقدان.',
        },
        {
          title: '4. ملفات الارتباط',
          body: 'قد نستخدم ملفات تعريف الارتباط أو تقنيات مشابهة لتحسين الأداء وفهم الاستخدام وتقديم تجربة أكثر سلاسة.',
        },
        {
          title: '5. حقوق المستخدم',
          body: 'باستخدامك للمنصة فإنك تقر بإمكانية معالجة البيانات ضمن حدود التشغيل المشروعة. في حال تحديث هذه السياسة سيتم نشر النسخة الأحدث داخل الموقع.',
        },
      ],
    },
    en: {
      eyebrow: 'Legal',
      title: 'Privacy Policy',
      sections: [
        {
          title: '1. Data Collection',
          body: 'At Bily Card, user privacy is important. We collect only the minimum data needed to operate the platform, process orders, and improve service quality.',
        },
        {
          title: '2. How We Use Data',
          body: 'We use data only for service delivery, user support, performance improvement, and platform security.',
        },
        {
          title: '3. Data Protection',
          body: 'We apply appropriate technical and organizational safeguards to protect data from unauthorized access, loss, or misuse.',
        },
        {
          title: '4. Cookies',
          body: 'We may use cookies and similar technologies to improve performance, understand usage, and provide a smoother experience.',
        },
        {
          title: '5. User Rights',
          body: 'By using the platform, you acknowledge that data may be processed for legitimate operational needs. Policy updates will be published on this page.',
        },
      ],
    },
    fr: {
      eyebrow: 'Juridique',
      title: 'Politique de confidentialité',
      sections: [
        {
          title: '1. Collecte des données',
          body: 'Chez Bily Card, la confidentialité est essentielle. Nous collectons uniquement les données nécessaires au fonctionnement du service et au traitement des commandes.',
        },
        {
          title: '2. Utilisation des données',
          body: 'Les données sont utilisées uniquement pour fournir le service, assister les utilisateurs, améliorer les performances et sécuriser la plateforme.',
        },
        {
          title: '3. Protection des données',
          body: 'Nous appliquons des mesures techniques et organisationnelles appropriées afin de protéger les données contre l’accès non autorisé, la perte ou l’usage abusif.',
        },
        {
          title: '4. Cookies',
          body: 'Nous pouvons utiliser des cookies et technologies similaires pour optimiser les performances, analyser l’utilisation et améliorer l’expérience utilisateur.',
        },
        {
          title: '5. Droits des utilisateurs',
          body: 'En utilisant la plateforme, vous acceptez le traitement des données dans le cadre opérationnel légitime. Toute mise à jour de la politique sera publiée sur cette page.',
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
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_62%)]" />

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
