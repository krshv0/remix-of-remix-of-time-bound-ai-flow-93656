import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileAttachment } from "./FileAttachment";
import { supabase } from "@/integrations/supabase/client";

interface AttachedFile {
  name: string;
  type: string;
  size: number;
  content: string;
}

export const FileAttachmentTest = () => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [testResult, setTestResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testFileAttachment = async () => {
    if (attachedFiles.length === 0) {
      setTestResult("Please attach a file first");
      return;
    }

    setIsLoading(true);
    setTestResult("Testing file attachment...");

    try {
      console.log('Files to test:', attachedFiles);
      
      // Mock session data for testing
      const mockSession = {
        id: "test-session",
        model_name: "test-model"
      };

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [{ role: "user", content: "Please analyze this attached file." }],
          sessionId: mockSession.id,
          files: attachedFiles,
        },
      });

      if (error) {
        setTestResult(`Error: ${error.message}`);
        console.error('Supabase function error:', error);
        return;
      }

      if (data.error) {
        setTestResult(`API Error: ${data.error}`);
        console.error('API error:', data.error);
        return;
      }

      setTestResult(`Success! AI Response: ${data.message}`);
      console.log('Success response:', data);

    } catch (error: any) {
      setTestResult(`Exception: ${error.message}`);
      console.error('Test error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>File Attachment Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FileAttachment 
          onFilesChange={setAttachedFiles}
          disabled={isLoading}
        />
        
        {attachedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Attached Files:</h4>
            {attachedFiles.map((file, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                <p><strong>Name:</strong> {file.name}</p>
                <p><strong>Type:</strong> {file.type}</p>
                <p><strong>Size:</strong> {file.size} bytes</p>
                <p><strong>Content length:</strong> {file.content.length} characters</p>
                <p><strong>Content preview:</strong> {file.content.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        )}
        
        <Button 
          onClick={testFileAttachment} 
          disabled={isLoading || attachedFiles.length === 0}
        >
          {isLoading ? "Testing..." : "Test File Attachment"}
        </Button>
        
        {testResult && (
          <div className="p-4 bg-secondary rounded-md">
            <pre className="text-sm whitespace-pre-wrap">{testResult}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};