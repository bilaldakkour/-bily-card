interface SectionTitleProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionTitle({ title, subtitle, className = '' }: SectionTitleProps) {
  return (
    <div className={`text-center mb-8 ${className}`}>
      <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="text-slate-400 max-w-2xl mx-auto text-base">
          {subtitle}
        </p>
      )}
    </div>
  )
}