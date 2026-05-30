const ISO_PATH =
  "M69.212 40H46.118L34.57 20 46.118 0h23.094l11.547 20zM57.665 60H34.57L23.023 40 34.57 20h23.095l11.547 20zm0-40H34.57L23.023 0 34.57-20h23.095L69.212 0zM34.57 60H11.476L-.07 40l11.547-20h23.095l11.547 20zm0-40H11.476L-.07 0l11.547-20h23.095L46.118 0zM23.023 40H-.07l-11.547-20L-.07 0h23.094L34.57 20z";

type IsoGridPatternProps = {
  className?: string;
  id?: string;
  preserveAspectRatio?: string;
  /** Lower values = smaller cells. Default `2` matches landing hero. */
  patternScale?: number;
  strokeOpacity?: number;
  strokeWidth?: number;
};

export function IsoGridPattern({
  className,
  id = "iso-grid-pattern",
  preserveAspectRatio = "xMidYMid slice",
  patternScale = 2,
  strokeOpacity = 0.22,
  strokeWidth = 0.75,
}: IsoGridPatternProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio={preserveAspectRatio}
    >
      <defs>
        <pattern
          id={id}
          width="69.141"
          height="40"
          patternTransform={`scale(${patternScale})`}
          patternUnits="userSpaceOnUse"
        >
          <path fill="none" stroke="#8a05ff" strokeOpacity={strokeOpacity} strokeWidth={strokeWidth} d={ISO_PATH} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
