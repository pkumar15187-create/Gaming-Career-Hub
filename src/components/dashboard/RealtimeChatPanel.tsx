import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Team, AdminSettings } from '../../types';
import { supabaseSocialService, ChatMessage, Conversation } from '../../lib/supabaseSocialService';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import { Send, Image, MessageSquare, ShieldAlert, Sparkles, Check, CheckCheck, Users, Info, Calendar, Shield } from 'lucide-react';
import { GamerAvatar } from '../GamerAvatar';

interface RealtimeChatPanelProps {
  currentUser: UserProfile;
  adminSettings: AdminSettings;
  userTeams: Team[];
  users: UserProfile[];
  initialConversationUserId?: string | null;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const RealtimeChatPanel: React.FC<RealtimeChatPanelProps> = ({
  currentUser,
  adminSettings,
  userTeams,
  users,
  initialConversationUserId,
  addToast
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUploadUrl, setImageUploadUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load all Conversations
  const loadConversations = async () => {
    try {
      setLoadingConvs(true);
      const list = await supabaseSocialService.getConversations(currentUser.id);
      
      // If none, we can create or check fallbacks
      setConversations(list);

      // Handle preset conversation selection
      if (initialConversationUserId) {
        // Find if conversation exists with this user
        const existing = list.find(c => {
          const isDirect = !c.is_group;
          const hasFriend = c.members?.includes(initialConversationUserId);
          return isDirect && hasFriend;
        });

        if (existing) {
          setSelectedConv(existing);
        } else {
          // Create new one dynamically
          const newConv = await supabaseSocialService.startOrCreateConversation(currentUser.id, initialConversationUserId);
          // Reload
          const updatedList = await supabaseSocialService.getConversations(currentUser.id);
          setConversations(updatedList);
          const newlyCreated = updatedList.find(c => c.id === newConv.id);
          if (newlyCreated) setSelectedConv(newlyCreated);
        }
      } else if (list.length > 0 && !selectedConv) {
        setSelectedConv(list[0]);
      }
    } catch (err) {
      console.warn("Could not grab tactical communications network lists", err);
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [currentUser?.id, initialConversationUserId]);

  // Load messages for chosen conversation
  useEffect(() => {
    if (!selectedConv) return;
    
    const loadMessages = async () => {
      try {
        setLoadingMsgs(true);
        const list = await supabaseSocialService.getChatMessages(selectedConv.id);
        setMessages(list);
        
        // Mark as read
        await supabaseSocialService.markMessagesAsRead(selectedConv.id, currentUser.id);
      } catch (err) {
        console.warn("Error getting message files", err);
      } finally {
        setLoadingMsgs(false);
      }
    };

    loadMessages();
  }, [selectedConv, currentUser]);

  // Handle Realtime Messages Insertion
  useEffect(() => {
    if (!selectedConv || !isSupabaseConfigured || !supabase) return;

    // Listen to chat_messages changes under this conversation
    const channel = supabase
      .channel(`tactical_comms_room:${selectedConv.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${selectedConv.id}`
        },
        async (payload) => {
          const msg = payload.new as ChatMessage;
          
          setMessages((prev) => {
            // Mitigate duplicate insertions (network resilience rule)
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          // Mark as read if receiving side
          if (msg.sender_id !== currentUser.id) {
            await supabaseSocialService.markMessagesAsRead(selectedConv.id, currentUser.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv, currentUser]);

  // Auto Scroll Chat Body
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Transmit Message Command
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || (!newMessage.trim() && !imageUploadUrl.trim())) return;

    try {
      const msg = await supabaseSocialService.sendMessage(
        selectedConv.id,
        currentUser.id,
        newMessage.trim(),
        imageUploadUrl.trim() || undefined
      );

      // Append to state if Supabase local fallback scenario,
      // otherwise, Realtime channel takes care of inserting.
      if (!isSupabaseConfigured || !supabase) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      setNewMessage('');
      setImageUploadUrl('');
      setShowImageInput(false);
    } catch (err) {
      console.error("Transmission error:", err);
      addToast("Failed to transmit satellite logs.", "error");
    }
  };

  // Map other member detail card
  const getRecipientProfile = (conv: Conversation): UserProfile | null => {
    if (conv.is_group) return null;
    const recipientId = conv.members?.find(uid => uid !== currentUser.id);
    if (!recipientId) return null;
    return users.find(u => u.id === recipientId) || null;
  };

  // Render Sub-Team Chat Channels
  const handleJoinTeamChat = async (team: Team) => {
    try {
      // Find or create group chat for Team
      const gConv = await supabaseSocialService.startOrCreateConversation(currentUser.id, team.name, true);
      addToast(`Joined sub-squad communications loop: ${team.name}!`, "success");
      loadConversations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-270px)] min-h-[500px]">
      {/* LEFT SIDEBAR: Conversational Channels */}
      <div className="md:col-span-4 bg-zinc-950/70 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden text-left">
        <div className="p-3 border-b border-zinc-900/80 bg-zinc-900/10">
          <h3 className="text-xs font-bold font-mono text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            Tactical Channels
          </h3>
          <p className="text-[9px] text-zinc-650 font-mono mt-0.5">Secure, encrypted communications streams</p>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            <div className="p-3 text-center">
              <span className="text-[10px] text-zinc-500 font-mono animate-pulse">Initializing comms line...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center mt-6 space-y-2">
              <Users className="w-6 h-6 text-zinc-700 mx-auto" />
              <p className="text-[10px] text-zinc-550 font-mono">No direct pipelines initiated.</p>
              <p className="text-[9px] text-zinc-650 font-mono leading-relaxed">
                Connect with mates from the directory to launch high-speed tactical communications.
              </p>
            </div>
          ) : (
            conversations.map((conv) => {
              const recipient = getRecipientProfile(conv);
              const isActive = selectedConv?.id === conv.id;
              
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConv(conv)}
                  className={`p-2.5 rounded-xl cursor-pointer flex items-center gap-3 transition-all text-left ${
                    isActive 
                      ? 'bg-rose-500/10 border border-rose-500/25' 
                      : 'hover:bg-zinc-900/60 border border-transparent'
                  }`}
                >
                  <div className="shrink-0 relative">
                    {conv.is_group ? (
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                        <Users className="w-4 h-4 text-rose-400" />
                      </div>
                    ) : (
                      recipient && (
                        <>
                          <GamerAvatar user={recipient} adminSettings={adminSettings} size="sm" />
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-black ${
                            recipient.membership !== 'Free' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                        </>
                      )
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate">
                        {conv.is_group ? conv.group_name : recipient?.gamerName || "Operative Portfolio"}
                      </span>
                      {conv.unread_count && conv.unread_count > 0 ? (
                        <span className="text-[8px] bg-rose-500 font-mono font-black text-white px-1.5 py-0.2 rounded-full">
                          {conv.unread_count}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[9px] text-zinc-550 font-mono truncate leading-normal mt-0.5">
                      {conv.last_message || "Comms link opened."}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          {/* SQUAD JOIN CHANNELS */}
          {userTeams.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-900/80 space-y-1 px-2.5">
              <span className="text-[8px] text-zinc-650 font-mono font-bold tracking-widest block uppercase">Squad Pipelines</span>
              {userTeams.map(t => (
                <div 
                  key={t.id}
                  onClick={() => handleJoinTeamChat(t)}
                  className="flex items-center justify-between text-[10px] text-zinc-450 hover:text-white transition-all cursor-pointer py-1 font-mono"
                >
                  <span className="truncate flex items-center gap-1">🛡️ [{t.tag}] {t.name}</span>
                  <span className="text-[8px] bg-zinc-905 border border-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-sans">Open</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT BODY: Message stream and transmitter cabinet */}
      <div className="md:col-span-8 bg-zinc-950/40 border border-zinc-900 rounded-2xl flex flex-col overflow-hidden relative">
        {selectedConv ? (
          <>
            {/* Conversation Header */}
            <div className="p-3 border-b border-zinc-900/80 bg-zinc-950/20 flex items-center justify-between text-left">
              <div className="flex items-center gap-2.5">
                {selectedConv.is_group ? (
                  <div className="p-1 px-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-[9px] text-rose-400 font-mono font-bold">GROUP CHALLENGE</span>
                  </div>
                ) : (
                  getRecipientProfile(selectedConv) && (
                    <GamerAvatar user={getRecipientProfile(selectedConv)!} adminSettings={adminSettings} size="sm" />
                  )
                )}
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">
                    {selectedConv.is_group ? selectedConv.group_name : getRecipientProfile(selectedConv)?.gamerName || "Enlisted Agent"}
                  </h4>
                  <p className="text-[8.5px] text-zinc-550 font-mono">
                    {selectedConv.is_group 
                      ? "Direct Team encrypted tactical broadcast network" 
                      : `Pilot Vouch Level rating: ${getRecipientProfile(selectedConv)?.skillRating || 1200}`
                    }
                  </p>
                </div>
              </div>

              {!selectedConv.is_group && getRecipientProfile(selectedConv)?.membership !== 'Free' && (
                <span className="text-[8px] border border-amber-500/20 bg-amber-500/5 text-amber-500 font-mono px-2 py-0.5 rounded uppercase font-black tracking-widest leading-none">
                  GOLDEN OPERATIVE
                </span>
              )}
            </div>

            {/* Comms Logs Stream */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 bg-zinc-950/10 text-left">
              {loadingMsgs ? (
                <div className="text-center py-6">
                  <span className="text-[10px] text-zinc-650 font-mono animate-pulse">Decrypting packets...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center space-y-1.5 opacity-40">
                  <span className="text-zinc-600 font-mono text-[10px]">TACHYON TUNNEL SILENT</span>
                  <p className="text-[9px] text-zinc-750 font-mono">Formulate a transmission to start logistics.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUser.id;
                  const senderUser = users.find(u => u.id === msg.sender_id);
                  
                  return (
                    <div 
                      key={msg.id} 
                      className={`flex gap-2.5 max-w-[85%] ${isOwn ? 'ml-auto flex-row-reverse text-right' : 'mr-auto text-left'}`}
                    >
                      {!isOwn && (
                        <div className="shrink-0 mt-1">
                          {senderUser ? (
                            <GamerAvatar user={senderUser} adminSettings={adminSettings} size="xs" />
                          ) : (
                            <div className="w-5 h-5 rounded bg-zinc-900 border border-zinc-850" />
                          )}
                        </div>
                      )}

                      <div className="space-y-1 flex flex-col">
                        <div className="flex items-center gap-1.5">
                          {!isOwn && (
                            <span className="text-[9px] font-mono text-zinc-500">
                              {senderUser?.gamerName || "Companion"}
                            </span>
                          )}
                          <span className="text-[7.5px] text-zinc-600 font-mono">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-2xl border ${
                          isOwn 
                            ? 'bg-rose-500/10 border-rose-500/35 rounded-tr-none text-rose-50' 
                            : 'bg-zinc-950 border-zinc-850 rounded-tl-none text-zinc-200'
                        }`}>
                          <p className="text-xs font-sans whitespace-pre-wrap leading-relaxed break-words pl-0.5">
                            {msg.content}
                          </p>
                          {msg.image_url && (
                            <div className="mt-2 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 max-h-40 flex justify-center items-center">
                              <img 
                                src={msg.image_url} 
                                alt="Sent clip preview" 
                                className="object-cover max-h-40 w-full"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Transmitter Interface */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-900/80 bg-zinc-950/20 space-y-2">
              {showImageInput && (
                <div className="flex gap-2 animate-fadeIn">
                  <input
                    type="url"
                    placeholder="Paste full screenshot/image URL link (e.g. https://images.unsplash.com/photo...)"
                    className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-cyan-550 placeholder-zinc-700 font-mono"
                    value={imageUploadUrl}
                    onChange={(e) => setImageUploadUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setImageUploadUrl('')}
                    className="p-1 px-2 bg-zinc-900 text-zinc-500 text-[10px] font-mono rounded-lg hover:text-white"
                  >
                    Clear Link
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className={`p-2 rounded-xl border transition-all ${
                    showImageInput 
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                      : 'bg-zinc-950 border-zinc-850/80 text-zinc-500 hover:text-white'
                  }`}
                  title="Attach combat image URL link"
                >
                  <Image className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Formulate encrypted communication packet..."
                  className="flex-1 bg-zinc-950 border border-zinc-850/80 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-rose-500 leading-normal"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />

                <button
                  type="submit"
                  className="bg-rose-500 hover:bg-rose-600 text-white font-mono px-4 py-2 rounded-xl text-xs uppercase font-bold flex items-center gap-1 transition-all pointer cursor-pointer shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  Emit
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-2">
            <MessageSquare className="w-10 h-10 text-zinc-700 animate-pulse" />
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-widest">TACTICAL SATELLITE COMMS LINKED</p>
            <p className="text-[10px] text-zinc-600 max-w-sm">
              Initiate a high-performance, private, or group communications sequence. Pick an active frequency from the left channel panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
