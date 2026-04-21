import { useState } from "react";

// ── Design tokens matched to existing app ──
const c = {
  bg: "#030508",
  surface: "#0A0E14",
  surfaceElevated: "#0F1319",
  border: "#1A2030",
  borderStrong: "#252D3D",
  gold: "#D4A24F",
  goldBright: "#E8C36A",
  goldDeep: "#B8862D",
  goldMuted: "rgba(212,162,79,0.10)",
  goldBorder: "rgba(212,162,79,0.25)",
  success: "#52D69A",
  successMuted: "rgba(82,214,154,0.10)",
  successBorder: "rgba(82,214,154,0.25)",
  text: "#E8E0D4",
  textSecondary: "#A09888",
  textMuted: "#6A6560",
  white: "#FFFFFF",
};

// ── Reusable components matching existing app patterns ──
const Phone = ({ children, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
    <div style={{
      width: 340, minHeight: 660, background: c.bg, borderRadius: 36,
      border: `2px solid ${c.border}`, padding: "48px 20px 28px",
      position: "relative", boxShadow: "0 24px 48px rgba(0,0,0,0.6)",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
        width: 80, height: 5, borderRadius: 3, background: c.border,
      }} />
      {children}
    </div>
    <div style={{ fontSize: 12, color: c.textSecondary, fontWeight: 600, maxWidth: 300, textAlign: "center", lineHeight: 1.4 }}>
      {label}
    </div>
  </div>
);

const GoldButton = ({ children, small, fullWidth = true }) => (
  <div style={{
    background: `linear-gradient(135deg, ${c.goldBright}, ${c.gold}, ${c.goldDeep})`,
    borderRadius: 18, padding: small ? "12px 20px" : "16px 24px",
    textAlign: "center", color: c.bg, fontWeight: 800, fontSize: small ? 14 : 15,
    cursor: "pointer", boxShadow: "0 12px 24px rgba(212,162,79,0.25)",
    letterSpacing: 0.2, width: fullWidth ? "100%" : "auto",
    minHeight: small ? 44 : 52, display: "flex", alignItems: "center", justifyContent: "center",
  }}>{children}</div>
);

const SecondaryButton = ({ children }) => (
  <div style={{
    background: c.surface, border: `1px solid ${c.borderStrong}`,
    borderRadius: 14, padding: "12px 18px",
    textAlign: "center", color: c.goldBright, fontWeight: 700, fontSize: 14,
    cursor: "pointer",
  }}>{children}</div>
);

const RitualCard = ({ children, goldLeft }) => (
  <div style={{
    background: c.surface, border: `1px solid ${goldLeft ? "transparent" : c.border}`,
    borderRadius: 16, padding: "16px 18px", position: "relative",
    borderLeft: goldLeft ? `3px solid ${c.gold}` : undefined,
  }}>{children}</div>
);

const Badge = ({ children, color, bg, border }) => (
  <div style={{
    display: "inline-flex", alignItems: "center", gap: 6,
    background: bg, border: `1px solid ${border}`,
    borderRadius: 20, padding: "5px 14px",
  }}>
    <div style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color }}>
      {children}
    </span>
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, letterSpacing: 1.3, textTransform: "uppercase",
    color: c.gold, marginBottom: 10, display: "flex", alignItems: "center", gap: 6,
  }}>
    <span>✦</span> {children}
  </div>
);

const Divider = () => <div style={{ height: 1, background: c.border, margin: "18px 0" }} />;

const TextLink = ({ children, muted }) => (
  <div style={{
    textAlign: "center", color: muted ? c.textMuted : c.textSecondary,
    fontSize: 12, cursor: "pointer", padding: "6px 0", opacity: muted ? 0.6 : 1,
  }}>{children}</div>
);

const Serif = ({ children, size = 20, style = {} }) => (
  <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: size, fontWeight: 500, ...style }}>
    {children}
  </span>
);

// ═══════════════════════════════════════════════
// SCREEN 1: WITNESS ACCEPTANCE PAGE (pending)
// Existing screen — NO changes in V1
// ═══════════════════════════════════════════════
const Screen1_WitnessAccept = () => (
  <div>
    {/* Badge */}
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: c.goldMuted, border: `1px solid ${c.goldBorder}`,
        borderRadius: 20, padding: "6px 16px",
      }}>
        <span style={{ fontSize: 14 }}>👁</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: c.gold }}>
          You're the witness
        </span>
      </div>
    </div>

    {/* Title */}
    <div style={{ textAlign: "center", marginBottom: 18 }}>
      <div style={{ color: c.white, marginBottom: 4 }}>
        <Serif size={22}>Joey made a vow.</Serif>
      </div>
      <div style={{ fontSize: 14, color: c.textSecondary, lineHeight: 1.5 }}>
        Joey put $50 on the line — and named you the judge.
      </div>
    </div>

    {/* Vow card */}
    <RitualCard>
      <SectionLabel>The vow</SectionLabel>
      <div style={{ color: c.white, marginBottom: 14, lineHeight: 1.4 }}>
        <Serif size={18}>"Do my taxes by Sunday"</Serif>
      </div>
      <div style={{ height: 1, background: c.border, margin: "12px 0" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: c.textSecondary }}>At stake</span>
          <span style={{ color: c.gold, fontWeight: 700 }}>$50</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: c.textSecondary }}>If broken</span>
          <span style={{ color: c.text }}>St. Jude's</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: c.textSecondary }}>Your verdict by</span>
          <span style={{ color: c.text }}>Sun, Apr 19</span>
        </div>
      </div>
    </RitualCard>

    <div style={{ height: 16 }} />
    <GoldButton>I'm in — I'll judge Joey honestly</GoldButton>
    <TextLink muted>I'll pass</TextLink>

    {/* Annotation */}
    <div style={{
      marginTop: 16, padding: "10px 14px", borderRadius: 10,
      border: `1px dashed ${c.textMuted}`, opacity: 0.5,
    }}>
      <div style={{ fontSize: 11, color: c.textMuted, textAlign: "center" }}>
        ↑ THIS SCREEN IS UNCHANGED IN V1
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════
// SCREEN 2: WITNESS POST-ACCEPTANCE
// This is where the V1 changes live
// ═══════════════════════════════════════════════
const Screen2_WitnessPostAccept = () => (
  <div>
    {/* Celebration — existing */}
    <div style={{ textAlign: "center", marginBottom: 14 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 28,
        background: "linear-gradient(135deg, rgba(82,214,154,0.2), rgba(82,214,154,0.08))",
        border: `2px solid rgba(82,214,154,0.3)`,
        boxShadow: "0 0 40px rgba(82,214,154,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 12px", fontSize: 22,
      }}>👁</div>
      <div style={{ color: c.white, marginBottom: 2 }}>
        <Serif size={22}>You're locked in.</Serif>
      </div>
      <div style={{ fontSize: 13, color: c.textSecondary }}>
        Joey has been notified. The vow is real now.
      </div>
    </div>

    {/* Vow quote — existing style */}
    <RitualCard goldLeft>
      <div style={{ color: c.white, lineHeight: 1.4, marginBottom: 6 }}>
        <Serif size={16}>"Do my taxes by Sunday"</Serif>
      </div>
      <div style={{ fontSize: 12, color: c.textMuted }}>
        <span style={{ color: c.gold }}>$50 at stake</span> · St. Jude's if broken
      </div>
    </RitualCard>

    {/* ═══ NEW: Spectator pledge nudge ═══ */}
    <div style={{
      background: c.goldMuted, border: `1px solid ${c.goldBorder}`,
      borderRadius: 16, padding: "16px 18px", marginTop: 14,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.55, marginBottom: 4 }}>
        Want to back Joey yourself?
      </div>
      <div style={{ fontSize: 12, color: c.textSecondary, lineHeight: 1.5, marginBottom: 14 }}>
        Pledge to charity if he pulls it off.
        <br />Only charged if he keeps his vow.
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {["$5", "$10", "$20"].map((amt, i) => (
          <div key={amt} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, textAlign: "center",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            background: i === 1 ? c.goldMuted : "transparent",
            border: `1px solid ${i === 1 ? c.goldBorder : c.border}`,
            color: i === 1 ? c.gold : c.textMuted,
          }}>{amt}</div>
        ))}
      </div>
      <GoldButton small>Back Joey — $10 to St. Jude's</GoldButton>
      <div style={{ height: 8 }} />
      <TextLink>Skip</TextLink>
    </div>

    {/* ═══ NEW: Share nudge ═══ */}
    <div style={{ textAlign: "center", marginTop: 16 }}>
      <div style={{ fontSize: 13, color: c.textSecondary, lineHeight: 1.5, marginBottom: 10 }}>
        Friends can pledge too — want to
        <br />loop them in?
      </div>
      <SecondaryButton>Send to friends</SecondaryButton>
    </div>

    <Divider />

    {/* Existing: time-based CTA */}
    <GoldButton small>Send Joey a message</GoldButton>

    <div style={{ height: 10 }} />

    {/* Existing: reciprocal CTA */}
    <SecondaryButton>
      Your move — make a vow and pick Joey to judge you
    </SecondaryButton>
  </div>
);

// ═══════════════════════════════════════════════
// SCREEN 3: SMS/iMESSAGE TO SPECTATOR
// What the friend sees in their group chat
// ═══════════════════════════════════════════════
const Screen3_TextToSpectator = () => (
  <div>
    {/* iMessage header */}
    <div style={{ textAlign: "center", marginBottom: 20 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 22, background: "#34C759",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 6px", fontSize: 18, color: c.white, fontWeight: 700,
      }}>M</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: c.white }}>Mikey</div>
      <div style={{ fontSize: 11, color: c.textMuted }}>iMessage · Group "The Boys"</div>
    </div>

    {/* Context message from earlier */}
    <div style={{
      background: "#2C2C2E", borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px", maxWidth: "75%", alignSelf: "flex-start", marginBottom: 8,
    }}>
      <div style={{ fontSize: 14, color: c.white }}>anyone doing anything sunday</div>
    </div>

    {/* Witness's share message */}
    <div style={{
      background: "#1C8AFF", borderRadius: "18px 18px 4px 18px",
      padding: "12px 16px", maxWidth: "85%", alignSelf: "flex-end", marginLeft: "auto",
      marginBottom: 4,
    }}>
      <div style={{ fontSize: 14, color: c.white, lineHeight: 1.5 }}>
        Joey just put $50 on the line that he'll do his taxes by Sunday 😂 I'm his witness
      </div>
    </div>

    {/* Link preview */}
    <div style={{
      background: "#2C2C2E", borderRadius: "14px 14px 4px 14px",
      overflow: "hidden", maxWidth: "85%", alignSelf: "flex-end", marginLeft: "auto",
      marginBottom: 6, border: `1px solid #3A3A3E`,
    }}>
      {/* Preview image area */}
      <div style={{
        background: "linear-gradient(135deg, #0A0E14, #151B26)",
        padding: "16px 14px", borderBottom: `1px solid #3A3A3E`,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 10, color: c.gold, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
          👁 Unbreakable Vow
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: c.white, fontFamily: "Georgia, serif" }}>
          "Do my taxes by Sunday"
        </div>
        <div style={{ fontSize: 12, color: c.gold, marginTop: 4 }}>$50 on the line</div>
      </div>
      <div style={{ padding: "8px 14px" }}>
        <div style={{ fontSize: 10, color: "#8E8E93", textTransform: "uppercase", letterSpacing: 0.5 }}>
          unbreakablevow.app
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: c.white, marginTop: 2 }}>
          Back Joey — pledge to charity if he pulls it off
        </div>
      </div>
    </div>
    <div style={{ fontSize: 10, color: c.textMuted, textAlign: "right", marginBottom: 16 }}>
      2:34 PM
    </div>

    {/* Friend reactions */}
    <div style={{
      background: "#2C2C2E", borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px", maxWidth: "65%", marginBottom: 6,
    }}>
      <div style={{ fontSize: 14, color: c.white }}>lmaooo no shot</div>
    </div>
    <div style={{
      background: "#2C2C2E", borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px", maxWidth: "70%", marginBottom: 6,
    }}>
      <div style={{ fontSize: 14, color: c.white }}>wait this is real?? 😂</div>
    </div>
    <div style={{
      background: "#2C2C2E", borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px", maxWidth: "60%", marginBottom: 6,
    }}>
      <div style={{ fontSize: 14, color: c.white }}>I just backed him $5</div>
    </div>

    {/* Annotation */}
    <div style={{
      marginTop: 16, padding: "10px 14px", borderRadius: 10,
      background: "rgba(212,162,79,0.06)", border: `1px solid ${c.goldBorder}`,
    }}>
      <div style={{ fontSize: 11, color: c.textSecondary, lineHeight: 1.5 }}>
        <span style={{ color: c.gold, fontWeight: 700 }}>Note:</span> The witness's share text is pre-loaded via native share sheet. They can edit it. The link preview is generated from OG meta tags on the pledge page.
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════
// SCREEN 4: SPECTATOR ARRIVAL (pledge page)
// Web page — no app required
// ═══════════════════════════════════════════════
const Screen4_SpectatorArrival = () => (
  <div>
    {/* Minimal brand */}
    <div style={{ textAlign: "center", marginBottom: 6 }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "4px 12px", borderRadius: 12,
        fontSize: 10, color: c.textMuted, letterSpacing: 1, textTransform: "uppercase",
      }}>
        👁 Unbreakable Vow
      </div>
    </div>

    {/* Vow */}
    <div style={{ textAlign: "center", marginBottom: 4 }}>
      <div style={{ fontSize: 13, color: c.textSecondary, marginBottom: 4 }}>Joey vowed to</div>
      <div style={{ color: c.white, lineHeight: 1.35, padding: "0 8px" }}>
        <Serif size={20}>"Do my taxes by Sunday"</Serif>
      </div>
    </div>

    {/* Stakes */}
    <div style={{
      display: "flex", justifyContent: "center", gap: 8, margin: "12px 0",
      fontSize: 12, color: c.textSecondary,
    }}>
      <span style={{ color: c.gold, fontWeight: 700 }}>$50 on the line</span>
      <span>→ St. Jude's</span>
    </div>

    {/* Progress */}
    <div style={{ marginBottom: 14 }}>
      <div style={{ height: 3, background: c.border, borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: "60%", height: "100%", background: c.gold, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 11, color: c.textMuted, textAlign: "center" }}>Day 3 of 5</div>
    </div>

    {/* Social proof — only shows if > 0 */}
    <div style={{
      display: "flex", justifyContent: "center", gap: 6, marginBottom: 16,
    }}>
      <div style={{
        background: c.successMuted, border: `1px solid ${c.successBorder}`,
        borderRadius: 20, padding: "4px 12px", fontSize: 12, color: c.success, fontWeight: 600,
      }}>3 friends backed · $25</div>
    </div>

    <Divider />

    {/* CTA */}
    <div style={{ textAlign: "center", marginBottom: 14 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: c.text, marginBottom: 4 }}>
        Back Joey
      </div>
      <div style={{ fontSize: 13, color: c.textSecondary, lineHeight: 1.5 }}>
        Pledge to charity if he keeps his vow.
        <br />
        <span style={{ color: c.textMuted }}>Only charged if he succeeds.</span>
      </div>
    </div>

    {/* Amount chips */}
    <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      {["$5", "$10", "$20"].map((amt, i) => (
        <div key={amt} style={{
          flex: 1, padding: "10px 0", borderRadius: 12, textAlign: "center",
          fontSize: 15, fontWeight: 700, cursor: "pointer",
          background: i === 1 ? c.goldMuted : "transparent",
          border: `2px solid ${i === 1 ? c.goldBorder : c.border}`,
          color: i === 1 ? c.gold : c.textMuted,
        }}>{amt}</div>
      ))}
    </div>

    {/* Apple Pay */}
    <div style={{
      background: c.white, borderRadius: 14, padding: "14px 20px",
      textAlign: "center", color: "#000", fontWeight: 700, fontSize: 16,
      cursor: "pointer", marginBottom: 8,
    }}>
       Pay
    </div>

    <div style={{ textAlign: "center", fontSize: 12, color: c.textMuted, marginBottom: 14 }}>
      or pay with card
    </div>

    {/* Disclaimer */}
    <div style={{
      fontSize: 11, color: c.textMuted, textAlign: "center", lineHeight: 1.5,
      padding: "0 12px",
    }}>
      This is a donation to St. Jude's. You're only charged
      if Joey keeps his vow. If he doesn't, you pay nothing.
    </div>
  </div>
);

// ═══════════════════════════════════════════════
// SCREEN 5: SPECTATOR POST-PLEDGE
// Confirmation + reshare + phone capture
// ═══════════════════════════════════════════════
const Screen5_SpectatorPostPledge = () => (
  <div>
    {/* Confirmation */}
    <div style={{ textAlign: "center", marginBottom: 4 }}>
      <div style={{
        width: 52, height: 52, borderRadius: 26,
        background: c.successMuted, border: `2px solid ${c.successBorder}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 12px", fontSize: 22, color: c.success,
      }}>✓</div>
      <div style={{ color: c.white, marginBottom: 4 }}>
        <Serif size={20}>You backed Joey.</Serif>
      </div>
      <div style={{ fontSize: 13, color: c.textSecondary, lineHeight: 1.5, padding: "0 16px" }}>
        If he keeps his vow, your $10 goes to
        <br />St. Jude's. We'll let you know.
      </div>
    </div>

    {/* Phone capture */}
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: c.textSecondary, marginBottom: 6 }}>
        Get the verdict by text
      </div>
      <div style={{
        background: c.surface, border: `1px solid ${c.border}`,
        borderRadius: 12, padding: "12px 14px", color: c.textMuted, fontSize: 14,
      }}>
        Your phone number
      </div>
      <div style={{ height: 8 }} />
      <GoldButton small>Notify me</GoldButton>
    </div>

    <Divider />

    {/* Reshare */}
    <div style={{
      background: c.goldMuted, border: `1px solid ${c.goldBorder}`,
      borderRadius: 14, padding: "16px", textAlign: "center",
    }}>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.5, marginBottom: 10 }}>
        Get more friends to back Joey —
        <br />the more pledges, the more to charity.
      </div>
      <SecondaryButton>Send to friends</SecondaryButton>
    </div>

    <Divider />

    {/* App install — soft */}
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, color: c.textSecondary, marginBottom: 10 }}>
        Make a vow of your own
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {["App Store", "Play Store"].map(store => (
          <div key={store} style={{
            background: c.surface, border: `1px solid ${c.border}`, borderRadius: 10,
            padding: "8px 20px", fontSize: 12, color: c.text, fontWeight: 600,
          }}>{store}</div>
        ))}
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════
// SCREEN 6: MAKER'S VIEW (vow detail)
// Existing screen + minimal additions
// ═══════════════════════════════════════════════
const Screen6_MakerView = () => (
  <div>
    <div style={{ fontSize: 13, color: c.textSecondary, marginBottom: 10 }}>← Back</div>

    {/* Vow text — existing */}
    <div style={{ color: c.white, marginBottom: 10, lineHeight: 1.35 }}>
      <Serif size={20}>"Do my taxes by Sunday"</Serif>
    </div>

    {/* Status + stake — existing */}
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
      <Badge color={c.success} bg={c.successMuted} border={c.successBorder}>Active</Badge>
      <span style={{ fontSize: 12, color: c.gold }}>$50 → St. Jude's</span>
    </div>

    {/* Progress bar — existing */}
    <div style={{ marginBottom: 16 }}>
      <div style={{ height: 4, background: c.border, borderRadius: 2, overflow: "hidden", marginBottom: 5 }}>
        <div style={{ width: "60%", height: "100%", background: c.gold, borderRadius: 2 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: c.textMuted }}>
        <span>Day 3 of 5</span>
        <span>Verdict: Apr 17</span>
      </div>
    </div>

    {/* People section — existing */}
    <RitualCard>
      <SectionLabel>People</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: c.text }}>You</span>
          <span style={{ color: c.textMuted }}>Maker</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: c.text }}>Mikey</span>
          <span style={{ color: c.success, fontSize: 12 }}>✓ Witness</span>
        </div>
      </div>
    </RitualCard>

    {/* ═══ NEW: Backers section ═══ */}
    {/* Only renders when pledges > 0 */}
    <div style={{
      background: c.goldMuted, border: `1px solid ${c.goldBorder}`,
      borderRadius: 16, padding: "14px 18px", marginTop: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: c.gold }}>
          ✦ Backers
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: c.white }}>$45</span>
      </div>
      <div style={{ fontSize: 12, color: c.textSecondary, marginBottom: 10 }}>
        5 friends pledged to St. Jude's if you succeed
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        {["Sarah $10", "Alex $5", "Jordan $20", "Priya $5", "Marcus $5"].map(p => (
          <span key={p} style={{
            background: "rgba(212,162,79,0.08)", border: `1px solid rgba(212,162,79,0.15)`,
            borderRadius: 20, padding: "3px 10px", fontSize: 11, color: c.text,
          }}>{p}</span>
        ))}
      </div>
    </div>

    <div style={{ height: 12 }} />

    {/* Check-in buttons — existing */}
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {["On track", "Struggling", "Done early"].map((label, i) => (
        <div key={label} style={{
          flex: 1, background: c.surface, border: `1px solid ${c.border}`,
          borderRadius: 10, padding: "8px 4px", textAlign: "center",
          fontSize: 11, color: i === 0 ? c.success : c.textSecondary, fontWeight: 600,
        }}>{label}</div>
      ))}
    </div>

    {/* Actions — existing buttons, one text change */}
    <GoldButton small>Get friends involved</GoldButton>
    <div style={{ height: 6 }} />
    <SecondaryButton>Text Mikey</SecondaryButton>
  </div>
);

// ═══════════════════════════════════════════════
// PANEL NOTES COMPONENT
// ═══════════════════════════════════════════════
const PanelNotes = ({ screen }) => {
  const notes = {
    1: {
      title: "Screen 1: Witness Acceptance (Unchanged)",
      shreyas: "Don't touch what works. The witness acceptance rate is a core metric. Any change here risks it for zero upside — the spectator mechanic doesn't need to exist at the acceptance decision point.",
      julie: "The witness is making a serious choice — judging a friend honestly. This is not the moment to introduce pledging or sharing. Emotional context: gravity, trust. Let them feel that.",
      nikita: "Agreed. Don't mess with conversion on the funnel step that's already working. The magic happens AFTER they accept.",
      soren: "If it ain't broke, ship something else.",
    },
    2: {
      title: "Screen 2: Post-Acceptance (Where V1 Lives)",
      shreyas: "Two new elements on one existing screen. The pledge card lets the witness put skin in the game at peak investment. The share nudge sits below — secondary to pledging but available. This is correct hierarchy: personal commitment first, social expansion second.",
      julie: "The pledge card sits between the celebration and the existing CTAs. It's a gold card — visually distinct, clearly optional. 'Skip' is prominent. The share nudge is even softer — just a line of text with a button. Neither blocks the existing 'Send Joey a message' or reciprocal CTA below.",
      nikita: "I wanted the share nudge higher but Julie's right — the witness who just accepted is more likely to pledge $10 themselves than to share. Get their money first, then ask them to recruit. 'Send to friends' is the correct button text — implies group chat, not broadcast.",
      soren: "'Want to back Joey yourself?' — that's the energy. It's a question, not a demand. The witness feels like they're choosing to go deeper, not being upsold.",
    },
    3: {
      title: "Screen 3: SMS to Spectator",
      shreyas: "The witness's own words carry more weight than any app-generated text. The pre-loaded share text should sound like the witness, not like marketing. Notice: no mention of the app name in the message itself. It's about Joey.",
      julie: "The link preview does the heavy lifting. It shows the vow, the stakes, and the CTA — the witness doesn't need to explain anything. Their message is just context and personality.",
      nikita: "The link preview text 'Back Joey — pledge to charity if he pulls it off' is the only copy that matters on this entire screen. It needs to be intriguing enough to tap. 'Back Joey' is personal — it's about the friend, not the product.",
      soren: "The group chat reactions sell it. 'lmaooo no shot' followed by 'I just backed him $5' — that's the social proof loop in two messages. You can't design that, but you can make it easy to happen.",
    },
    4: {
      title: "Screen 4: Spectator Arrives",
      shreyas: "One concept: back Joey with a pledge to charity. That's the entire page. No app explanation, no onboarding, no account creation. The spectator should be done in 20 seconds.",
      julie: "Hierarchy: Who (Joey), What (his vow), Stakes ($50), Social proof (3 friends backed), Action (pick amount, Apple Pay). Eyes flow top to bottom and arrive at the payment button without detours. The disclaimer is at the bottom — present but not anxious.",
      nikita: "The $10 default is correct — it's the 'obviously fine' amount. $5 feels cheap, $20 feels considered. $10 is impulse-buy territory. Apple Pay means one tap after choosing amount. Two decisions total: amount and confirm.",
      soren: "The white Apple Pay button is the only bright element on a dark page. Your eye goes straight to it. That's not an accident.",
    },
    5: {
      title: "Screen 5: Spectator Post-Pledge",
      shreyas: "Three things in priority order: confirm the pledge, capture the phone for verdict notification, enable reshare. The phone capture is the bridge to the verdict notification — without it, the spectator disappears.",
      julie: "'You backed Joey' — past tense, it's done, you're part of this now. The phone field is soft — 'Get the verdict by text' frames it as something they WANT, not something we need. The reshare sits in its own gold card below the fold. It's there for the 20% who are social connectors.",
      nikita: "The reshare copy 'Get more friends to back Joey — the more pledges, the more to charity' gives a WHY. Not 'share this' (what's in it for me?) but 'more pledges = more charity' (collective impact). For V1 this is fine. V2 we add the believe/doubt tally here and reshare doubles.",
      soren: "'Send to friends' appears twice in the flow — once on the witness screen, once here. Same button, same text, same energy. Consistency is kindness.",
    },
    6: {
      title: "Screen 6: Maker's View",
      shreyas: "One new section. Everything else is identical. The 'Backers' card only appears when pledges exist — if nobody has pledged, this screen is exactly what it is today. That's the right call. Don't show an empty state that makes the maker feel like nobody cares.",
      julie: "The backers section sits between 'People' and 'Check-in buttons' — it's contextually grouped with the social information. Gold card draws the eye without dominating. Individual names + amounts create warmth — these aren't anonymous donors, they're Sarah and Alex and Jordan.",
      nikita: "The one button change — 'Share your vow' becomes 'Get friends involved' — is the only maker-side change that matters for growth. Same button, same position, new copy that implies participation rather than broadcast. The pledge link is now the share destination.",
      soren: "'$45 pledged to St. Jude's if you succeed' — if you succeed. Three words doing all the emotional work. Not 'pledged for your vow' (abstract) but 'if you succeed' (personal, conditional, motivating).",
    },
  };

  const n = notes[screen];
  if (!n) return null;

  return (
    <div style={{
      maxWidth: 540, margin: "24px auto 0",
      background: c.surface, border: `1px solid ${c.border}`,
      borderRadius: 16, padding: "20px 22px", lineHeight: 1.6,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: c.gold, marginBottom: 14 }}>
        {n.title}
      </div>
      {[
        { name: "Shreyas", text: n.shreyas },
        { name: "Julie", text: n.julie },
        { name: "Nikita", text: n.nikita },
        { name: "Soren", text: n.soren },
      ].map(({ name, text }) => (
        <div key={name} style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: c.goldBright, letterSpacing: 0.5 }}>
            {name}:
          </span>
          <span style={{ fontSize: 13, color: c.text, marginLeft: 6 }}>{text}</span>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════
export default function SpectatorV1() {
  const [screen, setScreen] = useState(1);

  const screens = [
    { id: 1, label: "Witness Accepts", sub: "Unchanged", color: c.textMuted },
    { id: 2, label: "Post-Accept", sub: "V1 changes", color: c.gold },
    { id: 3, label: "SMS Invite", sub: "Group chat", color: c.gold },
    { id: 4, label: "Spectator Lands", sub: "Pledge page", color: c.gold },
    { id: 5, label: "Post-Pledge", sub: "Reshare", color: c.gold },
    { id: 6, label: "Maker Sees", sub: "Minimal adds", color: c.gold },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#060606",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: "28px 12px",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: c.white, letterSpacing: -0.3 }}>
          Spectator Pledge — V1 Screens
        </div>
        <div style={{ fontSize: 13, color: c.textSecondary, marginTop: 4 }}>
          6 screens · Nikita-scoped · Ship in 2 weeks
        </div>
      </div>

      {/* Screen selector */}
      <div style={{
        display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8,
        marginBottom: 24, WebkitOverflowScrolling: "touch",
      }}>
        {screens.map(s => (
          <button
            key={s.id}
            onClick={() => setScreen(s.id)}
            style={{
              flexShrink: 0,
              background: screen === s.id ? c.goldMuted : "transparent",
              border: `1px solid ${screen === s.id ? c.goldBorder : c.border}`,
              borderRadius: 12, padding: "10px 16px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              outline: "none", minWidth: 100,
            }}
          >
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: screen === s.id ? c.gold : c.textMuted,
              whiteSpace: "nowrap",
            }}>
              {s.id}. {s.label}
            </span>
            <span style={{
              fontSize: 10,
              color: screen === s.id ? s.color : c.textMuted,
              fontWeight: screen === s.id ? 600 : 400,
            }}>
              {s.sub}
            </span>
          </button>
        ))}
      </div>

      {/* Phone */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {screen === 1 && (
          <Phone label="Existing witness invite — no changes in V1">
            <Screen1_WitnessAccept />
          </Phone>
        )}
        {screen === 2 && (
          <Phone label="Witness pledges + invites spectators after accepting">
            <Screen2_WitnessPostAccept />
          </Phone>
        )}
        {screen === 3 && (
          <Phone label="What spectators see in their group chat">
            <Screen3_TextToSpectator />
          </Phone>
        )}
        {screen === 4 && (
          <Phone label="Spectator taps link — pledge page, no app needed">
            <Screen4_SpectatorArrival />
          </Phone>
        )}
        {screen === 5 && (
          <Phone label="After pledging — confirmation, phone capture, reshare">
            <Screen5_SpectatorPostPledge />
          </Phone>
        )}
        {screen === 6 && (
          <Phone label="Maker's vow detail — 'Backers' section only if pledges exist">
            <Screen6_MakerView />
          </Phone>
        )}
      </div>

      {/* Panel notes */}
      <PanelNotes screen={screen} />

      {/* Build scope summary */}
      <div style={{
        maxWidth: 540, margin: "28px auto 0",
        background: c.surface, border: `1px solid ${c.border}`,
        borderRadius: 16, padding: "20px 22px",
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.white, marginBottom: 12 }}>
          V1 Build Scope
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: c.text }}>
          {[
            { label: "Changed", value: "Screen 2 (witness post-accept): add pledge card + share nudge", color: c.gold },
            { label: "Changed", value: "Screen 6 (maker vow detail): add Backers section, change share button text", color: c.gold },
            { label: "New page", value: "Screen 4 (/p/[token]): spectator pledge page (web)", color: c.goldBright },
            { label: "New page", value: "Screen 5 (/p/[token]/confirmed): post-pledge + reshare (web)", color: c.goldBright },
            { label: "New", value: "OG meta tags for pledge page link previews", color: c.textSecondary },
            { label: "New", value: "Edge functions: create-pledge, process-pledges", color: c.textSecondary },
            { label: "New", value: "DB: pledges table, share_token on vows", color: c.textSecondary },
            { label: "Unchanged", value: "Screen 1 (witness accept), all maker creation flows, verdict flow", color: c.textMuted },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                color: item.color, minWidth: 65, paddingTop: 2,
              }}>{item.label}</span>
              <span style={{ color: c.textSecondary }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
