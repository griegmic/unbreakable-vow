import { useState } from "react";

const colors = {
  bg: "#030508",
  card: "#0C1117",
  cardBorder: "#1A2030",
  gold: "#D4A24F",
  goldDim: "rgba(212,162,79,0.15)",
  goldBorder: "rgba(212,162,79,0.3)",
  green: "#4ADE80",
  greenDim: "rgba(74,222,128,0.12)",
  greenBorder: "rgba(74,222,128,0.25)",
  text: "#E8E0D4",
  textMuted: "#8A8579",
  textDim: "#5A564F",
  white: "#FFFFFF",
};

const Phone = ({ children, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
    <div
      style={{
        width: 320,
        minHeight: 640,
        background: colors.bg,
        borderRadius: 32,
        border: `2px solid ${colors.cardBorder}`,
        padding: "48px 20px 32px",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: 80,
          height: 6,
          borderRadius: 3,
          background: colors.cardBorder,
        }}
      />
      {children}
    </div>
    <span style={{ fontSize: 13, color: colors.textMuted, fontWeight: 600, letterSpacing: 0.5 }}>
      {label}
    </span>
  </div>
);

const GoldButton = ({ children, small }) => (
  <div
    style={{
      background: `linear-gradient(135deg, #E8C36A, ${colors.gold}, #B8862D)`,
      borderRadius: 14,
      padding: small ? "10px 20px" : "14px 24px",
      textAlign: "center",
      color: colors.bg,
      fontWeight: 700,
      fontSize: small ? 14 : 15,
      cursor: "pointer",
      boxShadow: "0 8px 20px rgba(212,162,79,0.25)",
      letterSpacing: 0.2,
    }}
  >
    {children}
  </div>
);

const TextLink = ({ children }) => (
  <div
    style={{
      textAlign: "center",
      color: colors.textMuted,
      fontSize: 13,
      cursor: "pointer",
      padding: "8px 0",
    }}
  >
    {children}
  </div>
);

const Divider = () => (
  <div
    style={{
      height: 1,
      background: colors.cardBorder,
      margin: "20px 0",
    }}
  />
);

const Card = ({ children, style }) => (
  <div
    style={{
      background: colors.card,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 14,
      padding: "16px 18px",
      ...style,
    }}
  >
    {children}
  </div>
);

// ==========================================
// SCREEN 1: Witness Accepted State
// ==========================================
const WitnessAccepted = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {/* Celebration */}
    <div style={{ textAlign: "center", marginBottom: 6 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          background: colors.greenDim,
          border: `2px solid ${colors.greenBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
          fontSize: 24,
        }}
      >
        ✓
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: colors.white,
          fontFamily: "Georgia, serif",
          marginBottom: 4,
        }}
      >
        You're locked in.
      </div>
    </div>

    {/* === THE NUDGE — Julie's placement === */}
    <div
      style={{
        background: colors.goldDim,
        border: `1px solid ${colors.goldBorder}`,
        borderRadius: 14,
        padding: "16px 18px",
        margin: "14px 0",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.55, marginBottom: 14 }}>
        Friends can pledge to charity if Joey pulls it off — want to loop them in?
      </div>
      <GoldButton small>Send to friends</GoldButton>
      <TextLink>Not now</TextLink>
    </div>

    {/* Vow preview */}
    <Card>
      <div
        style={{
          fontSize: 16,
          color: colors.white,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          lineHeight: 1.45,
          marginBottom: 10,
        }}
      >
        "Do my taxes by Sunday"
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 12, color: colors.textMuted }}>
        <span style={{ color: colors.gold }}>$50 at stake</span>
        <span>→ St. Jude's</span>
      </div>
    </Card>

    {/* Stats */}
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 16,
        margin: "16px 0 12px",
        fontSize: 12,
        color: colors.textMuted,
      }}
    >
      <span>Day 1 of 5</span>
      <span>·</span>
      <span>Verdict: Apr 17</span>
    </div>

    {/* Check-in CTA */}
    <div
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: 14,
        padding: "12px 18px",
        textAlign: "center",
        color: colors.text,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      Check in on Joey
    </div>

    {/* Reciprocal CTA */}
    <div
      style={{
        textAlign: "center",
        fontSize: 13,
        color: colors.textMuted,
        margin: "18px 0 0",
        lineHeight: 1.5,
      }}
    >
      Your move — make a vow and pick
      <br />
      Joey to judge you
    </div>
  </div>
);

// ==========================================
// SCREEN 2: Spectator Pledge Confirmation + Reshare
// ==========================================
const SpectatorConfirmed = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {/* Confirmation */}
    <div style={{ textAlign: "center", marginBottom: 4 }}>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          background: colors.greenDim,
          border: `2px solid ${colors.greenBorder}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
          fontSize: 24,
        }}
      >
        ✓
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: colors.white,
          fontFamily: "Georgia, serif",
          marginBottom: 6,
        }}
      >
        You pledged $10
      </div>
      <div style={{ fontSize: 14, color: colors.textMuted, lineHeight: 1.5, padding: "0 8px" }}>
        If Joey keeps his vow, your $10 goes
        <br />
        to St. Jude's. We'll let you know.
      </div>
    </div>

    {/* Phone capture */}
    <div style={{ margin: "18px 0 4px" }}>
      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
        Get the verdict by text
      </div>
      <div
        style={{
          background: colors.card,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 10,
          padding: "12px 14px",
          color: colors.textDim,
          fontSize: 14,
        }}
      >
        Your phone number
      </div>
    </div>

    <Divider />

    {/* === THE RE-SHARE NUDGE === */}
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 13,
          color: colors.textMuted,
          marginBottom: 4,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Pile on
      </div>
      <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.55, marginBottom: 14, padding: "0 4px" }}>
        The more friends who pledge, the more
        <br />
        goes to charity if Joey pulls it off.
      </div>
      <GoldButton small>Send to friends</GoldButton>
    </div>

    <Divider />

    {/* App install soft CTA */}
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 13, color: colors.textMuted, marginBottom: 10 }}>
        Make a vow of your own
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 10,
            padding: "8px 18px",
            fontSize: 13,
            color: colors.text,
            fontWeight: 600,
          }}
        >
          App Store
        </div>
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.cardBorder}`,
            borderRadius: 10,
            padding: "8px 18px",
            fontSize: 13,
            color: colors.text,
            fontWeight: 600,
          }}
        >
          Play Store
        </div>
      </div>
    </div>
  </div>
);

// ==========================================
// SCREEN 3: Maker Vow Detail (with pledges)
// ==========================================
const MakerVowDetail = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
    {/* Header */}
    <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 10 }}>← Back</div>

    <div
      style={{
        fontSize: 20,
        fontWeight: 700,
        color: colors.white,
        fontFamily: "Georgia, serif",
        marginBottom: 10,
        lineHeight: 1.35,
      }}
    >
      "Do my taxes by Sunday"
    </div>

    {/* Status + Stake */}
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
      <div
        style={{
          background: colors.greenDim,
          border: `1px solid ${colors.greenBorder}`,
          borderRadius: 20,
          padding: "4px 12px",
          fontSize: 12,
          color: colors.green,
          fontWeight: 600,
        }}
      >
        ● Active
      </div>
      <span style={{ fontSize: 12, color: colors.gold }}>$50 → St. Jude's</span>
    </div>

    {/* Progress bar */}
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          height: 4,
          background: colors.cardBorder,
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 6,
        }}
      >
        <div style={{ width: "60%", height: "100%", background: colors.gold, borderRadius: 2 }} />
      </div>
      <div style={{ fontSize: 12, color: colors.textMuted }}>Day 3 of 5</div>
    </div>

    {/* People section */}
    <Card>
      <div style={{ fontSize: 11, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, marginBottom: 10 }}>
        People
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: colors.text }}>You</span>
          <span style={{ color: colors.textMuted }}>Maker</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
          <span style={{ color: colors.text }}>Mikey</span>
          <span style={{ color: colors.green, fontSize: 12 }}>✓ Witness</span>
        </div>
      </div>
    </Card>

    {/* === PLEDGE SECTION — only shows if pledges > 0 === */}
    <div
      style={{
        background: colors.goldDim,
        border: `1px solid ${colors.goldBorder}`,
        borderRadius: 14,
        padding: "16px 18px",
        marginTop: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: colors.gold, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>
          Friends pledging
        </div>
        <div style={{ fontSize: 18, color: colors.white, fontWeight: 700 }}>$85</div>
      </div>
      <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.5, marginBottom: 10 }}>
        8 friends · pledged to St. Jude's if you succeed
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["Sarah $10", "Alex $5", "Jordan $20", "Priya $10", "Marcus $15"].map((p) => (
          <span
            key={p}
            style={{
              background: "rgba(212,162,79,0.1)",
              border: `1px solid rgba(212,162,79,0.2)`,
              borderRadius: 20,
              padding: "3px 10px",
              fontSize: 11,
              color: colors.text,
            }}
          >
            {p}
          </span>
        ))}
        <span
          style={{
            padding: "3px 10px",
            fontSize: 11,
            color: colors.textMuted,
          }}
        >
          +3 more
        </span>
      </div>
    </div>

    {/* Actions */}
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
      <GoldButton small>Get friends involved</GoldButton>
      <div
        style={{
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
          padding: "10px 18px",
          textAlign: "center",
          color: colors.text,
          fontSize: 14,
        }}
      >
        Text Mikey
      </div>
    </div>
  </div>
);

// ==========================================
// MAIN APP
// ==========================================
export default function SpectatorMockups() {
  const [activeTab, setActiveTab] = useState("witness");

  const tabs = [
    { id: "witness", label: "Witness Accepts", sublabel: "Expo app" },
    { id: "spectator", label: "Spectator Pledged", sublabel: "Web" },
    { id: "maker", label: "Maker's View", sublabel: "Expo app" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0A0A",
        padding: "32px 20px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: colors.white, marginBottom: 4 }}>
          Spectator Pledge — Screen Mockups
        </div>
        <div style={{ fontSize: 14, color: colors.textMuted }}>
          The 3 touchpoints that create the viral loop
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? colors.goldDim : "transparent",
              border: `1px solid ${activeTab === tab.id ? colors.goldBorder : colors.cardBorder}`,
              borderRadius: 10,
              padding: "10px 18px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              outline: "none",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === tab.id ? colors.gold : colors.textMuted,
              }}
            >
              {tab.label}
            </span>
            <span style={{ fontSize: 11, color: colors.textDim }}>{tab.sublabel}</span>
          </button>
        ))}
      </div>

      {/* Phone mockup */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        {activeTab === "witness" && (
          <Phone label="WITNESS — After accepting Joey's vow">
            <WitnessAccepted />
          </Phone>
        )}
        {activeTab === "spectator" && (
          <Phone label="SPECTATOR — After pledging $10">
            <SpectatorConfirmed />
          </Phone>
        )}
        {activeTab === "maker" && (
          <Phone label="MAKER — Vow detail with pledges">
            <MakerVowDetail />
          </Phone>
        )}
      </div>

      {/* Annotations */}
      <div
        style={{
          maxWidth: 500,
          margin: "32px auto 0",
          padding: "20px 24px",
          background: colors.card,
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 14,
        }}
      >
        {activeTab === "witness" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.gold, marginBottom: 8 }}>
              Julie's placement call
            </div>
            <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>
              The spectator nudge sits right below "You're locked in" — at peak engagement, where the witness's eyes naturally go. It's a warm gold card, not an interstitial. One tap to share, one tap to dismiss. The vow details and check-in CTA sit below, unchanged.
            </div>
            <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, marginTop: 10 }}>
              Copy uses Nikita's directness ("pledge to charity") with Julie's warmth ("want to loop them in?"). Button says "Send to friends" — implies a group chat, not a broadcast.
            </div>
          </div>
        )}
        {activeTab === "spectator" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.gold, marginBottom: 8 }}>
              Nikita's exponential multiplier
            </div>
            <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>
              After pledging, the spectator sees "Pile on" — a re-share prompt framed as increasing the charity impact. Same "Send to friends" button. This turns a linear chain (witness → spectators) into a branching tree (witness → spectators → more spectators).
            </div>
            <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, marginTop: 10 }}>
              Phone capture for verdict SMS is above the fold. App install is below — soft, optional, never pushy. The spectator never needed an account to pledge.
            </div>
          </div>
        )}
        {activeTab === "maker" && (
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.gold, marginBottom: 8 }}>
              Shreyas: passive value, zero new decisions
            </div>
            <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.6 }}>
              The pledge section only appears when pledges exist. If nobody's pledged, this screen is identical to today. The maker doesn't manage spectators — they just see "$85 pledged by 8 friends" as motivation. "Get friends involved" replaces "Share your vow" on the existing button.
            </div>
            <div style={{ fontSize: 13, color: colors.textMuted, lineHeight: 1.6, marginTop: 10 }}>
              The gold card draws the eye without dominating. Friend names + amounts create social proof. Framing is "if you succeed" — motivation, not pressure.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
