interface PageToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  children?: React.ReactNode;
}

export function PageToolbar({ search, onSearchChange, placeholder, children }: PageToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <input
        className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-blue-100 md:max-w-md"
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={search}
      />
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
