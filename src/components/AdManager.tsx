import React from 'react';
import { Shield, ToggleLeft, ToggleRight, Sparkles, HelpCircle } from 'lucide-react';

interface AdConfig {
  adsenseEnabled: boolean;
  adsenseClientId: string;
  headerActive: boolean;
  sidebarActive: boolean;
  footerActive: boolean;
  inContentActive: boolean;
}

// Default global ad state persisted in localStorage for mock-real operation
export function getLocalAdConfig(): AdConfig {
  const saved = localStorage.getItem('gh_adsense_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      // Fallback
    }
  }
  return {
    adsenseEnabled: false, // Hidden until configured
    adsenseClientId: '',
    headerActive: true,
    sidebarActive: true,
    footerActive: true,
    inContentActive: true
  };
}

export function saveLocalAdConfig(config: AdConfig) {
  localStorage.setItem('gh_adsense_config', JSON.stringify(config));
}

interface AdManagerProps {
  onConfigChange?: (config: AdConfig) => void;
}

export default function AdManager({ onConfigChange }: AdManagerProps) {
  const [config, setConfig] = React.useState<AdConfig>(getLocalAdConfig);

  const updateConfig = (newConfig: Partial<AdConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    saveLocalAdConfig(updated);
    if (onConfigChange) {
      onConfigChange(updated);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono px-2 py-0.5 rounded font-bold uppercase">
              Monetization engine
            </span>
            <span className="text-zinc-500 text-xs font-mono">• AdSense Ready</span>
          </div>
          <h2 className="text-lg font-black text-white mt-1 uppercase tracking-wide flex items-center gap-2">
            <Shield className="text-amber-550 w-5 h-5" />
            Ad Manager Center
          </h2>
          <p className="text-zinc-400 text-xs mt-0.5">
            Configure Google AdSense script integration globally. Setting a valid Client ID activates responsive slots across the site.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            updateConfig({ adsenseEnabled: !config.adsenseEnabled });
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-black border transition-all cursor-pointer ${
            config.adsenseEnabled
              ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
              : "bg-zinc-950 border-zinc-800 text-zinc-500"
          }`}
        >
          {config.adsenseEnabled ? (
            <>
              <ToggleRight className="w-5 h-5 text-emerald-400" />
              ADSENSE RUNNING
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5 text-zinc-650" />
              ADSENSE DISABLED
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credentials Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-zinc-500 font-mono font-black uppercase tracking-wider mb-1.5">
              Google AdSense Publisher Client ID
            </label>
            <input
              type="text"
              placeholder="e.g. ca-pub-XXXXXXXXXXXXXXXX"
              value={config.adsenseClientId}
              onChange={(e) => updateConfig({ adsenseClientId: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 text-xs text-white rounded-xl px-4 py-2.5 font-mono focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-zinc-500 mt-1.5 leading-normal">
              Enter your publisher account client code. When empty, ad placeholders remain strictly hid from public views.
            </p>
          </div>

          <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-xl space-y-2.5">
            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="text-amber-400 w-3.5 h-3.5" />
              Responsive Placements Status
            </h4>
            <div className="space-y-2 font-mono text-[10px] text-zinc-400">
              <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 border border-zinc-850 rounded-lg">
                <span>Header Billboard Banner</span>
                <button
                  type="button"
                  onClick={() => updateConfig({ headerActive: !config.headerActive })}
                  className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                    config.headerActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {config.headerActive ? "ACTIVE" : "OMITID"}
                </button>
              </div>
              <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 border border-zinc-850 rounded-lg">
                <span>Right/Left Sidebar Tower</span>
                <button
                  type="button"
                  onClick={() => updateConfig({ sidebarActive: !config.sidebarActive })}
                  className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                    config.sidebarActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {config.sidebarActive ? "ACTIVE" : "OMITID"}
                </button>
              </div>
              <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 border border-zinc-850 rounded-lg">
                <span>Footer Banner Placement</span>
                <button
                  type="button"
                  onClick={() => updateConfig({ footerActive: !config.footerActive })}
                  className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                    config.footerActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {config.footerActive ? "ACTIVE" : "OMITID"}
                </button>
              </div>
              <div className="flex justify-between items-center bg-zinc-900/40 p-2.5 border border-zinc-850 rounded-lg">
                <span>In-Content Flow Banner</span>
                <button
                  type="button"
                  onClick={() => updateConfig({ inContentActive: !config.inContentActive })}
                  className={`px-2 py-0.5 rounded text-[9px] font-black cursor-pointer ${
                    config.inContentActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"
                  }`}
                >
                  {config.inContentActive ? "ACTIVE" : "OMITID"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Informative Side */}
        <div className="space-y-4 flex flex-col justify-between">
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs space-y-2.5 text-zinc-300">
            <h5 className="font-extrabold text-amber-400 font-mono text-[10px] tracking-wider uppercase flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" />
              Integration Directives
            </h5>
            <p className="text-[11px] leading-relaxed">
              Google AdSense requires checking the site domains. Once verified, ads dynamically stream via scripts. In development mode:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-[10px] text-zinc-400">
              <li>Configured: Previews rendering with a dashed border</li>
              <li>Unconfigured: Ad slots are stripped from layout</li>
              <li>Auto-Format sizes automatically fit page margins</li>
            </ul>
          </div>

          <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl space-y-1.5 leading-normal text-left text-zinc-400 text-xs">
            <span className="text-[9px] font-mono text-zinc-500 block uppercase font-black">Estimated Ad Earnings</span>
            <div className="flex justify-between items-baseline flex-wrap gap-2 pt-1 border-t border-zinc-900">
              <span className="text-lg font-black text-white font-mono">₹4,250.00</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">+18.5% CPC conversion</span>
            </div>
            <p className="text-[9px] text-zinc-500 font-mono mt-1">Calculated based on 23,200 simulated impressions index.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Global Ad Slot Renderer
export function AdSensePlaceholder({
  slotType
}: {
  slotType: 'header' | 'sidebar' | 'footer' | 'in_content';
}) {
  const config = getLocalAdConfig();

  // If globally disabled or client ID not set, do not render anything
  if (!config.adsenseEnabled || !config.adsenseClientId) {
    return null;
  }

  // If specific placement inactive
  if (slotType === 'header' && !config.headerActive) return null;
  if (slotType === 'sidebar' && !config.sidebarActive) return null;
  if (slotType === 'footer' && !config.footerActive) return null;
  if (slotType === 'in_content' && !config.inContentActive) return null;

  const labels = {
    header: '728x90 Header Billboard Ad Placement',
    sidebar: '300x600 Sidebar Tower Ad Placement',
    footer: '468x60 Footer Banner Placement',
    in_content: '970x250 In-content Flow Placement'
  };

  const cssSizes = {
    header: 'w-full md:h-[90px] min-h-[90px] py-2',
    sidebar: 'w-full lg:max-w-[300px] h-[600px] min-h-[500px]',
    footer: 'w-full h-[60px] min-h-[60px]',
    in_content: 'w-full h-[250px] min-h-[120px]'
  };

  return (
    <div className={`my-4 relative overflow-hidden bg-zinc-950/70 border border-dashed border-rose-500/25 p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-inner ${cssSizes[slotType]}`}>
      <span className="text-[8px] font-mono font-black text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded border border-rose-500/20 uppercase tracking-widest leading-none mb-1.5">
        GOOGLE ADSENSE ACTIVE ADVERTISING
      </span>
      <p className="text-[10px] font-mono text-zinc-400 font-bold uppercase">{labels[slotType]}</p>
      <span className="text-[8px] text-zinc-600 font-mono mt-1">
        Client ID: {config.adsenseClientId} • Simulated Delivery
      </span>
    </div>
  );
}
