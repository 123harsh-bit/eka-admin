// Convert TipTap JSON to DOCX using the `docx` package.
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ExternalHyperlink,
} from 'docx';

type Node = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

const runFromTextNode = (n: Node): TextRun | ExternalHyperlink => {
  const marks = n.marks || [];
  const bold = marks.some((m) => m.type === 'bold');
  const italic = marks.some((m) => m.type === 'italic');
  const underline = marks.some((m) => m.type === 'underline');
  const strike = marks.some((m) => m.type === 'strike');
  const highlight = marks.some((m) => m.type === 'highlight');
  const linkMark = marks.find((m) => m.type === 'link');
  const run = new TextRun({
    text: n.text ?? '',
    bold,
    italics: italic,
    underline: underline ? {} : undefined,
    strike,
    highlight: highlight ? 'yellow' : undefined,
  });
  if (linkMark && typeof linkMark.attrs?.href === 'string') {
    return new ExternalHyperlink({
      link: linkMark.attrs.href as string,
      children: [run],
    });
  }
  return run;
};

const runsFromInline = (nodes?: Node[]): (TextRun | ExternalHyperlink)[] => {
  const out: (TextRun | ExternalHyperlink)[] = [];
  (nodes || []).forEach((n) => {
    if (n.type === 'text') out.push(runFromTextNode(n));
    else if (n.type === 'hardBreak') out.push(new TextRun({ text: '', break: 1 }));
    else if (n.content) out.push(...runsFromInline(n.content));
  });
  return out;
};

const headingLevelMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

const paragraphsFromNode = (n: Node): Paragraph[] => {
  switch (n.type) {
    case 'heading': {
      const lvl = Number(n.attrs?.level ?? 1);
      return [new Paragraph({
        heading: headingLevelMap[lvl] || HeadingLevel.HEADING_1,
        children: runsFromInline(n.content),
      })];
    }
    case 'paragraph':
      return [new Paragraph({
        alignment: (n.attrs?.textAlign as string) === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: runsFromInline(n.content),
      })];
    case 'bulletList':
    case 'orderedList': {
      const paras: Paragraph[] = [];
      (n.content || []).forEach((li) => {
        (li.content || []).forEach((child) => {
          paras.push(new Paragraph({
            bullet: n.type === 'bulletList' ? { level: 0 } : undefined,
            numbering: n.type === 'orderedList' ? { reference: 'ol', level: 0 } : undefined,
            children: runsFromInline(child.content),
          }));
        });
      });
      return paras;
    }
    case 'blockquote':
      return [new Paragraph({
        indent: { left: 720 },
        children: runsFromInline(n.content?.flatMap((c) => c.content || []) as Node[]),
      })];
    case 'horizontalRule':
      return [new Paragraph({ text: '───────────────' })];
    default:
      return [new Paragraph({ children: runsFromInline(n.content) })];
  }
};

const tableFromNode = (n: Node): Table => {
  const rows = (n.content || []).map((row) => {
    const cells = (row.content || []).map((cell) => {
      const children = (cell.content || []).flatMap(paragraphsFromNode);
      return new TableCell({
        children: children.length ? children : [new Paragraph('')],
        width: { size: 100 / (row.content?.length || 1), type: WidthType.PERCENTAGE },
      });
    });
    return new TableRow({ children: cells });
  });
  return new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } });
};

export async function exportEditorToDocx(json: unknown, filename: string) {
  const doc = json as { type: string; content?: Node[] };
  const children: (Paragraph | Table)[] = [];
  (doc.content || []).forEach((n) => {
    if (n.type === 'table') children.push(tableFromNode(n));
    else children.push(...paragraphsFromNode(n));
  });

  const document = new Document({
    numbering: {
      config: [{
        reference: 'ol',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT }],
      }],
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(document);
  const url = URL.createObjectURL(blob);
  const a = document_downloadEl(url, filename.endsWith('.docx') ? filename : `${filename}.docx`);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const document_downloadEl = (href: string, download: string) => {
  const a = window.document.createElement('a');
  a.href = href;
  a.download = download;
  a.style.display = 'none';
  window.document.body.appendChild(a);
  setTimeout(() => a.remove(), 1000);
  return a;
};
