import { StoryCanvas } from "@/components/marketing/landing/story/story-canvas";
import {
  StoryCard,
  StoryConnector,
  StoryGridBackdrop,
  StoryShopifyMark,
  StoryStatBadge,
  StoryStorefront,
  StoryWidget,
} from "@/components/marketing/landing/story/primitives";
import { STORY } from "@/components/marketing/landing/story/tokens";

type SceneProps = { className?: string };

/** Scene 1: Widget grounded in knowledge sources. */
export function StorySceneAccurate({ className }: SceneProps) {
  return (
    <StoryCanvas label="Support widget pulling answers from indexed knowledge" className={className}>
      <StoryGridBackdrop />
      <StoryCard x={32} y={48} w={96} h={72} fill={STORY.yellow} label="Policy" />
      <StoryCard x={32} y={136} w={96} h={72} fill={STORY.blue} label="FAQ" />
      <StoryConnector from={{ x: 128, y: 84 }} to={{ x: 168, y: 132 }} />
      <StoryConnector from={{ x: 128, y: 172 }} to={{ x: 168, y: 148 }} />
      <StoryWidget x={168} y={72} />
      <circle cx={158} cy={132} r={10} fill={STORY.orange} opacity={0.2} />
      <path
        d="M 154 132 L 158 136 L 166 126"
        stroke={STORY.orange}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <StoryStatBadge x={196} y={248} value="80+" caption="CSAT on grounded replies" />
    </StoryCanvas>
  );
}

/** Scene 2: Widget connected to live Shopify catalog. */
export function StorySceneShopify({ className }: SceneProps) {
  return (
    <StoryCanvas label="Support widget connected to live Shopify store data" className={className}>
      <StoryGridBackdrop />
      <StoryStorefront x={36} y={196} w={168} h={100} />
      <StoryShopifyMark x={52} y={52} size={40} />
      <StoryConnector from={{ x: 92, y: 92 }} to={{ x: 168, y: 120 }} />
      <StoryWidget x={188} y={64} />
      <StoryCard x={208} y={208} w={112} h={64} fill={STORY.coral} />
      <rect x={220} y={220} width={36} height={36} rx={8} fill={STORY.white} stroke={STORY.stroke} strokeWidth={1.25} />
      <rect x={262} y={226} width={48} height={8} rx={4} fill={STORY.stroke} />
      <StoryStatBadge x={32} y={248} value="52%" caption="resolution rate on day one" />
    </StoryCanvas>
  );
}

/** Scene 3: Thread flows from widget to merchant ticket. */
export function StorySceneHandoff({ className }: SceneProps) {
  return (
    <StoryCanvas label="Chat thread handed off to merchant inbox with full context" className={className}>
      <StoryGridBackdrop />
      <StoryWidget x={48} y={88} />
      <StoryConnector from={{ x: 180, y: 160 }} to={{ x: 212, y: 120 }} />
      <StoryCard x={212} y={72} w={116} h={140} fill={STORY.blue} label="Ticket" />
      <rect x={224} y={108} width={88} height={6} rx={3} fill={STORY.stroke} />
      <rect x={224} y={122} width={72} height={6} rx={3} fill={STORY.stroke} />
      <rect x={224} y={136} width={80} height={6} rx={3} fill={STORY.stroke} />
      <rect x={224} y={150} width={64} height={6} rx={3} fill={STORY.stroke} />
      <StoryStatBadge x={48} y={248} value="100%" caption="transcript preserved" />
    </StoryCanvas>
  );
}

/** Comparison center: crossfade between static FAQ doc and live widget. */
export function StorySceneComparison({
  className,
  chatrelyAmount,
}: SceneProps & { chatrelyAmount: number }) {
  const typicalOpacity = 1 - chatrelyAmount;
  const chatrelyOpacity = chatrelyAmount;

  return (
    <StoryCanvas label="Static FAQ bot versus ChatRely on live store data" className={className}>
      <g style={{ opacity: typicalOpacity }} transform={`translate(0, ${(1 - typicalOpacity) * 12})`}>
        <StoryCard x={72} y={64} w={216} h={200} fill={STORY.cream} />
        <text
          x={96}
          y={108}
          fill={STORY.inkMuted}
          fontSize={13}
          fontWeight={600}
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          Static FAQ
        </text>
        <rect x={96} y={124} width={168} height={8} rx={4} fill={STORY.stroke} />
        <rect x={96} y={142} width={140} height={8} rx={4} fill={STORY.stroke} />
        <rect x={96} y={160} width={152} height={8} rx={4} fill={STORY.stroke} />
        <rect x={96} y={178} width={120} height={8} rx={4} fill={STORY.stroke} />
        <StoryWidget x={108} y={208} w={120} h={120} dimmed />
      </g>
      <g style={{ opacity: chatrelyOpacity }} transform={`translate(0, ${(1 - chatrelyOpacity) * -12})`}>
        <StoryWidget x={108} y={72} />
        <StoryStorefront x={56} y={228} w={140} h={80} />
        <StoryShopifyMark x={248} y={248} size={32} />
        <StoryCard x={228} y={88} w={100} h={56} fill={STORY.yellow} />
      </g>
    </StoryCanvas>
  );
}

/** Customer story: CSAT lift chart + same widget motif. */
export function StorySceneCsatLift({ className }: SceneProps) {
  return (
    <StoryCanvas label="Higher CSAT on order-status chats with ChatRely" className={className}>
      <rect x={40} y={56} width={200} height={140} rx={20} fill={STORY.white} stroke={STORY.strokeStrong} strokeWidth={1.25} />
      <text
        x={56}
        y={88}
        fill={STORY.inkMuted}
        fontSize={11}
        fontFamily="var(--font-geist-sans), system-ui, sans-serif"
      >
        CSAT · order chats
      </text>
      <rect x={72} y={148} width={36} height={36} rx={8} fill={STORY.stroke} opacity={0.45} />
      <rect x={120} y={124} width={36} height={60} rx={8} fill={STORY.orange} opacity={0.35} />
      <rect x={168} y={108} width={36} height={76} rx={8} fill={STORY.orange} />
      <text x={168} y={100} fill={STORY.ink} fontSize={12} fontWeight={700} fontFamily="var(--font-geist-sans), system-ui, sans-serif">
        77%
      </text>
      <text x={72} y={100} fill={STORY.inkMuted} fontSize={12} fontFamily="var(--font-geist-sans), system-ui, sans-serif">
        61%
      </text>
      <StoryWidget x={248} y={168} w={96} h={128} />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M ${56 + i * 18} 44 L ${58 + i * 18} 48 L ${62 + i * 18} 40 Z`}
          fill={STORY.orange}
          opacity={0.85}
        />
      ))}
    </StoryCanvas>
  );
}

/** Trust: grounded data flows into widget (tuned for dark section backgrounds). */
export function StorySceneTrust({ className }: SceneProps) {
  return (
    <StoryCanvas label="Knowledge and Shopify data flowing into a grounded widget" className={className}>
      <g opacity={0.2}>
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <rect
              key={`t-${row}-${col}`}
              x={40 + col * 72}
              y={32 + row * 72}
              width={64}
              height={64}
              rx={10}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
            />
          )),
        )}
      </g>
      <StoryWidget x={114} y={88} />
      <StoryCard x={32} y={72} w={72} h={56} fill={STORY.yellow} />
      <StoryCard x={256} y={72} w={72} h={56} fill={STORY.blue} />
      <StoryShopifyMark x={272} y={148} size={28} />
      <StoryConnector from={{ x: 104, y: 100 }} to={{ x: 114, y: 120 }} />
      <StoryConnector from={{ x: 256, y: 100 }} to={{ x: 246, y: 120 }} />
      <path
        d="M 168 56 L 184 72 L 200 56 L 184 40 Z"
        fill={STORY.orange}
        opacity={0.45}
        stroke={STORY.orange}
        strokeWidth={1.25}
      />
      <path
        d="M 176 64 L 184 72 L 192 64"
        stroke={STORY.orange}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x={72} y={248} width={216} height={48} rx={14} fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth={1.25} />
      <rect x={88} y={262} width={80} height={8} rx={4} fill="rgba(255,255,255,0.35)" />
      <rect x={176} y={262} width={96} height={8} rx={4} fill={STORY.orange} opacity={0.75} />
    </StoryCanvas>
  );
}

export type StoryPostCoverVariant = "shopify" | "playground" | "resolution" | "knowledge";

/** Editorial cover thumbnails for guides (same system, different chapter). */
export function StoryPostCover({ variant, className }: { variant: StoryPostCoverVariant; className?: string }) {
  return (
    <StoryCanvas label={`Guide cover: ${variant}`} className={className}>
      <StoryGridBackdrop />
      {variant === "shopify" ? (
        <>
          <StoryShopifyMark x={148} y={120} size={56} />
          <StoryConnector from={{ x: 176, y: 176 }} to={{ x: 176, y: 200 }} />
          <StoryWidget x={114} y={200} w={132} h={120} />
        </>
      ) : null}
      {variant === "playground" ? (
        <>
          <rect x={64} y={80} width={232} height={160} rx={20} fill={STORY.white} stroke={STORY.strokeStrong} strokeWidth={1.25} />
          <StoryWidget x={96} y={104} w={108} h={128} />
          <rect x={220} y={120} width={56} height={8} rx={4} fill={STORY.orange} opacity={0.5} />
          <rect x={220} y={136} width={44} height={8} rx={4} fill={STORY.stroke} />
        </>
      ) : null}
      {variant === "resolution" ? (
        <>
          <StoryWidget x={114} y={72} />
          <circle cx={180} cy={220} r={48} fill={STORY.orangeSoft} />
          <path d="M 168 220 L 178 232 L 200 208" stroke={STORY.orange} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {variant === "knowledge" ? (
        <>
          <StoryCard x={48} y={96} w={88} h={72} fill={STORY.yellow} label="Docs" />
          <StoryCard x={48} y={184} w={88} h={72} fill={STORY.blue} label="URLs" />
          <StoryConnector from={{ x: 136, y: 132 }} to={{ x: 168, y: 148 }} />
          <StoryWidget x={168} y={108} />
        </>
      ) : null}
    </StoryCanvas>
  );
}

/** CTA: storefront goes live with widget on the page. */
export function StorySceneLaunch({ className }: SceneProps) {
  return (
    <StoryCanvas label="Shopify storefront with ChatRely widget live on site" className={className}>
      <StoryGridBackdrop />
      <StoryStorefront x={40} y={168} w={200} h={120} />
      <StoryWidget x={220} y={56} />
      <StoryShopifyMark x={56} y={56} size={36} />
      <path
        d="M 92 74 L 220 100"
        stroke={STORY.orange}
        strokeWidth={1.25}
        strokeDasharray="6 5"
        opacity={0.6}
      />
      <rect x={248} y={248} width={72} height={28} rx={14} fill={STORY.ink} opacity={0.08} />
      <rect x={260} y={258} width={48} height={8} rx={4} fill={STORY.orange} opacity={0.65} />
    </StoryCanvas>
  );
}
