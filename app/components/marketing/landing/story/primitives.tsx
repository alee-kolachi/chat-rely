import { STORY, STORY_STROKE } from "@/components/marketing/landing/story/tokens";

type Point = { x: number; y: number };

/** Recurring ChatRely widget used in every scene so the page reads as one story. */
export function StoryWidget({
  x,
  y,
  w = 132,
  h = 168,
  dimmed = false,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  dimmed?: boolean;
}) {
  const bodyFill = dimmed ? STORY.cream : STORY.white;
  const headerFill = dimmed ? "rgba(26,26,26,0.35)" : STORY.orange;

  return (
    <g transform={`translate(${x} ${y})`} opacity={dimmed ? 0.55 : 1}>
      <rect x={0} y={0} width={w} height={h} rx={18} fill={bodyFill} stroke={STORY.strokeStrong} strokeWidth={STORY_STROKE} />
      <rect x={0} y={0} width={w} height={34} rx={18} fill={headerFill} />
      <rect x={0} y={18} width={w} height={16} fill={headerFill} />
      <circle cx={22} cy={17} r={7} fill={dimmed ? STORY.cream : STORY.white} opacity={0.9} />
      <rect x={38} y={12} width={52} height={10} rx={5} fill={dimmed ? STORY.cream : STORY.white} opacity={0.85} />
      <rect x={14} y={48} width={w - 28} height={10} rx={5} fill={STORY.orangeSoft} />
      <rect x={14} y={66} width={w - 52} height={8} rx={4} fill={STORY.stroke} />
      <rect x={14} y={82} width={w - 40} height={8} rx={4} fill={STORY.stroke} />
      <rect x={w - 78} y={104} width={64} height={36} rx={12} fill={dimmed ? STORY.stroke : STORY.orange} opacity={dimmed ? 0.35 : 0.18} />
      <rect x={w - 72} y={110} width={52} height={8} rx={4} fill={dimmed ? STORY.inkMuted : STORY.orange} opacity={0.55} />
      <rect x={w - 72} y={124} width={40} height={6} rx={3} fill={dimmed ? STORY.inkMuted : STORY.orange} opacity={0.35} />
      <rect x={12} y={h - 36} width={w - 24} height={24} rx={12} fill={STORY.cream} stroke={STORY.stroke} strokeWidth={STORY_STROKE} />
    </g>
  );
}

export function StoryStorefront({ x, y, w = 200, h = 120 }: Point & { w?: number; h?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M 8 28 L ${w / 2} 8 L ${w - 8} 28 L ${w - 8} ${h} L 8 ${h} Z`}
        fill={STORY.white}
        stroke={STORY.strokeStrong}
        strokeWidth={STORY_STROKE}
        strokeLinejoin="round"
      />
      <rect x={24} y={44} width={44} height={52} rx={6} fill={STORY.blue} opacity={0.55} stroke={STORY.stroke} strokeWidth={STORY_STROKE} />
      <rect x={78} y={44} width={44} height={52} rx={6} fill={STORY.yellow} opacity={0.7} stroke={STORY.stroke} strokeWidth={STORY_STROKE} />
      <rect x={132} y={44} width={44} height={52} rx={6} fill={STORY.coral} opacity={0.55} stroke={STORY.stroke} strokeWidth={STORY_STROKE} />
      <rect x={w / 2 - 28} y={h - 22} width={56} height={14} rx={7} fill={STORY.ink} opacity={0.08} />
    </g>
  );
}

export function StoryShopifyMark({ x, y, size = 36 }: Point & { size?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={size} height={size} rx={10} fill={STORY.ink} opacity={0.92} />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fill={STORY.white}
        fontSize={size * 0.52}
        fontWeight={700}
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      >
        S
      </text>
    </g>
  );
}

export function StoryCard({
  x,
  y,
  w,
  h,
  fill,
  label,
}: Point & { w: number; h: number; fill: string; label?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={14} fill={fill} stroke={STORY.stroke} strokeWidth={STORY_STROKE} />
      {label ? (
        <>
          <rect x={12} y={14} width={w - 24} height={8} rx={4} fill={STORY.strokeStrong} opacity={0.35} />
          <rect x={12} y={30} width={w - 40} height={6} rx={3} fill={STORY.stroke} />
          <text x={12} y={h - 14} fill={STORY.inkMuted} fontSize={10} fontFamily="var(--font-geist-sans), system-ui, sans-serif">
            {label}
          </text>
        </>
      ) : (
        <>
          <rect x={12} y={14} width={w - 24} height={8} rx={4} fill={STORY.strokeStrong} opacity={0.3} />
          <rect x={12} y={30} width={w - 36} height={6} rx={3} fill={STORY.stroke} />
          <rect x={12} y={44} width={w - 48} height={6} rx={3} fill={STORY.stroke} />
        </>
      )}
    </g>
  );
}

export function StoryConnector({ from, to }: { from: Point; to: Point }) {
  const midX = (from.x + to.x) / 2;
  return (
    <path
      d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
      stroke={STORY.orange}
      strokeWidth={STORY_STROKE}
      strokeDasharray="5 4"
      opacity={0.65}
    />
  );
}

export function StoryStatBadge({
  x,
  y,
  value,
  caption,
}: Point & { value: string; caption: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={148} height={72} rx={16} fill="rgba(255,255,255,0.42)" stroke={STORY.stroke} strokeWidth={STORY_STROKE} />
      <text
        x={16}
        y={34}
        fill={STORY.ink}
        fontSize={30}
        fontWeight={700}
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      >
        {value}
      </text>
      <text
        x={16}
        y={56}
        fill={STORY.inkMuted}
        fontSize={11}
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      >
        {caption}
      </text>
    </g>
  );
}

export function StoryGridBackdrop() {
  return (
    <g opacity={0.35}>
      {[0, 1, 2, 3, 4].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={24 + col * 64}
            y={24 + row * 64}
            width={56}
            height={56}
            rx={8}
            fill="none"
            stroke={STORY.stroke}
            strokeWidth={1}
          />
        )),
      )}
    </g>
  );
}
