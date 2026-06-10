import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import { supabaseSocialService } from '../../lib/supabaseSocialService';
import { PenTool, Image, Trash, MessageCircle, Heart, Send, Sparkles } from 'lucide-react';

interface MyPostsPanelProps {
  currentUser: UserProfile;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const MyPostsPanel: React.FC<MyPostsPanelProps> = ({
  currentUser,
  addToast
}) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      const all = await supabaseSocialService.getPosts();
      const mine = all.filter(p => p.user_id === currentUser.id);
      setPosts(mine);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPosts();
  }, [currentUser?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setPublishing(true);
      await supabaseSocialService.createPost(
        currentUser.id,
        content.trim(),
        imageUrl.trim() || undefined
      );

      addToast("Competitive publication broadcasted successfully!", "success");
      setContent('');
      setImageUrl('');
      setShowImageInput(false);
      fetchMyPosts();
    } catch (err) {
      console.error(err);
      addToast("Failed to compile publication file.", "error");
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (confirm("Are you certain you wish to delete this publication? This removes it permanently.")) {
      try {
        await supabaseSocialService.deletePost(postId, currentUser.id);
        addToast("Publication file withdrawn.", "info");
        fetchMyPosts();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">
      {/* Composition Block */}
      <div className="lg:col-span-5 bg-zinc-950/40 border border-zinc-900 rounded-2xl p-4 h-fit space-y-4">
        <div>
          <h3 className="text-xs font-bold font-mono text-rose-450 uppercase tracking-widest flex items-center gap-1.5 leading-none">
            <PenTool className="w-4 h-4 text-rose-500 animate-pulse" />
            Launch Publication
          </h3>
          <p className="text-[9px] text-zinc-550 font-mono mt-1">Status logs, clip highlights or announcements</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 block uppercase">Log Entry Content</label>
            <textarea
              rows={4}
              placeholder="What competitive benchmarks or news are you tracking today, pilot? (e.g. 'Finished dual-arena calibration. Registered 4.1 KD win in clutch master lobby.')"
              className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-rose-500 leading-normal"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={1000}
            />
          </div>

          {showImageInput ? (
            <div className="space-y-1 animate-fadeIn">
              <label className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 block uppercase">Banner Image Link</label>
              <input
                type="url"
                placeholder="Paste direct jpg/png URL link (e.g. https://images.unsplash.com/photo...)"
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-cyan-550 placeholder-zinc-750 font-mono"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>
          ) : null}

          <div className="flex gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={() => {
                setShowImageInput(!showImageInput);
                if (showImageInput) setImageUrl('');
              }}
              className={`px-3 py-2 border rounded-xl font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                showImageInput 
                  ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                  : 'bg-zinc-950 border-zinc-850 text-zinc-400 hover:text-white'
              }`}
            >
              <Image className="w-3.5 h-3.5" />
              {showImageInput ? 'Discard Image' : 'Add Graphic'}
            </button>

            <button
              type="submit"
              disabled={publishing || !content.trim()}
              className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-mono text-[10px] font-bold uppercase py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all pointer cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {publishing ? 'Publishing...' : 'Broadcast'}
            </button>
          </div>
        </form>
      </div>

      {/* Publications Stream */}
      <div className="lg:col-span-7 space-y-4">
        <div>
          <h3 className="text-sm font-semibold font-mono text-zinc-350 uppercase">MY PUBLICATIONS ({posts.length})</h3>
          <p className="text-[10px] text-zinc-550 font-mono">Status reports and clip registries you have shared with the community</p>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-500 font-mono animate-pulse">Retrieving publications cabin...</p>
        ) : posts.length === 0 ? (
          <div className="p-8 rounded-2xl bg-zinc-950/20 border border-zinc-850/60 text-center font-mono text-xs text-zinc-600">
            No active publications found. Compose above to initiate.
          </div>
        ) : (
          <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
            {posts.map((post) => (
              <div 
                key={post.id} 
                className="p-3.5 bg-zinc-950/80 border border-zinc-855 rounded-xl space-y-3 hover:border-zinc-800 transition-all text-left"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-b border-zinc-900 pb-2">
                  <span className="text-xs font-bold text-rose-450 uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-rose-500 shrink-0" />
                    PILOT LOG REPORT
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-rose-550 hover:text-rose-400 transition-all cursor-pointer"
                      title="Withdraw publication"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-zinc-250 leading-relaxed font-sans font-medium">
                  {post.content}
                </p>

                {post.image_url && (
                  <div className="relative rounded-lg overflow-hidden border border-zinc-900 bg-zinc-900 max-h-56 flex justify-center items-center">
                    <img 
                      src={post.image_url} 
                      alt="Gamer uploaded clip" 
                      className="object-cover w-full h-full max-h-56"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <div className="flex items-center gap-4 text-[9px] text-zinc-500 font-mono">
                  <span className="flex items-center gap-1 text-rose-450 bg-rose-500/5 rounded border border-rose-500/10 px-2.5 py-0.5">
                    👍 <strong className="font-bold">{post.likes_count || 0}</strong> Likes
                  </span>
                  <span className="flex items-center gap-1 text-cyan-450 bg-cyan-500/5 rounded border border-cyan-500/10 px-2.5 py-0.5">
                    💬 <strong className="font-bold">{post.comments_count || 0}</strong> Comments
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
