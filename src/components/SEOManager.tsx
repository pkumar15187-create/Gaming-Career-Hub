import React, { useEffect } from 'react';
import { UserProfile, Team, Tournament, SponsorApplication } from '../types';

interface SEOManagerProps {
  activeSection: string;
  users?: UserProfile[];
  teams?: Team[];
  tournaments?: Tournament[];
  sponsors?: SponsorApplication[];
}

export default function SEOManager({
  activeSection,
  users = [],
  teams = [],
  tournaments = [],
  sponsors = []
}: SEOManagerProps) {

  useEffect(() => {
    // ----------------------------------------------------
    // 1. Dynamic Meta Configuration according to active route
    // ----------------------------------------------------
    let title = "Gaming Career Hub | Esports Career Profiles & Arena Tournaments";
    let desc = "Supercharge your esports career. Create professional worker profiles, find recruiting squads, apply for sponsorships, track global standards, and register for tournaments.";
    let keywords = "gaming career, esports profiles, pro gamer tools, team finder, esports sponsorships, leaderboards, cash brackets";
    let type = "website";
    let url = window.location.href;
    let image = "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80"; // Premium Gaming Hero illustration
    let author = "Gaming Career Hub";
    let canonical = window.location.origin + (window.location.pathname || "/") + (window.location.hash || "#home");
    let robots = "index, follow";

    // Extract dynamic items based on Hash matching or parameter indicators
    const hash = window.location.hash;
    
    if (hash.startsWith('#gamer/')) {
      const uName = hash.split('#gamer/')[1]?.split('?')[0];
      const gamer = users.find(u => u.username === uName || u.gamerName === uName);
      if (gamer) {
        title = `${gamer.gamerName} | esports Profile on Gaming Career Hub`;
        desc = `View ${gamer.gamerName}'s esports achievements. Skill rating: ${gamer.skillRating}, K/D: ${gamer.kdRatio}, Win Rate: ${gamer.winRate}%. Based in ${gamer.city}, ${gamer.country}. Bio: ${gamer.bio || "Esports competitor."}`;
        keywords = `${gamer.gamerName}, ${gamer.username}, gamer profile, esports athlete, competitive gaming, ${gamer.favoriteGames?.join(", ") || "pro gaming"}`;
        type = "profile";
        image = gamer.profilePhoto || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=80";
      }
    } else if (activeSection === 'directory') {
      title = "Esports Gamer Directory | Professional Career Profiles";
      desc = "Discover top competitive players, content creators, streamers, and esports professionals in our verified world Directory. Connect and explore stats.";
      keywords = "gamer index, search esports players, professional gamer bios, verified streamers, play partners";
    } else if (activeSection === 'teams') {
      title = "Squad Finder & Team Recruitment Index | Gaming Career Hub";
      desc = "Join verified gaming organizations and competitive squads. Create vacant role listings, enlist recruits, and compete together.";
      keywords = "squad finder, recruit team, clans index, gaming teams, esports recruiters";
    } else if (activeSection === 'tournaments') {
      title = "Active Brackets & Arena Meetups | Register Team";
      desc = "View upcoming, active live tournaments. Challenge other clubs, register solos or teams, track interactive round-robin brackets, and claim prize cash.";
      keywords = "register tourney, esports brackets, local match arena, live video game tournament";
    } else if (activeSection === 'leaderboard') {
      title = "Esports Leaderboards & Verified Elo Standings";
      desc = "Real-time leadership board. Track elite gamer ratings, wins, statistics, and top earners. Compare stats of professional competitors.";
      keywords = "global standings, top gamer leaderboards, elo rank rating, gaming champion statistics";
    } else if (activeSection === 'achievements') {
      title = "Badges Chest: Growth Rewards, Perks & Esports News";
      desc = "Claim daily reward points/diamonds, discover trending news updates, redeem loyalty coupon promo codes, and assign prestige visual profile badges.";
      keywords = "visual badge rewards, esports daily claim, promo code coupon, gaming achievements";
    } else if (activeSection === 'sponsors') {
      title = "Gaming Sponsors Zone: Brand Ambassador Opportunities";
      desc = "Apply to premium developer and hardware brand campaigns. Monetize your gamer tag, secure endorsement agreements, and track click stats.";
      keywords = "sponsorship deals, gaming brand advocate, sponsor click tracker, earn sponsorship money";
    } else if (activeSection === 'dashboard') {
      title = "Athletes Control Panel | Gamer Portfolio Dashboard";
      desc = "Configure your professional gaming profile. Review tournament applications, chat inbox channels, store transactions, and withdrawal records.";
      keywords = "my career folder, withdrawal diamond request, portfolio setup, inbox dashboard";
      robots = "noindex, nofollow"; // Lock dashboard access safely
    } else if (activeSection === 'admin') {
      title = "Operations Desk | Command Admin Interface";
      desc = "Approve verification requests, audit display ad placements, update store coupon discount programs, and manage backend stats.";
      robots = "noindex, nofollow"; // Strict search engine blocks on admin panel
    }

    // ----------------------------------------------------
    // 2. Head Tags Injection & Deduplication
    // ----------------------------------------------------
    document.title = title;

    const setMeta = (attrName: string, attrVal: string, content: string) => {
      // Find matches to overwrite and delete duplicates in a single unified step
      const selector = `meta[${attrName}="${attrVal}"]`;
      const matches = document.querySelectorAll(selector);
      
      if (matches.length > 0) {
        // Update first match
        (matches[0] as HTMLMetaElement).content = content;
        // Purge duplicates to guarantee no duplicate tags exist
        for (let i = 1; i < matches.length; i++) {
          matches[i].remove();
        }
      } else {
        // Create new
        const meta = document.createElement('meta');
        meta.setAttribute(attrName, attrVal);
        meta.content = content;
        document.head.appendChild(meta);
      }
    };

    const setLink = (rel: string, href: string) => {
      const matches = document.querySelectorAll(`link[rel="${rel}"]`);
      if (matches.length > 0) {
        (matches[0] as HTMLLinkElement).href = href;
        for (let i = 1; i < matches.length; i++) {
          matches[i].remove();
        }
      } else {
        const link = document.createElement('link');
        link.rel = rel;
        link.href = href;
        document.head.appendChild(link);
      }
    };

    // Standard Metas
    setMeta('name', 'description', desc);
    setMeta('name', 'keywords', keywords);
    setMeta('name', 'author', author);
    setMeta('name', 'robots', robots);
    setMeta('name', 'theme-color', "#ef4444");

    // Open Graph Tags
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:type', type);

    // Twitter Card Tags
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', image);

    // Canonical link
    setLink('canonical', canonical);

    // Add search engine webmaster verifications from localStorage config or environment variables
    const gscVerificationId = localStorage.getItem('seo_verification_gsc') || (import.meta as any).env.VITE_GSC_VERIFICATION || "";
    if (gscVerificationId) {
      setMeta('name', 'google-site-verification', gscVerificationId);
    } else {
      // Create helper placeholder that allows Search Console checking
      setMeta('name', 'google-site-verification', 'GSC_PLACEHOLDER_VERIFICATION_TOKEN_GAMING_CAREER_HUB');
    }

    const bingVerificationId = localStorage.getItem('seo_verification_bing') || (import.meta as any).env.VITE_BING_VERIFICATION || "";
    if (bingVerificationId) {
      setMeta('name', 'msvalidate.01', bingVerificationId);
    } else {
      setMeta('name', 'msvalidate.01', 'BING_PLACEHOLDER_VERIFICATION_TOKEN_GAMING_CAREER_HUB');
    }

    // ----------------------------------------------------
    // 3. Dynamic Structured Schema Data (JSON-LD JSONs)
    // ----------------------------------------------------
    const buildJsonLd = () => {
      // Organization / WebSite base schemas always loaded
      const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Gaming Career Hub",
        "url": window.location.origin,
        "logo": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=150&q=80",
        "description": "Premium esports career matchmakers, leaderboards, tournament hub and profile portfolios.",
        "sameAs": [
          "https://twitter.com/GamingCareerHub",
          "https://instagram.com/GamingCareerHub"
        ]
      };

      const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Gaming Career Hub",
        "url": window.location.origin,
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${window.location.origin}/#profiles?search={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      };

      const breadcrumbList = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": `${window.location.origin}/#home`
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": activeSection.toUpperCase(),
            "item": canonical
          }
        ]
      };

      // Construct dynamic schema based on active section
      const dynamicSchemas: any[] = [organizationSchema, websiteSchema, breadcrumbList];

      // Add Tournament schema for Tournament pages
      if (activeSection === 'tournaments' && tournaments.length > 0) {
        tournaments.slice(0, 5).forEach(t => {
          dynamicSchemas.push({
            "@context": "https://schema.org",
            "@type": "Event",
            "name": t.title,
            "description": `${t.game} Championship on Arena Meetups. Prize Pool: ${t.prize_pool || t.prizePool || '$1,000'}. Hosted on Gaming Career Hub.`,
            "startDate": t.tournament_start || new Date().toISOString(),
            "endDate": t.tournament_end || new Date(Date.now() + 86400000 * 2).toISOString(),
            "eventStatus": t.status === 'completed' ? "https://schema.org/EventCompleted" : "https://schema.org/EventScheduled",
            "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
            "location": {
              "@type": "VirtualLocation",
              "url": `${window.location.origin}/#tournaments`
            },
            "image": t.banner_url || "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
            "offers": {
              "@type": "Offer",
              "price": t.entry_fee ? parseFloat(t.entry_fee.replace(/[^0-9.]/g, '')) || 0 : 0,
              "priceCurrency": "USD",
              "availability": "https://schema.org/InStock",
              "url": `${window.location.origin}/#tournaments`
            }
          });
        });
      }

      // Add Person profile dynamic schema if viewing specific gamer profile
      if (hash.startsWith('#gamer/')) {
        const uName = hash.split('#gamer/')[1]?.split('?')[0];
        const gamer = users.find(u => u.username === uName || u.gamerName === uName);
        if (gamer) {
          dynamicSchemas.push({
            "@context": "https://schema.org",
            "@type": "Person",
            "name": gamer.gamerName,
            "additionalName": gamer.username,
            "description": gamer.bio || "Competitive esports player",
            "image": gamer.profilePhoto || "https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=800&q=80",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": gamer.city,
              "addressRegion": gamer.state,
              "addressCountry": gamer.country
            },
            "knowsAbout": gamer.favoriteGames || ["Competitive Esports"],
            "url": `${window.location.origin}/#gamer/${gamer.username}`
          });
        }
      }

      return JSON.stringify(dynamicSchemas);
    };

    // Purge old JSON-LD and place fresh updated structures
    const oldScripts = document.querySelectorAll('script[id="seo-json-ld"]');
    oldScripts.forEach(s => s.remove());

    const script = document.createElement('script');
    script.id = "seo-json-ld";
    script.type = "application/ld+json";
    script.innerHTML = buildJsonLd();
    document.head.appendChild(script);

    // ----------------------------------------------------
    // 4. Analytics Hooks (GA4, GTM, Microsoft Clarity)
    // ----------------------------------------------------
    const gaId = (import.meta as any).env.VITE_GA4_ID || localStorage.getItem('seo_analytics_ga4');
    const gtmId = (import.meta as any).env.VITE_GTM_ID || localStorage.getItem('seo_analytics_gtm');
    const clarityId = (import.meta as any).env.VITE_CLARITY_ID || localStorage.getItem('seo_analytics_clarity');

    // Only injects if IDs are entered explicitly by user to guarantee premium zero-bloat performance
    if (gaId && !window.hasOwnProperty('ga4_initiated')) {
      const scriptGA = document.createElement('script');
      scriptGA.async = true;
      scriptGA.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(scriptGA);

      const scriptInlineGA = document.createElement('script');
      scriptInlineGA.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${gaId}');
      `;
      document.head.appendChild(scriptInlineGA);
      (window as any).ga4_initiated = true;
      console.log("[Analytics Manager] Google Analytics 4 Initialized with key: ", gaId);
    }

    if (gtmId && !window.hasOwnProperty('gtm_initiated')) {
      const scriptInlineGTM = document.createElement('script');
      scriptInlineGTM.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `;
      document.head.appendChild(scriptInlineGTM);
      (window as any).gtm_initiated = true;
      console.log("[Analytics Manager] Google Tag Manager Initialized with ID: ", gtmId);
    }

    if (clarityId && !window.hasOwnProperty('clarity_initiated')) {
      const scriptInlineClarity = document.createElement('script');
      scriptInlineClarity.innerHTML = `
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${clarityId}");
      `;
      document.head.appendChild(scriptInlineClarity);
      (window as any).clarity_initiated = true;
      console.log("[Analytics Manager] Microsoft Clarity Ingest Tracker Initialized with key: ", clarityId);
    }

    // Trigger virtual page views inside GA4 on route changes
    if ((window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_title: title,
        page_path: hash || '#home',
        page_location: canonical
      });
    }

  }, [activeSection, users, teams, tournaments, sponsors, window.location.hash]);

  // The component returns null or standard tiny structural tag since it handles document updates directly
  return null;
}
