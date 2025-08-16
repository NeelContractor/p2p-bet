/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"
import { useEffect, useState } from "react";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Messages, UserAvatar } from "./Messages";
import { MessageInput } from "../MessageInput";
import { pusherClient } from "@/lib/pusher";
import { User } from "@prisma/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Users, Globe, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Message {
  id: string | number;
  content: string | null;
  sender: User | null;
  senderId: string | null;
  timestamp: string | null;
}

export interface ChatBet { 
  betTitle: string;
  betPubKey: string;
}

interface OnlineUsersProps {
  channel: string;
  currentUser: User;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function OnlineUsers({ channel, currentUser, isCollapsed = false, onToggleCollapse }: OnlineUsersProps) {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([currentUser]);

  useEffect(() => {
    // Subscribe to presence channel
    const presenceChannel = pusherClient.subscribe(`presence-${channel}`);

    // Initial list of members
    presenceChannel.bind('pusher:subscription_succeeded', (members: any) => {
      const users: User[] = [];
      members.each((member: any) => {
        if (member.info) users.push(member.info);
      });
      setOnlineUsers(users);
    });

    // User joined
    presenceChannel.bind('pusher:member_added', (member: any) => {
      if (member.info && member.info.id !== currentUser.id) {
        setOnlineUsers(prev => {
          const exists = prev.some(user => user.id === member.info.id);
          return exists ? prev : [...prev, member.info];
        });
      }
    });

    // User left
    presenceChannel.bind('pusher:member_removed', (member: any) => {
      if (member.info) {
        setOnlineUsers(prev => prev.filter(user => user.id !== member.info.id));
      }
    });

    return () => {
      pusherClient.unsubscribe(`presence-${channel}`);
    };
  }, [channel, currentUser.id]);

  if (isCollapsed) {
    return (
      <div className="w-16 border-l border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="mb-4 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center space-y-3">
          <div className="text-center">
            <Users className="h-5 w-5 text-slate-500 mx-auto mb-1" />
            <Badge variant="secondary" className="text-xs px-2 py-1">
              {onlineUsers.length}
            </Badge>
          </div>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {onlineUsers.slice(0, 8).map((user) => (
                <div key={user.id} className="relative group">
                  <UserAvatar user={user} />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                </div>
              ))}
              {onlineUsers.length > 8 && (
                <div className="text-xs text-slate-500 text-center mt-2">
                  +{onlineUsers.length - 8}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-none border-r-0 border-t-0 border-b-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Online Users</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Active in chat</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/30">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              {onlineUsers.length} online
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-3">
            {onlineUsers.map((user) => (
              <div 
                key={user.id} 
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  currentUser?.id === user.id && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                )}
              >
                <div className="relative">
                  <UserAvatar user={user} />
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                    <span className="w-2 h-2 bg-white rounded-full"></span>
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {user.username || `User ${user.id}`}
                    </span>
                    {currentUser?.id === user.id && (
                      <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user.walletPublicKey ? `${user.walletPublicKey.slice(0, 8)}...` : 'Anonymous'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface PublicChatProps {
  userId: string;
  initialMessages: Message[];
  bets: ChatBet[];
  currentUser?: User;
}

export function PublicChat({ userId, initialMessages, bets, currentUser }: PublicChatProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-full w-full bg-white dark:bg-slate-950">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Global Chat</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center">
                <Zap className="h-3 w-3 mr-1" />
                Live betting discussion
              </p>
            </div>
          </div>
          
          {/* Active Bets Badge */}
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700">
            {bets.length} Active Bets
          </Badge>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden bg-gradient-to-b from-slate-50/50 to-white dark:from-slate-900/50 dark:to-slate-950">
          {initialMessages.length > 0 && userId ? (
            <Messages
              initialMessages={initialMessages}
              currentUserId={userId}
              channel="global-chat"
              event="incoming-message"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-md mx-auto p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mx-auto">
                  <Globe className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Welcome to Global Chat</h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Start the conversation! Share your thoughts, discuss bets, and connect with other users.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <MessageInput />
        </div>
      </div>

      {/* Online Users Sidebar */}
      {currentUser && (
        <OnlineUsers 
          channel="global-chat" 
          currentUser={currentUser}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}
    </div>
  );
}