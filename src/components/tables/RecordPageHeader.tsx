type RecordPageHeaderProps = {
  title: string;
  description: string;
  count?: number;
  actions?: React.ReactNode;
};

export function RecordPageHeader({
  title,
  description,
  count,
  actions,
}: RecordPageHeaderProps) {
  return (
    <div className="border-b border-zinc-200 px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
          {count !== undefined && (
            <p className="mt-2 text-xs font-medium text-zinc-400">
              {count} {count === 1 ? "record" : "records"}
            </p>
          )}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </div>
  );
}
