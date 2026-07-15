type PlaceholderPageProps = {
  title: string;
  description: string;
};

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-page-title font-semibold text-text-primary">{title}</h1>
      <p className="text-sm text-text-muted">{description}</p>
    </div>
  );
}
