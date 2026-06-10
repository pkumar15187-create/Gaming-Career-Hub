import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile, Team, Notification } from '../types';
import { loadData, saveData } from '../initialData';

// Shared interfaces for our Phase 5 Social & Chat System
export interface Follow {
  id: string;
  follower_id: string; // user id of person who followed
  following_id: string; // user id of person being followed
  created_at: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Conversation {
  id: string;
  name?: string; // used for team or group chats
  is_group: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  members?: string[];
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
  image_url?: string;
}

export interface Post {
  id: string;
  user_id: string;
  gamerName: string;
  profilePhoto: string;
  membership?: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  is_reported: boolean;
  report_reason?: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  gamerName: string;
  profilePhoto: string;
  membership?: string;
  content: string;
  is_reported: boolean;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface ChatReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  conversation_id: string;
  reason: string;
  created_at: string;
}

// Generate unique ID helper
const generateUUID = () => crypto.randomUUID();

export const parseMessageImage = (msg: any): ChatMessage => {
  if (!msg) return msg;
  let text = msg.message_text || '';
  let imgUrl = msg.image_url;
  const match = text.match(/\[image:(https?:\/\/[^\]]+)\]/);
  if (match) {
    imgUrl = match[1];
    text = text.replace(/\[image:https?:\/\/[^\]]+\]/, '').trim();
  }
  return {
    ...msg,
    message_text: text,
    image_url: imgUrl
  };
};

export const supabaseSocialService = {
  // ==========================================
  // 1. FOLLOWS SYSTEM
  // ==========================================
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('follows').insert([{
          follower_id: followerId,
          following_id: followingId
        }]);
      } catch (err) {
        console.error("Supabase followUser failed:", err);
      }
    }

    // fallback / parallel local updates
    const follows = loadData<Follow[]>('gh_social_follows', []);
    if (!follows.some(f => f.follower_id === followerId && f.following_id === followingId)) {
      follows.push({
        id: generateUUID(),
        follower_id: followerId,
        following_id: followingId,
        created_at: new Date().toISOString()
      });
      saveData('gh_social_follows', follows);
    }
  },

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('follows').delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId);
      } catch (err) {
        console.error("Supabase unfollowUser failed:", err);
      }
    }

    const follows = loadData<Follow[]>('gh_social_follows', []);
    const filtered = follows.filter(f => !(f.follower_id === followerId && f.following_id === followingId));
    saveData('gh_social_follows', filtered);
  },

  async getFollowingCount(userId: string): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { count, error } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userId);
        if (!error && count !== null) return count;
      } catch (err) {
        console.error("Supabase getFollowingCount failed:", err);
      }
    }

    const follows = loadData<Follow[]>('gh_social_follows', []);
    return follows.filter(f => f.follower_id === userId).length;
  },

  async getFollowersCount(userId: string): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { count, error } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userId);
        if (!error && count !== null) return count;
      } catch (err) {
        console.error("Supabase getFollowersCount failed:", err);
      }
    }

    const follows = loadData<Follow[]>('gh_social_follows', []);
    return follows.filter(f => f.following_id === userId).length;
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', followerId)
          .eq('following_id', followingId)
          .maybeSingle();
        if (!error && data) return true;
      } catch (err) {
        console.error("Supabase isFollowing query failed:", err);
      }
    }

    const follows = loadData<Follow[]>('gh_social_follows', []);
    return follows.some(f => f.follower_id === followerId && f.following_id === followingId);
  },

  async getFollowingList(userId: string): Promise<string[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);
        if (!error && data) return data.map((d: any) => d.following_id);
      } catch (err) {
        console.error("Supabase getFollowingList failed:", err);
      }
    }

    const follows = loadData<Follow[]>('gh_social_follows', []);
    return follows.filter(f => f.follower_id === userId).map(f => f.following_id);
  },

  async getFollowersList(userId: string): Promise<string[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', userId);
        if (!error && data) return data.map((d: any) => d.follower_id);
      } catch (err) {
        console.error("Supabase getFollowersList failed:", err);
      }
    }

    const follows = loadData<Follow[]>('gh_social_follows', []);
    return follows.filter(f => f.following_id === userId).map(f => f.follower_id);
  },

  // ==========================================
  // 2. FRIEND REQUESTS SYSTEM
  // ==========================================
  async sendFriendRequest(senderId: string, receiverId: string): Promise<void> {
    if (senderId === receiverId) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('friend_requests').insert([{
          sender_id: senderId,
          receiver_id: receiverId,
          id_status: 'pending'
        }]);
      } catch (err) {
        console.error("Supabase sendFriendRequest failed:", err);
      }
    }

    const reqs = loadData<FriendRequest[]>('gh_social_friend_requests', []);
    // check redundancy
    if (!reqs.some(r => r.sender_id === senderId && r.receiver_id === receiverId)) {
      reqs.push({
        id: generateUUID(),
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      saveData('gh_social_friend_requests', reqs);
    }
  },

  async acceptFriendRequest(senderId: string, receiverId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('friend_requests')
          .update({ id_status: 'accepted' })
          .eq('sender_id', senderId)
          .eq('receiver_id', receiverId);
      } catch (err) {
        console.error("Supabase acceptFriendRequest failed:", err);
      }
    }

    const reqs = loadData<FriendRequest[]>('gh_social_friend_requests', []);
    const updated = reqs.map(r => {
      if ((r.sender_id === senderId && r.receiver_id === receiverId) || (r.sender_id === receiverId && r.receiver_id === senderId)) {
        return { ...r, status: 'accepted' as const };
      }
      return r;
    });
    saveData('gh_social_friend_requests', updated);
  },

  async rejectFriendRequest(senderId: string, receiverId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('friend_requests')
          .update({ id_status: 'rejected' })
          .eq('sender_id', senderId)
          .eq('receiver_id', receiverId);
      } catch (err) {
        console.error("Supabase rejectFriendRequest failed:", err);
      }
    }

    const reqs = loadData<FriendRequest[]>('gh_social_friend_requests', []);
    const updated = reqs.map(r => {
      if (r.sender_id === senderId && r.receiver_id === receiverId) {
        return { ...r, status: 'rejected' as const };
      }
      return r;
    });
    saveData('gh_social_friend_requests', updated);
  },

  async cancelFriendRequest(senderId: string, receiverId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('friend_requests').delete()
          .eq('sender_id', senderId)
          .eq('receiver_id', receiverId);
      } catch (err) {
        console.error("Supabase cancelFriendRequest failed:", err);
      }
    }

    const reqs = loadData<FriendRequest[]>('gh_social_friend_requests', []);
    const filtered = reqs.filter(r => !(r.sender_id === senderId && r.receiver_id === receiverId));
    saveData('gh_social_friend_requests', filtered);
  },

  async getFriendRequests(userId: string): Promise<FriendRequest[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .select('*')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        if (!error && data) {
          return data.map((d: any) => ({
            id: d.id,
            sender_id: d.sender_id,
            receiver_id: d.receiver_id,
            status: d.id_status as 'pending' | 'accepted' | 'rejected',
            created_at: d.created_at
          }));
        }
      } catch (err) {
        console.error("Supabase getFriendRequests failed:", err);
      }
    }

    const reqs = loadData<FriendRequest[]>('gh_social_friend_requests', []);
    return reqs.filter(r => r.sender_id === userId || r.receiver_id === userId);
  },

  async getFriends(userId: string): Promise<string[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .select('*')
          .eq('id_status', 'accepted')
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        if (!error && data) {
          return data.map((d: any) => d.sender_id === userId ? d.receiver_id : d.sender_id);
        }
      } catch (err) {
        console.error("Supabase getFriends failed:", err);
      }
    }

    const reqs = loadData<FriendRequest[]>('gh_social_friend_requests', []);
    return reqs
      .filter(r => r.status === 'accepted' && (r.sender_id === userId || r.receiver_id === userId))
      .map(r => r.sender_id === userId ? r.receiver_id : r.sender_id);
  },

  // ==========================================
  // 3. REALTIME MESSAGES SYSTEM
  // ==========================================
  async getConversations(userId: string): Promise<Conversation[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Query conversations where user is a member
        const { data: memberRows, error: memberErr } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', userId);

        if (!memberErr && memberRows && memberRows.length > 0) {
          const convIds = memberRows.map((r: any) => r.conversation_id);
          const { data: convs, error: convsErr } = await supabase
            .from('conversations')
            .select('*')
            .in('id', convIds)
            .order('updated_at', { ascending: false });

          if (!convsErr && convs) {
            // Retrieve members for each conversation
            const { data: allMembers } = await supabase
              .from('conversation_members')
              .select('conversation_id, user_id')
              .in('conversation_id', convIds);

            return convs.map(c => {
              const mIds = allMembers ? allMembers.filter((m: any) => m.conversation_id === c.id).map((m: any) => m.user_id) : [userId];
              return { ...c, members: mIds };
            });
          }
        }
      } catch (err) {
        console.error("Supabase getConversations failed:", err);
      }
    }

    const convs = loadData<Conversation[]>('gh_social_conversations', []);
    const members = loadData<ConversationMember[]>('gh_social_conversation_members', []);
    const myConvIds = members.filter(m => m.user_id === userId).map(m => m.conversation_id);
    return convs
      .filter(c => myConvIds.includes(c.id))
      .map(c => {
        const mIds = members.filter(m => m.conversation_id === c.id).map(m => m.user_id);
        return { ...c, members: mIds };
      })
      .sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  },

  async startOrCreateConversation(userId1: string, secondArg: string, isGroup = false): Promise<Conversation> {
    if (isSupabaseConfigured && supabase) {
      try {
        if (!isGroup) {
          // direct chat check (secondArg is userId2)
          const userId2 = secondArg;
          const { data: m1 } = await supabase.from('conversation_members').select('*').eq('user_id', userId1);
          const { data: m2 } = await supabase.from('conversation_members').select('*').eq('user_id', userId2);

          if (m1 && m2) {
            const sharedConv = m1.find((c1: any) => m2.some((c2: any) => c2.conversation_id === c1.conversation_id));
            if (sharedConv) {
              const { data: existingConv } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', sharedConv.conversation_id)
                .eq('is_group', false)
                .maybeSingle();
              if (existingConv) return { ...existingConv, members: [userId1, userId2] };
            }
          }

          const { data: newConv, error: newConvErr } = await supabase
            .from('conversations')
            .insert([{ is_group: false }])
            .select()
            .single();

          if (!newConvErr && newConv) {
            await supabase.from('conversation_members').insert([
              { conversation_id: newConv.id, user_id: userId1 },
              { conversation_id: newConv.id, user_id: userId2 }
            ]);
            return { ...newConv, members: [userId1, userId2] };
          }
        } else {
          // group chat checked by name (secondArg is groupName)
          const groupName = secondArg;
          const { data: existingConv } = await supabase
            .from('conversations')
            .select('*')
            .eq('name', groupName)
            .eq('is_group', true)
            .maybeSingle();

          if (existingConv) return { ...existingConv, members: [userId1] };

          const { data: newConv, error: newConvErr } = await supabase
            .from('conversations')
            .insert([{ name: groupName, is_group: true }])
            .select()
            .single();

          if (!newConvErr && newConv) {
            await supabase.from('conversation_members').insert([
              { conversation_id: newConv.id, user_id: userId1 }
            ]);
            return { ...newConv, members: [userId1] };
          }
        }
      } catch (err) {
        console.error("Supabase startOrCreateConversation failed:", err);
      }
    }

    // fallback
    const convs = loadData<Conversation[]>('gh_social_conversations', []);
    const members = loadData<ConversationMember[]>('gh_social_conversation_members', []);

    if (!isGroup) {
      const userId2 = secondArg;
      const m1 = members.filter(m => m.user_id === userId1);
      const m2 = members.filter(m => m.user_id === userId2);
      const shared = m1.find(c1 => m2.some(c2 => c2.conversation_id === c1.conversation_id));

      if (shared) {
        const existing = convs.find(c => c.id === shared.conversation_id && !c.is_group);
        if (existing) return { ...existing, members: [userId1, userId2] };
      }

      const brandNew: Conversation = {
        id: generateUUID(),
        is_group: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: [userId1, userId2]
      };
      convs.push(brandNew);
      saveData('gh_social_conversations', convs);

      members.push(
        { id: generateUUID(), conversation_id: brandNew.id, user_id: userId1, joined_at: new Date().toISOString() },
        { id: generateUUID(), conversation_id: brandNew.id, user_id: userId2, joined_at: new Date().toISOString() }
      );
      saveData('gh_social_conversation_members', members);
      return brandNew;
    } else {
      const groupName = secondArg;
      const existing = convs.find(c => c.name === groupName && c.is_group);
      if (existing) return { ...existing, members: [userId1] };

      const brandNew: Conversation = {
        id: generateUUID(),
        name: groupName,
        is_group: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        members: [userId1]
      };
      convs.push(brandNew);
      saveData('gh_social_conversations', convs);

      members.push({
        id: generateUUID(),
        conversation_id: brandNew.id,
        user_id: userId1,
        joined_at: new Date().toISOString()
      });
      saveData('gh_social_conversation_members', members);
      return brandNew;
    }
  },

  async startOrCreateTeamConversation(teamId: string, teamName: string, memberIds: string[]): Promise<Conversation> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('name', `Squad: ${teamName}`)
          .eq('is_group', true)
          .maybeSingle();

        if (existingConv) return existingConv;

        const { data: newConv, error: newConvErr } = await supabase
          .from('conversations')
          .insert([{ name: `Squad: ${teamName}`, is_group: true }])
          .select()
          .single();

        if (!newConvErr && newConv) {
          const insertMembers = memberIds.map(uid => ({
            conversation_id: newConv.id,
            user_id: uid
          }));
          await supabase.from('conversation_members').insert(insertMembers);
          return newConv;
        }
      } catch (err) {
        console.error("Supabase team conversation initialization error:", err);
      }
    }

    // fallback
    const convs = loadData<Conversation[]>('gh_social_conversations', []);
    const name = `Squad: ${teamName}`;
    const existing = convs.find(c => c.is_group && c.name === name);
    if (existing) return existing;

    const groupConv: Conversation = {
      id: generateUUID(),
      name,
      is_group: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    convs.push(groupConv);
    saveData('gh_social_conversations', convs);

    const members = loadData<ConversationMember[]>('gh_social_conversation_members', []);
    memberIds.forEach(uid => {
      members.push({
        id: generateUUID(),
        conversation_id: groupConv.id,
        user_id: uid,
        joined_at: new Date().toISOString()
      });
    });
    saveData('gh_social_conversation_members', members);

    return groupConv;
  },

  async getConversationMembers(conversationId: string): Promise<string[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('conversation_members')
          .select('user_id')
          .eq('conversation_id', conversationId);
        if (!error && data) return data.map((d: any) => d.user_id);
      } catch (err) {
        console.error("Supabase getConversationMembers error:", err);
      }
    }

    const members = loadData<ConversationMember[]>('gh_social_conversation_members', []);
    return members.filter(m => m.conversation_id === conversationId).map(m => m.user_id);
  },

  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });
        if (!error && data) return data.map(parseMessageImage);
      } catch (err) {
        console.error("Supabase getChatMessages error:", err);
      }
    }

    const msgs = loadData<ChatMessage[]>('gh_social_chat_messages', []);
    return msgs
      .filter(m => m.conversation_id === conversationId)
      .map(parseMessageImage)
      .sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  async sendMessage(conversationId: string, senderId: string, text: string, imageUrl?: string): Promise<ChatMessage> {
    const finalMsgText = imageUrl ? `${text} [image:${imageUrl}]` : text;

    const newMessageObj = {
      id: generateUUID(),
      conversation_id: conversationId,
      sender_id: senderId,
      message_text: finalMsgText,
      is_read: false,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('chat_messages').insert([{
          id: newMessageObj.id,
          conversation_id: conversationId,
          sender_id: senderId,
          message_text: finalMsgText,
          is_read: false
        }]);

        await supabase.from('conversations')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      } catch (err) {
        console.error("Supabase sendMessage failed:", err);
      }
    }

    // fallback
    const msgs = loadData<ChatMessage[]>('gh_social_chat_messages', []);
    msgs.push(newMessageObj);
    saveData('gh_social_chat_messages', msgs);

    const convs = loadData<Conversation[]>('gh_social_conversations', []);
    const updatedConvs = convs.map(c => {
      if (c.id === conversationId) {
        return {
          ...c,
          updated_at: new Date().toISOString()
        };
      }
      return c;
    });
    saveData('gh_social_conversations', updatedConvs);

    return parseMessageImage(newMessageObj);
  },

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('chat_messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId);
      } catch (err) {
        console.error("Supabase markMessagesAsRead failed:", err);
      }
    }

    const msgs = loadData<ChatMessage[]>('gh_social_chat_messages', []);
    const updated = msgs.map(m => {
      if (m.conversation_id === conversationId && m.sender_id !== userId) {
        return { ...m, is_read: true };
      }
      return m;
    });
    saveData('gh_social_chat_messages', updated);
  },

  async getUnreadMessagesCount(userId: string): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Find user conv IDs first
        const { data: memberRows } = await supabase
          .from('conversation_members')
          .select('conversation_id')
          .eq('user_id', userId);

        if (memberRows && memberRows.length > 0) {
          const convIds = memberRows.map((r: any) => r.conversation_id);
          const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', convIds)
            .neq('sender_id', userId)
            .eq('is_read', false);

          if (!error && count !== null) return count;
        }
      } catch (err) {
        console.error("Supabase unread messages query failed:", err);
      }
    }

    const msgs = loadData<ChatMessage[]>('gh_social_chat_messages', []);
    const members = loadData<ConversationMember[]>('gh_social_conversation_members', []);
    const myConvIds = members.filter(m => m.user_id === userId).map(m => m.conversation_id);
    return msgs.filter(m => myConvIds.includes(m.conversation_id) && m.sender_id !== userId && !m.is_read).length;
  },

  // ==========================================
  // 4. GAMER POSTS SYSTEM
  // ==========================================
  async createPost(user: UserProfile, content: string, imageUrl?: string): Promise<Post> {
    const newPost: Post = {
      id: generateUUID(),
      user_id: user.id,
      gamerName: user.gamerName,
      profilePhoto: user.profilePhoto || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
      membership: user.membership,
      content,
      image_url: imageUrl || undefined,
      likes_count: 0,
      comments_count: 0,
      is_reported: false,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('posts').insert([{
          id: newPost.id,
          user_id: user.id,
          content,
          image_url: imageUrl || null,
          likes_count: 0,
          comments_count: 0,
          is_reported: false
        }]);
      } catch (err) {
        console.error("Supabase createPost fail:", err);
      }
    }

    const posts = loadData<Post[]>('gh_social_posts', []);
    posts.unshift(newPost);
    saveData('gh_social_posts', posts);

    return newPost;
  },

  async getPosts(): Promise<Post[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Join with custom mapping or query and stitch profiles
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error && data) {
          // Fetch gamer profiles to map photo / name
          const { data: profiles } = await supabase.from('gamer_profiles').select('*');
          const { data: users } = await supabase.from('users').select('*');

          return data.map((post: any) => {
            const prof = profiles?.find((p: any) => p.user_id === post.user_id);
            const usr = users?.find((u: any) => u.id === post.user_id);
            return {
              id: post.id,
              user_id: post.user_id,
              gamerName: prof?.gamer_name || 'Gamer Hub Player',
              profilePhoto: prof?.profile_photo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
              membership: usr?.membership || 'Free',
              content: post.content,
              image_url: post.image_url || undefined,
              likes_count: post.likes_count || 0,
              comments_count: post.comments_count || 0,
              is_reported: post.is_reported || false,
              report_reason: post.report_reason || undefined,
              created_at: post.created_at
            };
          });
        }
      } catch (err) {
        console.error("Supabase getPosts failed, fallback used:", err);
      }
    }

    return loadData<Post[]>('gh_social_posts', []);
  },

  async likePost(postId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('post_likes').insert([{
          post_id: postId,
          user_id: userId
        }]);

        // increment count
        const { data: post } = await supabase.from('posts').select('likes_count').eq('id', postId).single();
        if (post) {
          await supabase.from('posts').update({ likes_count: (post.likes_count || 0) + 1 }).eq('id', postId);
        }
      } catch (err) {
        console.error("Supabase likePost error:", err);
      }
    }

    const likes = loadData<PostLike[]>('gh_social_post_likes', []);
    if (!likes.some(l => l.post_id === postId && l.user_id === userId)) {
      likes.push({ id: generateUUID(), post_id: postId, user_id: userId, created_at: new Date().toISOString() });
      saveData('gh_social_post_likes', likes);

      const posts = loadData<Post[]>('gh_social_posts', []);
      const updated = posts.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p);
      saveData('gh_social_posts', updated);
    }
  },

  async unlikePost(postId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);

        const { data: post } = await supabase.from('posts').select('likes_count').eq('id', postId).single();
        if (post && post.likes_count > 0) {
          await supabase.from('posts').update({ likes_count: post.likes_count - 1 }).eq('id', postId);
        }
      } catch (err) {
        console.error("Supabase unlikePost error:", err);
      }
    }

    const likes = loadData<PostLike[]>('gh_social_post_likes', []);
    const filtered = likes.filter(l => !(l.post_id === postId && l.user_id === userId));
    saveData('gh_social_post_likes', filtered);

    const posts = loadData<Post[]>('gh_social_posts', []);
    const updated = posts.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p);
    saveData('gh_social_posts', updated);
  },

  async hasLikedPost(postId: string, userId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle();
        if (!error && data) return true;
      } catch (err) {
        console.error("Supabase hasLikedPost query fail:", err);
      }
    }

    const likes = loadData<PostLike[]>('gh_social_post_likes', []);
    return likes.some(l => l.post_id === postId && l.user_id === userId);
  },

  async commentOnPost(postId: string, user: UserProfile, content: string): Promise<PostComment> {
    const newComment: PostComment = {
      id: generateUUID(),
      post_id: postId,
      user_id: user.id,
      gamerName: user.gamerName,
      profilePhoto: user.profilePhoto || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
      membership: user.membership,
      content,
      is_reported: false,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('post_comments').insert([{
          id: newComment.id,
          post_id: postId,
          user_id: user.id,
          content,
          is_reported: false
        }]);

        const { data: post } = await supabase.from('posts').select('comments_count').eq('id', postId).single();
        if (post) {
          await supabase.from('posts').update({ comments_count: (post.comments_count || 0) + 1 }).eq('id', postId);
        }
      } catch (err) {
        console.error("Supabase commentOnPost failed:", err);
      }
    }

    const comments = loadData<PostComment[]>('gh_social_post_comments', []);
    comments.push(newComment);
    saveData('gh_social_post_comments', comments);

    const posts = loadData<Post[]>('gh_social_posts', []);
    const updated = posts.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p);
    saveData('gh_social_posts', updated);

    return newComment;
  },

  async getPostComments(postId: string): Promise<PostComment[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('post_comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          // Stitch profiles
          const { data: profiles } = await supabase.from('gamer_profiles').select('*');
          const { data: users } = await supabase.from('users').select('*');

          return data.map((c: any) => {
            const prof = profiles?.find((p: any) => p.user_id === c.user_id);
            const usr = users?.find((u: any) => u.id === c.user_id);
            return {
              id: c.id,
              post_id: c.post_id,
              user_id: c.user_id,
              gamerName: prof?.gamer_name || 'Gamer Commenter',
              profilePhoto: prof?.profile_photo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
              membership: usr?.membership || 'Free',
              content: c.content,
              is_reported: c.is_reported || false,
              created_at: c.created_at
            };
          });
        }
      } catch (err) {
        console.error("Supabase getPostComments error:", err);
      }
    }

    const comments = loadData<PostComment[]>('gh_social_post_comments', []);
    return comments.filter(c => c.post_id === postId).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  },

  async deletePost(postId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('posts').delete().eq('id', postId).eq('user_id', userId);
      } catch (err) {
        console.error("Supabase deletePost error:", err);
      }
    }

    const posts = loadData<Post[]>('gh_social_posts', []);
    const filtered = posts.filter(p => !(p.id === postId && p.user_id === userId));
    saveData('gh_social_posts', filtered);
  },

  async reportPost(postId: string, reporterId: string, reason: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('posts')
          .update({ is_reported: true, report_reason: reason })
          .eq('id', postId);
      } catch (err) {
        console.error("Supabase reportPost error:", err);
      }
    }

    const posts = loadData<Post[]>('gh_social_posts', []);
    const updated = posts.map(p => p.id === postId ? { ...p, is_reported: true, report_reason: reason } : p);
    saveData('gh_social_posts', updated);
  },

  async reportComment(commentId: string, reporterId: string, reason: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('post_comments')
          .update({ is_reported: true, report_reason: reason })
          .eq('id', commentId);
      } catch (err) {
        console.error("Supabase reportComment error:", err);
      }
    }

    const comments = loadData<PostComment[]>('gh_social_post_comments', []);
    const updated = comments.map(c => c.id === commentId ? { ...c, is_reported: true } : c);
    saveData('gh_social_post_comments', updated);
  },

  // ==========================================
  // 5. ADMIN UTILITIES (MODERATION)
  // ==========================================
  async getReportedPosts(): Promise<Post[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('is_reported', true);
        if (!error && data) {
          const { data: profiles } = await supabase.from('gamer_profiles').select('*');
          const { data: users } = await supabase.from('users').select('*');

          return data.map((post: any) => {
            const prof = profiles?.find((p: any) => p.user_id === post.user_id);
            const usr = users?.find((u: any) => u.id === post.user_id);
            return {
              id: post.id,
              user_id: post.user_id,
              gamerName: prof?.gamer_name || 'Gamer Hub Player',
              profilePhoto: prof?.profile_photo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
              membership: usr?.membership || 'Free',
              content: post.content,
              image_url: post.image_url || undefined,
              likes_count: post.likes_count || 0,
              comments_count: post.comments_count || 0,
              is_reported: true,
              report_reason: post.report_reason || undefined,
              created_at: post.created_at
            };
          });
        }
      } catch (err) {
        console.error("Supabase getReportedPosts error:", err);
      }
    }

    const posts = loadData<Post[]>('gh_social_posts', []);
    return posts.filter(p => p.is_reported);
  },

  async getReportedComments(): Promise<PostComment[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('post_comments')
          .select('*')
          .eq('is_reported', true);
        if (!error && data) {
          const { data: profiles } = await supabase.from('gamer_profiles').select('*');
          const { data: users } = await supabase.from('users').select('*');

          return data.map((c: any) => {
            const prof = profiles?.find((p: any) => p.user_id === c.user_id);
            const usr = users?.find((u: any) => u.id === c.user_id);
            return {
              id: c.id,
              post_id: c.post_id,
              user_id: c.user_id,
              gamerName: prof?.gamer_name || 'Gamer App Player',
              profilePhoto: prof?.profile_photo || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150',
              membership: usr?.membership || 'Free',
              content: c.content,
              is_reported: true,
              created_at: c.created_at
            };
          });
        }
      } catch (err) {
        console.error("Supabase getReportedComments error:", err);
      }
    }

    const comments = loadData<PostComment[]>('gh_social_post_comments', []);
    return comments.filter(c => c.is_reported);
  },

  async deleteComment(commentId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('post_comments').delete().eq('id', commentId);
      } catch (err) {
        console.error("Supabase deleteComment error:", err);
      }
    }

    const comments = loadData<PostComment[]>('gh_social_post_comments', []);
    const filtered = comments.filter(c => c.id !== commentId);
    saveData('gh_social_post_comments', filtered);
  },

  async submitChatReport(reporterId: string, reportedUserId: string, conversationId: string, reason: string): Promise<void> {
    const reportObj = {
      id: generateUUID(),
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      conversation_id: conversationId,
      reason,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('chat_reports').insert([reportObj]);
      } catch (err) {
        console.error("Supabase submitChatReport error:", err);
      }
    }

    const reports = loadData<ChatReport[]>('gh_social_chat_reports', []);
    reports.push(reportObj);
    saveData('gh_social_chat_reports', reports);
  },

  async getChatReports(): Promise<ChatReport[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('chat_reports').select('*');
        if (!error && data) return data;
      } catch (err) {
        console.error("Supabase getChatReports fail:", err);
      }
    }

    return loadData<ChatReport[]>('gh_social_chat_reports', []);
  },

  // Dismiss reported posts/comments
  async dismissPostReport(postId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('posts').update({ is_reported: false, report_reason: null }).eq('id', postId);
      } catch (err) {
        console.error("Supabase dismissPostReport fail:", err);
      }
    }

    const posts = loadData<Post[]>('gh_social_posts', []);
    const updated = posts.map(p => p.id === postId ? { ...p, is_reported: false, report_reason: undefined } : p);
    saveData('gh_social_posts', updated);
  },

  async dismissCommentReport(commentId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('post_comments').update({ is_reported: false }).eq('id', commentId);
      } catch (err) {
        console.error("Supabase dismissCommentReport fail:", err);
      }
    }

    const comments = loadData<PostComment[]>('gh_social_post_comments', []);
    const updated = comments.map(c => c.id === commentId ? { ...c, is_reported: false } : c);
    saveData('gh_social_post_comments', updated);
  },

  async addNotification(userId: string, title: string, message: string, type: 'follow' | 'friend_request' | 'tournament' | 'system' = 'system', linkId?: string): Promise<Notification> {
    // Map social notification type safely to types.ts Notification types
    let mappedType: Notification['type'] = 'info';
    if (type === 'tournament') {
      mappedType = 'tournament';
    } else if (type === 'friend_request') {
      mappedType = 'team'; // Team alliances
    } else if (type === 'follow') {
      mappedType = 'success'; // Earned a follower achievement!
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('notifications').insert([{
          user_id: userId,
          title,
          message,
          type: mappedType,
          link_id: linkId,
          read: false
        }]).select().single();
        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            title: data.title,
            message: data.message,
            type: mappedType,
            read: data.read,
            date: data.created_at || new Date().toISOString()
          };
        }
      } catch (err) {
        console.error("Supabase addNotification failed, falling back:", err);
      }
    }

    // fallback
    const items = loadData<Notification[]>('gh_notifications', []);
    const newNotif: Notification = {
      id: generateUUID(),
      userId,
      title,
      message,
      type: mappedType,
      read: false,
      date: new Date().toISOString()
    };
    items.push(newNotif);
    saveData('gh_notifications', items);
    return newNotif;
  },

  async addPostComment(postId: string, userId: string, content: string): Promise<PostComment> {
    const allUsers = loadData<UserProfile[]>('gh_users_profiles', []);
    const user = allUsers.find(u => u.id === userId) || {
      id: userId,
      gamerName: 'Operator',
      membership: 'Silver',
      profilePhoto: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=150'
    } as UserProfile;

    return this.commentOnPost(postId, user, content);
  }
};
