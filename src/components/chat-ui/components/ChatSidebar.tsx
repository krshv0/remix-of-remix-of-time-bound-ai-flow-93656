/**
 * Chat Sidebar Component
 * Collapsible sidebar for conversation history and navigation
 */

import { useState, useMemo } from 'react';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Edit3,
  MessageSquare,
  Sun,
  Moon,
  Settings,
  History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Conversation } from '../types';

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId?: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  className?: string;
}

// Group conversations by time period
function groupConversations(conversations: Conversation[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const groups: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    'This Month': [],
    Older: [],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.updatedAt);
    if (date >= today) {
      groups['Today'].push(conv);
    } else if (date >= yesterday) {
      groups['Yesterday'].push(conv);
    } else if (date >= lastWeek) {
      groups['This Week'].push(conv);
    } else if (date >= lastMonth) {
      groups['This Month'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  });

  return Object.entries(groups).filter(([_, convs]) => convs.length > 0);
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  onRename?: (newTitle: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== conversation.title) {
      onRename?.(editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer',
        'transition-colors duration-150',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
      )}
      onClick={() => !isEditing && onSelect()}
      onMouseEnter={() => setShowMenu(true)}
      onMouseLeave={() => !isEditing && setShowMenu(false)}
    >
      <MessageSquare className="w-4 h-4 shrink-0 opacity-70" />

      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className={cn(
            'flex-1 bg-transparent border-b border-sidebar-border outline-none text-sm',
            'px-1 py-0.5'
          )}
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-sm">{conversation.title}</span>
      )}

      {/* Menu button */}
      {showMenu && !isEditing && (onDelete || onRename) && (
        <div className="flex items-center gap-0.5">
          {onRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditTitle(conversation.title);
                setIsEditing(true);
              }}
              className={cn(
                'p-1 rounded opacity-60 hover:opacity-100',
                'hover:bg-sidebar-accent transition-opacity'
              )}
              aria-label="Rename conversation"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={cn(
                'p-1 rounded opacity-60 hover:opacity-100',
                'hover:bg-destructive/20 hover:text-destructive transition-all'
              )}
              aria-label="Delete conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatSidebar({
  isOpen,
  onToggle,
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  isDarkMode = false,
  onToggleTheme,
  className,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(query) ||
        conv.preview?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const groupedConversations = useMemo(
    () => groupConversations(filteredConversations),
    [filteredConversations]
  );

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col',
          'bg-sidebar border-r border-sidebar-border',
          'transition-all duration-300 ease-in-out',
          isOpen ? 'w-72' : 'w-0',
          className
        )}
      >
        <div className={cn('flex flex-col h-full', !isOpen && 'invisible')}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <button
              onClick={onNewChat}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                'bg-sidebar-primary text-sidebar-primary-foreground',
                'hover:opacity-90 transition-opacity',
                'text-sm font-medium'
              )}
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
            <button
              onClick={onToggle}
              className={cn(
                'p-2 rounded-lg',
                'text-sidebar-foreground/70 hover:text-sidebar-foreground',
                'hover:bg-sidebar-accent transition-colors'
              )}
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className={cn(
                  'w-full pl-9 pr-3 py-2 rounded-lg',
                  'bg-sidebar-accent/50 border-0',
                  'text-sm placeholder:text-sidebar-foreground/50',
                  'focus:outline-none focus:ring-2 focus:ring-sidebar-ring/30'
                )}
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {groupedConversations.length === 0 ? (
              <div className="text-center py-8 text-sidebar-foreground/50 text-sm">
                {searchQuery ? 'No conversations found' : 'No conversations yet'}
              </div>
            ) : (
              groupedConversations.map(([group, convs]) => (
                <div key={group} className="mb-4">
                  <div className="px-3 py-1.5 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                    {group}
                  </div>
                  {convs.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={conv.id === activeConversationId}
                      onSelect={() => onSelectConversation(conv.id)}
                      onDelete={onDeleteConversation ? () => onDeleteConversation(conv.id) : undefined}
                      onRename={
                        onRenameConversation
                          ? (newTitle) => onRenameConversation(conv.id, newTitle)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-3 space-y-1">
            <button
              onClick={onToggleTheme}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'text-sidebar-foreground/70 hover:text-sidebar-foreground',
                'hover:bg-sidebar-accent transition-colors',
                'text-sm'
              )}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </div>
      </aside>

      {/* Toggle button when closed */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className={cn(
            'fixed top-4 left-4 z-30',
            'p-2.5 rounded-lg',
            'bg-background border shadow-sm',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted transition-colors'
          )}
          aria-label="Open sidebar"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
      )}

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
