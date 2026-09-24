
interface MonoLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function MonoLabel({ children, className = '' }: MonoLabelProps) {
  return (
    <span className={`font-mono text-xs text-cyan-400 ${className}`}>
      {children}
    </span>
  );
}
