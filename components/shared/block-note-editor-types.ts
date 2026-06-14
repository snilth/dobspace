import {
  Type, Heading1, Heading2, Heading3, List, ListOrdered, ListChecks, Quote,
  type LucideIcon,
} from "lucide-react";

export type BlockType =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulleted"
  | "numbered"
  | "todo"
  | "quote";

export type Block = {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
};

export const BLOCK_OPTIONS: { type: BlockType; label: string; icon: LucideIcon; hint: string }[] = [
  { type: "paragraph", label: "Text", icon: Type, hint: "" },
  { type: "heading1", label: "Heading 1", icon: Heading1, hint: "#" },
  { type: "heading2", label: "Heading 2", icon: Heading2, hint: "##" },
  { type: "heading3", label: "Heading 3", icon: Heading3, hint: "###" },
  { type: "bulleted", label: "Bulleted list", icon: List, hint: "-" },
  { type: "numbered", label: "Numbered list", icon: ListOrdered, hint: "1." },
  { type: "todo", label: "To-do list", icon: ListChecks, hint: "[]" },
  { type: "quote", label: "Quote", icon: Quote, hint: '"' },
];

export const LIST_TYPES: BlockType[] = ["bulleted", "numbered", "todo"];

let counter = 0;
export function makeId() {
  counter += 1;
  return `b${Date.now()}${counter}`;
}

function mk(type: BlockType, text: string, checked?: boolean): Block {
  return { id: makeId(), type, text, checked };
}

export function parseMarkdown(md: string): Block[] {
  if (!md.trim()) return [mk("paragraph", "")];
  return md.split("\n").map((line) => {
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^### (.*)$/))) return mk("heading3", m[1]);
    if ((m = line.match(/^## (.*)$/))) return mk("heading2", m[1]);
    if ((m = line.match(/^# (.*)$/))) return mk("heading1", m[1]);
    if ((m = line.match(/^- \[([ xX])\] (.*)$/))) return mk("todo", m[2], m[1].toLowerCase() === "x");
    if ((m = line.match(/^[-*] (.*)$/))) return mk("bulleted", m[1]);
    if ((m = line.match(/^\d+\. (.*)$/))) return mk("numbered", m[1]);
    if ((m = line.match(/^> (.*)$/))) return mk("quote", m[1]);
    return mk("paragraph", line);
  });
}

export function serializeMarkdown(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading1": return `# ${b.text}`;
        case "heading2": return `## ${b.text}`;
        case "heading3": return `### ${b.text}`;
        case "bulleted": return `- ${b.text}`;
        case "numbered": return `1. ${b.text}`;
        case "todo": return `- [${b.checked ? "x" : " "}] ${b.text}`;
        case "quote": return `> ${b.text}`;
        default: return b.text;
      }
    })
    .join("\n");
}

export const TEXT_SHORTCUTS: { pattern: RegExp; type: BlockType }[] = [
  { pattern: /^### $/, type: "heading3" },
  { pattern: /^## $/, type: "heading2" },
  { pattern: /^# $/, type: "heading1" },
  { pattern: /^- \[\] $/, type: "todo" },
  { pattern: /^\[\] $/, type: "todo" },
  { pattern: /^[-*] $/, type: "bulleted" },
  { pattern: /^1\. $/, type: "numbered" },
  { pattern: /^> $/, type: "quote" },
];
