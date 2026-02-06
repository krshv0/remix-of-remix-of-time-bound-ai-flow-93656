import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Image, Loader2, Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImageGeneratorProps {
  sessionId: string;
  conversationId?: string;
  creditsRemaining: number;
  onImageGenerated: () => void;
  onClose?: () => void;
}

export const ImageGenerator = ({ 
  sessionId, 
  conversationId, 
  creditsRemaining,
  onImageGenerated,
  onClose
}: ImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      });
      return;
    }

    if (creditsRemaining <= 0) {
      toast({
        title: "No Credits Remaining",
        description: "You've used all your image generation credits for this session.",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt, sessionId, conversationId },
      });

      if (error) throw error;

      if (data.error) {
        if (data.loading) {
          toast({
            title: "Model Loading",
            description: data.error,
          });
        } else {
          toast({
            title: "Generation Failed",
            description: data.error,
            variant: "destructive",
          });
        }
        return;
      }

      setGeneratedImage(data.imageUrl);
      onImageGenerated();
      
      toast({
        title: "Image Generated!",
        description: `${data.creditsRemaining} credits remaining`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate image",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `generated-${Date.now()}.png`;
      link.click();
    }
  };

  return (
    <Card className="p-4 space-y-4 border-primary/20">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Image className="w-4 h-4 text-primary" />
          Generate Image
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {creditsRemaining} credits left
          </span>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Describe the image you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={generating}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleGenerate()}
          className="flex-1"
        />
        <Button 
          onClick={handleGenerate} 
          disabled={generating || creditsRemaining <= 0}
          size="sm"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Image className="w-4 h-4 mr-2" />
              Generate
            </>
          )}
        </Button>
      </div>

      {generating && (
        <div className="text-xs text-muted-foreground text-center py-2">
          This may take 3-5 seconds...
        </div>
      )}

      {generatedImage && (
        <div className="relative group">
          <img 
            src={generatedImage} 
            alt="Generated" 
            className="w-full rounded-lg border"
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Prompt: {prompt}
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        💡 Tip: Be specific in your description for better results
      </div>
    </Card>
  );
};
