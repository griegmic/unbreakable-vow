/**
 * TimelineCard — V6 witness accepted state ("WHAT HAPPENS NEXT")
 *
 * VISUAL CONTRACT (locked — do not modify without spec revision):
 *
 * Dots:
 *   - Diameter: 8px
 *   - "now" row: filled --uv-gold with 6px gold glow (box-shadow)
 *   - "future" rows: filled --uv-text-dim (no glow)
 *   - Vertical alignment: margin-top 7px (aligns with first line of text)
 *
 * Connecting lines:
 *   - No vertical connector lines between dots. Rows separated by
 *     1px dashed --uv-border-soft (matching mock's `border-top: 1px dashed var(--rule)`)
 *
 * Label typography (tl-when):
 *   - Inter Tight, 9.5px, weight 500, letter-spacing 0.18em, uppercase
 *   - "now" row: --uv-gold color
 *   - "future" rows: --uv-text-dim color
 *
 * Description typography (tl-what):
 *   - Fraunces, 14.5px, weight 400, letter-spacing -0.005em, line-height 1.35
 *   - "now" row: --uv-text color
 *   - "future" rows: --uv-text-muted color
 *
 * Card:
 *   - Background: --uv-bg-card
 *   - Border: 1px solid --uv-border-soft
 *   - Border-radius: 18px
 *   - Padding: 18px 20px
 *   - Max-width: 320px
 *
 * Section title:
 *   - Inter Tight, 9.5px, weight 500, letter-spacing 0.28em, uppercase
 *   - Color: --uv-text-dim
 *   - Margin-bottom: 14px
 *
 * Row layout:
 *   - Flex row, align-items flex-start, gap 12px, padding 8px 0
 *   - Rows after first: border-top 1px dashed --uv-border-soft
 *
 * Timeline state model:
 *   - STATIC LABELS. The timeline is a fixed 3-step template rendered
 *     once at accept time. States are 'now' (current step with gold
 *     emphasis) and 'future' (upcoming steps, dimmed).
 *   - 'past' is NOT a valid state. The timeline always represents
 *     the path forward from render time. If the witness returns to
 *     /w/[token] after the vow progresses, the S19 router catches
 *     them at a terminal state before S16 renders.
 *   - The timeline's purpose is cadence communication ("here's when
 *     we'll text you"), not progress tracking.
 */

interface TimelineStep {
  label: string;
  desc: string;
  state: 'now' | 'future';
}

interface TimelineCardProps {
  title?: string;
  steps: TimelineStep[];
}

export function TimelineCard({ title = 'What happens next', steps }: TimelineCardProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 320,
        background: 'var(--uv-bg-card)',
        border: '1px solid var(--uv-border-soft)',
        borderRadius: 18,
        padding: '18px 20px',
      }}
    >
      {/* Section title */}
      <div
        style={{
          fontFamily: 'var(--uv-font-sans)',
          fontSize: 9.5,
          fontWeight: 500,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--uv-text-dim)',
          marginBottom: 14,
        }}
      >
        {title}
      </div>

      {/* Timeline rows */}
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '8px 0',
            borderTop: i > 0 ? '1px dashed var(--uv-border-soft)' : 'none',
          }}
        >
          {/* Dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              marginTop: 7,
              background: step.state === 'now' ? 'var(--uv-gold)' : 'var(--uv-text-dim)',
              boxShadow: step.state === 'now' ? '0 0 6px var(--uv-gold)' : 'none',
            }}
          />

          {/* Text */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--uv-font-sans)',
                fontSize: 9.5,
                fontWeight: 500,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: step.state === 'now' ? 'var(--uv-gold)' : 'var(--uv-text-dim)',
                marginBottom: 2,
              }}
            >
              {step.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--uv-font-serif)',
                fontSize: 14.5,
                fontWeight: 400,
                letterSpacing: '-0.005em',
                lineHeight: 1.35,
                color: step.state === 'now' ? 'var(--uv-text)' : 'var(--uv-text-muted)',
              }}
            >
              {step.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
