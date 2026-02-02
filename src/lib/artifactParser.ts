// Artifact detection and parsing utilities

export type ArtifactType = 'code' | 'markdown' | 'image' | 'pdf' | 'docx' | 'text' | 'diagram';

export interface Artifact {
  id: string;
  type: ArtifactType;
  content: string;
  language?: string;
  filename?: string;
  title?: string;
  mimeType?: string;
}

export interface ParsedMessage {
  textSegments: Array<{ text: string; index: number }>;
  artifacts: Artifact[];
}

// Language detection for code blocks
const LANGUAGE_ALIASES: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'jsx': 'javascript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'shell': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
};

const normalizeLanguage = (lang: string): string => {
  const lower = lang.toLowerCase().trim();
  return LANGUAGE_ALIASES[lower] || lower;
};

// Generate unique ID for artifacts
const generateId = (): string => {
  return `artifact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Detect if content is a base64 image
const isBase64Image = (content: string): boolean => {
  return /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/.test(content);
};

// Detect if content looks like a data URL
const isDataUrl = (content: string): boolean => {
  return /^data:[a-z]+\/[a-z0-9.+-]+;base64,/i.test(content);
};

// Extract code blocks from markdown content
const extractCodeBlocks = (content: string): { blocks: Artifact[]; remaining: string } => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Artifact[] = [];
  let remaining = content;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1] ? normalizeLanguage(match[1]) : 'plaintext';
    const code = match[2].trim();
    
    // Skip empty code blocks
    if (!code) continue;

    // Detect filename from first line comment
    let filename: string | undefined;
    const firstLine = code.split('\n')[0];
    const filenameMatch = firstLine.match(/^(?:\/\/|#|\/\*)\s*(?:file:?\s*)?([a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }

    blocks.push({
      id: generateId(),
      type: 'code',
      content: code,
      language,
      filename,
      title: filename || `${language} code`,
    });

    // Replace the code block with a placeholder
    remaining = remaining.replace(match[0], `\n[[ARTIFACT:${blocks[blocks.length - 1].id}]]\n`);
  }

  return { blocks, remaining };
};

// Extract inline images (base64 or URLs)
const extractImages = (content: string): { images: Artifact[]; remaining: string } => {
  const images: Artifact[] = [];
  let remaining = content;

  // Match markdown images: ![alt](url)
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = markdownImageRegex.exec(content)) !== null) {
    const alt = match[1];
    const url = match[2];

    images.push({
      id: generateId(),
      type: 'image',
      content: url,
      title: alt || 'Image',
      mimeType: url.startsWith('data:') ? url.match(/data:([^;]+)/)?.[1] : undefined,
    });

    remaining = remaining.replace(match[0], `\n[[ARTIFACT:${images[images.length - 1].id}]]\n`);
  }

  // Match standalone base64 image data
  const base64Regex = /(data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+)/g;
  while ((match = base64Regex.exec(remaining)) !== null) {
    // Skip if already captured in markdown format
    if (images.some(img => img.content === match[1])) continue;

    images.push({
      id: generateId(),
      type: 'image',
      content: match[1],
      title: 'Generated Image',
      mimeType: match[1].match(/data:([^;]+)/)?.[1],
    });

    remaining = remaining.replace(match[0], `\n[[ARTIFACT:${images[images.length - 1].id}]]\n`);
  }

  return { images, remaining };
};

// Parse a message and extract all artifacts
export const parseMessageForArtifacts = (content: string): ParsedMessage => {
  if (!content) {
    return { textSegments: [], artifacts: [] };
  }

  let processedContent = content;
  const allArtifacts: Artifact[] = [];

  // Extract code blocks first
  const { blocks: codeBlocks, remaining: afterCode } = extractCodeBlocks(processedContent);
  allArtifacts.push(...codeBlocks);
  processedContent = afterCode;

  // Extract images
  const { images, remaining: afterImages } = extractImages(processedContent);
  allArtifacts.push(...images);
  processedContent = afterImages;

  // Split remaining content into text segments
  const segments = processedContent.split(/\[\[ARTIFACT:([^\]]+)\]\]/);
  const textSegments: Array<{ text: string; index: number }> = [];
  
  let currentIndex = 0;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i].trim();
    if (segment && !allArtifacts.find(a => a.id === segment)) {
      textSegments.push({ text: segment, index: currentIndex });
    }
    currentIndex++;
  }

  return {
    textSegments,
    artifacts: allArtifacts,
  };
};

// Get file extension from filename or mime type
export const getFileExtension = (filename?: string, mimeType?: string): string => {
  if (filename) {
    const ext = filename.split('.').pop();
    if (ext) return ext.toLowerCase();
  }
  
  if (mimeType) {
    const mimeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'text/plain': 'txt',
      'text/markdown': 'md',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
    };
    return mimeMap[mimeType] || 'bin';
  }

  return 'txt';
};

// Check if artifact should be rendered inline or as expandable
export const shouldRenderInline = (artifact: Artifact): boolean => {
  if (artifact.type === 'image') return true;
  if (artifact.type === 'code' && artifact.content.split('\n').length <= 10) return true;
  return false;
};
