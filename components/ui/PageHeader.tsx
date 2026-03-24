import Link from 'next/link'

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{
    label: string;
    href: string;
  }>;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, action }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-5 sm:py-6">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-gradient-to-l from-[#2e5bff]/12 to-[#7e57ff]/10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-gradient-to-r from-[#7e57ff]/10 to-[#d4a940]/10 blur-3xl"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {breadcrumbs && (
          <nav className="mb-2.5">
            <ol className="flex flex-wrap items-center gap-y-1 text-xs sm:text-sm text-slate-400">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2 text-slate-600 sm:mx-3">/</span>}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-white">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="font-medium transition-colors duration-300 hover:text-[#d4a940]">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-xl font-black leading-tight text-white sm:text-2xl lg:text-[2rem]">
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-3xl text-xs font-medium leading-relaxed text-slate-400 sm:text-sm lg:text-base">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="shrink-0 sm:ml-6">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
