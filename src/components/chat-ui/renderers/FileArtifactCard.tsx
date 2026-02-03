/**
 * File Artifact Card Component
 * Displays downloadable file artifacts with icon, filename, and download button
 */

import { useMemo, useCallback } from 'react';
import { Download, FileText, FileSpreadsheet, FileImage, File, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileArtifactCardProps {
  filename: string;
  content: string;
  mimeType?: string;
  size?: number;
  className?: string;
}

// Get file type info from filename and mime type
function getFileTypeInfo(filename: string, mimeType?: string) {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  const typeMap: Record<string, { icon: typeof FileText; label: string; color: string }> = {
    pdf: { icon: FileText, label: 'PDF', color: 'text-red-500' },
    doc: { icon: FileText, label: 'Word', color: 'text-blue-600' },
    docx: { icon: FileText, label: 'Word', color: 'text-blue-600' },
    xls: { icon: FileSpreadsheet, label: 'Excel', color: 'text-green-600' },
    xlsx: { icon: FileSpreadsheet, label: 'Excel', color: 'text-green-600' },
    csv: { icon: FileSpreadsheet, label: 'CSV', color: 'text-green-600' },
    png: { icon: FileImage, label: 'PNG', color: 'text-purple-500' },
    jpg: { icon: FileImage, label: 'JPEG', color: 'text-purple-500' },
    jpeg: { icon: FileImage, label: 'JPEG', color: 'text-purple-500' },
    gif: { icon: FileImage, label: 'GIF', color: 'text-purple-500' },
    webp: { icon: FileImage, label: 'WebP', color: 'text-purple-500' },
    svg: { icon: FileImage, label: 'SVG', color: 'text-purple-500' },
    js: { icon: FileCode, label: 'JavaScript', color: 'text-yellow-500' },
    ts: { icon: FileCode, label: 'TypeScript', color: 'text-blue-500' },
    py: { icon: FileCode, label: 'Python', color: 'text-blue-400' },
    html: { icon: FileCode, label: 'HTML', color: 'text-orange-500' },
    css: { icon: FileCode, label: 'CSS', color: 'text-blue-400' },
    json: { icon: FileCode, label: 'JSON', color: 'text-yellow-600' },
    txt: { icon: FileText, label: 'Text', color: 'text-muted-foreground' },
    md: { icon: FileText, label: 'Markdown', color: 'text-muted-foreground' },
  };

  return typeMap[extension] || { icon: File, label: extension.toUpperCase() || 'File', color: 'text-muted-foreground' };
}

// Format file size
function formatSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function FileArtifactCard({
  filename,
  content,
  mimeType,
  size,
  className,
}: FileArtifactCardProps) {
  const { icon: Icon, label, color } = useMemo(
    () => getFileTypeInfo(filename, mimeType),
    [filename, mimeType]
  );

  const formattedSize = useMemo(() => formatSize(size), [size]);

  const handleDownload = useCallback(() => {
    let blob: Blob;
    
    // Check if content is base64 data URL
    if (content.startsWith('data:')) {
      const [header, base64] = content.split(',');
      const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
      const binary = atob(base64);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      blob = new Blob([array], { type: mime });
    } else {
      // Plain text content
      blob = new Blob([content], { type: mimeType || 'text/plain' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, filename, mimeType]);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-3 px-4 py-3 rounded-xl',
        'bg-muted/50 border border-border hover:bg-muted transition-colors',
        'group cursor-pointer',
        className
      )}
      onClick={handleDownload}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDownload();
        }
      }}
    >
      <div className={cn('p-2 rounded-lg bg-background', color)}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate max-w-[200px]">{filename}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-medium uppercase tracking-wider">
            {label}
          </span>
          {formattedSize && <span>{formattedSize}</span>}
        </div>
      </div>

      <Download className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
    </div>
  );
}
