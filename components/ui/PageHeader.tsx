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
    <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-8 sm:py-10">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-gradient-to-l from-blue-500/5 to-purple-500/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-gradient-to-r from-purple-500/5 to-pink-500/5 blur-3xl"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {breadcrumbs && (
          <nav className="mb-4">
            <ol className="flex flex-wrap items-center gap-y-1 text-xs sm:text-sm text-slate-400">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2 text-slate-600 sm:mx-3">/</span>}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-white">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="font-medium transition-colors duration-300 hover:text-blue-400">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2.5">
            <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="max-w-3xl text-sm font-medium leading-relaxed text-slate-400 sm:text-base lg:text-lg">
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
