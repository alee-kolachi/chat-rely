import { IsoGridPattern } from "@/components/marketing/iso-grid-pattern";
import { cn } from "@/lib/utils";

type IsoGridPanelBackgroundProps = {
  id?: string;
  className?: string;
};

export function IsoGridPanelBackground({
  id = "iso-grid-panel",
  className,
}: IsoGridPanelBackgroundProps) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 z-0 min-h-full opacity-[0.36]", className)}>
      <IsoGridPattern
        id={id}
        className="h-full w-full"
        patternScale={1}
        strokeOpacity={0.28}
        strokeWidth={0.7}
      />
    </div>
  );
}
