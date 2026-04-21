import { useState } from "react";

const c = {
  bg: "#030508",
  card: "#0C1117",
  border: "#1A2030",
  gold: "#D4A24F",
  goldDim: "rgba(212,162,79,0.12)",
  goldBorder: "rgba(212,162,79,0.25)",
  green: "#4ADE80",
  greenDim: "rgba(74,222,128,0.10)",
  greenBorder: "rgba(74,222,128,0.25)",
  blue: "#60A5FA",
  blueDim: "rgba(96,165,250,0.10)",
  blueBorder: "rgba(96,165,250,0.25)",
  red: "#F87171",
  redDim: "rgba(248,113,113,0.10)",
  redBorder: "rgba(248,113,113,0.25)",
  text: "#E8E0D4",
  muted: "#8A8579",
  dim: "#5A564F",
  white: "#FFF",
};

// ── Shared components ──
const Phone = ({ children, label, sublabel }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
    <div style={{
      width: 310, minHeight: 620, background: c.bg, borderRadius: 32,
      border: `2px solid ${c.border}`, padding: "44px 18px 28px",
      position: "relative", boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
    }}>
      <div style={{
        position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
        width: 72, height: 5, borderRadius: 3, background: c.border,
      }} />
      {children}
    </div>
    <span style={{ fontSize: 12, color: c.gold, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
    {sublabel && <span style={{ fontSize: 11, color: c.dim, marginTop: -4 }}>{sublabel}</span>}
  </div>
);

const Btn = ({ children, gold, outline, small, color }) => (
  <div style={{
    background: gold ? `linear-gradient(135deg, #E8C36A, ${c.gold}, #B8862D)` : outline ? "transparent" : c.card,
    border: gold ? "none" : `1px solid ${outline ? (color || c.border) : c.border}`,
    borderRadius: 12, padding: small ? "9px 16px" : "13px 20px",
    textAlign: "center", fontWeight: 700, fontSize: small ? 13 : 14,
    color: gold ? c.bg : (color || c.text), cursor: "pointer",
    boxShadow: gold ? "0 6px 16px rgba(212,162,79,0.2)" : "none",
  }}>{children}</div>
);

const Chip = ({ children, selected, color, bg, border }) => (
  <div style={{
    background: selected ? (bg || c.goldDim) : "transparent",
    border: `1px solid ${selected ? (border || c.goldBorder) : c.border}`,
    borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: 600,
    color: selected ? (color || c.gold) : c.muted, cursor: "pointer",
    textAlign: "center", flex: 1,
  }}>{children}</div>
);

const Tag = ({ children }) => (
  <div style={{
    position: "absolute", top: -10, left: 16, background: c.bg,
    padding: "2px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 1,
    color: c.gold, textTransform: "uppercase", borderRadius: 4,
    border: `1px solid ${c.goldBorder}`,
  }}>{children}</div>
);

const Sep = () => <div style={{ height: 1, background: c.border, margin: "16px 0" }} />;

const Check = () => (
  <div style={{
    width: 44, height: 44, borderRadius: 22, background: c.greenDim,
    border: `2px solid ${c.greenBorder}`, display: "flex", alignItems: "center",
    justifyContent: "center", margin: "0 auto 10px", fontSize: 20, color: c.green,
  }}>✓</div>
);

// ═══════════════════════════════════════
// SMS BUBBLE (iMessage style)
// ═══════════════════════════════════════
const SMSBubble = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {/* iMessage header */}
    <div style={{ textAlign: "center", marginBottom: 14 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 20, background: "#34C759",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 6px", fontSize: 16, color: c.white, fontWeight: 700,
      }}>M</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: c.white }}>Mikey</div>
      <div style={{ fontSize: 11, color: c.dim }}>iMessage</div>
    </div>

    {/* Message bubble */}
    <div style={{
      background: "#1C8AFF", borderRadius: "18px 18px 4px 18px",
      padding: "12px 16px", maxWidth: "88%", alignSelf: "flex-end",
      marginBottom: 6,
    }}>
      <div style={{ fontSize: 14, color: c.white, lineHeight: 1.5 }}>
        Joey put $50 on the line — he's vowing to do his taxes by Sunday or the money goes to St. Jude's 😂
      </div>
    </div>
    <div style={{
      background: "#1C8AFF", borderRadius: "18px 18px 4px 18px",
      padding: "12px 16px", maxWidth: "88%", alignSelf: "flex-end",
      marginBottom: 4,
    }}>
      <div style={{ fontSize: 14, color: c.white, lineHeight: 1.5 }}>
        Back him or call BS — pledge a few bucks to charity either way 👀
      </div>
    </div>

    {/* Link preview */}
    <div style={{
      background: "#2A2A2E", borderRadius: "14px 14px 4px 14px",
      overflow: "hidden", maxWidth: "88%", alignSelf: "flex-end",
      marginBottom: 6, border: `1px solid #3A3A3E`,
    }}>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 10, color: "#8E8E93", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>
          unbreakablevow.app
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: c.white, marginBottom: 3 }}>
          Joey's Vow: Do my taxes by Sunday
        </div>
        <div style={{ fontSize: 12, color: "#8E8E93" }}>
          $50 on the line · 3 friends have backed him
        </div>
      </div>
    </div>

    <div style={{ fontSize: 10, color: c.dim, textAlign: "right", marginBottom: 16 }}>
      2:34 PM
    </div>

    {/* Group chat reactions */}
    <div style={{
      background: "#2A2A2E", borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px", maxWidth: "70%", alignSelf: "flex-start", marginBottom: 6,
    }}>
      <div style={{ fontSize: 14, color: c.white }}>lmao no way he's doing this</div>
    </div>
    <div style={{
      background: "#2A2A2E", borderRadius: "18px 18px 18px 4px",
      padding: "10px 14px", maxWidth: "60%", alignSelf: "flex-start",
    }}>
      <div style={{ fontSize: 14, color: c.white }}>I just pledged $5 😂</div>
    </div>
  </div>
);

// ═══════════════════════════════════════
// VARIANT A: "Back Joey" — success only, simple
// ═══════════════════════════════════════
const WitnessVariantA = () => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <Check />
    <div style={{ textAlign: "center", marginBottom: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: c.white, fontFamily: "Georgia, serif" }}>
        You're locked in.
      </div>
    </div>

    {/* Pledge + share card */}
    <div style={{
      background: c.goldDim, border: `1px solid ${c.goldBorder}`,
      borderRadius: 14, padding: "16px 16px 14px", marginBottom: 14,
      position: "relative",
    }}>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.5, marginBottom: 12, textAlign: "center" }}>
        Back Joey with a pledge to charity?
        <br />
        <span style={{ fontSize: 12, color: c.muted }}>
          Only charged if he actually does it.
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <Chip>$5</Chip>
        <Chip selected>$10</Chip>
        <Chip>$20</Chip>
      </div>
      <Btn gold small>Back Joey — $10 to St. Jude's</Btn>
      <div style={{ textAlign: "center", fontSize: 12, color: c.muted, marginTop: 10 }}>
        or just spread the word →
      </div>
    </div>

    {/* Vow preview (compact) */}
    <div style={{
      background: c.card, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: "12px 14px", marginBottom: 12,
    }}>
      <div style={{ fontSize: 15, color: c.white, fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 6 }}>
        "Do my taxes by Sunday"
      </div>
      <div style={{ fontSize: 11, color: c.muted }}>
        <span style={{ color: c.gold }}>$50 at stake</span> → St. Jude's · Day 1 of 5
      </div>
    </div>

    <Btn small>Check in on Joey</Btn>
  </div>
);

// ═══════════════════════════════════════
// VARIANT B: "Believe / Doubt" — spectator chooses
// ═══════════════════════════════════════
const WitnessVariantB = () => {
  const [side, setSide] = useState("believe");
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Check />
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: c.white, fontFamily: "Georgia, serif" }}>
          You're locked in.
        </div>
      </div>

      {/* Believe/Doubt card */}
      <div style={{
        background: c.card, border: `1px solid ${c.border}`,
        borderRadius: 14, padding: "16px 16px 14px", marginBottom: 14,
      }}>
        <div style={{ fontSize: 14, color: c.text, textAlign: "center", marginBottom: 12 }}>
          Think Joey will actually do it?
        </div>

        {/* Toggle */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <div onClick={() => setSide("believe")} style={{
            flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
            background: side === "believe" ? c.greenDim : "transparent",
            border: `1px solid ${side === "believe" ? c.greenBorder : c.border}`,
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>👊</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: side === "believe" ? c.green : c.muted }}>
              Believe
            </div>
            <div style={{ fontSize: 10, color: c.dim, marginTop: 2 }}>
              Donate if he does it
            </div>
          </div>
          <div onClick={() => setSide("doubt")} style={{
            flex: 1, padding: "10px 8px", borderRadius: 10, textAlign: "center", cursor: "pointer",
            background: side === "doubt" ? c.redDim : "transparent",
            border: `1px solid ${side === "doubt" ? c.redBorder : c.border}`,
          }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>😏</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: side === "doubt" ? c.red : c.muted }}>
              Doubt
            </div>
            <div style={{ fontSize: 10, color: c.dim, marginTop: 2 }}>
              Donate if he doesn't
            </div>
          </div>
        </div>

        {/* Amount */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          <Chip>$5</Chip>
          <Chip selected
            color={side === "believe" ? c.green : c.red}
            bg={side === "believe" ? c.greenDim : c.redDim}
            border={side === "believe" ? c.greenBorder : c.redBorder}
          >$10</Chip>
          <Chip>$20</Chip>
        </div>

        <Btn gold small>
          {side === "believe"
            ? "I believe — $10 to St. Jude's if he does it"
            : "I doubt it — $10 to St. Jude's if he doesn't"
          }
        </Btn>

        <div style={{ textAlign: "center", fontSize: 11, color: c.muted, marginTop: 8 }}>
          Either way, charity wins. Not charged unless triggered.
        </div>
      </div>

      {/* Share nudge */}
      <div style={{
        textAlign: "center", padding: "0 8px", marginBottom: 14,
      }}>
        <div style={{ fontSize: 13, color: c.muted, marginBottom: 8 }}>
          Get friends to weigh in too
        </div>
        <Btn small outline>Send to friends</Btn>
      </div>

      {/* Vow preview */}
      <div style={{
        background: c.card, border: `1px solid ${c.border}`, borderRadius: 12,
        padding: "12px 14px",
      }}>
        <div style={{ fontSize: 15, color: c.white, fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 6 }}>
          "Do my taxes by Sunday"
        </div>
        <div style={{ fontSize: 11, color: c.muted }}>
          <span style={{ color: c.gold }}>$50 at stake</span> → St. Jude's · Day 1 of 5
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
// VARIANT C: Ultra-minimal — just the nudge + share
// ═══════════════════════════════════════
const WitnessVariantC = () => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <Check />
    <div style={{ textAlign: "center", marginBottom: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: c.white, fontFamily: "Georgia, serif" }}>
        You're locked in.
      </div>
    </div>

    {/* Vow card */}
    <div style={{
      background: c.card, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: "14px 16px", marginBottom: 14,
    }}>
      <div style={{ fontSize: 16, color: c.white, fontFamily: "Georgia, serif", fontStyle: "italic", marginBottom: 8 }}>
        "Do my taxes by Sunday"
      </div>
      <div style={{ display: "flex", gap: 10, fontSize: 12, color: c.muted }}>
        <span style={{ color: c.gold }}>$50 at stake</span>
        <span>→ St. Jude's</span>
        <span>· Day 1 of 5</span>
      </div>
    </div>

    {/* Simple share nudge */}
    <div style={{
      background: c.goldDim, border: `1px solid ${c.goldBorder}`,
      borderRadius: 14, padding: "16px", textAlign: "center", marginBottom: 14,
    }}>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.5, marginBottom: 12 }}>
        Friends can pledge to charity if Joey
        <br />pulls it off — want to loop them in?
      </div>
      <Btn gold small>Send to friends</Btn>
      <div style={{ fontSize: 12, color: c.muted, marginTop: 8 }}>Not now</div>
    </div>

    <Btn small>Check in on Joey</Btn>

    <div style={{ textAlign: "center", fontSize: 12, color: c.muted, marginTop: 14, lineHeight: 1.5 }}>
      Your move — make a vow and
      <br />pick Joey to judge you
    </div>
  </div>
);

// ═══════════════════════════════════════
// SPECTATOR LANDING PAGE (from link)
// ═══════════════════════════════════════
const SpectatorLanding = () => {
  const [side, setSide] = useState("believe");
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Minimal brand */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: c.dim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 14 }}>
          👁 Unbreakable Vow
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: c.white, fontFamily: "Georgia, serif", lineHeight: 1.35 }}>
          Joey vowed to
          <br />do his taxes by Sunday
        </div>
      </div>

      {/* Stakes info */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 8, marginBottom: 16,
        fontSize: 12, color: c.muted,
      }}>
        <span style={{ color: c.gold, fontWeight: 600 }}>$50 on the line</span>
        <span>→ St. Jude's</span>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 3, background: c.border, borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
          <div style={{ width: "60%", height: "100%", background: c.gold, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 11, color: c.dim, textAlign: "center" }}>Day 3 of 5</div>
      </div>

      {/* Social proof */}
      <div style={{
        display: "flex", justifyContent: "center", gap: 12, marginBottom: 18,
        fontSize: 12,
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ color: c.green, fontWeight: 700, fontSize: 16 }}>5</div>
          <div style={{ color: c.muted }}>believe</div>
        </div>
        <div style={{ width: 1, background: c.border }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: c.red, fontWeight: 700, fontSize: 16 }}>2</div>
          <div style={{ color: c.muted }}>doubt</div>
        </div>
        <div style={{ width: 1, background: c.border }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ color: c.gold, fontWeight: 700, fontSize: 16 }}>$45</div>
          <div style={{ color: c.muted }}>pledged</div>
        </div>
      </div>

      <Sep />

      {/* Believe / Doubt choice */}
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: c.text }}>
          Think he'll do it?
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div onClick={() => setSide("believe")} style={{
          flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer",
          background: side === "believe" ? c.greenDim : "transparent",
          border: `2px solid ${side === "believe" ? c.greenBorder : c.border}`,
          transition: "all 0.15s",
        }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>👊</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: side === "believe" ? c.green : c.muted }}>
            Believe
          </div>
          <div style={{ fontSize: 10, color: c.dim, marginTop: 3, lineHeight: 1.3 }}>
            Donate if he
            <br />keeps his vow
          </div>
        </div>
        <div onClick={() => setSide("doubt")} style={{
          flex: 1, padding: "12px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer",
          background: side === "doubt" ? c.redDim : "transparent",
          border: `2px solid ${side === "doubt" ? c.redBorder : c.border}`,
          transition: "all 0.15s",
        }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>😏</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: side === "doubt" ? c.red : c.muted }}>
            Doubt
          </div>
          <div style={{ fontSize: 10, color: c.dim, marginTop: 3, lineHeight: 1.3 }}>
            Donate if he
            <br />breaks his vow
          </div>
        </div>
      </div>

      {/* Amount chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <Chip>$5</Chip>
        <Chip selected
          color={side === "believe" ? c.green : c.red}
          bg={side === "believe" ? c.greenDim : c.redDim}
          border={side === "believe" ? c.greenBorder : c.redBorder}
        >$10</Chip>
        <Chip>$20</Chip>
      </div>

      <Btn gold>
        {side === "believe" ? "👊 I believe — $10 to charity" : "😏 I doubt it — $10 to charity"}
      </Btn>

      <div style={{ textAlign: "center", fontSize: 11, color: c.dim, marginTop: 10, lineHeight: 1.5 }}>
        This is a donation to St. Jude's. You're only
        <br />charged if your pick is right. Either way, charity wins.
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
// SPECTATOR CONFIRMED + RESHARE
// ═══════════════════════════════════════
const SpectatorConfirmedReshare = () => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <Check />
    <div style={{ textAlign: "center", marginBottom: 4 }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: c.white, fontFamily: "Georgia, serif", marginBottom: 4 }}>
        You're in.
      </div>
      <div style={{
        display: "inline-block", background: c.greenDim, border: `1px solid ${c.greenBorder}`,
        borderRadius: 20, padding: "4px 14px", fontSize: 12, color: c.green, fontWeight: 600,
      }}>
        👊 Believe — $10
      </div>
    </div>

    <div style={{ textAlign: "center", fontSize: 13, color: c.muted, lineHeight: 1.5, margin: "10px 0" }}>
      If Joey keeps his vow, your $10
      <br />goes to St. Jude's.
    </div>

    {/* Phone capture */}
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, color: c.muted, marginBottom: 5 }}>Text me the verdict</div>
      <div style={{
        background: c.card, border: `1px solid ${c.border}`,
        borderRadius: 10, padding: "11px 14px", color: c.dim, fontSize: 13,
      }}>Your phone number</div>
    </div>

    <Sep />

    {/* Live tally */}
    <div style={{
      background: c.card, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: "14px 16px", marginBottom: 14,
    }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, marginBottom: 10 }}>
        The crowd so far
      </div>
      <div style={{ display: "flex", gap: 0, marginBottom: 8 }}>
        <div style={{
          width: "71%", height: 6, background: c.green, borderRadius: "3px 0 0 3px",
        }} />
        <div style={{
          width: "29%", height: 6, background: c.red, borderRadius: "0 3px 3px 0",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: c.green }}>👊 5 believe · $35</span>
        <span style={{ color: c.red }}>😏 2 doubt · $15</span>
      </div>
    </div>

    {/* Reshare */}
    <div style={{
      background: c.goldDim, border: `1px solid ${c.goldBorder}`,
      borderRadius: 14, padding: "16px", textAlign: "center", marginBottom: 14,
    }}>
      <div style={{ fontSize: 14, color: c.text, lineHeight: 1.5, marginBottom: 10 }}>
        Get more friends to weigh in —
        <br />believe or doubt?
      </div>
      <Btn gold small>Send to friends</Btn>
    </div>

    {/* Soft app CTA */}
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, color: c.muted, marginBottom: 8 }}>Make a vow of your own</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <div style={{
          background: c.card, border: `1px solid ${c.border}`, borderRadius: 8,
          padding: "6px 16px", fontSize: 12, color: c.text,
        }}>App Store</div>
        <div style={{
          background: c.card, border: `1px solid ${c.border}`, borderRadius: 8,
          padding: "6px 16px", fontSize: 12, color: c.text,
        }}>Play Store</div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════
// MAKER VIEW (with believe/doubt tallies)
// ═══════════════════════════════════════
const MakerWithTally = () => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <div style={{ fontSize: 12, color: c.muted, marginBottom: 8 }}>← Back</div>
    <div style={{
      fontSize: 18, fontWeight: 700, color: c.white, fontFamily: "Georgia, serif",
      marginBottom: 8, lineHeight: 1.35,
    }}>
      "Do my taxes by Sunday"
    </div>
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
      <div style={{
        background: c.greenDim, border: `1px solid ${c.greenBorder}`, borderRadius: 20,
        padding: "3px 10px", fontSize: 11, color: c.green, fontWeight: 600,
      }}>● Active</div>
      <span style={{ fontSize: 11, color: c.gold }}>$50 → St. Jude's</span>
    </div>

    {/* Progress */}
    <div style={{ marginBottom: 14 }}>
      <div style={{ height: 3, background: c.border, borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
        <div style={{ width: "60%", height: "100%", background: c.gold, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 11, color: c.muted }}>Day 3 of 5</div>
    </div>

    {/* Believe/Doubt tally — the thing the maker ACTUALLY sees */}
    <div style={{
      background: c.goldDim, border: `1px solid ${c.goldBorder}`,
      borderRadius: 14, padding: "14px 16px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: c.gold, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>
          Friends weighing in
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: c.white }}>$50 pledged</div>
      </div>

      {/* Bar */}
      <div style={{ display: "flex", gap: 0, marginBottom: 8, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: "71%", height: 6, background: c.green }} />
        <div style={{ width: "29%", height: 6, background: c.red }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 10 }}>
        <span style={{ color: c.green }}>👊 5 believe</span>
        <span style={{ color: c.red }}>😏 2 doubt</span>
      </div>

      <div style={{ fontSize: 12, color: c.muted, lineHeight: 1.5 }}>
        5 friends think you'll do it. 2 aren't so sure.
        <br />
        <span style={{ color: c.text }}>Prove them right — $35 to St. Jude's if you do.</span>
      </div>
    </div>

    {/* People */}
    <div style={{
      background: c.card, border: `1px solid ${c.border}`, borderRadius: 12,
      padding: "12px 14px", marginBottom: 12,
    }}>
      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, marginBottom: 8 }}>
        People
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
        <span style={{ color: c.text }}>You</span>
        <span style={{ color: c.muted }}>Maker</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
        <span style={{ color: c.text }}>Mikey</span>
        <span style={{ color: c.green, fontSize: 11 }}>✓ Witness</span>
      </div>
    </div>

    {/* Actions */}
    <Btn gold small>Get friends involved</Btn>
    <div style={{ height: 8 }} />
    <Btn small>Text Mikey</Btn>
  </div>
);


// ═══════════════════════════════════════
// MAIN
// ═══════════════════════════════════════
export default function App() {
  const [view, setView] = useState("sms");

  const views = [
    { id: "sms", label: "1. SMS Invite", sub: "What spectators see first" },
    { id: "witnessA", label: "2a. Witness: Back", sub: "Success-only, simple" },
    { id: "witnessB", label: "2b. Witness: Believe", sub: "Believe/Doubt choice" },
    { id: "witnessC", label: "2c. Witness: Minimal", sub: "Share only, no pledge" },
    { id: "spectator", label: "3. Spectator Lands", sub: "Pledge page from link" },
    { id: "confirmed", label: "4. Pledged + Reshare", sub: "After paying" },
    { id: "maker", label: "5. Maker Sees", sub: "Vow detail + tally" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#080808",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: "28px 12px",
    }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: c.white }}>
          Spectator Pledge — Full Flow
        </div>
        <div style={{ fontSize: 13, color: c.muted, marginTop: 4 }}>
          Tap through each step of the spectator journey
        </div>
      </div>

      {/* Tab bar — scrollable */}
      <div style={{
        display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8,
        marginBottom: 24, WebkitOverflowScrolling: "touch",
      }}>
        {views.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            style={{
              flexShrink: 0, background: view === v.id ? c.goldDim : "transparent",
              border: `1px solid ${view === v.id ? c.goldBorder : c.border}`,
              borderRadius: 10, padding: "8px 14px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
              outline: "none", minWidth: 110,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: view === v.id ? c.gold : c.muted, whiteSpace: "nowrap" }}>
              {v.label}
            </span>
            <span style={{ fontSize: 9, color: c.dim, whiteSpace: "nowrap" }}>{v.sub}</span>
          </button>
        ))}
      </div>

      {/* Phone */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {view === "sms" && (
          <Phone label="GROUP CHAT" sublabel="Witness shares Joey's vow to the friend group">
            <SMSBubble />
          </Phone>
        )}
        {view === "witnessA" && (
          <Phone label="VARIANT A — BACK JOEY" sublabel="Success-only pledge. Simple, clean, positive.">
            <WitnessVariantA />
          </Phone>
        )}
        {view === "witnessB" && (
          <Phone label="VARIANT B — BELIEVE / DOUBT" sublabel="Spectator chooses. More engaging. Both → charity.">
            <WitnessVariantB />
          </Phone>
        )}
        {view === "witnessC" && (
          <Phone label="VARIANT C — SHARE ONLY" sublabel="No witness pledge. Just the share nudge. Minimal.">
            <WitnessVariantC />
          </Phone>
        )}
        {view === "spectator" && (
          <Phone label="SPECTATOR PLEDGE PAGE" sublabel="Web page from shared link. No app needed.">
            <SpectatorLanding />
          </Phone>
        )}
        {view === "confirmed" && (
          <Phone label="PLEDGED + RESHARE" sublabel="Confirmation, tally, and the viral re-share moment.">
            <SpectatorConfirmedReshare />
          </Phone>
        )}
        {view === "maker" && (
          <Phone label="MAKER'S VOW DETAIL" sublabel="Only shows if pledges exist. Otherwise unchanged.">
            <MakerWithTally />
          </Phone>
        )}
      </div>

      {/* Context notes */}
      <div style={{
        maxWidth: 520, margin: "28px auto 0",
        background: c.card, border: `1px solid ${c.border}`,
        borderRadius: 14, padding: "18px 20px",
      }}>
        {view === "sms" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.gold, marginBottom: 6 }}>
              This is where it starts
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>
              The witness drops the link in a group chat. No explanation of the app needed — it's about Joey, not about Unbreakable Vow. The link preview shows the vow, the stakes, and the social proof. Friends react naturally. The link does the rest.
            </div>
          </div>
        )}
        {view === "witnessA" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.gold, marginBottom: 6 }}>
              Variant A — "Back Joey"
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6, marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Pros:</span> Simple. One concept — pledge to charity if Joey succeeds. No confusing choices. The gold card is warm and inviting. "Or just spread the word" lets witnesses who don't want to pay still share.
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>
              <span style={{ fontWeight: 600 }}>Cons:</span> Less engaging than Believe/Doubt. No game mechanic. Spectators who think Joey will fail have no way to participate — you lose the doubters entirely.
            </div>
          </div>
        )}
        {view === "witnessB" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.gold, marginBottom: 6 }}>
              Variant B — "Believe / Doubt" ← Recommended
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6, marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Pros:</span> Captures BOTH sides — friends who believe AND friends who doubt. The ratio (5 believe, 2 doubt) creates a scoreboard that's irresistible to check. Drives conversation in the group chat. Both outcomes go to charity — NOT gambling. The maker sees "2 people doubt you" which is the strongest possible motivation.
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>
              <span style={{ fontWeight: 600 }}>Cons:</span> More complex. Requires explaining two paths. Some users may perceive "doubt" as negative or mean-spirited. Copy must be very clear that both sides → charity.
            </div>
          </div>
        )}
        {view === "witnessC" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.gold, marginBottom: 6 }}>
              Variant C — Share only (the previous plan)
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6, marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Pros:</span> Absolute minimum change to the witness flow. No payment on this screen at all. Just the nudge to share. Witness pledges on the same page spectators use if they want to.
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>
              <span style={{ fontWeight: 600 }}>Cons:</span> Misses the chance to let the witness pledge at peak engagement. They accepted — they're invested — why send them to another page to pledge?
            </div>
          </div>
        )}
        {view === "spectator" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.gold, marginBottom: 6 }}>
              The pledge page — one concept, 30 seconds
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>
              Believe/Doubt creates a social scoreboard that drives the group chat conversation. "5 believe, 2 doubt" is inherently shareable — people want to weigh in. The $10 default with Apple Pay means this is two taps to complete. No account, no app, no sign-up.
            </div>
          </div>
        )}
        {view === "confirmed" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.gold, marginBottom: 6 }}>
              The reshare — Nikita's multiplier
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>
              After pledging, the spectator sees the live tally (believe vs doubt bar). "Get more friends to weigh in" is framed as expanding the game, not marketing the app. The crowd bar is the key — it makes people want to tip the balance. "Send to friends" keeps the chain going.
            </div>
          </div>
        )}
        {view === "maker" && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.gold, marginBottom: 6 }}>
              The maker's motivation engine
            </div>
            <div style={{ fontSize: 13, color: c.text, lineHeight: 1.6 }}>
              "5 friends think you'll do it. 2 aren't so sure." — this is the most motivating sentence in the entire app. The believe/doubt ratio gives the maker something to prove. "Get friends involved" lets them share the pledge link themselves. The section only renders when pledges exist.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
