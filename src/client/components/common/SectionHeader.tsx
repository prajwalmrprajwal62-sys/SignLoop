
interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionHeader({ children, className = '' }: SectionHeaderProps) {
  return (
    <p className={`text-xs font-mono font-semibold uppercase tracking-widest text-zinc-500 ${className}`}>
      {children}
    </p>
  );
}
