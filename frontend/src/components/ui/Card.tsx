// src/components/ui/Card.tsx
export function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-card text-card-foreground p-4 md:p-6 rounded-xl shadow-sm border border-border mb-6">
      {title && <h2 className="text-lg font-bold text-primary mb-4">{title}</h2>}
      {children}
    </div>
  );
}