import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, File, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface AttachedFile {
  name: string;
  type: string;
  size: number;
  content: string;
}

interface FileAttachmentProps {
  onFilesChange: (files: AttachedFile[]) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_FILES = 5;
const ACCEPTED_TYPES = {
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'application/vnd.ms-powerpoint': '.ppt',
  'image/jpeg': '.jpg,.jpeg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'text/csv': '.csv',
};

export const FileAttachment = ({ onFilesChange, disabled }: FileAttachmentProps) => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const { toast } = useToast();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const extractPdfText = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');

        fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
      }

      return fullText.trim() || "[PDF document appears to be empty or contains only images]";
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error('Failed to extract PDF text');
    }
  };

  const extractDocxText = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim() || "[Word document appears to be empty]";
    } catch (error) {
      console.error('DOCX extraction error:', error);
      throw new Error('Failed to extract Word document text');
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result);
      };

      reader.onerror = () => reject(new Error('Failed to read file'));

      // For text-based files, read as text. For others, read as base64
      if (file.type.startsWith('text/') || file.type === 'text/csv') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (attachedFiles.length + files.length > MAX_FILES) {
      toast({
        title: "Too many files",
        description: `You can only attach up to ${MAX_FILES} files per message.`,
        variant: "destructive",
      });
      return;
    }

    const validFiles: AttachedFile[] = [];
    
    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 25MB limit.`,
          variant: "destructive",
        });
        continue;
      }

      // Validate file type
      if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type.`,
          variant: "destructive",
        });
        continue;
      }

      try {
        let content: string;

        // Extract text from different document types
        if (file.type === 'application/pdf') {
          toast({
            title: "Processing PDF",
            description: `Extracting text from ${file.name}...`,
          });
          content = await extractPdfText(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          toast({
            title: "Processing Word document",
            description: `Extracting text from ${file.name}...`,
          });
          content = await extractDocxText(file);
        } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
          // PowerPoint files - read as base64 for now
          // Client-side PPT parsing is limited, but we'll send it for AI to attempt to understand
          toast({
            title: "Processing PowerPoint",
            description: `Preparing ${file.name} for AI analysis...`,
          });
          content = await readFileContent(file);
        } else {
          // Images, text files, and other formats
          content = await readFileContent(file);
        }

        validFiles.push({
          name: file.name,
          type: file.type,
          size: file.size,
          content,
        });

        if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          toast({
            title: "Document processed",
            description: `Successfully extracted text from ${file.name}.`,
          });
        }
      } catch (error) {
        toast({
          title: "Error reading file",
          description: `Failed to read ${file.name}. ${error instanceof Error ? error.message : ''}`,
          variant: "destructive",
        });
      }
    }

    if (validFiles.length > 0) {
      const newFiles = [...attachedFiles, ...validFiles];
      setAttachedFiles(newFiles);
      onFilesChange(newFiles);
    }

    // Reset input
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = attachedFiles.filter((_, i) => i !== index);
    setAttachedFiles(newFiles);
    onFilesChange(newFiles);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="file"
          id="file-input"
          multiple
          accept={Object.values(ACCEPTED_TYPES).join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => document.getElementById('file-input')?.click()}
          disabled={disabled || attachedFiles.length >= MAX_FILES}
          title="Attach files"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        {attachedFiles.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {attachedFiles.length}/{MAX_FILES} files
          </span>
        )}
      </div>

      {attachedFiles.length > 0 && (
        <div className="space-y-1">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-secondary rounded text-sm"
            >
              {getFileIcon(file.type)}
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => removeFile(index)}
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
