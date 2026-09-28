// src/components/ui/Card.tsx
export function Card({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      {title && <h2 className="text-lg font-bold text-gray-800 mb-4">{title}</h2>}
      {children}
    </div>
  );
}