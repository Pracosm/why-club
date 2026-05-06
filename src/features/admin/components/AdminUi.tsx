export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    neutral: "bg-slate-100 text-slate-600",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-rose-50 text-rose-700",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-slate-500">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 ${props.className ?? ""}`}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 ${props.className ?? ""}`}
    />
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </header>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-slate-950">{value}</p>
    </div>
  );
}

export function SimpleManagerShell({
  title,
  description,
  actionLabel,
  onCreate,
  list,
  editor,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onCreate: () => void;
  list: React.ReactNode;
  editor: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <AdminHeader
        title={title}
        description={description}
        action={
          <button type="button" onClick={onCreate} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
            {actionLabel}
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_30rem]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {list}
        </section>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {editor}
        </aside>
      </div>
    </div>
  );
}

export function EditorActions({
  onSave,
  onDelete,
}: {
  onSave: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onSave} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white">
        Save
      </button>
      {onDelete ? (
        <button type="button" onClick={onDelete} className="h-10 rounded-md border border-rose-200 px-4 text-sm font-semibold text-rose-700">
          Delete
        </button>
      ) : null}
    </div>
  );
}
