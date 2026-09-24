
interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
}

export function GradientText({ children, className = '' }: GradientTextProps) {
  return (
    <span
      className={`bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent ${className}`}
    >
      {children}
    </span>
  );
}
