/**
 * Arogya Relay locale catalog (Problem Statement 3).
 *
 * First-release languages with complete packs: English, Hindi, Odia.
 * Substantial first packs (machine-drafted, flagged for review): Bengali,
 * Assamese, Telugu, Marathi. Partial: Santali.
 *
 * SAFETY: Tier 1 strings are provided in English only where a reviewed
 * translation is not yet approved. They are never machine-translated at runtime;
 * they fall back to the approved English text. Tier 2/3 accept drafted packs but
 * are flagged `machine_draft` so production gating can exclude them.
 *
 * PROTOTYPE / SYNTHETIC DATA ONLY.
 */

import type { Catalog, CatalogEntry, LanguageCode, ReviewStatus } from "./types";
import { UI_CATALOG } from "./ui-catalog.ts";

/**
 * Determine the review status of a single entry for a given language.
 * Approved if an explicit translation exists for that language OR it is English
 * (the source/approved baseline). Otherwise `untranslated` (falls back to en)
 * or `machine_draft` for the deliberately-drafted additional languages.
 */
const DRAFT_LANGS: LanguageCode[] = ["bn", "as", "te", "mr", "sat"];

export function reviewStatus(entry: CatalogEntry, lang: LanguageCode): ReviewStatus {
  if (lang === "en") return "approved";
  const has = Boolean((entry as Record<string, unknown>)[lang]);
  if (!has) return "untranslated";
  return DRAFT_LANGS.includes(lang) ? "machine_draft" : "approved";
}

/**
 * Translate a catalog entry. Always returns a string (English fallback).
 * Tier 1 entries never fall to machine text — English is the approved baseline.
 */
export function translate(entry: CatalogEntry, lang: LanguageCode): string {
  if (lang === "en") return entry.en;
  const localized = (entry as Record<string, unknown>)[lang];
  if (typeof localized === "string" && localized.length > 0) return localized;
  // Fallback chain: requested → English (always present).
  return entry.en;
}

export const CATALOG: Catalog = {
  ...UI_CATALOG,
  // ── Navigation (Tier 3) ────────────────────────────────────────────────
  "nav.overview": { tier: "tier3", en: "Overview", hi: "अवलोकन", or: "ଅବଲୋକନ", bn: "ওভারভিউ", as: "ওভাৰভিউ", te: "అవలోకనం", mr: "अवलोकन", sat: "ᱚᱵᱚᱞᱚᱠᱚᱱ" },
  "nav.cases": { tier: "tier3", en: "Case queue", hi: "केस कतार", or: "କେଶ ଧାଡ଼ି", bn: "কেস কিউ", as: "কেচ কিউ", te: "కేసు క్యూ", mr: "केस यादी", sat: "ᱠᱮᱥ ᱞᱟᱭᱤᱱ" },
  "nav.care": { tier: "tier3", en: "Care guidance", hi: "देखभाल मार्गदर्शन", or: "ଯତ୍ନ ମାର୍ଗଦର୍ଶନ", bn: "কেয়ার গাইডেন্স", as: "কেয়াৰ গাইডেন্স", te: "సంరక్షణ మార్గదర్శి", mr: "काळजी मार्गदर्शन", sat: "ᱥᱟᱲᱦᱟᱣ ᱜᱟᱭᱰ" },
  "nav.nearby": { tier: "tier3", en: "Nearby care", hi: "निकटतम देखभाल", or: "ନିକଟତମ ଚିକିତ୍ସା", bn: "নিকটবর্তী কেয়ার", as: "নিকটৱৰ্তী কেয়াৰ", te: "సమీప సంరక్షణ", mr: "जवळची काळजी", sat: "ᱥᱩᱨ ᱨᱮ ᱥᱟᱲᱦᱟᱣ" },
  "nav.plan": { tier: "tier3", en: "Care plan", hi: "देखभाल योजना", or: "ଯତ୍ନ ଯୋଜନା", bn: "কেয়ার পরিকল্পনা", as: "কেয়াৰ পৰিকল্পনা", te: "సంరక్షణ ప్రణాళిక", mr: "काळजीची योजना", sat: "ᱥᱟᱲᱦᱟᱣ ᱟᱹᱨᱤ" },
  "nav.device": { tier: "tier3", en: "Field device", hi: "फील्ड उपकरण", or: "ଫିଲ୍ଡ ଯନ୍ତ୍ର", bn: "ফিল্ড ডিভাইস", as: "ফিল্ড ডিভাইচ", te: "ఫీల్డ్ పరికరం", mr: "फील्ड उपकरण", sat: "ᱯᱷᱤᱞᱰ ᱢᱤᱫᱽ" },

  // ── Topbar / common (Tier 3) ──────────────────────────────────────────
  "app.title": { tier: "tier3", en: "Arogya Relay", hi: "आरोग्य रिले", or: "ଆରୋଗ୍ୟ ରିଲେ", bn: "আরোগ্য রিলে", as: "আৰোগ্য ৰিলে", te: "ఆరోగ్య రిలే", mr: "आरोग्य रेले", sat: "ᱟᱨᱚᱜᱽᱭ ᱨᱤᱞᱮ" },
  "action.newScreening": { tier: "tier3", en: "New screening", hi: "नई जाँच", or: "ନୂଆ ସ୍କ୍ରିନିଂ", bn: "নতুন স্ক্রিনিং", as: "নতুন স্ক্ৰিনিং", te: "కొత్త స్క్రీనింగ్", mr: "नवीन तपासणी", sat: "ᱱᱟᱣᱟ ᱥᱠᱨᱤᱱᱤᱝ" },
  "action.sync": { tier: "tier3", en: "Sync reports", hi: "रिपोर्ट सिंक करें", or: "ରିପୋର୍ଟ ସିଙ୍କ କରନ୍ତୁ", bn: "রিপোর্ট সিঙ্ক করুন", as: "ৰিপোর্ট ছিঙ্ক কৰক", te: "నివేదికలను సింక్ చేయి", mr: "अहवाल सिंक करा", sat: "ᱨᱤᱯᱚᱨᱴ ᱥᱤᱝᱠ ᱢᱮ" },
  "action.language": { tier: "tier3", en: "Language", hi: "भाषा", or: "ଭାଷା", bn: "ভাষা", as: "ভাষা", te: "భాష", mr: "भाषा", sat: "ᱯᱟᱹᱨᱥᱤ" },
  "action.readAloud": { tier: "tier3", en: "Read aloud", hi: "ज़ोर से पढ़ें", or: "ଜୋରରେ ପଢନ୍ତୁ", bn: "জোরে পড়ুন", as: "জোৰে পঢ়ক", te: "గట్టిగా చదువు", mr: "मोठ्याने वाचा", sat: "ᱟᱲᱟᱝ ᱛᱮ ᱯᱟᱲᱦᱟᱣ" },
  "action.showOriginal": { tier: "tier3", en: "Show original English", hi: "मूल अंग्रेज़ी दिखाएँ", or: "ମୂଳ ଇଂରାଜୀ ଦେଖନ୍ତୁ", bn: "মূল ইংরেজি দেখান", as: "মূল ইংৰাজী দেখুৱাওক", te: "అసలు ఇంగ్లీషును చూపు", mr: "मूळ इंग्रजी दाखवा", sat: "ᱟᱥᱚᱞ ᱤᱝᱨᱟᱡᱤ ᱩᱫᱩᱜ ᱢᱮ" },

  // ── Overview (Tier 3) ──────────────────────────────────────────────────
  "overview.greeting": { tier: "tier3", en: "Good morning.", hi: "सुप्रभात।", or: "ଶୁଭ ସକାଳ।", bn: "সুপ্রভাত।", as: "শুভ সকাল।", te: "శుభోదయం.", mr: "शुभ सकाळ.", sat: "ᱥᱩᱵ ᱥᱟᱜᱩᱱ." },
  "overview.greetingMorning": { tier: "tier3", en: "Good morning.", hi: "सुप्रभात।", or: "ଶୁଭ ସକାଳ।", bn: "সুপ্রভাত।", as: "শুভ সকাল।", te: "శుభోదయం.", mr: "शुभ सकाळ.", sat: "ᱥᱩᱵ ᱥᱟᱜᱩᱱ." },
  "overview.greetingAfternoon": { tier: "tier3", en: "Good afternoon.", hi: "शुभ दोपहर।", or: "ଶୁଭ ଅପରାହ୍ନ।", bn: "শুভ অপরাহ্ন।", as: "শুভ আবেলি।", te: "శుభ మధ్యాహ్నం.", mr: "शुभ दुपार.", sat: "ᱥᱟᱹᱜᱩᱱ ᱛᱤᱠᱤᱱ." },
  "overview.greetingEvening": { tier: "tier3", en: "Good evening.", hi: "शुभ संध्या।", or: "ଶୁଭ ସନ୍ଧ୍ୟା।", bn: "শুভ সন্ধ্যা।", as: "শুভ গধূলি।", te: "శుభ సాయంత్రం.", mr: "शुभ संध्याकाळ.", sat: "ᱥᱟᱹᱜᱩᱱ ᱟᱹᱭᱩᱵ." },
  "overview.subtitle": { tier: "tier3", en: "Here is what needs attention across your three villages.", hi: "यहाँ आपके तीन गाँवों में ध्यान देने योग्य बातें हैं।", or: "ଆପଣଙ୍କର ତିନି ଗାଁରେ ଯାହା ଧ୍ୟାନ ଦେବାକୁ ଆବଶ୍ୟକ।", bn: "আপনার তিনটি গ্রামে যা নজর দেওয়া দরকার।", as: "আপোনাৰ তিনিটা গাঁওত যিটো মনোযোগ দিব লাগে।", te: "మీ మూడు గ్రామాల్లో దృష్టి పెట్టాల్సినవి ఇవి.", mr: "तुझ्या तीन गावांमध्ये काय लक्ष द्यायचे आहे.", sat: "ᱟᱢᱟᱜ ᱯᱩᱱ ᱟᱹᱛᱩ ᱨᱮ ᱪᱮᱫ ᱧᱮᱞ ᱞᱟᱠᱛᱟ ᱢᱮᱱᱟᱜᱼᱟ᱾" },
  "overview.signals": { tier: "tier3", en: "Respiratory signal", hi: "श्वसन संकेत", or: "ଶ୍ୱାସପ୍ରଶ୍ୱାସ ସଙ୍କେତ", bn: "শ্বাসযন্ত্রের সিগনাল", as: "শ্বাস-প্ৰশ্বাসৰ চিহ্ন", te: "శ్వాసకోశ సంకేతం", mr: "श्वसन सिग्नल", sat: "ᱥᱟᱥ ᱪᱤᱱ" },
  "overview.urgentQueue": { tier: "tier3", en: "Urgent queue", hi: "तत्काल कतार", or: "ଜରୁରୀ ଧାଡ଼ି", bn: "জরুরি কিউ", as: "জৰুৰী কিউ", te: "అత్యవసర క్యూ", mr: "तातडीची यादी", sat: "ᱡᱩᱨᱩᱜ ᱞᱟᱭᱤᱱ" },

  // ── Nearby Care (Tier 2/3) ─────────────────────────────────────────────
  "nearby.title": { tier: "tier3", en: "Nearby Care", hi: "निकटतम देखभाल", or: "ନିକଟତମ ଚିକିତ୍ସା", bn: "নিকটবর্তী কেয়ার", as: "নিকটৱৰ্তী কেয়াৰ", te: "సమీప సంరక్షణ", mr: "जवळची काळजी", sat: "ᱥᱩᱨ ᱨᱮ ᱥᱟᱲᱦᱟᱣ" },
  "nearby.subtitle": { tier: "tier3", en: "Find appropriate care near you. Capability is ranked before distance.", hi: "अपने पास उचित देखभाल खोजें। क्षमता को दूरी से पहले रैंक किया जाता है।", or: "ଆପଣଙ୍କ ନିକଟରେ ଉପଯୁକ୍ତ ଚିକିତ୍ସା ଖୋଜନ୍ତୁ। ଦୂରତା ପୂର୍ବରୁ କ୍ଷମତାକୁ ର୍ୟାଙ୍କ କରାଯାଏ।", bn: "আপনার কাছে উপযুক্ত কেয়ার খুঁজুন। দূরত্বের আগে ক্ষমতা।", as: "আপোনাৰ ওচৰত উপযুক্ত কেয়াৰ বিচাৰক। দূৰত্বৰ আগত ক্ষমতা।", te: "మీ దగ్గర తగిన సంరక్షణ కనుగొనండి. దూరం కంటే సామర్థ్యం ముందు.", mr: "तुमच्याजवळ योग्य काळजी शोधा. अंतरापूर्वी क्षमता.", sat: "ᱟᱢᱟᱜ ᱥᱩᱨ ᱨᱮ ᱱᱟᱯᱟᱢ ᱥᱟᱲᱦᱟᱣ ᱧᱟᱢ ᱢᱮ᱾" },
  "nearby.list": { tier: "tier3", en: "List", hi: "सूची", or: "ତାଲିକା", bn: "তালিকা", as: "তালিকা", te: "జాబితా", mr: "यादी", sat: "ᱞᱤᱥᱴ" },
  "nearby.map": { tier: "tier3", en: "Map", hi: "मानचित्र", or: "ᱢᱟᱱᱪᱤᱛᱨ", bn: "মানচিত্র", as: "মানচিত্ৰ", te: "మ్యాప్", mr: "नकाशा", sat: "ᱢᱟᱯ" },
  "nearby.facilities": { tier: "tier3", en: "Nearby facilities", hi: "निकटतम सुविधाएँ", or: "ନିକଟସ୍ଥ ସୁବିଧା", bn: "নিকটবর্তী সুবিধা", as: "নিকটৱৰ্তী সুবিধা", te: "సమీప సౌకర్యాలు", mr: "जवळच्या सुविधा", sat: "ᱥᱩᱨ ᱨᱮ ᱥᱩᱵᱤᱫᱷᱟ" },
  "nearby.noResults": { tier: "tier3", en: "No facilities match these filters. Try widening them.", hi: "इन फ़िल्टरों से कोई सुविधा मेल नहीं खाती। इन्हें चौड़ा करने की कोशिश करें।", or: "ଏହି ଫିଲ୍ଟରଗୁଡ଼ିକ ସହିତ କୌଣସି ସୁବିଧା ମେଳ ଖାଉ ନାହିଁ। ଏହାକୁ ବଡ଼ କରିବାକୁ ଚେଷ୍ଟା କରନ୍ତୁ।", bn: "এই ফিল্টারের সাথে কোনো সুবিধা মেলে না। চড়া করুন।", as: "এই ফিল্টাৰৰ লগত কোনো সুবিধা মিলে নাই। ডাঙৰ কৰক।", te: "ఈ ఫిల్టర్లకు సరిపోలే సౌకర్యాలు లేవు. విస్తరించండి.", mr: "या फिल्टरशी जुळणारी कोणतीही सुविधा नाही. विस्तृत करा.", sat: "ᱱᱚᱶᱟ ᱯᱷᱤᱞᱴᱟᱨ ᱥᱟᱶ ᱢᱤᱫ ᱦᱚᱸ ᱥᱩᱵᱤᱫᱷᱟ ᱵᱟᱹᱱᱩᱜᱼᱟ᱾ ᱢᱟᱨᱟᱝ ᱢᱮ᱾" },
  "nearby.callToConfirm": { tier: "tier3", en: "call to confirm", hi: "पुष्टि करने हेतु कॉल करें", or: "ନିଶ୍ଚିତ କରିବା ପାଇଁ କল୍ କରନ୍ତୁ", bn: "নিশ্চিত করতে কল করুন", as: "নিশ্চিত কৰিবলৈ কল কৰক", te: "నిర్ధారించడానికి కాల్ చేయి", mr: "खात्री करण्यासाठी कॉल करा", sat: "ᱧᱮᱞ ᱞᱟᱹᱜᱤᱫ ᱠᱚᱞ ᱢᱮ" },
  "nearby.copyBrief": { tier: "tier3", en: "Copy referral brief", hi: "रेफरल सारांश कॉपी करें", or: "ରେଫରାଲ ସାରାଂଶ କପି କରନ୍ତୁ", bn: "রেফারেল ব্রিফ কপি করুন", as: "ৰেফাৰেল ব্ৰিফ কপি কৰক", te: "రెఫరల్ బ్రీఫ్‌ను కాపీ చేయి", mr: "रेफरल ब्रीफ कॉपी करा", sat: "ᱨᱮᱯᱷᱟᱨᱟᱞ ᱵᱨᱤᱯᱷ ᱠᱚᱯᱤ ᱢᱮ" },

  // ── Care Guidance (Tier 2) ─────────────────────────────────────────────
  "care.title": { tier: "tier2", en: "Care guidance", hi: "देखभाल मार्गदर्शन", or: "ଯତ୍ନ ମାର୍ଗଦର୍ଶନ", bn: "কেয়ার গাইডেন্স", as: "কেয়াৰ গাইডেন্স", te: "సంరక్షణ మార్గదర్శి", mr: "काळजी मार्गदर्शन", sat: "ᱥᱟᱲᱦᱟᱣ ᱜᱟᱭᱰ" },
  "care.subtitle": { tier: "tier2", en: "Screening support, not a diagnosis. Apply local clinical protocols.", hi: "जाँच समर्थन, निदान नहीं। स्थानीय नैदानिक प्रोटोकॉल लागू करें।", or: "ସ୍କ୍ରିନିଂ ସମର୍ଥନ, ରୋଗ ନିର୍ଣ୍ଣୟ ନୁହେଁ। ସ୍ଥାନୀୟ ଚିକିତ୍ସା ପ୍ରୋଟୋକଲ ପ୍ରୟୋଗ କରନ୍ତୁ।", bn: "স্ক্রিনিং সাপোর্ট, রোগ নির্ণয় নয়। স্থানীয় প্রোটোকল।", as: "স্ক্ৰিনিং সাপোৰ্ট, ৰোগ নিৰ্ণয় নহয়। স্থানীয় প্ৰটোকল।", te: "స్క్రీనింగ్ మద్దతు, రోగ నిర్ధారణ కాదు. స్థానిక ప్రోటోకాల్.", mr: "तपासणी समर्थन, निदान नाही. स्थानिक प्रोटोकॉल लागू करा.", sat: "ᱥᱠᱨᱤᱱᱤᱝ ᱥᱟᱲᱦᱟᱣ, ᱵᱟᱝ ᱵᱷᱮᱡᱽ ᱧᱟᱢ ᱵᱟᱝ। ᱞᱚᱠᱟᱞ ᱯᱨᱚᱴᱚᱠᱚᱞ ᱵᱮᱵᱷᱟᱨ ᱢᱮ।" },
  "care.symptomQuestion": { tier: "tier2", en: "What symptoms are you noticing?", hi: "आप कौन से लक्षण देख रहे हैं?", or: "ଆପଣ କେଉଁ ଲକ୍ଷଣ ଦେଖୁଛନ୍ତି?", bn: "আপনি কী লক্ষণ দেখছেন?", as: "আপুনি কি লক্ষণ দেখি পাইছে?", te: "మీరు ఏ లక్షణాలను గమనిస్తున్నారు?", mr: "तुम्ही कोणती लक्षणे पाहत आहात?", sat: "ᱟᱢ ᱪᱮᱫ ᱪᱤᱱᱦ ᱧᱮᱞ ᱛᱟᱸᱫᱟᱢ ᱠᱟᱱᱟ?" },
  "care.getGuidance": { tier: "tier3", en: "Get guidance", hi: "मार्गदर्शन प्राप्त करें", or: "ମାର୍ଗଦର୍ଶନ ପାଆନ୍ତୁ", bn: "গাইডেন্স পান", as: "গাইডেন্স পাওক", te: "మార్గదర్శనం పొందు", mr: "मार्गदर्शन मिळवा", sat: "ᱜᱟᱭᱰ ᱧᱟᱢ ᱢᱮ" },

  // ── Emergency / Tier 1 (NEVER machine-translated at runtime) ──────────
  // Provided in English only as the approved baseline; falls back to en.
  "emergency.call112": { tier: "tier1", en: "Call 112 now for any life-threatening situation. Do not wait for the map to load." },
  "emergency.button": { tier: "tier1", en: "Call 112" },
  "emergency.title": { tier: "tier1", en: "Emergency?" },
  "consent.location": { tier: "tier1", en: "I allow Arogya Relay to use my location for this referral. It is retained briefly and can be deleted." },
  "referral.instruction": { tier: "tier1", en: "Go to the facility named below. Carry this brief. Call ahead to confirm they are open." },
  "medication.beforeFood": { tier: "tier1", en: "Before food" },
  "medication.afterFood": { tier: "tier1", en: "After food" },
  "medication.asNeeded": { tier: "tier1", en: "As needed" },
  "medication.doNotDouble": { tier: "tier1", en: "Do not double the dose" },
  "medication.onceDaily": { tier: "tier1", en: "Once daily" },
  "medication.oneTablet": { tier: "tier1", en: "One tablet" },

  // ── Safety / prototype notices (Tier 1) ───────────────────────────────
  "notice.prototype": { tier: "tier1", en: "Research and user-interface prototype. Not a certified medical device. All records shown are fictional demonstration data." },
  "notice.referralSupport": { tier: "tier1", en: "Referral support only. Facility and camp data are synthetic. Always call to confirm. Arogya Relay does not dispatch ambulances." },
  "notice.screeningSupport": { tier: "tier1", en: "Screening support only. Arogya Relay highlights patterns; it does not diagnose. Apply local clinical and referral protocols." },
};

