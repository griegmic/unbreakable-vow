import fs from "node:fs/promises";
import path from "node:path";
import {
  Presentation,
  PresentationFile,
  row,
  column,
  grid,
  panel,
  text,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  grow,
  fr,
} from "@oai/artifact-tool";

const outDir = new URL("../output/", import.meta.url);
const scratchDir = new URL("../scratch/", import.meta.url);

const C = {
  bg: "#F7F4EC",
  ink: "#16212A",
  muted: "#566675",
  line: "#CFD9E1",
  white: "#FFFFFF",
  green: "#0A8E53",
  greenSoft: "#E6F7EE",
  blue: "#315BFF",
  blueSoft: "#E8EDFF",
  amber: "#A36800",
  amberSoft: "#FFF0CA",
  red: "#B5334A",
  redSoft: "#FFE8ED",
  teal: "#007D78",
  tealSoft: "#E2F8F6",
};

const font = "Aptos";
const display = "Aptos Display";

function style(size, color = C.ink, bold = false) {
  return {
    fontFace: bold ? display : font,
    fontSize: size,
    color,
    bold,
    lineSpacingMultiple: 1.07,
  };
}

function stepHeader(num, title, color, fillColor) {
  return panel(
    {
      name: `step-header-${num}`,
      width: fill,
      height: fixed(112),
      fill: fillColor,
      line: { style: "solid", width: 0, fill: fillColor },
      borderRadius: "rounded-xl",
      padding: { x: 20, y: 15 },
    },
    row({ name: `step-header-row-${num}`, width: fill, height: hug, gap: 14, align: "center" }, [
      panel(
        {
          name: `step-number-${num}`,
          width: fixed(42),
          height: fixed(42),
          fill: C.white,
          line: { style: "solid", width: 0, fill: C.white },
          borderRadius: "rounded-full",
          align: "center",
          justify: "center",
          padding: { x: 0, y: 6 },
        },
        text(String(num), {
          name: `step-number-text-${num}`,
          width: fill,
          height: hug,
          style: style(19, color, true),
        }),
      ),
      text(title, {
        name: `step-title-${num}`,
        width: fill,
        height: hug,
        style: style(25, color, true),
      }),
    ]),
  );
}

function laneLabel(title, subtitle, color, fillColor) {
  return panel(
    {
      name: `lane-${title}`,
      width: fill,
      height: fill,
      fill: fillColor,
      line: { style: "solid", width: 0, fill: fillColor },
      borderRadius: "rounded-xl",
      padding: { x: 20, y: 18 },
    },
    column({ name: `lane-stack-${title}`, width: fill, height: hug, gap: 6 }, [
      text(title, {
        name: `lane-title-${title}`,
        width: fill,
        height: hug,
        style: style(24, color, true),
      }),
      text(subtitle, {
        name: `lane-subtitle-${title}`,
        width: fill,
        height: hug,
        style: style(16, C.muted, false),
      }),
    ]),
  );
}

function cell(name, value, tone = "plain") {
  const fills = {
    plain: C.white,
    active: "#FFFDF7",
    green: C.greenSoft,
    blue: C.blueSoft,
    red: C.redSoft,
    teal: C.tealSoft,
  };
  const colors = {
    plain: C.ink,
    active: C.ink,
    green: C.green,
    blue: C.blue,
    red: C.red,
    teal: C.teal,
  };

  return panel(
    {
      name,
      width: fill,
      height: fill,
      fill: fills[tone],
      line: { style: "solid", width: 1.5, fill: C.line },
      borderRadius: "rounded-xl",
      padding: { x: 18, y: 16 },
    },
    text(value, {
      name: `${name}-text`,
      width: fill,
      height: hug,
      style: style(21, colors[tone], tone !== "plain" && tone !== "active"),
    }),
  );
}

const presentation = Presentation.create({ slideSize: { width: 1920, height: 1080 } });
const slide = presentation.slides.add();
slide.background.fill = C.bg;

slide.compose(
  column(
    {
      name: "root",
      width: fill,
      height: fill,
      padding: { x: 70, y: 48 },
      gap: 22,
    },
    [
      row({ name: "top-row", width: fill, height: hug, align: "end", justify: "between", gap: 36 }, [
        column({ name: "title-stack", width: grow(1), height: hug, gap: 8 }, [
          text("R3VL + Turnkey BYO-wallet flow", {
            name: "title",
            width: fill,
            height: hug,
            style: { fontFace: display, fontSize: 58, bold: true, color: C.ink },
          }),
          text("Screen-share version: what R3VL owns, what Turnkey enables, and where the wallet signs.", {
            name: "subtitle",
            width: wrap(1120),
            height: hug,
            style: style(25, C.muted, false),
          }),
        ]),
        panel(
          {
            name: "headline-chip",
            width: fixed(430),
            height: hug,
            fill: C.greenSoft,
            line: { style: "solid", width: 1.5, fill: "#A8DEC1" },
            borderRadius: "rounded-full",
            padding: { x: 28, y: 15 },
          },
          text("Direct. Non-custodial. No prefund.", {
            name: "headline-chip-text",
            width: fill,
            height: hug,
            style: style(24, C.green, true),
          }),
        ),
      ]),
      grid(
        {
          name: "swimlane-grid",
          width: fill,
          height: fixed(650),
          columns: [fixed(260), fr(1), fr(1), fr(1), fr(1)],
          rows: [fixed(112), fixed(148), fixed(148), fixed(148)],
          columnGap: 16,
          rowGap: 14,
        },
        [
          text("", { name: "blank-corner", width: fill, height: fill }),
          stepHeader(1, "User asks in WhatsApp", C.green, C.greenSoft),
          stepHeader(2, "R3VL opens secure session", C.blue, C.blueSoft),
          stepHeader(3, "Wallet signs natively", C.red, C.redSoft),
          stepHeader(4, "Funds move directly", C.teal, C.tealSoft),

          laneLabel("R3VL owns", "agent + identity + transaction intent", C.blue, C.blueSoft),
          cell("r3vl-1", "Receive WhatsApp message and phone identity.", "plain"),
          cell("r3vl-2", "Map phone -> verified wallet/payment ID. Resolve Samuel -> recipient address.", "blue"),
          cell("r3vl-3", "Present clear transaction details in the R3VL session.", "plain"),
          cell("r3vl-4", "Send status and receipt back to WhatsApp.", "plain"),

          laneLabel("Turnkey enables", "external wallet connection + signing helpers", C.amber, C.amberSoft),
          cell("tk-1", "No embedded wallet required for the BYO-wallet path.", "plain"),
          cell("tk-2", "Connect MetaMask / WalletConnect and expose connected walletAccount.", "active"),
          cell("tk-3", "Call signTransaction or signAndSendTransaction with that connected account.", "active"),
          cell("tk-4", "No funded Turnkey-managed wallet sits in the middle.", "plain"),

          laneLabel("Wallet / chain owns", "confirmation UI + signature + settlement", C.red, C.redSoft),
          cell("wallet-1", "User keeps their existing wallet.", "plain"),
          cell("wallet-2", "Wallet connection happens in a wallet-capable R3VL session.", "plain"),
          cell("wallet-3", "MetaMask / WalletConnect shows the approval UI and collects the signature.", "red"),
          cell("wallet-4", "Transaction goes user wallet -> recipient address.", "teal"),
        ],
      ),
      rule({ name: "footer-rule", width: fixed(1780), stroke: "#C7D2DA", weight: 2 }),
      row({ name: "footer", width: fill, height: hug, gap: 18, align: "center" }, [
        panel(
          {
            name: "constraint-chip",
            width: fixed(332),
            height: fixed(74),
            fill: C.amberSoft,
            line: { style: "solid", width: 1.5, fill: "#EBC56D" },
            borderRadius: "rounded-xl",
            padding: { x: 22, y: 18 },
          },
          text("Only real handoff", {
            name: "constraint-chip-text",
            width: fill,
            height: hug,
            style: style(25, C.amber, true),
          }),
        ),
        text(
          "WhatsApp starts the flow, but MetaMask / WalletConnect signing needs a secure R3VL web or app session. Everything else maps cleanly to a non-custodial BYO-wallet architecture.",
          {
            name: "footer-copy",
            width: fill,
            height: hug,
            style: style(26, C.ink, false),
          },
        ),
      ]),
    ],
  ),
  { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
);

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(scratchDir, { recursive: true });

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(path.join(outDir.pathname, "r3vl-turnkey-screen-share-swimlane.pptx"));

const preview = await slide.export({ format: "png" });
await fs.writeFile(
  path.join(scratchDir.pathname, "r3vl-turnkey-screen-share-swimlane-preview.png"),
  Buffer.from(await preview.arrayBuffer()),
);
