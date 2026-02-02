import { useState, useMemo, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { List, Search, User, Sparkles, ChevronUp, ChevronDown, X } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  files?: Array<{
    name: string;
    type: string;
    size: number;
    content: string;
  }>;
}

interface MessageGroup {
  userIndex: number;
  userMessage: Message;
  aiMessage?: Message;
  aiIndex?: number;
}

interface MessageNavigatorProps {
  messages: Message[];
  onMessageClick: (index: number) => void;
}

export const MessageNavigator = ({
  messages,
  onMessageClick,
}: MessageNavigatorProps) => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(-1);

  // Group messages into user prompt + AI response pairs
  const messageGroups = useMemo(() => {
    const groups: MessageGroup[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (msg.role === "user") {
        const aiResponse = messages[i + 1];
        groups.push({
          userIndex: i,
          userMessage: msg,
          aiMessage: aiResponse?.role === "assistant" ? aiResponse : undefined,
          aiIndex: aiResponse?.role === "assistant" ? i + 1 : undefined,
        });
      } else if (i === 0 || messages[i - 1]?.role !== "user") {
        // Standalone AI message (like greeting)
        groups.push({
          userIndex: i,
          userMessage: msg,
        });
      }
    }
    
    return groups;
  }, [messages]);

  // Filter groups based on search
  const filteredGroups = useMemo(() => {
    if (!search.trim()) {
      return messageGroups;
    }
    
    const searchLower = search.toLowerCase();
    return messageGroups.filter((group) => {
      const userMatch = group.userMessage.content.toLowerCase().includes(searchLower);
      const aiMatch = group.aiMessage?.content.toLowerCase().includes(searchLower);
      return userMatch || aiMatch;
    });
  }, [messageGroups, search]);

  const getPreview = (content: string, maxLength: number = 50) => {
    const cleaned = content.replace(/\n/g, ' ').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.slice(0, maxLength) + "...";
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>
        : part
    );
  };

  const handleSelect = useCallback((userIndex: number) => {
    onMessageClick(userIndex);
    setOpen(false);
    setSearch("");
    setSelectedGroupIndex(-1);
  }, [onMessageClick]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedGroupIndex(prev => 
        prev < filteredGroups.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedGroupIndex(prev => prev > 0 ? prev - 1 : prev);
    } else if (e.key === "Enter" && selectedGroupIndex >= 0) {
      e.preventDefault();
      handleSelect(filteredGroups[selectedGroupIndex].userIndex);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }, [filteredGroups, selectedGroupIndex, handleSelect]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedGroupIndex(-1);
  }, [search]);

  // Keyboard shortcut to open navigator
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  if (messages.length <= 1) {
    return null;
  }

  const userMessageCount = messages.filter(m => m.role === "user").length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-8"
          title="Jump to message (⌘K)"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">Jump</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-96 p-0 z-50 bg-popover border shadow-xl" 
        align="end"
        sideOffset={8}
      >
        {/* Search Header */}
        <div className="p-3 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 pr-8 h-9 bg-background"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{filteredGroups.length} conversation{filteredGroups.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-2">
              <kbd className="inline-flex items-center rounded border bg-muted px-1 text-[10px]">↑↓</kbd>
              <span>navigate</span>
              <kbd className="inline-flex items-center rounded border bg-muted px-1 text-[10px]">↵</kbd>
              <span>select</span>
            </div>
          </div>
        </div>

        {/* Message Groups List */}
        <ScrollArea className="h-[320px]">
          <div className="p-2 space-y-1">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No messages found
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              filteredGroups.map((group, idx) => {
                const isSelected = idx === selectedGroupIndex;
                const isStandaloneAI = group.userMessage.role === "assistant";
                
                return (
                  <button
                    key={group.userIndex}
                    onClick={() => handleSelect(group.userIndex)}
                    className={`w-full text-left rounded-lg transition-all ${
                      isSelected 
                        ? 'bg-primary/10 ring-1 ring-primary/30' 
                        : 'hover:bg-accent'
                    }`}
                  >
                    <div className="p-3 space-y-2">
                      {/* Group Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                          {isStandaloneAI ? 'AI Message' : `Exchange #${idx + 1}`}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          #{group.userIndex + 1}
                        </span>
                      </div>

                      {/* User Prompt */}
                      {!isStandaloneAI && (
                        <div className="flex items-start gap-2">
                          <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center">
                            <User className="h-3 w-3 text-foreground/70" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-foreground/80 mb-0.5">You</p>
                            <p className="text-sm text-foreground leading-snug">
                              {highlightMatch(getPreview(group.userMessage.content, 60), search)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* AI Response */}
                      {(group.aiMessage || isStandaloneAI) && (
                        <div className="flex items-start gap-2">
                          <div className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                            <Sparkles className="h-3 w-3 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-primary/80 mb-0.5">AI</p>
                            <p className="text-xs text-muted-foreground leading-snug">
                              {highlightMatch(
                                getPreview(
                                  isStandaloneAI 
                                    ? group.userMessage.content 
                                    : group.aiMessage!.content, 
                                  80
                                ), 
                                search
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t bg-muted/20">
          <p className="text-[10px] text-center text-muted-foreground">
            {userMessageCount} prompt{userMessageCount !== 1 ? 's' : ''} • {messages.length} total messages
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};