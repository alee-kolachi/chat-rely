import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** When true, description is not max-width capped (e.g. index intros). */
  descriptionWide?: boolean;
  className?: string;
};

export function PageHeader({ title, description, descriptionWide, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)}>
      <h1 className="ds-app-page-title">{title}</h1>
      {description ? (
        <p
          className={cn("ds-app-page-description", descriptionWide && "ds-app-page-description--wide")}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
