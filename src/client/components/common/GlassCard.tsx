
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={`backdrop-blur-xl rounded-2xl ${className}`}
      style={{
        background: 'rgba(30, 41, 59, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
      }}
    >
      {children}
    </div>
  );
}
