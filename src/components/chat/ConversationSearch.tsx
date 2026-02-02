import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, MessageSquare, Calendar, Sparkles, User } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
  conversation_id: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  session_id: string;
  user_sessions?: {
    model_name: string;
    plan_id: string;
  };
}

interface SearchResult {
  conversation: Conversation;
  matchedMessages: Array<{
    message: Message;
    matchContext: string;
  }>;
  relevanceScore: number;
}

interface ConversationSearchProps {
  conversations: Conversation[];
  allMessages: Map<string, Message[]>;
  onConversationSelect: (conversation: Conversation) => void;
  onMessageSelect?: (conversationId: string, messageId: string) => void;
}

export const ConversationSearch = ({
  conversations,
  allMessages,
  onConversationSelect,
  onMessageSelect,
}: ConversationSearchProps) => {
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsSearching(true);
      }
      if (e.key === "Escape" && isSearching) {
        setSearch("");
        setIsSearching(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearching]);

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!search.trim()) return [];

    const query = search.toLowerCase();
    const results: SearchResult[] = [];

    for (const conversation of conversations) {
      const messages = allMessages.get(conversation.id) || [];
      const matchedMessages: SearchResult["matchedMessages"] = [];
      let relevanceScore = 0;

      // Check title match
      if (conversation.title.toLowerCase().includes(query)) {
        relevanceScore += 10;
      }

      // Check message content
      for (const message of messages) {
        const content = message.content.toLowerCase();
        if (content.includes(query)) {
          relevanceScore += message.role === "user" ? 3 : 1;
          
          // Extract context around match
          const idx = content.indexOf(query);
          const start = Math.max(0, idx - 30);
          const end = Math.min(content.length, idx + query.length + 50);
          const context = (start > 0 ? "..." : "") + 
            message.content.slice(start, end) + 
            (end < content.length ? "..." : "");

          matchedMessages.push({
            message,
            matchContext: context,
          });
        }
      }

      if (relevanceScore > 0) {
        results.push({
          conversation,
          matchedMessages: matchedMessages.slice(0, 3), // Limit to 3 matches per conversation
          relevanceScore,
        });
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [search, conversations, allMessages]);

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">{part}</mark>
        : part
    );
  };

  const handleResultClick = (conversation: Conversation, messageId?: string) => {
    if (messageId && onMessageSelect) {
      onMessageSelect(conversation.id, messageId);
    } else {
      onConversationSelect(conversation);
    }
    setSearch("");
    setIsSearching(false);
  };

  const hasResults = searchResults.length > 0;
  const showResults = search.trim().length > 0;

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search conversations... (⌘F)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsSearching(true);
          }}
          onFocus={() => setIsSearching(true)}
          className="pl-9 pr-8 h-10"
        />
        {search && (
          <button
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {hasResults 
                ? `${searchResults.length} conversation${searchResults.length !== 1 ? 's' : ''} found`
                : 'No results found'
              }
            </p>
          </div>

          <ScrollArea className="max-h-[400px]">
            {!hasResults ? (
              <div className="p-8 text-center">
                <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No conversations match your search</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Try different keywords</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.conversation.id}
                    className="rounded-lg border bg-card hover:bg-accent/50 transition-colors overflow-hidden"
                  >
                    {/* Conversation Header */}
                    <button
                      onClick={() => handleResultClick(result.conversation)}
                      className="w-full p-3 text-left hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {highlightMatch(result.conversation.title, search)}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(result.conversation.updated_at), 'MMM d, yyyy')}</span>
                            <span>•</span>
                            <MessageSquare className="h-3 w-3" />
                            <span>{result.conversation.message_count} messages</span>
                          </div>
                        </div>
                        {result.conversation.user_sessions && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {result.conversation.user_sessions.model_name.replace('google/', '').replace('gemini-', '')}
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Matched Messages */}
                    {result.matchedMessages.length > 0 && (
                      <div className="border-t bg-muted/20">
                        {result.matchedMessages.map((match, idx) => (
                          <button
                            key={match.message.id}
                            onClick={() => handleResultClick(result.conversation, match.message.id)}
                            className="w-full p-2 text-left hover:bg-accent/50 transition-colors flex items-start gap-2 border-b last:border-b-0"
                          >
                            <div className="shrink-0 mt-0.5">
                              {match.message.role === "user" ? (
                                <User className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Sparkles className="h-3 w-3 text-primary" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                              {highlightMatch(match.matchContext, search)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Backdrop */}
      {showResults && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setSearch("");
            setIsSearching(false);
          }}
        />
      )}
    </div>
  );
};