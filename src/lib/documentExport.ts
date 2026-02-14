import { Document, Paragraph, TextRun, Packer, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export function downloadMarkdown(content: string, filename?: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `response-${Date.now()}.md`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadDocx(content: string, filename?: string) {
  // Parse markdown-ish content into paragraphs
  const lines = content.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    const trimmed = line.trimStart();

    if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3 }));
    } else if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(new Paragraph({ text: trimmed.slice(2), bullet: { level: 0 } }));
    } else if (/^\d+\.\s/.test(trimmed)) {
      children.push(new Paragraph({ text: trimmed.replace(/^\d+\.\s/, ''), numbering: { reference: 'default', level: 0 } }));
    } else if (trimmed === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      // Handle inline bold/italic
      const runs: TextRun[] = [];
      const parts = trimmed.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
      for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
          runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
        } else if (part.startsWith('*') && part.endsWith('*')) {
          runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
        } else {
          runs.push(new TextRun({ text: part }));
        }
      }
      children.push(new Paragraph({ children: runs }));
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'default',
        levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: 'start' as any }],
      }],
    },
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename || `response-${Date.now()}.docx`);
}
