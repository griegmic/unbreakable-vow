import fs from "node:fs/promises";
import path from "node:path";
import {
  Presentation,
  PresentationFile,
  row,
  column,
  panel,
  text,
  shape,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  grow,
} from "@oai/artifact-tool";

const outDir = new URL("../output/", import.meta.url);
const scratchDir = new URL("../scratch/", import.meta.url);

const c = {
  bg: "#F5F2EA",
  ink: "#151D24",
  muted: "#596877",
  line: "#D2DCE3",
  white: "#FFFFFF",
  green: "#16A163",
  greenSoft: "#E8F7EF",
  blue: "#315BFF",
  blueSoft: "#E8EDFF",
  amber: "#B57400",
  amberSoft: "#FFF1CF",
  red: "#BA3650",
  redSoft: "#FFE8ED",
  teal: "#007C78",
  tealSoft: "#E4F8F6",
  dark: "#24313B",
};

const font = "Aptos";
const display = "Aptos Display";

function copy(size = 22, color = c.muted, bold = false) {
  return {
    fontFace: bold ? display : font,
    fontSize: size,
    color,
    bold,
    lineSpacingMultiple: 1.08,
  };
}

function checkLine(label, color = c.green) {
  return row(
    { name: `check-${label}`, width: fill, height: hug, gap: 12, align: "start" },
    [
      text("✓", {
        name: `check-mark-${label}`,
        width: fixed(26),
        height: hug,
        style: { fontFace: display, fontSize: 22, bold: true, color },
      }),
      text(label, {
        name: `check-text-${label}`,
        width: fill,
        height: hug,
        style: copy(21, c.ink, false),
      }),
    ],
  );
}

function step({ eyebrow, title, body, fillColor, accent }) {
  return panel(
    {
      name: `step-${title}`,
      width: fixed(262),
      height: fixed(218),
      fill: c.white,
      line: { style: "solid", width: 2, fill: accent },
      borderRadius: "rounded-xl",
      padding: { x: 22, y: 20 },
    },
    column({ name: `step-stack-${title}`, width: fill, height: fill, gap: 13 }, [
      panel(
        {
          name: `step-eyebrow-wrap-${title}`,
          width: fixed(64),
          height: fixed(40),
          fill: fillColor,
          line: { style: "solid", width: 0, fill: fillColor },
          borderRadius: "rounded-full",
          padding: { x: 0, y: 8 },
          align: "center",
          justify: "center",
        },
        text(eyebrow, {
          name: `step-eyebrow-${title}`,
          width: fill,
          height: hug,
          style: { fontFace: display, fontSize: 17, bold: true, color: accent },
        }),
      ),
      text(title, {
        name: `step-title-${title}`,
        width: fill,
        height: hug,
        style: copy(27, c.ink, true),
      }),
      text(body, {
        name: `step-body-${title}`,
        width: fill,
        height: hug,
        style: copy(18, c.muted, false),
      }),
    ]),
  );
}

function arrow(name) {
  return text("→", {
    name: `arrow-${name}`,
    width: fixed(54),
    height: hug,
    style: { fontFace: display, fontSize: 38, bold: true, color: "#697B89" },
  });
}

function ownership(label, body, color, fillColor) {
  return panel(
    {
      name: `ownership-${label}`,
      width: grow(1),
      height: fixed(110),
      fill: fillColor,
      line: { style: "solid", width: 0, fill: fillColor },
      borderRadius: "rounded-xl",
      padding: { x: 22, y: 18 },
    },
    column({ name: `ownership-stack-${label}`, width: fill, height: hug, gap: 6 }, [
      text(label, {
        name: `ownership-label-${label}`,
        width: fill,
        height: hug,
        style: copy(18, color, true),
      }),
      text(body, {
        name: `ownership-body-${label}`,
        width: fill,
        height: hug,
        style: copy(15, c.muted, false),
      }),
    ]),
  );
}

const presentation = Presentation.create({ slideSize: { width: 1920, height: 1080 } });
const slide = presentation.slides.add();
slide.background.fill = c.bg;

slide.compose(
  column(
    {
      name: "root",
      width: fill,
      height: fill,
      padding: { x: 78, y: 56 },
      gap: 26,
    },
    [
      row(
        { name: "top", width: fill, height: hug, align: "end", justify: "between", gap: 42 },
        [
          column({ name: "title-stack", width: grow(1), height: hug, gap: 10 }, [
            text("The short answer for R3VL", {
              name: "title",
              width: fill,
              height: hug,
              style: { fontFace: display, fontSize: 62, bold: true, color: c.ink },
            }),
            text(
              "Turnkey can support the wallet-native path they asked for, with one clean implementation detail: WhatsApp initiates, a secure R3VL app session signs.",
              {
                name: "subtitle",
                width: wrap(1290),
                height: hug,
                style: copy(24, c.muted, false),
              },
            ),
          ]),
          panel(
            {
              name: "answer-chip",
              width: fixed(390),
              height: hug,
              fill: c.greenSoft,
              line: { style: "solid", width: 1.5, fill: "#A9DEC1" },
              borderRadius: "rounded-full",
              padding: { x: 26, y: 15 },
              align: "center",
              justify: "center",
            },
            text("Yes, without prefunding", {
              name: "answer-chip-text",
              width: fill,
              height: hug,
              style: copy(25, "#0A7A43", true),
            }),
          ),
        ],
      ),
      row({ name: "main", width: fill, height: fixed(440), gap: 28 }, [
        panel(
          {
            name: "asked-panel",
            width: fixed(430),
            height: fill,
            fill: c.white,
            line: { style: "solid", width: 1.5, fill: c.line },
            borderRadius: "rounded-xl",
            padding: { x: 30, y: 28 },
          },
          column({ name: "asked-stack", width: fill, height: fill, gap: 20 }, [
            text("What they asked for", {
              name: "asked-title",
              width: fill,
              height: hug,
              style: copy(30, c.ink, true),
            }),
            column({ name: "ask-checks", width: fill, height: hug, gap: 13 }, [
              checkLine("Start in WhatsApp"),
              checkLine("Use MetaMask or existing wallet"),
              checkLine("Phone number becomes payment ID"),
              checkLine("Wallet-native confirmation UI"),
              checkLine("Funds go straight to recipient"),
              checkLine("No prefunding or custody"),
            ]),
          ]),
        ),
        column(
          {
            name: "path-panel",
            width: grow(1),
            height: fill,
            gap: 18,
            padding: { x: 0, y: 0 },
          },
          [
            row(
              { name: "path-header", width: fill, height: hug, align: "center", justify: "between" },
              [
                text("Turnkey-supported path", {
                  name: "path-title",
                  width: wrap(620),
                  height: hug,
                  style: copy(30, c.ink, true),
                }),
                text("No Turnkey-managed wallet required in this BYO-wallet flow", {
                  name: "path-note",
                  width: wrap(565),
                  height: hug,
                  style: copy(19, "#0A7A43", true),
                }),
              ],
            ),
            row(
              { name: "steps", width: fill, height: fixed(238), align: "center", justify: "center", gap: 12 },
              [
                step({
                  eyebrow: "1",
                  title: "Chat request",
                  body: 'User says: "send Samuel $20" in WhatsApp.',
                  fillColor: c.greenSoft,
                  accent: c.green,
                }),
                arrow("one"),
                step({
                  eyebrow: "2",
                  title: "R3VL session",
                  body: "Secure app link resolves identity and prepares the transaction.",
                  fillColor: c.blueSoft,
                  accent: c.blue,
                }),
                arrow("two"),
                step({
                  eyebrow: "3",
                  title: "Wallet signs",
                  body: "Turnkey routes signing to MetaMask / WalletConnect.",
                  fillColor: c.redSoft,
                  accent: c.red,
                }),
                arrow("three"),
                step({
                  eyebrow: "4",
                  title: "Direct transfer",
                  body: "User wallet sends directly to the recipient address.",
                  fillColor: c.tealSoft,
                  accent: c.teal,
                }),
              ],
            ),
            panel(
              {
                name: "constraint",
                width: fill,
                height: fixed(106),
                fill: "#FFF9EA",
                line: { style: "solid", width: 1.5, fill: "#EEC76F" },
                borderRadius: "rounded-xl",
                padding: { x: 28, y: 20 },
              },
              row({ name: "constraint-row", width: fill, height: hug, gap: 18, align: "center" }, [
                text("Important constraint", {
                  name: "constraint-label",
                  width: fixed(230),
                  height: hug,
                  style: copy(21, c.amber, true),
                }),
                text(
                  "WhatsApp cannot directly pop MetaMask. The clean pattern is a lightweight R3VL confirmation session where the external wallet connection and signature happen.",
                  {
                    name: "constraint-copy",
                    width: fill,
                    height: hug,
                    style: copy(20, c.ink, false),
                  },
                ),
              ]),
            ),
          ],
        ),
      ]),
      rule({ name: "divider", width: fixed(1764), stroke: "#C4D0D9", weight: 2 }),
      row({ name: "ownership", width: fill, height: fixed(112), gap: 18 }, [
        ownership("R3VL owns", "WhatsApp identity, phone-to-wallet mapping, recipient resolution, transaction construction.", c.blue, c.blueSoft),
        ownership("Turnkey enables", "External wallet connection state plus signing helpers for connected wallet accounts.", c.amber, c.amberSoft),
        ownership("Wallet owns", "Native confirmation UI, signature, and transaction submission from the user's wallet.", c.red, c.redSoft),
        ownership("Chain sees", "A direct wallet-to-recipient transaction. No intermediate funded wallet in the path.", c.teal, c.tealSoft),
      ]),
    ],
  ),
  { frame: { left: 0, top: 0, width: 1920, height: 1080 }, baseUnit: 8 },
);

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(scratchDir, { recursive: true });

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(path.join(outDir.pathname, "r3vl-turnkey-short-answer.pptx"));

const preview = await slide.export({ format: "png" });
await fs.writeFile(
  path.join(scratchDir.pathname, "r3vl-turnkey-short-answer-preview.png"),
  Buffer.from(await preview.arrayBuffer()),
);
