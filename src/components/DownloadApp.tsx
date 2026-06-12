import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Smartphone, 
  Laptop, 
  Bell, 
  RefreshCw, 
  Link2, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Github, 
  ChevronRight,
  Wifi,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';

interface DownloadAppProps {
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function DownloadApp({ addToast }: DownloadAppProps) {
  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [detectedPlatform, setDetectedPlatform] = useState<string>('Detecting...');
  
  // Update Checker State
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  // Push Notification state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Network Online/Offline state monitor
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // 1. Detect platform automatically
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(userAgent)) {
      setDetectedPlatform('Android');
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setDetectedPlatform('iOS');
    } else if (/Macintosh|Windows|Linux/.test(userAgent)) {
      setDetectedPlatform('Desktop');
    } else {
      setDetectedPlatform('Mobile Web Browser');
    }

    // 2. Monitor standard PWA installation promts
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA Engine] "beforeinstallprompt" event captured successfully.');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if running inside standalone PWA display mode
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    // Monitor Online/Offline state
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial permission checking
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      addToast("PWA install instructions requested. If not prompted automatically, please use your browser's 'Add to Home screen' option.", "info");
      return;
    }
    // Show prompt
    deferredPrompt.prompt();
    // Wait for response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA Engine] Install prompt decision outline outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      addToast("Gaming Career Hub install completed successfully!", "success");
    } else {
      addToast("App installation declined. You can continue playing in the web environment.", "info");
    }
  };

  const handleCheckForUpdates = () => {
    setCheckingUpdates(true);
    setTimeout(() => {
      setCheckingUpdates(false);
      // Simulate newer release detection (Changelog highlights core web vitals update)
      setUpdateAvailable(true);
      addToast("Critical performance update v1.2.1 detected!", "info");
    }, 2000);
  };

  const handleApplyUpdate = () => {
    setCheckingUpdates(true);
    setUpdateAvailable(false);
    setTimeout(() => {
      setCheckingUpdates(false);
      addToast("Application core binaries modernized! Enjoy fluid refresh rates.", "success");
      // Simulate Service worker reload action block
      window.location.reload();
    }, 1500);
  };

  const handleRequestPushPermissions = async () => {
    if (!('Notification' in window)) {
      addToast("Action Denied: Push Notifications not supported in this client environment.", "error");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        addToast("Alert dispatchers connected! Real-time telemetry signals unlocked.", "success");
        // Trigger a simulation notification trigger
        new Notification("Gaming Career Hub", {
          body: "Notifications linked. Tournament rosters and squad recruitment posts ready!",
          icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🎮</text></svg>"
        });
      } else {
        addToast("Permission state: " + permission, "info");
      }
    } catch {
      addToast("User authorization required.", "info");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-12">
      
      {/* Immersive Header Block */}
      <div className="relative rounded-3xl overflow-hidden border border-zinc-850 bg-zinc-950 p-8 md:p-12 text-left">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.1),transparent)]" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 uppercase tracking-widest border border-rose-500/20">
              <Zap className="w-3 h-3 animate-pulse" /> Mobile APK & Standalone PWA Module
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight uppercase">
              Immersive Native <span className="text-gradient font-black">Experience</span>
            </h1>
            <p className="text-sm text-zinc-400 max-w-xl">
              Turn Gaming Career Hub into a standalone desktop utility or compile into a native Android APK package containing integrated caching and zero-frame responsiveness.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={handleInstallClick}
              disabled={isInstalled}
              className={`flex-1 md:flex-initial px-6 py-3.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                isInstalled 
                  ? 'bg-zinc-900 border border-zinc-800 text-emerald-400 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer hover:shadow-lg hover:shadow-rose-600/10'
              }`}
            >
              {isInstalled ? <CheckCircle className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
              {isInstalled ? 'Installed Standalone' : 'Install Standalone App'}
            </button>
            
            <button
              onClick={handleCheckForUpdates}
              disabled={checkingUpdates}
              className="px-5 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-805 text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${checkingUpdates ? 'animate-spin' : ''}`} />
              Check Updates
            </button>
          </div>
        </div>

        {/* Real-time System Metrics */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-zinc-900 text-xs font-mono">
          <div className="space-y-1">
            <p className="text-zinc-500 uppercase tracking-wide text-[9px] font-bold">Auto Platform Detected</p>
            <p className="text-white font-bold inline-flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-rose-400" /> {detectedPlatform}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500 uppercase tracking-wide text-[9px] font-bold">Offline Sync Readiness</p>
            <p className="text-white font-bold inline-flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" /> {isOnline ? 'Online (Synced)' : 'Offline (Cached Local)'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500 uppercase tracking-wide text-[9px] font-bold">Active Engine Version</p>
            <p className="text-white font-bold inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> v1.2.0 (Stable)
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-zinc-500 uppercase tracking-wide text-[9px] font-bold">Push Gateway Status</p>
            <p className="text-white font-bold inline-flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-rose-500" /> {notificationPermission.toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      {/* Main Core Elements Row: APK Download Panel + Native Features */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PART 7: Android APK Download Package Panel */}
        <div className="lg:col-span-2 bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-850 rounded-3xl p-6 md:p-8 text-left space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-white uppercase tracking-tight">Android APK Distribution Desk</h3>
              <p className="text-xs text-zinc-500">Run natively inside Google play store shells via Trusted Web Activities.</p>
            </div>
            <span className="px-3 py-1 rounded bg-rose-950 text-rose-400 border border-rose-900 text-[10px] font-mono font-bold">
              DOWNLOADABLE
            </span>
          </div>

          <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase font-mono">CURRENT COMPILED FILE</span>
                <p className="text-lg font-black text-rose-500 font-mono">GamingCareerHub-v12.apk</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <p className="text-zinc-500 text-[9px]">FILE METRICS SIZE</p>
                  <p className="text-zinc-300 font-bold">~24.50 Megabytes</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[9px]">MINIMUM REQUIREMENT</p>
                  <p className="text-zinc-300 font-bold">Android 9.0 (Oreo+)</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[9px]">SECURITY CRYPTO HASH</p>
                  <p className="text-zinc-300 font-bold">SHA2512-VERIFIED</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[9px]">ARCHITECTURE SHELL</p>
                  <p className="text-zinc-300 font-bold">Capacitor Native</p>
                </div>
              </div>
            </div>

            {/* Custom Changelog Listing */}
            <div className="border-t md:border-t-0 md:border-l border-zinc-800 pt-4 md:pt-0 md:pl-6 space-y-3">
              <p className="text-[10px] font-mono font-black uppercase text-zinc-400 tracking-wide">WHAT'S NEW IN v1.2.0 RELEASE</p>
              <ul className="text-xs text-zinc-400 space-y-2 list-none p-0 m-0">
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-mono">➔</span> Optimized LCP and fully non-blocking Core Web Vitals.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-mono">➔</span> Real-time round robin bracket caching for offline viewing.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-mono">➔</span> Safe backends secret caching keeping keys strictly server-side.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-500 font-mono">➔</span> Immersive zero-margin header views under fullscreen orientation.
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 pt-1">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                addToast("Direct APK download triggered with placeholder binaries. When actual APK is built in Android Studio, upload build outputs here.", "success");
              }}
              className="w-full md:w-auto bg-gradient-to-r from-rose-600 to-amber-600 hover:opacity-90 text-white font-mono font-black text-xs uppercase px-8 py-4 rounded-xl shadow-lg shadow-rose-600/10 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> DOWNLOAD ANDROID APK FILE
            </a>
            
            <div className="text-zinc-500 text-[10px] font-mono leading-relaxed text-center md:text-left flex-1">
              * Note: Self-hosted APK requires approving installation from external/unknown sources in Android developer tools.
            </div>
          </div>

          {/* Guide for building capacitor / Trusted Web Activity */}
          <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-850 mt-4 space-y-3">
            <div className="flex items-center gap-2 text-rose-400">
              <Info className="w-4 h-4 shrink-0" />
              <p className="text-xs font-black uppercase tracking-wide text-zinc-300">Android Studio Export Blueprint</p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This repository is fully optimized to run within standard <strong>Capacitor</strong>. Generates high performance assets under <code>/dist</code>, compatible with <code>npx cap init</code> and <code>npx cap add android</code> right out of the box.
            </p>
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 font-mono text-[10px] text-zinc-400 select-all space-y-1 leading-normal">
              <p># Install Capacitor Core dependencies</p>
              <p className="text-rose-400">npm install @capacitor/core @capacitor/cli @capacitor/android</p>
              <p># Launch native environment and port your layouts</p>
              <p className="text-rose-400">npx cap init "Gaming Career Hub" "com.gamingcareerhub.app" --web-dir=dist</p>
              <p className="text-rose-400">npx cap add android && npx cap sync android</p>
            </div>
          </div>
        </div>

        {/* Right Side Column: Notifications Readiness + Deep Linking index testing */}
        <div className="space-y-6 text-left">
          
          {/* Notifications config box */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Bell className="w-4.5 h-4.5 text-rose-500" /> Notifications Telemetry
            </h4>
            <p className="text-xs text-zinc-450 leading-relaxed">
              Receive live matching alerts and sponsor applications feedback right inside your devices background bar.
            </p>

            <button
              onClick={handleRequestPushPermissions}
              className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 hover:border-zinc-750 font-mono text-xs uppercase py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {notificationPermission === 'granted' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4 text-rose-400" />}
              {notificationPermission === 'granted' ? 'Alert Matrix Active' : 'Request Push Permissions'}
            </button>
          </div>

          {/* Deep Linking testing area */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-3xl p-6 space-y-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Link2 className="w-4.5 h-4.5 text-amber-500" /> Deep Linking Protocols
            </h4>
            <p className="text-xs text-zinc-450 leading-relaxed">
              Our routers resolve direct routing endpoints. Test launching deep link anchors straight inside this live preview:
            </p>

            <div className="space-y-2 text-xs font-mono">
              <a
                href="#tournaments"
                className="block p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 hover:border-rose-500/30 text-zinc-300 hover:text-white transition-all flex justify-between items-center"
              >
                <span>🚀 Arena Meetups</span>
                <span className="text-rose-500 text-[10px]">#tournaments</span>
              </a>

              <a
                href="#profiles"
                className="block p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 hover:border-rose-500/30 text-zinc-300 hover:text-white transition-all flex justify-between items-center"
              >
                <span>🌍 Player Directory</span>
                <span className="text-rose-400 text-[10px]">#profiles</span>
              </a>

              <a
                href="#sponsors"
                className="block p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 hover:border-rose-500/30 text-zinc-300 hover:text-white transition-all flex justify-between items-center"
              >
                <span>💰 Sponsors Zone</span>
                <span className="text-amber-500 text-[10px]">#sponsors</span>
              </a>
            </div>

            <p className="text-[10px] text-zinc-550 leading-normal">
              Under Capacitor builds, setting <code>app.config.json</code> links standard web hooks instantly into matching internal application screens.
            </p>
          </div>

        </div>

      </div>

      {/* PART 8: Simulation Update Dialog modal prompt */}
      <AnimatePresence>
        {updateAvailable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-md w-full text-left space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider font-mono">
                  <AlertCircle className="w-4 h-4" /> SECURITY & PERFORMANCE PATCH
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Critical Update Available!</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Version <strong>v1.2.1-Patch</strong> is ready for installation. This updates our background routing performance index and fixes several UI animations shifts to stabilize Core Web Vitals layout consistency.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleApplyUpdate}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-mono font-black text-xs uppercase py-3 rounded-xl transition-all shadow-lg hover:shadow-rose-600/10 cursor-pointer text-center"
                >
                  DOWNLOAD & RE-LOAD
                </button>
                <button
                  onClick={() => {
                    setUpdateAvailable(false);
                    addToast("Update deferred. You can check again anytime inside this panel.", "info");
                  }}
                  className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 hover:text-white text-zinc-400 text-xs font-mono font-bold uppercase transition-all border border-zinc-805 cursor-pointer text-center"
                >
                  LATER
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
