import React from 'react';

interface AdSenseSlotProps {
  /**
   * Type of slot: 'home' | 'directory' | 'tournament' | 'leaderboard' | 'sponsor' | 'footer' | 'mobile_sticky'
   */
  slotType: 'home' | 'directory' | 'tournament' | 'leaderboard' | 'sponsor' | 'footer' | 'mobile_sticky';
  className?: string;
}

export default function AdSenseSlot({ slotType, className = "" }: AdSenseSlotProps) {
  // Define standard responsive dimensions for each ad slot type
  const styleConfigs = {
    home: {
      label: "728x90 Billboard Header Ad",
      dimensions: "w-full min-h-[90px] h-[90px]",
    },
    directory: {
      label: "300x250 Directory Rail Ad",
      dimensions: "w-full min-h-[250px] md:max-w-[300px]",
    },
    tournament: {
      label: "970x250 Large Tournament Feature Banner",
      dimensions: "w-full min-h-[120px] lg:min-h-[250px]",
    },
    leaderboard: {
      label: "728x90 Leaderboard Arena Banner",
      dimensions: "w-full min-h-[90px]",
    },
    sponsor: {
      label: "300x600 Sponsor Dealmaker Tower AD",
      dimensions: "w-full min-h-[300px] lg:min-h-[500px]",
    },
    footer: {
      label: "468x60 Platform Footer Banner",
      dimensions: "max-w-xl mx-auto min-h-[60px]",
    },
    mobile_sticky: {
      label: "320x50 Sticky Smart Mobile Banner",
      dimensions: "fixed bottom-0 left-0 w-full min-h-[50px] z-50 md:hidden bg-zinc-950/95 border-t border-rose-500/25",
    }
  };

  const config = styleConfigs[slotType];

  return (
    <div 
      id={`adsense-slot-${slotType}`}
      className={`relative overflow-hidden bg-zinc-950/40 border border-dashed border-zinc-800 hover:border-zinc-700/80 p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all ${config.dimensions} ${className}`}
    >
      {/* 
        DEVELOPER DIRECTIVE: Replace this placeholder with Google AdSense code after approval.
        Example script block:
        <ins className="adsbygoogle"
             style={{ display: 'block' }}
             data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
             data-ad-slot="XXXXXXXXXX"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
        <script>
             (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,63,94,0.02),transparent)] pointer-events-none"></div>
      
      <span className="text-[8px] font-mono font-black text-rose-500/60 uppercase tracking-widest bg-zinc-950/80 border border-zinc-900 px-2 py-0.5 rounded">
        SPONSOR STREAM ADVERTISEMENT
      </span>
      
      <p className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">
        {config.label}
      </p>

      <span className="text-[8px] text-zinc-650 font-mono mt-0.5">
        Awaiting AdSense Integration approval • Click to close preview
      </span>
    </div>
  );
}
