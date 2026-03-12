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
    <div className="relative border-b border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-16 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-l from-blue-500/5 to-purple-500/5 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-gradient-to-r from-purple-500/5 to-pink-500/5 blur-3xl"></div>
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {breadcrumbs && (
          <nav className="mb-6">
            <ol className="flex items-center space-x-3 text-sm text-slate-400">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="mx-3 text-slate-600">/</span>}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-white font-medium">{crumb.label}</span>
                  ) : (
                    <a href={crumb.href} className="hover:text-blue-400 transition-colors duration-300 font-medium">
                      {crumb.label}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-slate-400 text-xl md:text-2xl font-medium leading-relaxed max-w-3xl">
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0 ml-8">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}