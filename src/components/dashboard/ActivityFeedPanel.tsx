import React, { useState, useEffect } from 'react';
import { UserProfile, AdminSettings } from '../../types';
import { supabaseSocialService, PostComment } from '../../lib/supabaseSocialService';
import { Heart, MessageCircle, Flag, Send, Image, Flame, HelpCircle, Shield, Sparkles } from 'lucide-react';
import { GamerAvatar } from '../GamerAvatar';

interface ActivityFeedPanelProps {
  currentUser: UserProfile;
  adminSettings: AdminSettings;
  users: UserProfile[];
  onSelectGamerProfile: (gamerUsername: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ActivityFeedPanel: React.FC<ActivityFeedPanelProps> = ({
  currentUser,
  adminSettings,
  users,
  onSelectGamerProfile,
  addToast
}) => {
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [quickContent, setQuickContent] = useState('');
  const [quickImageUrl, setQuickImageUrl] = useState('');
  const [showQuickComposer, setShowQuickComposer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedCommentsPostId, setExpandedCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, PostComment[]>>({});
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const fetchGlobalFeed = async () => {
    try {
      setLoading(true);
      const list = await supabaseSocialService.getPosts();
      
      // Sort newest first
      const sorted = list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Map author profile
      const mapped = sorted.map(post => {
        const author = users.find(u => u.id === post.user_id);
        return { ...post, author };
      }).filter(post => post.author); // Ensure safe matching

      setFeedPosts(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalFeed();
  }, [currentUser?.id, users]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContent.trim()) return;

    try {
      const created = await supabaseSocialService.createPost(
        currentUser.id,
        quickContent.trim(),
        quickImageUrl.trim() || undefined
      );

      addToast("Competitive publication broadcasted to global feed!", "success");
      setQuickContent('');
      setQuickImageUrl('');
      setShowQuickComposer(false);
      fetchGlobalFeed();
    } catch (err) {
      console.error(err);
      addToast("Failed to compile global tactical entry.", "error");
    }
  };

  const handleLikeToggle = async (postId: string) => {
    try {
      const alreadyLiked = await supabaseSocialService.hasLikedPost(postId, currentUser.id);
      
      if (alreadyLiked) {
        await supabaseSocialService.unlikePost(postId, currentUser.id);
      } else {
        await supabaseSocialService.likePost(postId, currentUser.id);
        
        // Push notice of like to author
        const post = feedPosts.find(p => p.id === postId);
        if (post && post.user_id !== currentUser.id) {
          await supabaseSocialService.addNotification(
            post.user_id,
            "Post Liked 👍",
            `${currentUser.gamerName} liked your recent publication entry!`,
            "tournament"
          );
        }
      }

      // Update state locally for real-time responsiveness
      setFeedPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const lDiff = alreadyLiked ? -1 : 1;
          return {
            ...p,
            likes_count: Math.max(0, (p.likes_count || 0) + lDiff)
          };
        }
        return p;
      }));

    } catch (err) {
      console.error(err);
    }
  };

  const loadPostComments = async (postId: string) => {
    try {
      setLoadingComments(true);
      const list = await supabaseSocialService.getPostComments(postId);
      setCommentsMap(prev => ({
        ...prev,
        [postId]: list
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleExpandComments = (postId: string) => {
    if (expandedCommentsPostId === postId) {
      setExpandedCommentsPostId(null);
    } else {
      setExpandedCommentsPostId(postId);
      loadPostComments(postId);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    try {
      const newComm = await supabaseSocialService.addPostComment(
        postId,
        currentUser.id,
        newCommentText.trim()
      );

      setNewCommentText('');
      addToast("Tactical comment transmitted.", "success");
      
      // Update local comment counts
      setFeedPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            comments_count: (p.comments_count || 0) + 1
          };
        }
        return p;
      }));

      // Reload comments list
      loadPostComments(postId);

      // Push notify
      const post = feedPosts.find(p => p.id === postId);
      if (post && post.user_id !== currentUser.id) {
        await supabaseSocialService.addNotification(
          post.user_id,
          "New Comment on Post 💬",
          `${currentUser.gamerName} commented: "${newCommentText.substring(0, 40)}..."`,
          "tournament"
        );
      }

    } catch (err) {
      console.error(err);
      addToast("Failed to transmit comment log.", "error");
    }
  };

  const handleReportPost = async (postId: string) => {
    const reason = prompt("Enter specific reason for content moderation review:");
    if (reason && reason.trim()) {
      try {
        await supabaseSocialService.reportPost(postId, currentUser.id, reason.trim());
        addToast("Abuse report forwarded straight to tournament compliance desk.", "success");
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto text-left">
      {/* Quick Feed Composer Trigger */}
      <div className="bg-zinc-950/40 border border-zinc-900 rounded-2xl p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <GamerAvatar user={currentUser} adminSettings={adminSettings} size="sm" />
          <span className="text-zinc-550 text-xs font-mono font-bold uppercase tracking-widest hidden sm:inline">Esports Global Grid</span>
        </div>
        <button
          onClick={() => setShowQuickComposer(!showQuickComposer)}
          className="flex-1 max-w-sm text-left bg-zinc-950/80 border border-zinc-850 rounded-xl px-3 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-all font-sans cursor-pointer"
        >
          Share status, highlights or calibrations direct to grid...
        </button>
        <button
          onClick={() => setShowQuickComposer(!showQuickComposer)}
          className="p-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold font-mono uppercase px-3 cursor-pointer"
        >
          Broadcast
        </button>
      </div>

      {showQuickComposer && (
        <form onSubmit={handleCreatePost} className="bg-zinc-950/90 border border-zinc-850 rounded-2xl p-4 space-y-3.5 animate-fadeIn">
          <textarea
            rows={3}
            placeholder="Compose tactical broadcast log entry..."
            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500"
            value={quickContent}
            onChange={(e) => setQuickContent(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="Paste optional JPG/PNG screenshot screenshot URL..."
              className="flex-1 bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-1 text-[10px] text-zinc-300 placeholder-zinc-750 font-mono"
              value={quickImageUrl}
              onChange={(e) => setQuickImageUrl(e.target.value)}
            />
            <button
              type="submit"
              className="bg-rose-500 hover:bg-rose-600 text-white font-mono text-[10px] font-bold px-4 py-1.5 rounded-xl cursor-default uppercase"
            >
              Emit
            </button>
          </div>
        </form>
      )}

      {/* Feed Stream */}
      {loading ? (
        <div className="text-center py-12">
          <span className="text-xs text-zinc-500 font-mono animate-pulse">Syncing Global Esports Feed Grid...</span>
        </div>
      ) : feedPosts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-950/20 border border-zinc-850">
          <p className="text-xs text-zinc-500 font-mono">GRID CHANNELS SILENT</p>
          <p className="text-[10px] text-zinc-650 font-sans mt-1">Be the first to transmit a tactical update report to this community!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedPosts.map((post) => {
            const isLikedLocal = false; // resolved from backend initially
            const author = post.author as UserProfile;
            const isMyPost = post.user_id === currentUser.id;
            const commentsList = commentsMap[post.id] || [];
            const isCommentsOpen = expandedCommentsPostId === post.id;

            return (
              <div 
                key={post.id} 
                className="bg-zinc-950/60 border border-zinc-855 rounded-2xl p-4 space-y-3 hover:border-zinc-800 transition-all text-left"
              >
                {/* Author Info Header */}
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                  <div 
                    onClick={() => onSelectGamerProfile(author.username)}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <GamerAvatar user={author} adminSettings={adminSettings} size="sm" />
                    <div>
                      <h4 className="text-xs font-black text-white group-hover:text-rose-400 transition-all flex items-center gap-1">
                        {author.gamerName}
                        {author.membership !== 'Free' && (
                          <span className="text-[8px] tracking-widest text-amber-500 font-bold uppercase">
                            👑 PLATINUM
                          </span>
                        )}
                      </h4>
                      <p className="text-[8.5px] text-zinc-550 font-mono leading-none mt-0.5">
                        {author.city}, {author.country} | rating: {author.skillRating}
                      </p>
                    </div>
                  </div>

                  <span className="text-[8px] text-zinc-600 font-mono font-bold tracking-wider">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Post Body Content */}
                <p className="text-xs font-sans text-zinc-250 leading-relaxed font-normal">
                  {post.content}
                </p>

                {/* Banner Attachment */}
                {post.image_url && (
                  <div className="rounded-xl overflow-hidden border border-zinc-900 bg-zinc-900/60 flex max-h-80 justify-center items-center">
                    <img 
                      src={post.image_url} 
                      alt="Gamer calibration capture" 
                      className="object-cover w-full h-full max-h-80 select-none"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Action Row */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] font-mono text-zinc-500">
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleLikeToggle(post.id)}
                      className="hover:text-rose-500 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>👍</span>
                      <span> {post.likes_count || 0}</span>
                    </button>

                    <button
                      onClick={() => handleExpandComments(post.id)}
                      className="hover:text-cyan-500 flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.comments_count || 0} Comments</span>
                    </button>
                  </div>

                  <button
                    onClick={() => handleReportPost(post.id)}
                    className="hover:text-rose-550 text-[9px] flex items-center gap-1 transition-all font-mono uppercase tracking-widest"
                    title="Report abusive or scam publications"
                  >
                    <Flag className="w-3 h-3" />
                    [! Abusive]
                  </button>
                </div>

                {/* Comments Section Drawer expansion */}
                {isCommentsOpen && (
                  <div className="mt-3.5 bg-zinc-950 rounded-xl p-3 space-y-3 border border-zinc-900">
                    <p className="text-[8px] tracking-widest text-zinc-650 font-bold font-mono uppercase">TRANSMITTED COMMENT FEED</p>
                    
                    {loadingComments ? (
                      <span className="text-[9px] text-zinc-550 font-mono animate-pulse block">Decrypting comments logs...</span>
                    ) : commentsList.length === 0 ? (
                      <p className="text-[10px] text-zinc-600 font-mono pl-1">No comments posted yet on this thread.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {commentsList.map((c) => {
                          const commenter = users.find(u => u.id === c.user_id);
                          return (
                            <div key={c.id} className="p-2bg-zinc-900/10 text-left space-y-1 block border-b border-zinc-900 pb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-rose-450">{commenter?.gamerName || "Companion"}</span>
                                <span className="text-[7px] text-zinc-600 font-mono">{new Date(c.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-[11px] text-zinc-350 font-sans pl-1">
                                {c.content}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Quick comment form */}
                    <form onSubmit={(e) => handleSubmitComment(e, post.id)} className="flex gap-2 pt-1 border-t border-zinc-900">
                      <input
                        type="text"
                        placeholder="Type comment..."
                        className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-rose-500 leading-normal"
                        value={newCommentText}
                        onChange={(e) => setNewCommentText(e.target.value)}
                        required
                        maxLength={250}
                      />
                      <button
                        type="submit"
                        className="bg-zinc-900 hover:bg-zinc-800 text-rose-400 border border-zinc-800 text-[9px] font-mono font-bold px-3 py-1 rounded-lg uppercase tracking-wider cursor-pointer"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
