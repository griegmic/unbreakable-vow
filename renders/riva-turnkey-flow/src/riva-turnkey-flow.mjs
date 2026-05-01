import fs from "node:fs/promises";
import path from "node:path";
import {
  Presentation,
  PresentationFile,
  row,
  column,
  layers,
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

const COLORS = {
  ink: "#17212B",
  muted: "#5D6B78",
  hairline: "#D8E1E8",
  bg: "#F7F5EE",
  white: "#FFFFFF",
  green: "#19B56B",
  greenSoft: "#E9F8EF",
  blue: "#356CFF",
  blueSoft: "#EAF0FF",
  amber: "#F7A928",
  amberSoft: "#FFF4D9",
  rose: "#F0647A",
  roseSoft: "#FFECEF",
  teal: "#20B8B0",
  tealSoft: "#E8FAF8",
  dark: "#22303A",
};

const titleStyle = {
  fontFace: "Aptos Display",
  fontSize: 58,
  bold: true,
  color: COLORS.ink,
};

const subtitleStyle = {
  fontFace: "Aptos",
  fontSize: 25,
  color: COLORS.muted,
  lineSpacingMultiple: 1.12,
};

const labelStyle = {
  fontFace: "Aptos",
  fontSize: 17,
  bold: true,
  color: COLORS.muted,
};

const cardTitleStyle = {
  fontFace: "Aptos Display",
  fontSize: 29,
  bold: true,
  color: COLORS.ink,
};

const cardBodyStyle = {
  fontFace: "Aptos",
  fontSize: 18,
  color: COLORS.muted,
  lineSpacingMultiple: 1.12,
};

const tinyStyle = {
  fontFace: "Aptos",
  fontSize: 15,
  color: COLORS.muted,
};

function badge(label, fillColor, textColor) {
  return panel(
    {
      name: `badge-${label}`,
      width: fixed(64),
      height: fixed(64),
      fill: fillColor,
      line: { style: "solid", width: 0, fill: fillColor },
      borderRadius: "rounded-full",
      padding: { x: 0, y: 0 },
      align: "center",
      justify: "center",
    },
      text(label, {
        name: `badge-text-${label}`,
      width: fixed(44),
      height: hug,
      style: {
        fontFace: "Aptos Display",
        fontSize: 20,
        bold: true,
        color: textColor,
      },
    }),
  );
}

function stepCard({ name, badgeText, title, body, badgeFill, badgeColor, border }) {
  return panel(
    {
      name,
      width: fixed(246),
      height: fixed(284),
      fill: COLORS.white,
      line: { style: "solid", width: 2, fill: border },
      borderRadius: "rounded-xl",
      padding: { x: 23, y: 22 },
    },
    column(
      {
        name: `${name}-stack`,
        width: fill,
        height: fill,
        gap: 15,
      },
      [
        badge(badgeText, badgeFill, badgeColor),
        text(title, {
          name: `${name}-title`,
          width: fill,
          height: hug,
          style: cardTitleStyle,
        }),
        text(body, {
          name: `${name}-body`,
          width: fill,
          height: hug,
          style: cardBodyStyle,
        }),
      ],
    ),
  );
}

function arrow(label) {
  return column(
    {
      name: `arrow-${label}`,
      width: fixed(58),
      height: fixed(284),
      align: "center",
      justify: "center",
      gap: 8,
    },
    [
      text("->", {
        name: `arrow-mark-${label}`,
        width: fixed(58),
        height: hug,
        style: {
          fontFace: "Aptos Display",
          fontSize: 30,
          bold: true,
          color: "#6C7D8A",
        },
      }),
    ],
  );
}

function pill(label, fillColor, color, width) {
  return panel(
    {
      name: `pill-${label}`,
      width: fixed(width),
      height: hug,
      fill: fillColor,
      line: { style: "solid", width: 0, fill: fillColor },
      borderRadius: "rounded-full",
      padding: { x: 22, y: 11 },
    },
    text(label, {
      name: `pill-text-${label}`,
      width: fill,
      height: hug,
      style: {
        fontFace: "Aptos",
        fontSize: 17,
        bold: true,
        color,
      },
    }),
  );
}

const presentation = Presentation.create({
  slideSize: { width: 1920, height: 1080 },
});

const slide = presentation.slides.add();
slide.background.fill = COLORS.bg;

slide.compose(
  layers(
    { name: "slide-layers", width: fill, height: fill },
    [
      shape({
        name: "background",
        width: fill,
        height: fill,
        fill: COLORS.bg,
        line: { style: "solid", width: 0, fill: COLORS.bg },
      }),
      column(
        {
          name: "slide-root",
          width: fill,
          height: fill,
          padding: { x: 78, y: 58 },
          gap: 34,
        },
        [
          row(
            {
              name: "header-row",
              width: fill,
              height: hug,
              align: "end",
              justify: "between",
              gap: 40,
            },
            [
              column(
                { name: "headline-stack", width: grow(1), height: hug, gap: 12 },
                [
                  text("Riva's ideal wallet-native payment flow", {
                    name: "slide-title",
                    width: wrap(1120),
                    height: hug,
                    style: titleStyle,
                  }),
                  text(
                    "WhatsApp starts the request. Turnkey connects the user's existing wallet. MetaMask signs. Funds move directly to the recipient.",
                    {
                      name: "slide-subtitle",
                      width: wrap(1280),
                      height: hug,
                      style: subtitleStyle,
                    },
                  ),
                ],
              ),
              panel(
                {
                  name: "trust-chip",
                  width: fixed(338),
                  height: hug,
                  fill: "#ECF8F1",
                  line: { style: "solid", width: 1.5, fill: "#B9E8CC" },
                  borderRadius: "rounded-full",
                  padding: { x: 24, y: 16 },
                },
                text("No prefund. No custody.", {
                  name: "trust-chip-text",
                  width: fill,
                  height: hug,
                  style: {
                    fontFace: "Aptos Display",
                    fontSize: 25,
                    bold: true,
                    color: "#0E7E46",
                  },
                }),
              ),
            ],
          ),
          row(
            {
              name: "flow-row",
              width: fill,
              height: fixed(318),
              gap: 14,
              align: "center",
              justify: "center",
            },
            [
              stepCard({
                name: "step-whatsapp",
                badgeText: "W",
                title: "Chat starts",
                body: '"Hey Riva, send Samuel $20."',
                badgeFill: COLORS.greenSoft,
                badgeColor: "#0E8A4F",
                border: "#BDE8CE",
              }),
              arrow("one"),
              stepCard({
                name: "step-riva",
                badgeText: "R",
                title: "Riva resolves",
                body: "Phone identity, payment intent, and recipient address.",
                badgeFill: COLORS.blueSoft,
                badgeColor: COLORS.blue,
                border: "#C7D6FF",
              }),
              arrow("two"),
              stepCard({
                name: "step-turnkey",
                badgeText: "TK",
                title: "Wallet linked",
                body: "Turnkey surfaces the connected external wallet account.",
                badgeFill: COLORS.amberSoft,
                badgeColor: "#A56B00",
                border: "#F6D68A",
              }),
              arrow("three"),
              stepCard({
                name: "step-metamask",
                badgeText: "M",
                title: "User signs",
                body: "The confirmation UI comes from MetaMask or WalletConnect.",
                badgeFill: COLORS.roseSoft,
                badgeColor: "#B8324B",
                border: "#F4B9C4",
              }),
              arrow("four"),
              stepCard({
                name: "step-direct",
                badgeText: "$",
                title: "Direct transfer",
                body: "Funds move from the connected wallet to Samuel.",
                badgeFill: COLORS.tealSoft,
                badgeColor: "#087E78",
                border: "#AEE9E5",
              }),
            ],
          ),
          rule({
            name: "flow-rule",
            width: fixed(1420),
            stroke: "#B9C6D0",
            weight: 2,
          }),
          row(
            {
              name: "ownership-row",
              width: fill,
              height: hug,
              align: "start",
              justify: "center",
              gap: 34,
            },
            [
              column(
                { name: "riva-owns", width: fixed(420), height: hug, gap: 9 },
                [
                  text("Riva owns", {
                    name: "riva-owns-label",
                    width: fill,
                    height: hug,
                    style: labelStyle,
                  }),
                  text("WhatsApp identity, payment ID mapping, agent intent, and recipient lookup.", {
                    name: "riva-owns-copy",
                    width: fill,
                    height: hug,
                    style: tinyStyle,
                  }),
                ],
              ),
              column(
                { name: "turnkey-enables", width: fixed(420), height: hug, gap: 9 },
                [
                  text("Turnkey enables", {
                    name: "turnkey-enables-label",
                    width: fill,
                    height: hug,
                    style: labelStyle,
                  }),
                  text("External wallet connection and signing abstraction using the connected wallet account.", {
                    name: "turnkey-enables-copy",
                    width: fill,
                    height: hug,
                    style: tinyStyle,
                  }),
                ],
              ),
              column(
                { name: "wallet-owns", width: fixed(420), height: hug, gap: 9 },
                [
                  text("Wallet owns", {
                    name: "wallet-owns-label",
                    width: fill,
                    height: hug,
                    style: labelStyle,
                  }),
                  text("The native confirmation prompt, signature, and direct transaction submission.", {
                    name: "wallet-owns-copy",
                    width: fill,
                    height: hug,
                    style: tinyStyle,
                  }),
                ],
              ),
            ],
          ),
          row(
            {
              name: "pill-row",
              width: fill,
              height: hug,
              align: "center",
              justify: "center",
              gap: 18,
            },
            [
              pill("BYO wallet", COLORS.blueSoft, COLORS.blue, 176),
              pill("No intermediate wallet", COLORS.greenSoft, "#0E8A4F", 254),
              pill("Wallet-native confirmation", COLORS.roseSoft, "#B8324B", 286),
              pill("Direct transfer", COLORS.tealSoft, "#087E78", 206),
            ],
          ),
        ],
      ),
    ],
  ),
  {
    frame: { left: 0, top: 0, width: 1920, height: 1080 },
    baseUnit: 8,
  },
);

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(scratchDir, { recursive: true });

const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(path.join(outDir.pathname, "output.pptx"));

const preview = await slide.export({ format: "png" });
await fs.writeFile(
  path.join(scratchDir.pathname, "riva-turnkey-flow-preview.png"),
  Buffer.from(await preview.arrayBuffer()),
);

const layout = await slide.export({ format: "layout" });
await fs.writeFile(
  path.join(scratchDir.pathname, "riva-turnkey-flow-layout.json"),
  JSON.stringify(layout, null, 2),
);
