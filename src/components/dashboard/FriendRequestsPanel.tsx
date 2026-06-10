import React, { useState, useEffect } from 'react';
import { UserProfile, AdminSettings } from '../../types';
import { supabaseSocialService } from '../../lib/supabaseSocialService';
import { UserPlus, UserCheck, UserX, Send, Check, X, ShieldAlert } from 'lucide-react';
import { GamerAvatar } from '../GamerAvatar';

interface FriendRequestsPanelProps {
  currentUser: UserProfile;
  adminSettings: AdminSettings;
  users: UserProfile[];
  addToast: (text: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const FriendRequestsPanel: React.FC<FriendRequestsPanelProps> = ({
  currentUser,
  adminSettings,
  users,
  addToast
}) => {
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const allReqs = await supabaseSocialService.getFriendRequests(currentUser.id);
      
      const incoming = allReqs.filter(r => r.receiver_id === currentUser.id && r.status === 'pending');
      const outgoing = allReqs.filter(r => r.sender_id === currentUser.id && r.status === 'pending');
      
      // Map profiles
      const matchedIncoming = incoming.map(r => {
        const senderProfile = users.find(u => u.id === r.sender_id);
        return { ...r, senderProfile };
      }).filter(r => r.senderProfile);

      const matchedOutgoing = outgoing.map(r => {
        const receiverProfile = users.find(u => u.id === r.receiver_id);
        return { ...r, receiverProfile };
      }).filter(r => r.receiverProfile);

      setIncomingRequests(matchedIncoming);
      setOutgoingRequests(matchedOutgoing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser?.id, users]);

  const handleAccept = async (requestId: string, senderId: string, name: string) => {
    try {
      await supabaseSocialService.acceptFriendRequest(senderId, currentUser.id);
      addToast(`Gamer alliance established with ${name}!`, "success");
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (requestId: string, senderId: string, name: string) => {
    try {
      await supabaseSocialService.cancelFriendRequest(senderId, currentUser.id);
      addToast(`Alliance proposal from ${name} declined.`, "info");
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelOutgoing = async (receiverId: string) => {
    try {
      await supabaseSocialService.cancelFriendRequest(currentUser.id, receiverId);
      addToast("Alliance proposal retracted successfully.", "info");
      fetchRequests();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Incoming Requests Column */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold font-mono text-zinc-350 uppercase">INCOMING PROPOSALS ({incomingRequests.length})</h3>
          <p className="text-[10px] text-zinc-550 font-mono">Opponents or allies proposing active companion networks</p>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-500 font-mono animate-pulse">Scanning secure network...</p>
        ) : incomingRequests.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-zinc-950/20 border border-zinc-850/60 font-mono text-[10px] text-zinc-650">
            No pending incoming proposals.
          </div>
        ) : (
          <div className="space-y-2.5">
            {incomingRequests.map((req) => (
              <div 
                key={req.id} 
                className="p-3 bg-zinc-950/90 border border-zinc-855 rounded-xl flex items-center justify-between hover:border-zinc-800 transition-all text-left"
              >
                <div className="flex items-center gap-2.5">
                  <GamerAvatar user={req.senderProfile} adminSettings={adminSettings} size="sm" />
                  <div>
                    <h4 className="text-xs font-bold text-white leading-normal">{req.senderProfile.gamerName}</h4>
                    <p className="text-[9px] text-zinc-550 font-mono leading-none">Rating: {req.senderProfile.skillRating} | KD: {req.senderProfile.kdRatio.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleAccept(req.id, req.sender_id, req.senderProfile.gamerName)}
                    className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-555 text-emerald-400 hover:bg-emerald-500/25 transition-all"
                    title="Confirm Alliance"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleReject(req.id, req.sender_id, req.senderProfile.gamerName)}
                    className="p-1.5 rounded-lg bg-rose-500/15 border border-rose-555 text-rose-400 hover:bg-rose-500/25 transition-all"
                    title="Decline Request"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Outgoing Requests Column */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold font-mono text-zinc-350 uppercase">FORWARDED PROPOSALS ({outgoingRequests.length})</h3>
          <p className="text-[10px] text-zinc-550 font-mono">Alliance requests pending their review and authorization</p>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-500 font-mono animate-pulse">Scanning secure network...</p>
        ) : outgoingRequests.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-zinc-950/20 border border-zinc-850/60 font-mono text-[10px] text-zinc-650">
            No pending forwarded proposals.
          </div>
        ) : (
          <div className="space-y-2.5">
            {outgoingRequests.map((req) => (
              <div 
                key={req.id} 
                className="p-3 bg-zinc-950/90 border border-zinc-855 rounded-xl flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2.5">
                  <GamerAvatar user={req.receiverProfile} adminSettings={adminSettings} size="sm" />
                  <div>
                    <h4 className="text-xs font-bold text-white leading-normal">{req.receiverProfile.gamerName}</h4>
                    <p className="text-[9px] text-zinc-550 font-mono">Pending verification...</p>
                  </div>
                </div>

                <button
                  onClick={() => handleCancelOutgoing(req.receiver_id)}
                  className="px-2.5 py-1 text-[9px] font-mono font-bold uppercase rounded-lg border border-rose-500/20 bg-rose-500/5 text-rose-450 hover:bg-rose-500/15 transition-all cursor-pointer"
                >
                  Cancel Proposal
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
