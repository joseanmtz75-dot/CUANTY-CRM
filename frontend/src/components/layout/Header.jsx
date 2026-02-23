export default function Header({ title, children }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-6 h-14 shrink-0">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center gap-4">
        {children}
      </div>
    </header>
  );
}
