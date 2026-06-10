import React, { useState, useEffect } from 'react';
import { UserProfile, AdminSettings } from '../../types';
import { supabaseSocialService } from '../../lib/supabaseSocialService';
import { Users, UserMinus, MessageSquare, ExternalLink, Search, Flame } from 'lucide-react';
import { GamerAvatar } from '../GamerAvatar';

interface MyFriendsPanelProps {
  currentUser: UserProfile;
  adminSettings: AdminSettings;
  users: UserProfile[];
  onSelectFriend: (conversationUserId: string) => void;
  onViewProfile: (gamerUsername: string) => void;
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const MyFriendsPanel: React.FC<MyFriendsPanelProps> = ({
  currentUser,
  adminSettings,
  users,
  onSelectFriend,
  onViewProfile,
  addToast
}) => {
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const friendIds = await supabaseSocialService.getFriends(currentUser.id);
      // Map list
      const matched = users.filter(u => friendIds.includes(u.id));
      setFriendsList(matched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, [currentUser?.id, users]);

  const handleUnfriend = async (friendId: string, name: string) => {
    if (confirm(`Dissolve alliance with ${name}?`)) {
      try {
        await supabaseSocialService.cancelFriendRequest(currentUser.id, friendId);
        addToast(`Gamer alliance dissolved with ${name}.`, "info");
        fetchFriends();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredFriends = friendsList.filter(f => 
    f.gamerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h3 className="text-sm font-semibold font-mono text-zinc-350 uppercase">COMMUNITY ALLIANCES ({friendsList.length})</h3>
          <p className="text-[10px] text-zinc-550 font-mono">Your verified direct action and combat squad companions</p>
        </div>
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search alliances..."
            className="w-full bg-zinc-950 border border-zinc-850 rounded-xl py-1.5 pl-8 pr-3 text-[11px] text-white focus:outline-none focus:border-rose-500 placeholder-zinc-650"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-zinc-650" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6">
          <p className="text-xs text-zinc-400 font-mono animate-pulse">Retriving database records...</p>
        </div>
      ) : filteredFriends.length === 0 ? (
        <div className="p-8 rounded-2xl bg-zinc-950/40 border border-zinc-850/80 text-center space-y-2">
          <Users className="w-8 h-8 text-zinc-700 mx-auto" />
          <p className="text-xs text-zinc-400 font-mono">NO ACTIVE ALLIANCES FOUND</p>
          <p className="text-[10px] text-zinc-600 max-w-sm mx-auto">
            Browse the global Gamer Directory, endorse portfolios, and propose tactical alliances to expand your network.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredFriends.map((friend) => (
            <div 
              key={friend.id} 
              className="p-3 bg-zinc-950/80 border border-zinc-855 rounded-xl flex items-center justify-between group hover:border-rose-500/25 transition-all text-left"
            >
              <div className="flex items-center gap-2.5">
                <div className="shrink-0">
                  <GamerAvatar user={friend} adminSettings={adminSettings} size="md" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-rose-450 transition-colors">
                    {friend.gamerName}
                  </h4>
                  <p className="text-[9px] text-zinc-500 font-mono">
                    Skill: <span className="text-rose-500 font-semibold">{friend.skillRating}</span> | K/D: <span className="text-cyan-400">{friend.kdRatio.toFixed(2)}</span>
                  </p>
                  <p className="text-[8px] font-mono text-zinc-650 uppercase">
                    {friend.membership} Rank
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onSelectFriend(friend.id)}
                  title="Open secure comms line"
                  className="p-1 px-2 rounded bg-cyan-950/40 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono flex items-center gap-0.5"
                >
                  <MessageSquare className="w-3 h-3" />
                  Chat
                </button>

                <button
                  onClick={() => onViewProfile(friend.username)}
                  title="Examine tactical dossier"
                  className="p-1 text-zinc-550 hover:text-white transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleUnfriend(friend.id, friend.gamerName)}
                  title="Sever companion link"
                  className="p-1 text-rose-550 hover:text-rose-500 transition-all cursor-pointer"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
