type PageHeaderProps = {
  title: string;
  description?: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <h1 className="text-ds-on-surface text-2xl font-semibold tracking-tight">
        {title}
      </h1>
      {description ? (
        <p className="text-ds-on-surface-variant mt-1 text-sm">
          {description}
        </p>
      ) : null}
    </div>
  );
}
