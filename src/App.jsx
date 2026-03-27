﻿﻿﻿﻿import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  ShieldCheck, Store, Settings, LayoutDashboard,
  BadgeDollarSign, Scissors, ClipboardList, Users,
  Lock, Package, Search, ArrowRight, CreditCard,
  Home, LogOut, Trash2, ChevronRight, BookOpen, Printer, ImageIcon,
  Droplet, Repeat, ThermometerSnowflake, Sparkles, AlertTriangle, Calculator,
  MessageCircle, Send, ScrollText, Edit3, Trash, ShoppingCart, RotateCcw, Save
} from 'lucide-react';

// --- FIREBASE SETUP ---
const userFirebaseConfig = {
  apiKey: "AIzaSyBtqinodXxcYU4U5F-LoImCOj681KlZ9w4",
  authDomain: "bonded-by-peptides.firebaseapp.com",
  projectId: "bonded-by-peptides",
  storageBucket: "bonded-by-peptides.firebasestorage.app",
  messagingSenderId: "840550043632",
  appId: "1:840550043632:web:d935ae58a19ed96893d735",
  measurementId: "G-6NMJD9WTS6"
};

const isCanvas = typeof __firebase_config !== 'undefined';
const firebaseConfig = isCanvas ? JSON.parse(__firebase_config) : userFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const colPath = (name) => isCanvas ? `artifacts/${appId}/public/data/${name}` : name;

const SLOTS_PER_BATCH = 10;
const CHAT_RETENTION_MS = 24 * 60 * 60 * 1000;
const HERO_CUTE_FLOATERS = [
  { id: 'unicorn', icon: '\uD83E\uDD84', label: 'unicorn', tone: 'from-white/90 to-pink-100/78', startX: 0.68, startY: 0.16, vx: -1.45, vy: 1.2, spin: -0.45 },
  { id: 'puppy', icon: '\uD83D\uDC36', label: 'puppy', tone: 'from-white/88 to-rose-100/78', startX: 0.12, startY: 0.72, vx: 1.3, vy: -1.18, spin: 0.52 },
  { id: 'sparkle', icon: '\u2728', label: 'sparkle', tone: 'from-white/88 to-[#FFE8F4]/84', startX: 0.86, startY: 0.26, vx: -1.24, vy: 1.08, spin: 0.35 },
  { id: 'kitten', icon: '\uD83D\uDC31', label: 'kitten', tone: 'from-white/88 to-[#FFE6F7]/80', startX: 0.14, startY: 0.28, vx: 1.2, vy: 1.26, spin: -0.58 },
  { id: 'heart', icon: '\uD83D\uDC96', label: 'heart', tone: 'from-white/88 to-[#FFD6EC]/82', startX: 0.76, startY: 0.7, vx: -1.12, vy: -1.1, spin: 0.42 },
  { id: 'ribbon', icon: '\uD83C\uDF80', label: 'ribbon', tone: 'from-white/88 to-[#FFE9F5]/82', startX: 0.42, startY: 0.12, vx: 1.18, vy: 1.05, spin: 0.68 }
];
const CUTE_PLEAS = [
  "Please help me complete the box.",
  "Don't let my vials get cut.",
  "I really need this product.",
  "Save my spot.",
  "Looking for box buddies.",
  "Help, I do not want to be trimmed."
];
const CALCULATOR_DOSE_PRESETS = [0.1, 0.25, 0.5, 1, 2, 2.5, 5, 7.5, 10, 12.5, 15];
const CALCULATOR_STRENGTH_PRESETS = [1, 5, 10, 15, 20, 50];
const CALCULATOR_WATER_PRESETS = [0.5, 1, 1.5, 2, 2.5, 3];
const PARTIAL_SHIP_OPTIONS = [
  { value: 'ship-ready', label: 'Ship agad pag may ready' },
  { value: 'wait-complete', label: 'Wait ko makumpleto lahat' }
];
const SHOP_ACCESS_STORAGE_KEY = 'bbp-shop-access-code';
const createEmptyAddressForm = () => ({ shipOpt: '', partialShipPref: '', street: '', brgy: '', city: '', prov: '', zip: '', contact: '' });
const normalizeAccessCode = (value) => String(value || '').trim().toLowerCase();
const normalizePartialShipPreference = (value) => {
  const cleaned = String(value || '').trim().toLowerCase();
  if (!cleaned) return '';
  if (['ship-ready', 'ship ready', 'ship agad', 'ship agad pag may ready', 'ship agad pag may ready na'].includes(cleaned)) return 'ship-ready';
  if (['wait-complete', 'wait complete', 'wait', 'hintay', 'wait ko makumpleto lahat'].includes(cleaned)) return 'wait-complete';
  return '';
};
const getPartialShipPreferenceLabel = (value) => PARTIAL_SHIP_OPTIONS.find(option => option.value === normalizePartialShipPreference(value))?.label || '';

// âœ¨ SUPERCHARGED KNOWLEDGE BASE
const WIKI_DATA = [
  { name: "5-amino-1mq", tags: ["Fat Loss", "Energy"], desc: "A small molecule that blocks the NNMT enzyme. Effectively reverses diet-induced obesity and enhances cellular energy metabolism without jitteriness.", dosage: "50mg to 150mg daily (Oral)", cycle: "4 to 8 weeks", storage: "Room Temperature / Refrigerate" },
  { name: "AA Water / Bacteriostatic Water", tags: ["Supplies", "Reconstitution"], desc: "Sterile water containing 0.9% benzyl alcohol. Essential for safely reconstituting and preserving lyophilized peptides.", dosage: "As required by peptide calculator", cycle: "Discard 28 days after first puncture", storage: "Room temperature (Dark place)" },
  { name: "AHK-Cu", tags: ["Hair", "Skin"], desc: "A powerful copper peptide specifically favored for hair growth and combating alopecia by stimulating blood flow to hair follicles.", dosage: "200mg per 50ml serum (Topical)", cycle: "Daily", storage: "Refrigerate (2°C - 8°C)" },
  { name: "AICAR", tags: ["Endurance", "Metabolism"], desc: "Activates AMPK pathways to dramatically increase endurance and fat burning, effectively simulating the metabolic effects of exercise.", dosage: "10mg to 20mg daily", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "AOD 9604", tags: ["Fat Loss"], desc: "Anti-Obesity Drug. A modified fragment of human growth hormone that specifically stimulates fat burning without affecting blood sugar or tissue growth.", dosage: "250mcg to 500mcg daily (Fasted)", cycle: "4 to 12 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "ARA-290", tags: ["Neuropathy", "Pain", "Inflammation"], desc: "A powerful peptide that stimulates tissue repair, specifically targeting small fiber neuropathy and chronic neuropathic pain.", dosage: "4mg daily", cycle: "28 days", storage: "Refrigerate reconstituted vial" },
  { name: "BPC-157", tags: ["Healing", "Gut Health", "Recovery"], desc: "Body Protection Compound. Rapidly accelerates the healing of tendons, ligaments, muscles, and the nervous system. Highly protective of gastric organs.", dosage: "250mcg to 500mcg daily (1-2x per day)", cycle: "4 to 12 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "Cagri-Sema (Blend)", tags: ["Weight Loss", "Blend"], desc: "A highly potent synergistic blend of Cagrilintide and Semaglutide. Maximizes appetite suppression and heavily delays gastric emptying.", dosage: "0.25mg to 2.4mg weekly", cycle: "Ongoing / As needed", storage: "Refrigerate (2°C - 8°C)" },
  { name: "Cagrilintide", tags: ["Weight Loss"], desc: "A long-acting amylin analog. Works synergistically with GLP-1s to significantly increase feelings of fullness and slow gastric emptying.", dosage: "0.25mg to 2.4mg weekly", cycle: "Ongoing / As needed", storage: "Refrigerate (2°C - 8°C)" },
  { name: "Cerebrolysin", tags: ["Brain Health", "Nootropic"], desc: "A peptide blend that mimics neurotrophic factors. Used for cognitive enhancement, stroke recovery, and protecting against neurodegenerative diseases.", dosage: "5ml to 10ml daily (IM/IV)", cycle: "4 weeks", storage: "Room Temperature (Keep dark)" },
  { name: "CJC-1295 / Ipamorelin (Blend)", tags: ["Growth Hormone", "Blend", "Anti-Aging"], desc: "The ultimate synergistic GH stack. Blends a GHRH with a GHRP to pulse natural growth hormone without raising cortisol or prolactin.", dosage: "200mcg to 300mcg nightly", cycle: "8 to 12 weeks (5 days on, 2 days off)", storage: "Refrigerate reconstituted vial" },
  { name: "CJC-1295 with/without DAC", tags: ["Growth Hormone", "Recovery"], desc: "A synthetic GHRH analog that increases basal growth hormone levels and IGF-1, deeply improving sleep, recovery, and muscle growth. (DAC extends half-life significantly).", dosage: "100mcg to 300mcg daily (No DAC) / 1mg-2mg weekly (With DAC)", cycle: "8 to 12 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "DSIP", tags: ["Sleep", "Recovery"], desc: "Delta Sleep-Inducing Peptide. Promotes deep, slow-wave restorative sleep and helps normalize cortisol levels and stress.", dosage: "100mcg to 250mcg before bed", cycle: "As needed (Not for daily long-term use)", storage: "Refrigerate reconstituted vial" },
  { name: "Epithalon", tags: ["Anti-Aging", "Sleep", "Longevity"], desc: "A pineal gland peptide that regulates the sleep-wake cycle and has been shown to lengthen telomeres, extending the lifespan of cells.", dosage: "5mg to 10mg daily", cycle: "10 to 20 days (Repeat 1-2x a year)", storage: "Refrigerate reconstituted vial" },
  { name: "GHK-Cu", tags: ["Skin", "Hair", "Anti-Aging"], desc: "A naturally occurring copper peptide. Promotes collagen and elastin production, accelerates wound healing, and stimulates hair growth.", dosage: "1mg to 2mg daily (Injectable or Topical)", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "GHRP-2", tags: ["Growth Hormone", "Appetite"], desc: "A potent growth hormone secretagogue that causes a massive release of GH. Note: Can slightly increase appetite and cortisol compared to Ipamorelin.", dosage: "100mcg to 200mcg 1-3x daily", cycle: "8 to 12 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "GLOW Blend", tags: ["Skin", "Anti-Aging", "Blend"], desc: "A premium cosmetic peptide blend designed to stimulate collagen, reduce wrinkles, and give the skin a radiant, youthful appearance.", dosage: "Topical or 1mg to 2mg SubQ daily", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "Glutathione", tags: ["Detox", "Antioxidant", "Skin"], desc: "The body's master antioxidant. Vital for liver detoxification, reducing oxidative stress, immune support, and promoting skin brightness.", dosage: "100mg to 200mg 1-3x weekly", cycle: "Ongoing", storage: "Refrigerate reconstituted vial" },
  { name: "HCG", tags: ["Hormones", "Fertility"], desc: "Human Chorionic Gonadotropin. Often used alongside TRT to maintain endogenous testosterone production and testicular volume.", dosage: "250IU to 500IU 2-3x weekly", cycle: "Ongoing with TRT", storage: "Refrigerate reconstituted vial" },
  { name: "HGH 191AA (Somatropin)", tags: ["Growth Hormone", "Recovery", "Fat Loss"], desc: "Bio-identical synthetic Human Growth Hormone. Drives cell regeneration, extreme fat loss, and muscle preservation.", dosage: "2IU to 4IU daily", cycle: "3 to 6+ months", storage: "Refrigerate reconstituted vial" },
  { name: "IGF-1 LR3", tags: ["Muscle Growth", "Performance"], desc: "Extended half-life variant of Insulin-like Growth Factor 1. Promotes massive muscle hyperplasia (new muscle cells) and nutrient shuttling.", dosage: "20mcg to 50mcg post-workout", cycle: "4 weeks on, 4 weeks off", storage: "Refrigerate reconstituted vial" },
  { name: "Ipamorelin", tags: ["Growth Hormone", "Anti-Aging"], desc: "A selective GHRP that stimulates a massive release of natural growth hormone without significantly spiking cortisol or prolactin (no hunger spikes).", dosage: "100mcg to 300mcg 1-3x daily", cycle: "8 to 12 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "KissPeptin-10", tags: ["Hormones", "Libido", "Fertility"], desc: "A master regulator of the HPG axis. Naturally stimulates the body's own production of testosterone and significantly enhances libido.", dosage: "100mcg to 200mcg daily or EOD", cycle: "4 to 6 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "KLOW Blend", tags: ["Healing", "Blend", "Skin"], desc: "The 'Wolverine' stack (BPC-157 + TB-500 + GHK-Cu + KPV). An elite combination for rapid tissue repair, gut health, and glowing skin.", dosage: "1mg to 2mg total blend daily", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "KPV", tags: ["Anti-Inflammatory", "Gut", "Skin"], desc: "A powerful, naturally occurring anti-inflammatory peptide. Extremely effective for inflammatory bowel diseases (IBD), psoriasis, and systemic inflammation.", dosage: "200mcg to 500mcg daily", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "L-Carnitine", tags: ["Fat Loss", "Energy"], desc: "An amino acid derivative that transports fatty acids into your cells' mitochondria to be burned for usable energy.", dosage: "200mg to 500mg daily (Pre-workout)", cycle: "Ongoing", storage: "Room Temperature / Refrigerate" },
  { name: "Lemon Bottle", tags: ["Fat Loss", "Aesthetics"], desc: "A premium, high-concentration lipolysis (fat dissolving) solution containing Riboflavin, Bromelain, and Lecithin. Used for targeted fat reduction.", dosage: "10ml to 50ml per session (SubQ localized)", cycle: "1 session per week (3-5 sessions total)", storage: "Room Temperature" },
  { name: "Lipo-C", tags: ["Fat Loss", "Liver Health"], desc: "A powerful lipotropic injection containing Methionine, Inositol, and Choline. Accelerates the breakdown of fat in the liver.", dosage: "1ml to 2ml 1-2x weekly (IM)", cycle: "Ongoing", storage: "Refrigerate" },
  { name: "MOTS-c", tags: ["Metabolism", "Exercise Mimetic"], desc: "A mitochondrial-derived peptide. Acts as an 'exercise mimetic' by boosting metabolism, improving insulin sensitivity, and enhancing physical performance.", dosage: "5mg to 10mg weekly (or pre-workout)", cycle: "4 to 6 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "NAD+", tags: ["Energy", "Anti-Aging", "Cellular Health"], desc: "A critical coenzyme found in every cell. Supplementation boosts mitochondrial function, aids in DNA repair, and increases overall energy levels.", dosage: "50mg to 100mg daily (SubQ)", cycle: "Ongoing / Intermittent", storage: "Refrigerate reconstituted vial" },
  { name: "Oxytocin", tags: ["Mood", "Bonding", "Stress"], desc: "The 'love hormone'. Greatly reduces social anxiety, promotes deep psychological bonding, accelerates healing, and enhances intimate touch.", dosage: "10mcg to 50mcg as needed", cycle: "As needed", storage: "Refrigerate reconstituted vial" },
  { name: "Pinealon", tags: ["Brain Health", "Circadian Rhythm"], desc: "A short peptide that interacts directly with DNA to protect brain cells from hypoxia and regulate the circadian rhythm.", dosage: "5mg to 10mg daily", cycle: "10 to 20 days (Repeat 1-2x a year)", storage: "Refrigerate reconstituted vial" },
  { name: "PT-141 (Bremelanotide)", tags: ["Libido", "Sexual Health"], desc: "Works directly through the nervous system to significantly increase sexual desire and treat sexual dysfunction in both men and women.", dosage: "1mg to 2mg as needed (2-4 hrs prior)", cycle: "As needed (Avoid daily use)", storage: "Refrigerate reconstituted vial" },
  { name: "Retatrutide", tags: ["Weight Loss", "Metabolism"], desc: "A triple-agonist (GLP-1, GIP, Glucagon). An advanced compound currently showing unprecedented weight loss and liver fat reduction in trials.", dosage: "2mg to 12mg weekly", cycle: "Ongoing / As needed", storage: "Refrigerate (2°C - 8°C)" },
  { name: "Selank", tags: ["Anxiety", "Nootropic", "Focus"], desc: "A synthetic peptide with anxiolytic (anti-anxiety) and nootropic properties. Improves learning and stabilizes mood without causing sedation.", dosage: "250mcg to 500mcg daily", cycle: "2 to 4 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "Semaglutide", tags: ["Weight Loss"], desc: "A GLP-1 receptor agonist. The active ingredient in popular weight loss medications, excellent for appetite suppression and steady weight management.", dosage: "0.25mg to 2.4mg weekly", cycle: "Ongoing / As needed", storage: "Refrigerate (2°C - 8°C)" },
  { name: "Semax", tags: ["Cognition", "Nootropic", "Focus"], desc: "A neuroactive peptide that increases Brain-Derived Neurotrophic Factor (BDNF). Enhances focus, memory, and offers neuroprotection.", dosage: "250mcg to 1mg daily", cycle: "2 to 4 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "Sermorelin", tags: ["Growth Hormone", "Sleep"], desc: "A well-tolerated GHRH that naturally encourages the pituitary gland to release more growth hormone. Excellent for sleep and anti-aging.", dosage: "200mcg to 500mcg nightly", cycle: "12 to 16 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "SLU-PP-332", tags: ["Endurance", "Fat Loss", "Exercise Mimetic"], desc: "An advanced ERR agonist known as an 'exercise pill'. Increases skeletal muscle endurance and fat oxidation without physical exercise.", dosage: "1mg to 2mg daily", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "Snap-8", tags: ["Skin", "Anti-Wrinkle"], desc: "A cosmetic octapeptide designed to reduce the depth of facial wrinkles caused by muscle contractions. A milder alternative to Botox.", dosage: "Added to serums at 2% to 10% concentration", cycle: "Daily (Topical)", storage: "Room Temperature (Keep dark)" },
  { name: "SS-31 (Elamipretide)", tags: ["Mitochondria", "Organ Health"], desc: "Targets the inner mitochondrial membrane to restore cellular energy production, drastically reducing oxidative stress and protecting organs.", dosage: "2mg to 4mg daily", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "TB-500 / BPC-157 (Blend)", tags: ["Healing", "Blend"], desc: "The undisputed gold-standard recovery stack. Combines systemic and localized healing properties to rapidly repair muscle and connective tissue.", dosage: "500mcg to 1mg of blend daily", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "TB-500", tags: ["Healing", "Inflammation", "Muscle"], desc: "Synthetic fraction of Thymosin Beta-4. Promotes new blood vessel formation (angiogenesis), reduces inflammation, and repairs muscle tears.", dosage: "2mg to 2.5mg twice weekly", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "Tesamorelin", tags: ["Fat Loss", "Growth Hormone"], desc: "A GHRH analog heavily researched and known specifically for its unique ability to reduce visceral adipose tissue (stubborn belly fat).", dosage: "1mg to 2mg daily (Before bed)", cycle: "8 to 12 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "Thymalin", tags: ["Immune", "Longevity"], desc: "A bioregulator peptide that profoundly restores immune system function, normalizes circadian rhythms, and supports the endocrine system.", dosage: "10mg daily", cycle: "10 to 20 days (Repeat every 6-12 months)", storage: "Refrigerate reconstituted vial" },
  { name: "Thymosin Alpha-1", tags: ["Immune Support", "Healing"], desc: "A major component of the thymus gland. Restores immune function, helps fight chronic infections, and acts as a powerful immunomodulator.", dosage: "1.5mg twice weekly", cycle: "Ongoing or Acute use", storage: "Refrigerate reconstituted vial" },
  { name: "VIP (Vasoactive Intestinal Peptide)", tags: ["Immune", "Gut", "Mold Toxicity"], desc: "A potent neuroendocrine peptide. Highly effective for reducing chronic systemic inflammation, treating mold toxicity (CIRS), and regulating the immune system.", dosage: "50mcg 1-4x daily (Nasal Spray or SubQ)", cycle: "Ongoing as prescribed", storage: "Refrigerate reconstituted vial" },
  { name: "Tirzepatide", tags: ["Weight Loss", "Metabolism"], desc: "A dual GIP and GLP-1 receptor agonist. Superior to Semaglutide in weight loss clinical trials by targeting two hormonal pathways instead of one.", dosage: "2.5mg to 15mg weekly", cycle: "Ongoing / As needed", storage: "Refrigerate (2°C - 8°C)" },
  { name: "GKP-70 (Glow Plus)", tags: ["Skin", "Healing", "Blend"], desc: "An advanced version of the GLOW blend. Higher concentration of GHK-Cu, BPC-157, and TB-500 for maximum anti-aging and regenerative effects.", dosage: "2mg to 3mg daily", cycle: "4 to 8 weeks", storage: "Refrigerate reconstituted vial" },
  { name: "Pharma Bac", tags: ["Supplies"], desc: "Premium pharmaceutical-grade bacteriostatic water. Used for the safe reconstitution and preservation of sensitive peptide sequences.", dosage: "As needed", cycle: "Discard 28 days after use", storage: "Room Temperature" },
  { name: "Vasopressin (VP)", tags: ["Cognition", "Memory", "Focus"], desc: "A natural hormone that regulates water retention and blood pressure, used off-label for significant improvements in memory recall and mental alertness.", dosage: "10mcg to 20mcg (Nasal Spray)", cycle: "As needed", storage: "Refrigerate" },
  { name: "Tesofensine", tags: ["Weight Loss", "Appetite"], desc: "A monoamine reuptake inhibitor investigated for obesity support, mainly discussed for appetite reduction and meaningful body-weight loss in trials.", dosage: "Commonly sold in mcg or mg strengths depending on format", cycle: "Use only with a clear protocol", storage: "Room temperature / as labeled", benefits: ["appetite control", "weight-management support", "metabolic focus"] },
  { name: "Mazdutide", tags: ["Weight Loss", "Metabolism"], desc: "A dual GLP-1 and glucagon receptor agonist being studied for obesity and metabolic support, with strong weight-loss signals in clinical trials.", dosage: "Usually weekly formats depending on product strength", cycle: "Protocol-dependent", storage: "Refrigerate (2°C - 8°C)", benefits: ["appetite support", "metabolic support", "weight-management focus"] },
  { name: "Melanotan II", tags: ["Tanning", "Libido"], desc: "A melanocortin receptor agonist commonly discussed for pigmentation effects and libido-related interest, but it also carries notable safety concerns when used outside regulated settings.", dosage: "Protocol-dependent", cycle: "Use cautiously and only with clear guidance", storage: "Refrigerate reconstituted vial", benefits: ["pigmentation support", "melanocortin activity", "libido-related interest"] }
];

const PRODUCT_INFO_FALLBACKS = [
  { keys: ["tesofensine"], tags: ["Weight Loss", "Appetite"], desc: "A weight-management compound usually discussed for appetite control and metabolic support.", benefits: ["appetite control", "metabolic support", "weight-management focus"] },
  { keys: ["mazdutide"], tags: ["Weight Loss", "Metabolism"], desc: "A dual incretin-style weight-management compound often positioned for appetite and metabolic support.", benefits: ["appetite support", "metabolic support", "weekly weight-management focus"] },
  { keys: ["melanotan"], tags: ["Pigmentation", "Libido"], desc: "A melanocortin-related compound commonly associated with tanning and libido-oriented interest.", benefits: ["pigmentation support", "melanocortin activity", "libido-oriented interest"] },
  { keys: ["hmg", "menotropin"], tags: ["Fertility", "Hormones"], desc: "A fertility-focused gonadotropin product typically used in hormone-support protocols.", benefits: ["fertility support", "gonadotropin support", "hormone protocol use"] },
  { keys: ["peg mgf", "mgf"], tags: ["Muscle Growth", "Recovery"], desc: "A mechano-growth-factor style product typically positioned around muscle repair and training recovery.", benefits: ["recovery support", "muscle-repair focus", "training support"] },
  { keys: ["bac water", "bacteriostatic"], tags: ["Supplies", "Reconstitution"], desc: "Sterile mixing water used for reconstitution and storage workflows.", benefits: ["reconstitution support", "supply essential", "multi-use handling"] }
];

const TAG_BENEFIT_MAP = {
  "Weight Loss": ["appetite support", "weight-management focus", "metabolic support"],
  "Metabolism": ["metabolic support", "energy-system focus", "body-composition interest"],
  "Healing": ["repair support", "recovery focus", "tissue-support interest"],
  "Recovery": ["recovery support", "post-cycle support", "performance upkeep"],
  "Growth Hormone": ["GH-axis support", "recovery focus", "body-composition interest"],
  "Muscle Growth": ["training support", "muscle-building interest", "recovery support"],
  "Skin": ["skin-support focus", "collagen interest", "appearance support"],
  "Hair": ["hair-support focus", "follicle support", "appearance support"],
  "Anti-Aging": ["longevity interest", "recovery support", "cellular-support focus"],
  "Brain Health": ["brain-support focus", "clarity interest", "neuro-support"],
  "Cognition": ["focus support", "clarity interest", "memory-oriented support"],
  "Focus": ["focus support", "clarity interest", "task-performance support"],
  "Sleep": ["sleep support", "night-time recovery", "stress-reset interest"],
  "Hormones": ["hormone support", "endocrine focus", "balance-oriented use"],
  "Libido": ["libido interest", "mood-connection support", "relationship wellness interest"],
  "Gut": ["gut-support focus", "digestive comfort", "inflammation-oriented support"],
  "Inflammation": ["inflammation support", "recovery focus", "comfort support"],
  "Supplies": ["mixing support", "workflow essential", "reconstitution utility"]
};

const findWikiEntry = (pName) => {
  if (!pName) return null;
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pClean = clean(pName);
  return WIKI_DATA.find(w => {
    const wClean = clean(w.name);
    return pClean.includes(wClean) || wClean.includes(pClean);
  });
};

const getStrengthLabel = (productName) => {
  if (!productName) return '';
  const matches = productName.match(/(\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|iu))/gi);
  return matches ? matches.join(' / ').toUpperCase() : '';
};

const getFallbackInfo = (productName) => {
  const lower = String(productName || '').toLowerCase();
  const matched = PRODUCT_INFO_FALLBACKS.find(item => item.keys.some(key => lower.includes(key)));
  if (matched) return matched;

  return {
    tags: ["Research", "Reference"],
    desc: "A batch item in the current catalog. Open the details view for the fuller reference card and ordering notes.",
    benefits: ["catalog reference", "batch ordering item", "details available in info view"]
  };
};

const buildProductInfo = (productName) => {
  const direct = findWikiEntry(productName);
  const fallback = getFallbackInfo(productName);
  const base = direct || fallback;
  const strength = getStrengthLabel(productName);
  const tags = base.tags?.length ? base.tags : fallback.tags;
  const tagBenefits = tags.flatMap(tag => TAG_BENEFIT_MAP[tag] || []);
  const benefits = Array.from(new Set([...(base.benefits || []), ...tagBenefits])).slice(0, 3);
  const shortDesc = base.desc.length > 120 ? `${base.desc.slice(0, 117)}...` : base.desc;
  const protectionNote = "10 vials = 1 protected kit. Extra loose vials can still be trimmed if a box stays incomplete.";

  return {
    name: base.name || productName,
    displayName: productName,
    tags,
    desc: base.desc,
    dosage: base.dosage || (strength ? `Label strength: ${strength}` : "Check product label for strength and mixing details."),
    cycle: base.cycle || "Protocol-dependent",
    storage: base.storage || "Store exactly as labeled",
    benefits,
    shortDesc,
    strength,
    protectionNote,
    isFallback: !direct
  };
};

const getProductImageSrc = (productInfo) => {
  const escapeXml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  const safeName = escapeXml((productInfo.displayName || productInfo.name || 'Product').slice(0, 28));
  const safeStrength = escapeXml(productInfo.strength || 'Research vial');
  const safeBenefits = escapeXml((productInfo.benefits || []).slice(0, 2).join(' • ') || 'Reference support');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="280" viewBox="0 0 220 280">
      <defs>
        <linearGradient id="shadow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="capTop" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#1c7d3a"/>
          <stop offset="50%" stop-color="#27a34d"/>
          <stop offset="100%" stop-color="#186c31"/>
        </linearGradient>
        <linearGradient id="metal" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#8f8f93"/>
          <stop offset="18%" stop-color="#eeeeef"/>
          <stop offset="52%" stop-color="#a7a7ab"/>
          <stop offset="82%" stop-color="#f6f6f7"/>
          <stop offset="100%" stop-color="#8f8f93"/>
        </linearGradient>
        <linearGradient id="glass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
          <stop offset="65%" stop-color="#fbfbfc" stop-opacity="0.75"/>
          <stop offset="100%" stop-color="#e5e6ea" stop-opacity="0.95"/>
        </linearGradient>
        <linearGradient id="labelStrip" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stop-color="#16813b"/>
          <stop offset="100%" stop-color="#27a34d"/>
        </linearGradient>
      </defs>
      <rect width="220" height="280" rx="28" fill="#ffffff"/>
      <ellipse cx="110" cy="250" rx="54" ry="12" fill="url(#shadow)"/>
      <rect x="67" y="20" width="86" height="26" rx="8" fill="url(#capTop)"/>
      <rect x="72" y="42" width="76" height="20" rx="6" fill="url(#metal)"/>
      <rect x="91" y="55" width="38" height="22" rx="6" fill="#f6f6f8" stroke="#cbccd2"/>
      <path d="M78 83 C80 70, 140 70, 142 83 L150 220 C150 229, 70 229, 70 220 Z" fill="url(#glass)" stroke="#d7d9de" stroke-width="2"/>
      <path d="M88 86 C90 78, 130 78, 132 86 L137 121 H83 Z" fill="#ffffff" fill-opacity="0.64"/>
      <rect x="76" y="112" width="68" height="82" rx="7" fill="#ffffff" stroke="#d9d9de"/>
      <text x="110" y="142" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#1a2d7b">${safeName}</text>
      <text x="110" y="164" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#1a2d7b">${safeStrength}</text>
      <text x="110" y="182" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="700" fill="#4d4d52">${safeBenefits}</text>
      <rect x="76" y="187" width="68" height="15" rx="0" fill="url(#labelStrip)"/>
      <text x="110" y="198" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#ffffff">Research Use Only</text>
      <rect x="84" y="96" width="9" height="118" rx="4" fill="#ffffff" fill-opacity="0.55"/>
      <rect x="120" y="92" width="5" height="118" rx="3" fill="#ffffff" fill-opacity="0.25"/>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const slugifyProductName = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const getRealProductImageSrc = (productName, explicitImageUrl = '') => {
  if (explicitImageUrl) return explicitImageUrl;
  const slug = slugifyProductName(productName);
  return `/product-vials/${slug}.png`;
};

const safeAwait = (promise, ms = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout! Check your Firebase rules or connection.")), ms))
  ]);
};

const parseCSVLine = (text) => {
  let ret = [], inQuote = false, value = '';
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    if (inQuote) {
      if (char === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') { inQuote = false; }
      else { value += char; }
    } else {
      if (char === '"') { inQuote = true; }
      else if (char === ',') { ret.push(value); value = ''; }
      else { value += char; }
    }
  }
  ret.push(value);
  return ret;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('shop');
  const [adminTab, setAdminTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const toastTimeoutRef = useRef(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHitListModal, setShowHitListModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showWikiModal, setShowWikiModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showAllProofsModal, setShowAllProofsModal] = useState(false);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState(null);
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [shopAccessCodeInput, setShopAccessCodeInput] = useState('');
  const [hasShopAccess, setHasShopAccess] = useState(false);
  const [pendingHitListAdd, setPendingHitListAdd] = useState(null);
  const [adminNoteDrafts, setAdminNoteDrafts] = useState({});

  const [hoveredProof, setHoveredProof] = useState(null);
  const [fullScreenProof, setFullScreenProof] = useState(null);

  const [shakingField, setShakingField] = useState(null);
  const [shakingProd, setShakingProd] = useState(null);
  const [addressErrors, setAddressErrors] = useState({});

  const [showAmbulance, setShowAmbulance] = useState(false);
  const [celebration, setCelebration] = useState({ show: false, type: '' });

  const [confirmAction, setConfirmAction] = useState({ type: null, id: null });
  const [showHowTo, setShowHowTo] = useState(false);

  const [chats, setChats] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [latestChatPreview, setLatestChatPreview] = useState(null);
  const chatEndRef = useRef(null);
  const chatPanelRef = useRef(null);
  const chatLauncherRef = useRef(null);
  const chatCleanupRef = useRef(false);
  const heroSectionRef = useRef(null);
  const heroBubbleFieldRef = useRef(null);
  const heroBubbleNodesRef = useRef({});
  const heroBubblePhysicsRef = useRef([]);
  const heroBubbleFrameRef = useRef(null);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState(createEmptyAddressForm());

  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [paymentFilterAdmin, setPaymentFilterAdmin] = useState('All');
  const [paymentViewFilter, setPaymentViewFilter] = useState('all');
  const [paymentSort, setPaymentSort] = useState('proof-first');

  // âœ¨ NEW: Admin Inline Order Editing State
  const [adminOrderEditTarget, setAdminOrderEditTarget] = useState(null);
  const [adminCart, setAdminCart] = useState({});
  const [adminModalSearchQuery, setAdminModalSearchQuery] = useState('');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [safetyRecords, setSafetyRecords] = useState([]);

  // Initializing with an empty array for admins
  const [settings, setSettings] = useState({
    batchName: 'Sample Group Buy Batch',
    fxRate: 60,
    adminFeePhp: 150,
    minOrder: 3,
    storeOpen: true,
    reviewStageOpen: false,
    paymentsOpen: false,
    addOnly: false,
    gasWebAppUrl: '',
    googleSheetUrl: '',
    proofFolder: 'proof of payments',
    labelsFolder: 'Order Labels',
    adminPass: 'admin123',
    shopAccessCode: '',
    shippingOptions: ["Lalamove", "LBC", "J&T", "Pickup"],
    admins: []
  });

  const [customerEmail, setCustomerEmail] = useState('');
  const [customerEmailConfirm, setCustomerEmailConfirm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerHandle, setCustomerHandle] = useState('');
  const [cartItems, setCartItems] = useState({});
  const [addressForm, setAddressForm] = useState(createEmptyAddressForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [wikiTagFilter, setWikiTagFilter] = useState('All');
  const [calculatorDoseMg, setCalculatorDoseMg] = useState(0.25);
  const [calculatorStrengthMg, setCalculatorStrengthMg] = useState(5);
  const [calculatorWaterMl, setCalculatorWaterMl] = useState(2);
  const [adminGlobalSearch, setAdminGlobalSearch] = useState('');
  const [adminInventoryFilter, setAdminInventoryFilter] = useState('all');
  const [adminInventorySort, setAdminInventorySort] = useState('name');
  const [inventoryTableSort, setInventoryTableSort] = useState({ key: 'name', direction: 'asc' });
  const [activeOrdersFilter, setActiveOrdersFilter] = useState('all');
  const [activeOrdersSort, setActiveOrdersSort] = useState('highest-total');
  const [activeOrdersTableSort, setActiveOrdersTableSort] = useState({ key: 'totalPHP', direction: 'desc' });
  const [selectedActiveOrders, setSelectedActiveOrders] = useState({});
  const [bulkAssignAdmin, setBulkAssignAdmin] = useState('');
  const [expandedActiveOrders, setExpandedActiveOrders] = useState({});
  const [paymentsTableSort, setPaymentsTableSort] = useState({ key: 'totalPHP', direction: 'desc' });
  const [logsTableSort, setLogsTableSort] = useState({ key: 'timestamp', direction: 'desc' });
  const [packingTableSort, setPackingTableSort] = useState({ key: 'product', direction: 'asc' });
  const [trimmingTableSort, setTrimmingTableSort] = useState({ key: 'prod', direction: 'asc' });
  const [customersTableSort, setCustomersTableSort] = useState({ key: 'name', direction: 'asc' });
  const [productsTableSort, setProductsTableSort] = useState({ key: 'name', direction: 'asc' });
  const [adminSettingsProductSearch, setAdminSettingsProductSearch] = useState('');
  const [cartInputDrafts, setCartInputDrafts] = useState({});

  // âœ¨ NEW: Customer UX States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [quickInfoProduct, setQuickInfoProduct] = useState(null);
  const POPULAR_CATEGORIES = ["All", "Weight Loss", "Healing", "Anti-Aging", "Muscle Growth", "Brain Health", "Skin"];

  const [newProd, setNewProd] = useState({ name: '', kit: '', vial: '', max: '' });
  const [newAdmin, setNewAdmin] = useState({ name: '', banks: [{ details: '', qrFile: null }] });
  const [isScrolled, setIsScrolled] = useState(false);
  const configuredShopAccessCode = normalizeAccessCode(settings.shopAccessCode);
  const requiresShopAccessCode = settings.storeOpen !== false && Boolean(configuredShopAccessCode);
  const [isHeroInView, setIsHeroInView] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(prev => {
        const scrolled = window.scrollY > 40;
        return prev !== scrolled ? scrolled : prev;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (view !== 'shop') return undefined;
    const heroEl = heroSectionRef.current;
    if (!heroEl) return undefined;

    const syncHeroVisibility = () => {
      const rect = heroEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const nextInView = rect.top < viewportHeight * 0.72 && rect.bottom > viewportHeight * 0.24;
      setIsHeroInView(prev => (prev === nextInView ? prev : nextInView));
    };

    syncHeroVisibility();

    if (typeof IntersectionObserver === 'undefined') {
      window.addEventListener('scroll', syncHeroVisibility, { passive: true });
      window.addEventListener('resize', syncHeroVisibility);
      return () => {
        window.removeEventListener('scroll', syncHeroVisibility);
        window.removeEventListener('resize', syncHeroVisibility);
      };
    }

    const observer = new IntersectionObserver(syncHeroVisibility, {
      threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
    });

    observer.observe(heroEl);
    window.addEventListener('resize', syncHeroVisibility);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncHeroVisibility);
    };
  }, [view, settings.storeOpen]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(collection(db, colPath('settings')), (snap) => { snap.forEach(d => { if (d.id === 'main') setSettings(d.data()); }); });
    const unsubProducts = onSnapshot(collection(db, colPath('products')), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setProducts(arr); });
    const unsubOrders = onSnapshot(collection(db, colPath('orders')), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setOrders(arr); });
    const unsubUsers = onSnapshot(collection(db, colPath('users')), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setUsers(arr); });
    const unsubHistory = onSnapshot(collection(db, colPath('history')), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setHistory(arr); });
    const unsubLogs = onSnapshot(collection(db, colPath('logs')), (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a, b) => b.timestamp - a.timestamp);
      setLogs(arr);
    });
    const unsubSafety = onSnapshot(collection(db, colPath('safetyBackups')), (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      setSafetyRecords(arr);
    });
    const unsubChats = onSnapshot(collection(db, colPath('chats')), (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a, b) => a.timestamp - b.timestamp);
      setChats(arr);
    });

    return () => { unsubSettings(); unsubProducts(); unsubOrders(); unsubUsers(); unsubHistory(); unsubChats(); unsubLogs(); unsubSafety(); };
  }, [user]);

  const currentChatIdentity = useMemo(() => (
    customerEmail.toLowerCase().trim() ||
    customerHandle.toLowerCase().trim() ||
    customerName.toLowerCase().trim() ||
    'guest'
  ), [customerEmail, customerHandle, customerName]);

  const recentChats = useMemo(() => {
    const cutoff = Date.now() - CHAT_RETENTION_MS;
    return chats.filter(chat => Number(chat.timestamp || 0) >= cutoff);
  }, [chats]);

  useEffect(() => {
    if (isChatOpen || recentChats.length === 0) {
      setLatestChatPreview(null);
      return;
    }

    const newestChat = recentChats[recentChats.length - 1];
    if (Date.now() - newestChat.timestamp < 10000) {
      setLatestChatPreview(newestChat);
      const timer = setTimeout(() => setLatestChatPreview(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [recentChats, isChatOpen]);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [recentChats, isChatOpen]);

  useEffect(() => {
    if (!isChatOpen) return;

    const handleOutsideChatClick = (event) => {
      const target = event.target;
      if (chatPanelRef.current?.contains(target)) return;
      if (chatLauncherRef.current?.contains(target)) return;
      setIsChatOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideChatClick);
    document.addEventListener('touchstart', handleOutsideChatClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideChatClick);
      document.removeEventListener('touchstart', handleOutsideChatClick);
    };
  }, [isChatOpen]);

  useEffect(() => {
    const expiredChats = chats.filter(chat => Number(chat.timestamp || 0) < (Date.now() - CHAT_RETENTION_MS));
    if (!user || expiredChats.length === 0 || chatCleanupRef.current) return;

    chatCleanupRef.current = true;
    const cleanup = async () => {
      try {
        for (let i = 0; i < expiredChats.length; i += 250) {
          const batch = writeBatch(db);
          expiredChats.slice(i, i + 250).forEach(chat => {
            batch.delete(doc(db, colPath('chats'), chat.id));
          });
          await safeAwait(batch.commit());
        }
      } catch (err) {
        console.error('Chat cleanup error:', err);
      } finally {
        chatCleanupRef.current = false;
      }
    };

    cleanup();
  }, [user, chats]);

  const normalizedAdmins = useMemo(() => {
    return (settings.admins || []).map(a => {
      if (a.banks) return a;
      const banks = [];
      if (a.bank1 || a.qr1) banks.push({ details: a.bank1 || '', qr: a.qr1 || '' });
      if (a.bank2 || a.qr2) banks.push({ details: a.bank2 || '', qr: a.qr2 || '' });
      return { name: a.name, banks };
    });
  }, [settings.admins]);

  useEffect(() => {
    if (!configuredShopAccessCode) {
      setHasShopAccess(true);
      return;
    }

    try {
      const savedCode = normalizeAccessCode(window.localStorage.getItem(SHOP_ACCESS_STORAGE_KEY));
      setHasShopAccess(savedCode === configuredShopAccessCode);
    } catch (error) {
      console.warn('Could not read saved shop access code.', error);
      setHasShopAccess(false);
    }
  }, [configuredShopAccessCode]);

  const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
  const cloneRecord = (value) => JSON.parse(JSON.stringify(value ?? null));

  const buildSafetyOrderSnapshot = (rows = []) => rows.map(row => ({ ...cloneRecord(row) }));
  const buildSafetyUserSnapshot = (profiles = []) => profiles.map(profile => ({ ...cloneRecord(profile) }));

  const createSafetyRecord = async (payload) => {
    return safeAwait(addDoc(collection(db, colPath('safetyBackups')), {
      createdAt: Date.now(),
      batchName: settings.batchName || '',
      ...payload
    }));
  };

  const createBatchSnapshot = async (label, details = {}) => {
    const activeEmails = Array.from(new Set(orders.map(order => order.email)));
    const activeProfiles = users.filter(profile => activeEmails.includes(profile.id));
    return createSafetyRecord({
      kind: 'snapshot',
      label,
      status: 'available',
      details,
      settingsSnapshot: cloneRecord(settings),
      ordersSnapshot: buildSafetyOrderSnapshot(orders),
      usersSnapshot: buildSafetyUserSnapshot(activeProfiles),
      productsSnapshot: cloneRecord(products),
      summary: {
        orders: orders.length,
        users: activeProfiles.length,
        products: products.length
      }
    });
  };

  const createRecycleRecord = async ({ label, recycleType, ordersSnapshot = [], userSnapshot = null, proofReference = null, meta = {} }) => {
    return createSafetyRecord({
      kind: 'recycle',
      recycleType,
      label,
      status: 'available',
      ordersSnapshot: buildSafetyOrderSnapshot(ordersSnapshot),
      userSnapshot: userSnapshot ? cloneRecord(userSnapshot) : null,
      proofReference: proofReference ? cloneRecord(proofReference) : null,
      meta: cloneRecord(meta)
    });
  };

  const createUndoRecord = async ({ actionType, label, beforeOrders = [], beforeUsers = [], targetEmails = [], replaceCustomerOrders = false, meta = {} }) => {
    return createSafetyRecord({
      kind: 'undo',
      actionType,
      label,
      status: 'available',
      beforeOrders: buildSafetyOrderSnapshot(beforeOrders),
      beforeUsers: buildSafetyUserSnapshot(beforeUsers),
      targetEmails: cloneRecord(targetEmails),
      replaceCustomerOrders,
      meta: cloneRecord(meta)
    });
  };

  const getFrozenPaymentSnapshot = (profile) => {
    const snap = profile?.paymentSnapshot;
    if (!snap || typeof snap !== 'object') return null;
    const totalPHP = Number(snap.totalPHP);
    const subtotalUSD = Number(snap.subtotalUSD);
    const totalUSD = Number(snap.totalUSD);
    if (!Number.isFinite(totalPHP) || !Number.isFinite(subtotalUSD) || !Number.isFinite(totalUSD)) return null;
    return {
      ...snap,
      totalPHP,
      subtotalUSD,
      totalUSD,
      fxRate: Number(snap.fxRate || 0),
      adminFeePhp: Number(snap.adminFeePhp || 0)
    };
  };

  const getSelectedAdminBankRoute = (adminName, email) => {
    const normalizedEmail = String(email || '').toLowerCase().trim();
    const resolvedAdminName = adminName || 'Unassigned';
    const adminObj = normalizedAdmins.find(a => a.name === resolvedAdminName) || null;
    const availableBanks = (adminObj?.banks || []).filter(bank => bank?.details || bank?.qr);
    if (!availableBanks.length) {
      return {
        adminAssigned: resolvedAdminName,
        bankIndex: -1,
        bankDetails: '',
        bankQr: '',
        hasRoute: false
      };
    }
    const hash = normalizedEmail.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const bankIndex = hash % availableBanks.length;
    const selectedBank = availableBanks[bankIndex];
    return {
      adminAssigned: resolvedAdminName,
      bankIndex,
      bankDetails: selectedBank?.details || '',
      bankQr: selectedBank?.qr || '',
      hasRoute: true
    };
  };

  const buildPaymentSnapshot = (items, adminName, email, capturedAt = Date.now()) => {
    let subtotalUSD = 0;
    Object.entries(items || {}).forEach(([prod, qty]) => {
      const product = products.find(p => p.name === prod);
      if (product && qty > 0) subtotalUSD += qty * Number(product.pricePerVialUSD || 0);
    });

    const fxRate = Number(settings.fxRate || 0);
    const adminFeePhp = Number(settings.adminFeePhp || 0);
    const totalUSD = subtotalUSD > 0 && fxRate > 0 ? subtotalUSD + (adminFeePhp / fxRate) : 0;
    const route = getSelectedAdminBankRoute(adminName, email);

    return {
      capturedAt,
      subtotalUSD,
      totalUSD,
      totalPHP: totalUSD * fxRate,
      fxRate,
      adminFeePhp,
      adminAssigned: route.adminAssigned,
      bankIndex: route.bankIndex,
      bankDetails: route.bankDetails,
      bankQr: route.bankQr
    };
  };

  const enrichedProducts = useMemo(() => {
    const productStats = {};
    orders.forEach(o => {
      if (!productStats[o.product]) productStats[o.product] = 0;
      productStats[o.product] += o.qty;
    });

    return products.map(p => {
      const totalVials = productStats[p.name] || 0;
      const boxes = Math.floor(totalVials / SLOTS_PER_BATCH);
      const slotsFilled = totalVials % SLOTS_PER_BATCH;
      const slotsLeft = totalVials === 0 ? SLOTS_PER_BATCH : (slotsFilled === 0 ? 0 : SLOTS_PER_BATCH - slotsFilled);

      const limitReached = p.maxBoxes > 0 && boxes >= p.maxBoxes;
      const isClosed = p.locked || settings.paymentsOpen || limitReached;

      let statusKey, statusText;
      if (settings.paymentsOpen) { statusKey = 'locked'; statusText = 'Payments Open'; }
      else if (isClosed && limitReached && p.maxBoxes > 0) { statusKey = 'full'; statusText = 'Limit Reached'; }
      else if (p.locked) { statusKey = 'locked'; statusText = 'Locked'; }
      else if (totalVials === 0) { statusKey = 'none'; statusText = 'New Batch'; }
      else if (slotsLeft === 0) { statusKey = 'available'; statusText = 'Next Box Open'; }
      else { statusKey = 'available'; statusText = `${slotsLeft} slots left`; }

      return { ...p, totalVials, boxes, slotsLeft, isClosed, statusKey, statusText, openBatchLabel: (!isClosed) ? `Box ${boxes + 1}` : '' };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, orders, settings.paymentsOpen]);

  // âœ¨ NEW: Calculate exactly how many physical boxes will arrive from the supplier
  const totalPhysicalBoxesToReceive = useMemo(() => {
    return enrichedProducts.reduce((sum, p) => sum + Math.ceil(p.totalVials / SLOTS_PER_BATCH), 0);
  }, [enrichedProducts]);

  const trimmingHitList = useMemo(() => {
    const productStats = {}; const customerTotals = {};
    orders.forEach(o => {
      if (!productStats[o.product]) productStats[o.product] = 0;
      productStats[o.product] += o.qty;
      const key = `${o.email}||${o.product}`;
      if (!customerTotals[key]) customerTotals[key] = 0;
      customerTotals[key] += o.qty;
    });

    const toTrim = {}; const openBoxNumbers = {};
    Object.keys(productStats).forEach(prod => {
      if (productStats[prod] % 10 > 0) {
        toTrim[prod] = productStats[prod] % 10;
        openBoxNumbers[prod] = Math.floor(productStats[prod] / 10) + 1;
      }
    });

    const victims = [];
    [...orders].sort((a, b) => b.timestamp - a.timestamp).forEach(row => {
      if (!toTrim[row.product] || toTrim[row.product] <= 0) return;
      const custTotal = customerTotals[`${row.email}||${row.product}`];
      if (custTotal % 10 === 0 || row.qty % 10 === 0) return;

      const amountToRemove = Math.min(toTrim[row.product], row.qty % 10);
      if (amountToRemove > 0) {
        victims.push({
          id: row.id, prod: row.product, boxNum: openBoxNumbers[row.product],
          missingSlots: 10 - (productStats[row.product] % 10),
          name: row.name, email: row.email, handle: row.handle, qty: row.qty, amountToRemove
        });
        toTrim[row.product] -= amountToRemove;
      }
    });
    return victims.sort((a, b) => b.missingSlots - a.missingSlots);
  }, [orders]);

  const discordTrimListText = useMemo(() => {
    if (!trimmingHitList.length) {
      return [
        'Loose Vial Hit List',
        'No one is currently at risk of trimming.'
      ].join('\n');
    }

    const groupedRows = trimmingHitList.reduce((acc, item) => {
      const groupKey = `${item.prod}||${item.boxNum}||${item.missingSlots}`;
      if (!acc[groupKey]) {
        acc[groupKey] = {
          prod: item.prod,
          boxNum: item.boxNum,
          missingSlots: item.missingSlots,
          rows: []
        };
      }
      acc[groupKey].rows.push(item);
      return acc;
    }, {});

    const lines = [
      'Loose Vial Hit List',
      'If these boxes do not fill before cutoff, the loose vials below may be cut.',
      ''
    ];

    Object.values(groupedRows).forEach(group => {
      lines.push(`${group.prod} - Box ${group.boxNum} needs ${group.missingSlots} more`);
      group.rows.forEach(row => {
        const label = row.handle ? `@${String(row.handle).replace(/^@+/, '')}` : row.email;
        lines.push(`- ${label}: ${row.amountToRemove} vial${row.amountToRemove === 1 ? '' : 's'} at risk`);
      });
      lines.push('');
    });

    return lines.join('\n').trim();
  }, [trimmingHitList]);

  const customerList = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!map[o.email]) {
        map[o.email] = {
          email: o.email,
          name: o.name,
          handle: o.handle,
          products: {},
          latestTimestamp: 0
        };
      }
      if (!map[o.email].products[o.product]) map[o.email].products[o.product] = 0;
      map[o.email].products[o.product] += o.qty;
      map[o.email].latestTimestamp = Math.max(map[o.email].latestTimestamp || 0, o.timestamp || 0);
    });

    return Object.values(map).map(c => {
      let sub = 0;
      const itemEntries = Object.entries(c.products).sort((a, b) => a[0].localeCompare(b[0]));
      itemEntries.forEach(([pName, qty]) => {
        const pData = products.find(p => p.name === pName);
        if (pData) sub += qty * pData.pricePerVialUSD;
      });
      const profile = users.find(u => u.id === c.email) || {};
      const frozenPaymentSnapshot = getFrozenPaymentSnapshot(profile);
      const fxRate = Number(settings.fxRate || 0);
      const liveTotalUSD = sub > 0 && fxRate > 0 ? sub + (settings.adminFeePhp / fxRate) : 0;
      const liveTotalPHP = liveTotalUSD * fxRate;
      const address = profile.address || null;
      const adminAssigned = frozenPaymentSnapshot?.adminAssigned || profile.adminAssigned || "Unassigned";
      const hasAddress = Boolean(address?.street && address?.city && address?.contact);
      const hasProof = Boolean(profile.proofUrl);
      const hasAssignedAdmin = Boolean(adminAssigned && adminAssigned !== 'Unassigned');
      const totalVials = itemEntries.reduce((acc, [, qty]) => acc + qty, 0);
      const itemCount = itemEntries.length;
      const buyerReviewConfirmedAt = Number(profile.buyerReviewConfirmedAt || 0) || null;
      const subtotalUSD = frozenPaymentSnapshot?.subtotalUSD ?? sub;
      const totalUSD = frozenPaymentSnapshot?.totalUSD ?? liveTotalUSD;
      const totalPHP = frozenPaymentSnapshot?.totalPHP ?? liveTotalPHP;

      return {
        ...c,
        products: Object.fromEntries(itemEntries),
        subtotalUSD,
        totalUSD,
        totalPHP,
        isPaid: profile.isPaid || false,
        adminAssigned,
        proofUrl: profile.proofUrl || null,
        proofReview: profile.proofReview || '',
        paymentSnapshot: frozenPaymentSnapshot,
        paymentBankDetails: frozenPaymentSnapshot?.bankDetails || '',
        paymentBankQr: frozenPaymentSnapshot?.bankQr || '',
        buyerReviewConfirmedAt,
        reviewReady: Boolean(buyerReviewConfirmedAt),
        adminNotes: profile.adminNotes || '',
        address,
        hasAddress,
        hasProof,
        hasAssignedAdmin,
        totalVials,
        itemCount
      };
    });
  }, [orders, products, settings, users]);

  const filteredAdminProducts = useMemo(() => {
    return [...enrichedProducts]
      .filter(p => !adminGlobalSearch || p.name.toLowerCase().includes(adminGlobalSearch.toLowerCase()))
      .filter(p => {
        if (adminInventoryFilter === 'all') return true;
        if (adminInventoryFilter === 'open') return !p.locked && (p.maxBoxes || 0) === 0;
        if (adminInventoryFilter === 'capped') return !p.locked && (p.maxBoxes || 0) > 0;
        if (adminInventoryFilter === 'locked') return p.locked;
        if (adminInventoryFilter === 'new') return p.totalVials === 0;
        if (adminInventoryFilter === 'filling') return p.totalVials > 0 && p.slotsLeft > 0 && !p.isClosed;
        return true;
      })
      .sort((a, b) => {
        if (adminInventorySort === 'slots-left') return a.slotsLeft - b.slotsLeft || b.totalVials - a.totalVials || a.name.localeCompare(b.name);
        if (adminInventorySort === 'most-filled') return b.totalVials - a.totalVials || a.slotsLeft - b.slotsLeft || a.name.localeCompare(b.name);
        if (adminInventorySort === 'capped-first') return Number(Boolean(b.maxBoxes)) - Number(Boolean(a.maxBoxes)) || a.name.localeCompare(b.name);
        if (adminInventorySort === 'locked-first') return Number(Boolean(b.locked)) - Number(Boolean(a.locked)) || a.name.localeCompare(b.name);
        if (adminInventorySort === 'attention') {
          const rank = (product) => {
            if (product.locked && product.totalVials === 0) return 4;
            if (product.statusKey === 'full') return 0;
            if (!product.isClosed && product.totalVials > 0 && product.slotsLeft > 0) return 1;
            if (product.syncCapped) return 2;
            return 3;
          };
          return rank(a) - rank(b) || a.slotsLeft - b.slotsLeft || b.totalVials - a.totalVials || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [enrichedProducts, adminGlobalSearch, adminInventoryFilter, adminInventorySort]);

  const activeOrdersList = useMemo(() => {
    const searched = customerList.filter(c => {
      if (!adminGlobalSearch) return true;
      const lowerQuery = adminGlobalSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery) ||
        (c.handle || '').toLowerCase().includes(lowerQuery) ||
        Object.keys(c.products).some(productName => productName.toLowerCase().includes(lowerQuery))
      );
    });

    const withStatus = searched.map(c => {
      let statusKey = 'ready';
      let statusLabel = 'Ready to Ship';
      let statusTone = 'border-emerald-200 bg-emerald-50 text-emerald-700';
      let statusHint = 'Paid, assigned, and address is complete.';

      if (settings.reviewStageOpen && !settings.paymentsOpen && !c.isPaid) {
        if (!c.buyerReviewConfirmedAt) {
          statusKey = 'buyer-review';
          statusLabel = 'Review Stage';
          statusTone = 'border-sky-200 bg-sky-50 text-sky-700';
          statusHint = 'Buyer review is open. Ask customers to double-check their saved orders before payments open.';
        } else {
          statusKey = 'review-ready';
          statusLabel = 'Buyer Confirmed';
          statusTone = 'border-emerald-200 bg-emerald-50 text-emerald-700';
          statusHint = 'Buyer already marked this saved order as good to go for the payment stage.';
        }
      } else if (!c.hasAssignedAdmin) {
        statusKey = 'needs-admin';
        statusLabel = 'Needs Admin';
        statusTone = 'border-sky-200 bg-sky-50 text-sky-700';
        statusHint = 'Pick an admin before shipping.';
      } else if (!c.hasAddress) {
        statusKey = 'needs-address';
        statusLabel = 'Needs Address';
        statusTone = 'border-rose-200 bg-rose-50 text-rose-700';
        statusHint = 'Address details are still incomplete.';
      } else if (!c.isPaid) {
        statusKey = c.hasProof ? 'proof-sent' : 'waiting-payment';
        statusLabel = c.hasProof ? 'Proof Sent' : 'Waiting Payment';
        statusTone = c.hasProof ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-amber-200 bg-amber-50 text-amber-700';
        statusHint = c.hasProof ? 'Proof is on file. Mark paid when cleared.' : 'Waiting for payment confirmation.';
      }

      return {
        ...c,
        itemEntries: Object.entries(c.products),
        isReadyToShip: c.isPaid && c.hasAddress && c.hasAssignedAdmin,
        statusKey,
        statusLabel,
        statusTone,
        statusHint
      };
    }).filter(c => {
      if (activeOrdersFilter === 'all') return true;
      if (activeOrdersFilter === 'unpaid') return !c.isPaid;
      if (activeOrdersFilter === 'no-address') return !c.hasAddress;
      if (activeOrdersFilter === 'no-admin') return !c.hasAssignedAdmin;
      if (activeOrdersFilter === 'has-proof') return c.hasProof;
      if (activeOrdersFilter === 'ready') return c.isReadyToShip;
      if (activeOrdersFilter === 'high-total') return c.totalPHP >= 10000;
      if (activeOrdersFilter === 'review-pending') return settings.reviewStageOpen && !c.buyerReviewConfirmedAt;
      if (activeOrdersFilter === 'buyer-review') return settings.reviewStageOpen && !c.buyerReviewConfirmedAt;
      if (activeOrdersFilter === 'review-ready') return c.reviewReady;
      return true;
    });

    return withStatus.sort((a, b) => {
      if (activeOrdersSort === 'newest') return (b.latestTimestamp || 0) - (a.latestTimestamp || 0) || b.totalPHP - a.totalPHP;
      if (activeOrdersSort === 'unpaid-first') return Number(a.isPaid) - Number(b.isPaid) || b.totalPHP - a.totalPHP;
      if (activeOrdersSort === 'missing-address') return Number(a.hasAddress) - Number(b.hasAddress) || Number(a.isPaid) - Number(b.isPaid) || b.totalPHP - a.totalPHP;
      if (activeOrdersSort === 'unassigned-admin') return Number(a.hasAssignedAdmin) - Number(b.hasAssignedAdmin) || b.totalPHP - a.totalPHP;
      if (activeOrdersSort === 'most-items') return b.itemCount - a.itemCount || b.totalVials - a.totalVials || b.totalPHP - a.totalPHP;
      return b.totalPHP - a.totalPHP || (b.latestTimestamp || 0) - (a.latestTimestamp || 0);
    });
  }, [customerList, adminGlobalSearch, activeOrdersFilter, activeOrdersSort, settings.reviewStageOpen, settings.paymentsOpen]);

  const activeOrdersSummary = useMemo(() => ({
    total: customerList.length,
    unpaid: customerList.filter(c => !c.isPaid).length,
    missingAddress: customerList.filter(c => !c.hasAddress).length,
    unassignedAdmin: customerList.filter(c => !c.hasAssignedAdmin).length,
    ready: customerList.filter(c => c.isPaid && c.hasAddress && c.hasAssignedAdmin).length,
    reviewPending: customerList.filter(c => settings.reviewStageOpen && !c.buyerReviewConfirmedAt).length,
    buyerReview: customerList.filter(c => settings.reviewStageOpen && !c.buyerReviewConfirmedAt).length,
    reviewReady: customerList.filter(c => c.reviewReady).length
  }), [customerList, settings.reviewStageOpen]);

  const paymentCustomers = useMemo(() => {
    const searched = customerList.filter(c => {
      if (!adminGlobalSearch) return true;
      const lowerQuery = adminGlobalSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(lowerQuery) ||
        c.email.toLowerCase().includes(lowerQuery) ||
        (c.handle || '').toLowerCase().includes(lowerQuery) ||
        (c.adminAssigned || '').toLowerCase().includes(lowerQuery)
      );
    });

    const normalized = searched.map(c => {
      const needsRecheck = c.proofReview === 'needs-recheck';
      let paymentStatusKey = 'ready';
      let paymentStatusLabel = 'Ready to Ship';
      let paymentStatusTone = 'border-emerald-200 bg-emerald-50 text-emerald-700';
      let paymentStatusHint = 'Paid and cleared for label printing.';

      if (needsRecheck) {
        paymentStatusKey = 'needs-recheck';
        paymentStatusLabel = 'Needs Recheck';
        paymentStatusTone = 'border-rose-200 bg-rose-50 text-rose-700';
        paymentStatusHint = 'Proof needs another look before marking paid.';
      } else if (!c.isPaid && c.hasProof) {
        paymentStatusKey = 'proof-sent';
        paymentStatusLabel = 'Proof Sent';
        paymentStatusTone = 'border-violet-200 bg-violet-50 text-violet-700';
        paymentStatusHint = 'Proof is uploaded and waiting for review.';
      } else if (!c.isPaid) {
        paymentStatusKey = 'waiting-payment';
        paymentStatusLabel = 'Waiting Payment';
        paymentStatusTone = 'border-amber-200 bg-amber-50 text-amber-700';
        paymentStatusHint = 'Still waiting for payment or proof.';
      } else if (!c.hasAddress) {
        paymentStatusKey = 'needs-address';
        paymentStatusLabel = 'Needs Address';
        paymentStatusTone = 'border-rose-200 bg-rose-50 text-rose-700';
        paymentStatusHint = 'Address is still missing for label printing.';
      } else if (!c.hasAssignedAdmin) {
        paymentStatusKey = 'needs-admin';
        paymentStatusLabel = 'Needs Admin';
        paymentStatusTone = 'border-sky-200 bg-sky-50 text-sky-700';
        paymentStatusHint = 'Assign an admin before turnover.';
      }

      return {
        ...c,
        needsRecheck,
        paymentStatusKey,
        paymentStatusLabel,
        paymentStatusTone,
        paymentStatusHint,
        readyForLabel: c.isPaid && c.hasAddress,
        readyToShip: c.isPaid && c.hasAddress && c.hasAssignedAdmin
      };
    }).filter(c => {
      if (paymentViewFilter === 'all') return true;
      if (paymentViewFilter === 'paid') return c.isPaid;
      if (paymentViewFilter === 'unpaid') return !c.isPaid;
      if (paymentViewFilter === 'proof-sent') return !c.isPaid && c.hasProof;
      if (paymentViewFilter === 'no-proof') return !c.hasProof;
      if (paymentViewFilter === 'no-address') return !c.hasAddress;
      if (paymentViewFilter === 'no-admin') return !c.hasAssignedAdmin;
      if (paymentViewFilter === 'ready') return c.readyToShip;
      if (paymentViewFilter === 'recheck') return c.needsRecheck;
      return true;
    }).filter(c => {
      if (paymentFilterAdmin === 'All') return true;
      return c.adminAssigned === paymentFilterAdmin;
    }).sort((a, b) => {
      if (paymentSort === 'highest-total') return b.totalPHP - a.totalPHP || (b.latestTimestamp || 0) - (a.latestTimestamp || 0);
      if (paymentSort === 'ready-first') return Number(b.readyToShip) - Number(a.readyToShip) || b.totalPHP - a.totalPHP;
      if (paymentSort === 'unpaid-first') return Number(a.isPaid) - Number(b.isPaid) || Number(b.hasProof) - Number(a.hasProof) || b.totalPHP - a.totalPHP;
      if (paymentSort === 'no-admin-first') return Number(a.hasAssignedAdmin) - Number(b.hasAssignedAdmin) || b.totalPHP - a.totalPHP;
      if (paymentSort === 'newest') return (b.latestTimestamp || 0) - (a.latestTimestamp || 0) || b.totalPHP - a.totalPHP;
      if (paymentSort === 'proof-first') {
        const rank = (customer) => {
          if (customer.needsRecheck) return 0;
          if (!customer.isPaid && customer.hasProof) return 1;
          if (!customer.isPaid) return 2;
          if (customer.readyToShip) return 3;
          return 4;
        };
        return rank(a) - rank(b) || b.totalPHP - a.totalPHP || (b.latestTimestamp || 0) - (a.latestTimestamp || 0);
      }
      return b.totalPHP - a.totalPHP;
    });

    return normalized;
  }, [customerList, adminGlobalSearch, paymentViewFilter, paymentSort, paymentFilterAdmin]);

  const paymentSummary = useMemo(() => ({
    totalExpectedPHP: customerList.reduce((acc, c) => acc + c.totalPHP, 0),
    totalPaidPHP: customerList.filter(c => c.isPaid).reduce((acc, c) => acc + c.totalPHP, 0),
    paidCount: customerList.filter(c => c.isPaid).length,
    unpaidCount: customerList.filter(c => !c.isPaid).length,
    proofSentCount: customerList.filter(c => !c.isPaid && c.hasProof).length,
    noProofCount: customerList.filter(c => !c.hasProof).length,
    missingAddressCount: customerList.filter(c => !c.hasAddress).length,
    missingAdminCount: customerList.filter(c => !c.hasAssignedAdmin).length,
    readyCount: customerList.filter(c => c.isPaid && c.hasAddress && c.hasAssignedAdmin).length,
    recheckCount: customerList.filter(c => c.proofReview === 'needs-recheck').length
  }), [customerList]);

  const paymentAuditSummary = useMemo(() => ({
    proofSubmittedPHP: customerList.filter(c => c.hasProof).reduce((acc, c) => acc + c.totalPHP, 0),
    pendingReviewPHP: customerList.filter(c => c.hasProof && !c.isPaid).reduce((acc, c) => acc + c.totalPHP, 0),
    noProofPHP: customerList.filter(c => !c.hasProof).reduce((acc, c) => acc + c.totalPHP, 0),
    proofSubmittedCount: customerList.filter(c => c.hasProof).length,
    pendingReviewCount: customerList.filter(c => c.hasProof && !c.isPaid).length,
    noProofCount: customerList.filter(c => !c.hasProof).length
  }), [customerList]);

  const paymentAdminBreakdown = useMemo(() => {
    const map = {};
    customerList.forEach(c => {
      const admin = c.hasAssignedAdmin ? c.adminAssigned : 'Unassigned';
      if (!map[admin]) {
        map[admin] = { admin, count: 0, paidCount: 0, unpaidCount: 0, expected: 0, paid: 0 };
      }
      map[admin].count += 1;
      map[admin].expected += c.totalPHP;
      if (c.isPaid) {
        map[admin].paidCount += 1;
        map[admin].paid += c.totalPHP;
      } else {
        map[admin].unpaidCount += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.expected - a.expected || a.admin.localeCompare(b.admin));
  }, [customerList]);

  const paymentAuditByAdmin = useMemo(() => {
    const map = {};
    customerList.forEach((customer) => {
      const admin = customer.hasAssignedAdmin ? customer.adminAssigned : 'Unassigned';
      if (!map[admin]) {
        map[admin] = {
          admin,
          expectedPHP: 0,
          paidPHP: 0,
          proofSubmittedPHP: 0,
          pendingReviewPHP: 0,
          noProofPHP: 0,
          buyers: [],
          flaggedBuyers: []
        };
      }

      const entry = map[admin];
      entry.expectedPHP += customer.totalPHP;
      if (customer.isPaid) entry.paidPHP += customer.totalPHP;
      if (customer.hasProof) entry.proofSubmittedPHP += customer.totalPHP;
      if (customer.hasProof && !customer.isPaid) entry.pendingReviewPHP += customer.totalPHP;
      if (!customer.hasProof) entry.noProofPHP += customer.totalPHP;

      const flags = [];
      if (!customer.hasAssignedAdmin) flags.push('Needs admin');
      if (!customer.hasAddress) flags.push('Missing address');
      if (!customer.hasProof) flags.push('No proof');
      if (customer.hasProof && !customer.isPaid) flags.push(customer.proofReview === 'needs-recheck' ? 'Needs recheck' : 'Pending review');
      if ((customer.hasProof || customer.isPaid) && !customer.paymentBankDetails && !customer.paymentBankQr) flags.push('No saved route');

      const buyer = {
        email: customer.email,
        name: customer.name,
        totalPHP: customer.totalPHP,
        flags,
        hasProof: customer.hasProof,
        isPaid: customer.isPaid,
        needsRecheck: customer.proofReview === 'needs-recheck',
        latestTimestamp: customer.latestTimestamp || 0
      };

      entry.buyers.push(buyer);
      if (flags.length > 0) entry.flaggedBuyers.push(buyer);
    });

    return Object.values(map)
      .map((entry) => ({
        ...entry,
        proofGapPHP: entry.expectedPHP - entry.proofSubmittedPHP,
        approvalGapPHP: entry.proofSubmittedPHP - entry.paidPHP,
        flaggedCount: entry.flaggedBuyers.length
      }))
      .sort((a, b) => b.expectedPHP - a.expectedPHP || a.admin.localeCompare(b.admin));
  }, [customerList]);

  useEffect(() => {
    setSelectedActiveOrders(prev => {
      const visibleEmails = new Set(activeOrdersList.map(c => c.email));
      const next = Object.fromEntries(Object.entries(prev).filter(([email, isSelected]) => isSelected && visibleEmails.has(email)));
      const prevKeys = Object.keys(prev).sort().join('|');
      const nextKeys = Object.keys(next).sort().join('|');
      if (prevKeys === nextKeys) return prev;
      return next;
    });
  }, [activeOrdersList]);

  useEffect(() => {
    setAdminNoteDrafts(prev => {
      const next = { ...prev };
      customerList.forEach(customer => {
        if (next[customer.email] === undefined) {
          next[customer.email] = customer.adminNotes || '';
        }
      });
      Object.keys(next).forEach(email => {
        if (!customerList.some(customer => customer.email === email)) delete next[email];
      });
      return next;
    });
  }, [customerList]);

  const filteredPackingOrders = useMemo(() => {
    return orders.filter(o => !adminGlobalSearch || o.product.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || o.name.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || o.email.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
  }, [orders, adminGlobalSearch]);

  const filteredHitList = useMemo(() => {
    return trimmingHitList.filter(v => !adminGlobalSearch || v.prod.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || v.name.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || v.email.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
  }, [trimmingHitList, adminGlobalSearch]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => !adminGlobalSearch || u.name?.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || u.id?.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || u.handle?.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
  }, [users, adminGlobalSearch]);

  // âœ¨ IMPROVED: Added Category Filtering
  const filteredShopProducts = useMemo(() => {
    let filtered = enrichedProducts;
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => {
        const productInfo = buildProductInfo(p.name);
        return productInfo.tags.some(t => t.toLowerCase().includes(selectedCategory.toLowerCase()));
      });
    }
    return [...filtered].sort((a, b) => {
      const aPriority = a.isClosed ? 1 : 0;
      const bPriority = b.isClosed ? 1 : 0;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.name.localeCompare(b.name);
    });
  }, [enrichedProducts, searchQuery, selectedCategory]);

  const filteredSettingsProducts = useMemo(() => {
    return products
      .filter(p => !adminSettingsProductSearch || p.name.toLowerCase().includes(adminSettingsProductSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, adminSettingsProductSearch]);

  const sortedAdminProducts = useMemo(() => {
    const list = [...filteredAdminProducts];
    return list.sort((a, b) => {
      if (inventoryTableSort.key === 'availability') {
        const rank = (product) => (product.locked ? 2 : (product.maxBoxes || 0) > 0 ? 1 : 0);
        return compareTableValues(rank(a), rank(b), inventoryTableSort.direction) || a.name.localeCompare(b.name);
      }
      if (inventoryTableSort.key === 'expectedBoxes') {
        return compareTableValues(Math.ceil(a.totalVials / SLOTS_PER_BATCH), Math.ceil(b.totalVials / SLOTS_PER_BATCH), inventoryTableSort.direction) || a.name.localeCompare(b.name);
      }
      return compareTableValues(a[inventoryTableSort.key], b[inventoryTableSort.key], inventoryTableSort.direction) || a.name.localeCompare(b.name);
    });
  }, [filteredAdminProducts, inventoryTableSort]);

  const sortedActiveOrders = useMemo(() => {
    const list = [...activeOrdersList];
    return list.sort((a, b) => {
      if (activeOrdersTableSort.key === 'customer') return compareTableValues(a.name, b.name, activeOrdersTableSort.direction);
      if (activeOrdersTableSort.key === 'items') return compareTableValues(a.itemCount, b.itemCount, activeOrdersTableSort.direction) || compareTableValues(a.totalVials, b.totalVials, activeOrdersTableSort.direction);
      if (activeOrdersTableSort.key === 'status') return compareTableValues(a.statusLabel, b.statusLabel, activeOrdersTableSort.direction);
      if (activeOrdersTableSort.key === 'admin') return compareTableValues(a.adminAssigned, b.adminAssigned, activeOrdersTableSort.direction);
      return compareTableValues(a.totalPHP, b.totalPHP, activeOrdersTableSort.direction);
    });
  }, [activeOrdersList, activeOrdersTableSort]);

  const sortedPaymentCustomers = useMemo(() => {
    const list = [...paymentCustomers];
    return list.sort((a, b) => {
      if (paymentsTableSort.key === 'customer') return compareTableValues(a.name, b.name, paymentsTableSort.direction);
      if (paymentsTableSort.key === 'admin') return compareTableValues(a.adminAssigned, b.adminAssigned, paymentsTableSort.direction);
      if (paymentsTableSort.key === 'proof') return compareTableValues(Number(a.hasProof), Number(b.hasProof), paymentsTableSort.direction);
      if (paymentsTableSort.key === 'label') return compareTableValues(Number(a.readyForLabel), Number(b.readyForLabel), paymentsTableSort.direction);
      if (paymentsTableSort.key === 'status') return compareTableValues(a.paymentStatusLabel, b.paymentStatusLabel, paymentsTableSort.direction);
      return compareTableValues(a.totalPHP, b.totalPHP, paymentsTableSort.direction);
    });
  }, [paymentCustomers, paymentsTableSort]);

  const sortedLogs = useMemo(() => {
    const filtered = logs.filter(log => !adminGlobalSearch || log.name?.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || log.email?.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || log.action?.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || log.details?.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
    return [...filtered].sort((a, b) => {
      if (logsTableSort.key === 'customer') return compareTableValues(a.name || a.email, b.name || b.email, logsTableSort.direction);
      if (logsTableSort.key === 'action') return compareTableValues(a.action, b.action, logsTableSort.direction);
      if (logsTableSort.key === 'details') return compareTableValues(a.details, b.details, logsTableSort.direction);
      return compareTableValues(a.timestamp, b.timestamp, logsTableSort.direction);
    });
  }, [logs, adminGlobalSearch, logsTableSort]);

  const packingRows = useMemo(() => {
    const rows = [];
    Object.keys(filteredPackingOrders.reduce((acc, o) => {
      if (!acc[o.product]) acc[o.product] = [];
      acc[o.product].push(o);
      return acc;
    }, {})).sort().forEach(prod => {
      let box = 1;
      let slots = 10;
      filteredPackingOrders.filter(o => o.product === prod).forEach(o => {
        let q = o.qty;
        while (q > 0) {
          if (slots === 0) {
            box += 1;
            slots = 10;
          }
          const alloc = Math.min(q, slots);
          slots -= alloc;
          rows.push({
            key: `${o.id}-${box}-${alloc}`,
            product: prod,
            box,
            email: o.email,
            name: o.name,
            order: o,
            take: alloc
          });
          q -= alloc;
        }
      });
    });
    return rows;
  }, [filteredPackingOrders]);

  const sortedPackingRows = useMemo(() => {
    const list = [...packingRows];
    return list.sort((a, b) => {
      if (packingTableSort.key === 'box') return compareTableValues(a.box, b.box, packingTableSort.direction);
      if (packingTableSort.key === 'customer') return compareTableValues(a.name, b.name, packingTableSort.direction);
      if (packingTableSort.key === 'take') return compareTableValues(a.take, b.take, packingTableSort.direction);
      return compareTableValues(a.product, b.product, packingTableSort.direction);
    });
  }, [packingRows, packingTableSort]);

  const sortedHitList = useMemo(() => {
    const list = [...filteredHitList];
    return list.sort((a, b) => {
      if (trimmingTableSort.key === 'status') return compareTableValues(a.missingSlots, b.missingSlots, trimmingTableSort.direction);
      if (trimmingTableSort.key === 'customer') return compareTableValues(a.name || a.email, b.name || b.email, trimmingTableSort.direction);
      return compareTableValues(a.prod, b.prod, trimmingTableSort.direction);
    });
  }, [filteredHitList, trimmingTableSort]);

  const groupedHitList = useMemo(() => {
    const groups = filteredHitList.reduce((acc, item) => {
      const key = `${item.prod}||${item.boxNum}||${item.missingSlots}`;
      if (!acc[key]) {
        acc[key] = {
          key,
          prod: item.prod,
          boxNum: item.boxNum,
          missingSlots: item.missingSlots,
          riskyVials: 0,
          rows: []
        };
      }
      acc[key].rows.push(item);
      acc[key].riskyVials += Number(item.amountToRemove || 0);
      return acc;
    }, {});

    return Object.values(groups)
      .map(group => ({
        ...group,
        customers: new Set(group.rows.map(row => row.email)).size,
        rows: [...group.rows].sort((a, b) => {
          const riskDiff = Number(b.amountToRemove || 0) - Number(a.amountToRemove || 0);
          if (riskDiff !== 0) return riskDiff;
          return (a.name || a.email).localeCompare(b.name || b.email);
        })
      }))
      .sort((a, b) => {
        const urgencyDiff = Number(a.missingSlots || 0) - Number(b.missingSlots || 0);
        if (urgencyDiff !== 0) return urgencyDiff;
        const productDiff = a.prod.localeCompare(b.prod);
        if (productDiff !== 0) return productDiff;
        return Number(a.boxNum || 0) - Number(b.boxNum || 0);
      });
  }, [filteredHitList]);

  const sortedRegisteredUsers = useMemo(() => {
    const list = [...filteredUsers];
    return list.sort((a, b) => {
      if (customersTableSort.key === 'address') return compareTableValues(a.address?.street || '', b.address?.street || '', customersTableSort.direction);
      return compareTableValues(a.name || a.id, b.name || b.id, customersTableSort.direction);
    });
  }, [filteredUsers, customersTableSort]);

  const sortedSettingsProducts = useMemo(() => {
    const list = [...filteredSettingsProducts];
    return list.sort((a, b) => {
      if (productsTableSort.key === 'price') return compareTableValues(a.pricePerVialUSD, b.pricePerVialUSD, productsTableSort.direction);
      return compareTableValues(a.name, b.name, productsTableSort.direction);
    });
  }, [filteredSettingsProducts, productsTableSort]);

  const logsSummary = useMemo(() => {
    const today = new Date();
    const todayCount = sortedLogs.filter(log => {
      const stamp = new Date(log.timestamp || 0);
      return stamp.toDateString() === today.toDateString();
    }).length;
    return {
      total: sortedLogs.length,
      today: todayCount,
      customers: new Set(sortedLogs.map(log => log.email).filter(Boolean)).size,
      latest: sortedLogs[0]?.action || 'No recent action'
    };
  }, [sortedLogs]);

  const packingSummary = useMemo(() => ({
    rows: sortedPackingRows.length,
    products: new Set(sortedPackingRows.map(row => row.product)).size,
    customers: new Set(sortedPackingRows.map(row => row.email)).size,
    boxes: totalPhysicalBoxesToReceive
  }), [sortedPackingRows, totalPhysicalBoxesToReceive]);

  const hitListSummary = useMemo(() => ({
    rows: filteredHitList.length,
    products: new Set(filteredHitList.map(item => item.prod)).size,
    customers: new Set(filteredHitList.map(item => item.email)).size,
    riskyVials: filteredHitList.reduce((sum, item) => sum + Number(item.amountToRemove || 0), 0)
  }), [filteredHitList]);

  const customerSummary = useMemo(() => ({
    total: sortedRegisteredUsers.length,
    withAddress: sortedRegisteredUsers.filter(user => user.address?.street).length,
    noAddress: sortedRegisteredUsers.filter(user => !user.address?.street).length,
    withHandle: sortedRegisteredUsers.filter(user => user.handle).length
  }), [sortedRegisteredUsers]);

  const adminProfilesSummary = useMemo(() => {
    const bankOptions = normalizedAdmins.reduce((sum, admin) => sum + (admin.banks?.length || 0), 0);
    const qrCount = normalizedAdmins.reduce((sum, admin) => sum + (admin.banks || []).filter(bank => bank.qr).length, 0);
    const noQrProfiles = normalizedAdmins.filter(admin => !(admin.banks || []).some(bank => bank.qr)).length;
    return {
      total: normalizedAdmins.length,
      bankOptions,
      qrCount,
      noQrProfiles
    };
  }, [normalizedAdmins]);

  const productCatalogSummary = useMemo(() => {
    const prices = sortedSettingsProducts.map(product => Number(product.pricePerVialUSD || 0)).filter(price => !Number.isNaN(price));
    const average = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const highest = prices.length ? Math.max(...prices) : 0;
    return {
      total: products.length,
      visible: sortedSettingsProducts.length,
      average,
      highest
    };
  }, [products.length, sortedSettingsProducts]);

  const wikiFilterOptions = useMemo(() => {
    const tagCounts = {};
    WIKI_DATA.forEach((item) => {
      item.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return [
      'All',
      ...Object.entries(tagCounts)
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([tag]) => tag)
        .slice(0, 10)
    ];
  }, []);

  const filteredWikiData = useMemo(() => {
    const lowerQuery = wikiSearchQuery.trim().toLowerCase();

    return WIKI_DATA
      .map((item) => ({
        ...item,
        benefits: buildProductInfo(item.name).benefits
      }))
      .filter((item) => {
        const matchesTag = wikiTagFilter === 'All' || item.tags.includes(wikiTagFilter);
        if (!matchesTag) return false;
        if (!lowerQuery) return true;

        return (
          item.name.toLowerCase().includes(lowerQuery) ||
          item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
          item.desc.toLowerCase().includes(lowerQuery) ||
          (item.benefits || []).some(benefit => benefit.toLowerCase().includes(lowerQuery))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [wikiSearchQuery, wikiTagFilter]);

  const peptideCalculator = useMemo(() => {
    const doseMg = Number(calculatorDoseMg);
    const strengthMg = Number(calculatorStrengthMg);
    const waterMl = Number(calculatorWaterMl);

    if (!doseMg || !strengthMg || !waterMl || doseMg <= 0 || strengthMg <= 0 || waterMl <= 0) return null;

    const concentrationMgPerMl = strengthMg / waterMl;
    const concentrationMcgPerUnit = concentrationMgPerMl * 10;
    const drawMl = doseMg / concentrationMgPerMl;
    const syringeUnits = drawMl * 100;
    const doseMcg = doseMg * 1000;
    const remainingDoses = Math.floor(strengthMg / doseMg);

    return {
      doseMg,
      doseMcg,
      strengthMg,
      waterMl,
      concentrationMgPerMl,
      concentrationMcgPerUnit,
      drawMl,
      syringeUnits,
      remainingDoses
    };
  }, [calculatorDoseMg, calculatorStrengthMg, calculatorWaterMl]);

  const customerProfile = useMemo(() => users.find(u => u.id === customerEmail.toLowerCase().trim()) || null, [users, customerEmail]);

  const existingOrderData = useMemo(() => {
    const userOrders = orders.filter(o => o.email === customerEmail.toLowerCase().trim());
    const itemsMap = {};
    userOrders.forEach(o => {
      if (!itemsMap[o.product]) itemsMap[o.product] = 0;
      itemsMap[o.product] += o.qty;
    });
    return { items: itemsMap };
  }, [orders, customerEmail]);

  const isCurrentUserAtRisk = useMemo(() => {
    if (!customerEmail || !settings.addOnly) return false;
    return trimmingHitList.some(v => v.email === customerEmail.toLowerCase().trim());
  }, [trimmingHitList, customerEmail, settings.addOnly]);

  useEffect(() => {
    if (view !== 'shop') return undefined;

    const fieldEl = heroBubbleFieldRef.current;
    if (!fieldEl) return undefined;

    let lastTime = 0;
    let resizeTick = 0;
    let stopped = false;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const renderScene = () => {
      heroBubblePhysicsRef.current.forEach((bubble) => {
        const node = heroBubbleNodesRef.current[bubble.id];
        if (!node) return;
        node.style.transform = `translate3d(${bubble.x - bubble.radius}px, ${bubble.y - bubble.radius}px, 0) rotate(${bubble.angle}deg)`;
      });
    };

    const initScene = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      if (!width || !height) return;

      const padX = clamp(width * 0.035, 18, 42);
      const padY = clamp(height * 0.045, 18, 42);
      const horizontalRoom = Math.max(width - padX * 2, width * 0.7);
      const verticalRoom = Math.max(height - padY * 2, height * 0.7);
      const speedScale = clamp(Math.min(width, height) * 0.14, 46, 84);

      heroBubblePhysicsRef.current = HERO_CUTE_FLOATERS.map((item, index) => {
        const node = heroBubbleNodesRef.current[item.id];
        const size = Math.max(node?.offsetWidth || 0, width < 640 ? 72 : 84);
        const radius = size / 2;
        const x = clamp(padX + radius + horizontalRoom * item.startX, padX + radius, width - padX - radius);
        const y = clamp(padY + radius + verticalRoom * item.startY, padY + radius, height - padY - radius);
        return {
          id: item.id,
          radius,
          x,
          y,
          vx: item.vx * speedScale,
          vy: item.vy * speedScale,
          angle: index % 2 === 0 ? -8 : 8,
          spin: item.spin * 42
        };
      });

      renderScene();
      lastTime = performance.now();
    };

    const separateAndBounce = (left, right) => {
      const dx = right.x - left.x;
      const dy = right.y - left.y;
      let distance = Math.hypot(dx, dy);
      const minDistance = left.radius + right.radius;

      if (distance >= minDistance) return;

      if (!distance) {
        distance = 0.01;
      }

      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = minDistance - distance;

      left.x -= nx * (overlap / 2);
      left.y -= ny * (overlap / 2);
      right.x += nx * (overlap / 2);
      right.y += ny * (overlap / 2);

      const leftNormal = left.vx * nx + left.vy * ny;
      const leftTangent = -left.vx * ny + left.vy * nx;
      const rightNormal = right.vx * nx + right.vy * ny;
      const rightTangent = -right.vx * ny + right.vy * nx;

      const bouncedLeftNormal = rightNormal * 0.97;
      const bouncedRightNormal = leftNormal * 0.97;

      left.vx = bouncedLeftNormal * nx - leftTangent * ny;
      left.vy = bouncedLeftNormal * ny + leftTangent * nx;
      right.vx = bouncedRightNormal * nx - rightTangent * ny;
      right.vy = bouncedRightNormal * ny + rightTangent * nx;

      left.spin += (rightNormal - leftNormal) * 0.01;
      right.spin += (leftNormal - rightNormal) * 0.01;
    };

    const tick = (now) => {
      if (stopped) return;

      if (!heroBubblePhysicsRef.current.length) {
        initScene();
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      const padX = clamp(width * 0.035, 18, 42);
      const padY = clamp(height * 0.045, 18, 42);
      const dt = Math.min((now - (lastTime || now)) / 1000, 0.024);
      lastTime = now;

      heroBubblePhysicsRef.current.forEach((bubble) => {
        bubble.x += bubble.vx * dt;
        bubble.y += bubble.vy * dt;
        bubble.angle += bubble.spin * dt;

        if (bubble.x - bubble.radius <= padX) {
          bubble.x = padX + bubble.radius;
          bubble.vx = Math.abs(bubble.vx);
          bubble.spin *= -1;
        }
        if (bubble.x + bubble.radius >= width - padX) {
          bubble.x = width - padX - bubble.radius;
          bubble.vx = -Math.abs(bubble.vx);
          bubble.spin *= -1;
        }
        if (bubble.y - bubble.radius <= padY) {
          bubble.y = padY + bubble.radius;
          bubble.vy = Math.abs(bubble.vy);
          bubble.spin *= -1;
        }
        if (bubble.y + bubble.radius >= height - padY) {
          bubble.y = height - padY - bubble.radius;
          bubble.vy = -Math.abs(bubble.vy);
          bubble.spin *= -1;
        }
      });

      for (let index = 0; index < heroBubblePhysicsRef.current.length; index += 1) {
        for (let compareIndex = index + 1; compareIndex < heroBubblePhysicsRef.current.length; compareIndex += 1) {
          separateAndBounce(heroBubblePhysicsRef.current[index], heroBubblePhysicsRef.current[compareIndex]);
        }
      }

      renderScene();
      heroBubbleFrameRef.current = requestAnimationFrame(tick);
    };

    const handleResize = () => {
      cancelAnimationFrame(resizeTick);
      resizeTick = requestAnimationFrame(() => {
        initScene();
      });
    };

    initScene();
    heroBubbleFrameRef.current = requestAnimationFrame(tick);

    window.addEventListener('resize', handleResize);

    return () => {
      stopped = true;
      cancelAnimationFrame(heroBubbleFrameRef.current);
      cancelAnimationFrame(resizeTick);
      window.removeEventListener('resize', handleResize);
    };
  }, [view, settings.storeOpen]);

  // --- ACTIONS & ANIMATIONS ---
  function triggerShake(field) {
    setShakingField(field);
    setTimeout(() => setShakingField(null), 500);
  }

  function unlockShopAccess() {
    if (!configuredShopAccessCode) {
      setHasShopAccess(true);
      return;
    }

    if (normalizeAccessCode(shopAccessCodeInput) !== configuredShopAccessCode) {
      triggerShake('shopAccessCode');
      showToast('Wrong batch code. Check Discord and try again.');
      return;
    }

    try {
      window.localStorage.setItem(SHOP_ACCESS_STORAGE_KEY, configuredShopAccessCode);
    } catch (error) {
      console.warn('Could not save shop access code locally.', error);
    }

    setHasShopAccess(true);
    setShopAccessCodeInput('');
    showToast('Batch code accepted.');
  }

  function triggerAmbulance() {
    setShowAmbulance(true);
    setTimeout(() => setShowAmbulance(false), 800);
    const formCard = document.getElementById('top-form-card');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function triggerCelebration(type) {
    setCelebration({ show: true, type });
    setTimeout(() => setCelebration({ show: false, type: '' }), 5000);
  }

  function showToast(msg, duration = 4500) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(String(msg));
    toastTimeoutRef.current = setTimeout(() => setToast(null), duration);
  }

  async function copyTrimListForDiscord() {
    try {
      if (!navigator?.clipboard?.writeText) {
        showToast('Clipboard is not available right now.');
        return;
      }
      await navigator.clipboard.writeText(discordTrimListText);
      showToast(trimmingHitList.length ? 'Trim list copied for Discord.' : 'Copied the empty trim list message.');
    } catch (err) {
      console.error(err);
      showToast('Could not copy the trim list.');
    }
  }

  function buildTrimGroupDiscordText(group) {
    const lines = [
      `${group.prod} - Box ${group.boxNum} needs ${group.missingSlots} more`,
      'If this box does not fill before cutoff, these loose vials may be cut:',
      ''
    ];

    group.rows.forEach(row => {
      const label = row.handle ? `@${String(row.handle).replace(/^@+/, '')}` : row.email;
      lines.push(`- ${label}: ${row.amountToRemove} vial${row.amountToRemove === 1 ? '' : 's'} at risk`);
    });

    return lines.join('\n');
  }

  async function copyTrimGroupForDiscord(group) {
    try {
      if (!navigator?.clipboard?.writeText) {
        showToast('Clipboard is not available right now.');
        return;
      }
      await navigator.clipboard.writeText(buildTrimGroupDiscordText(group));
      showToast(`Copied ${group.prod} box ${group.boxNum} alert.`);
    } catch (err) {
      console.error(err);
      showToast('Could not copy this box alert.');
    }
  }

  function confirmHitListIncrease(productName, requestedAddQty = 1, hitListContext = {}) {
    const product = products.find(p => p.name === productName);
    if (!product) {
      adjustCartItem(productName, 1);
      return;
    }

    const currentQty = cartItems[productName]?.v || existingOrderData.items[productName] || 0;
    const addQty = Math.max(1, parseInt(requestedAddQty, 10) || 1);
    const nextQty = currentQty + addQty;
    const nextSubtotalUSD = subtotalUSD + (Number(product.pricePerVialUSD || 0) * addQty);
    const nextTotalPHP = lockedPaymentSnapshot?.totalPHP ?? ((nextSubtotalUSD > 0 && settings.fxRate > 0 ? nextSubtotalUSD + (settings.adminFeePhp / settings.fxRate) : 0) * settings.fxRate);

    setPendingHitListAdd({
      productName,
      currentQty,
      addQty,
      nextQty,
      pricePerVialUSD: Number(product.pricePerVialUSD || 0),
      baseSubtotalUSD: subtotalUSD,
      missingSlots: Number(hitListContext.missingSlots || 0),
      boxNum: Number(hitListContext.boxNum || 0) || null,
      nextTotalPHP
    });
  }

  async function removeCustomerProof(customer) {
    if (!customer?.email) return;
    if (!window.confirm(`Remove proof for ${customer.name || customer.email}?`)) return;

    try {
      const customerProfile = users.find(userProfile => userProfile.id === customer.email) || null;
      await createRecycleRecord({
        label: `Deleted proof reference for ${customer.name || customer.email}`,
        recycleType: 'proof',
        userSnapshot: customerProfile || { id: customer.email, name: customer.name || '', email: customer.email },
        proofReference: {
          proofUrl: customer.proofUrl || null,
          proofReview: customer.proofReview || '',
          paymentSubmittedAt: customerProfile?.paymentSubmittedAt || customer.paymentSubmittedAt || null,
          isPaid: customer.isPaid || false
        },
        meta: {
          email: customer.email,
          name: customer.name || ''
        }
      });

      await safeAwait(setDoc(doc(db, colPath('users'), customer.email), {
        isPaid: false,
        proofUrl: null,
        proofReview: '',
        paymentSubmittedAt: null
      }, { merge: true }));
      showToast('Proof removed. The reference is saved in Admin Safety so you can restore it.');
    } catch (error) {
      console.error(error);
      showToast('Could not remove proof.');
    }
  }

  function focusProductCard(prodName) {
    setShakingProd(prodName);
    setTimeout(() => setShakingProd(null), 700);
    const prodEl = document.querySelector(`[data-name="${prodName}"]`);
    if (prodEl) prodEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function getNextTableSort(currentSort, key) {
    return currentSort.key === key
      ? { key, direction: currentSort.direction === 'asc' ? 'desc' : 'asc' }
      : { key, direction: 'asc' };
  }

  function compareTableValues(left, right, direction = 'asc') {
    const a = left ?? '';
    const b = right ?? '';
    let result = 0;

    if (typeof a === 'number' && typeof b === 'number') {
      result = a - b;
    } else {
      result = String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    }

    return direction === 'asc' ? result : -result;
  }

  async function saveAdminNote(customer, nextNote) {
    if (!customer?.email) return;
    try {
      await safeAwait(setDoc(doc(db, colPath('users'), customer.email), {
        adminNotes: nextNote,
        adminNotesUpdatedAt: Date.now()
      }, { merge: true }));
      showToast(`Saved note for ${customer.name || customer.email}.`);
    } catch (error) {
      console.error(error);
      showToast('Could not save that note right now.');
    }
  }

  async function confirmBuyerReview() {
    if (!currentCustomerRecord?.email) {
      showToast('Load your order first with the same email you used to save it.');
      return;
    }
    try {
      await safeAwait(setDoc(doc(db, colPath('users'), currentCustomerRecord.email), {
        buyerReviewConfirmedAt: Date.now()
      }, { merge: true }));
      showToast('Your order is marked as looking good for the payment stage.');
    } catch (error) {
      console.error(error);
      showToast('Could not save your review confirmation.');
    }
  }

  async function toggleReviewStageWindow() {
    if (settings.reviewStageOpen) {
      try {
        const nextSettings = { ...settings, reviewStageOpen: false };
        await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), nextSettings));
        setSettings(nextSettings);
        showToast('Review stage closed.');
      } catch (error) {
        console.error(error);
        showToast('Could not close the review stage right now.');
      }
      return;
    }

    const activeCustomers = customerList.filter(customer => customer.itemCount > 0);
    if (!activeCustomers.length) {
      showToast('No active orders to review yet.');
      return;
    }

    setIsBtnLoading(true);
    try {
      await createBatchSnapshot('Before review stage', { action: 'open-review-stage' });
      for (const chunk of chunkArray(activeCustomers, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(customer => {
          batch.set(doc(db, colPath('users'), customer.email), {
            buyerReviewConfirmedAt: null
          }, { merge: true });
        });
        await safeAwait(batch.commit());
      }
      const nextSettings = { ...settings, reviewStageOpen: true };
      await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), nextSettings));
      setSettings(nextSettings);
      showToast('Review stage opened. Buyers can now double-check saved orders before payments open.');
    } catch (error) {
      console.error(error);
      showToast('Could not open the review stage right now.');
    }
    setIsBtnLoading(false);
  }

  async function restoreSafetyRecord(record) {
    if (!record?.id) return;

    try {
      setIsBtnLoading(true);

      if (record.kind === 'recycle') {
        if (record.recycleType === 'orders') {
          if (record.userSnapshot?.id) {
            const currentOrders = orders.filter(order => order.email === record.userSnapshot.id);
            for (const chunk of chunkArray(currentOrders, 250)) {
              const batch = writeBatch(db);
              chunk.forEach(order => batch.delete(doc(db, colPath('orders'), order.id)));
              await safeAwait(batch.commit());
            }
          }
          for (const chunk of chunkArray(record.ordersSnapshot || [], 250)) {
            const batch = writeBatch(db);
            chunk.forEach(order => {
              const { id, ...payload } = order;
              batch.set(doc(db, colPath('orders'), id), payload);
            });
            await safeAwait(batch.commit());
          }
          if (record.userSnapshot?.id) {
            const { id, ...payload } = record.userSnapshot;
            await safeAwait(setDoc(doc(db, colPath('users'), id), payload, { merge: true }));
          }
        }

        if (record.recycleType === 'proof' && record.userSnapshot?.id) {
          const proofReference = record.proofReference || {};
          await safeAwait(setDoc(doc(db, colPath('users'), record.userSnapshot.id), {
            proofUrl: proofReference.proofUrl || null,
            proofReview: proofReference.proofReview || '',
            paymentSubmittedAt: proofReference.paymentSubmittedAt || null,
            isPaid: Boolean(proofReference.isPaid)
          }, { merge: true }));
        }

        await safeAwait(setDoc(doc(db, colPath('safetyBackups'), record.id), {
          status: 'restored',
          restoredAt: Date.now()
        }, { merge: true }));
        showToast('Recycle bin item restored.');
        return;
      }

      if (record.kind === 'undo') {
        if (record.replaceCustomerOrders && (record.targetEmails || []).length) {
          for (const emailChunk of chunkArray(record.targetEmails || [], 100)) {
            const matchingOrders = orders.filter(order => emailChunk.includes(order.email));
            for (const deleteChunk of chunkArray(matchingOrders, 250)) {
              const batch = writeBatch(db);
              deleteChunk.forEach(order => batch.delete(doc(db, colPath('orders'), order.id)));
              await safeAwait(batch.commit());
            }
          }
        }

        for (const chunk of chunkArray(record.beforeOrders || [], 250)) {
          const batch = writeBatch(db);
          chunk.forEach(order => {
            const { id, ...payload } = order;
            batch.set(doc(db, colPath('orders'), id), payload);
          });
          await safeAwait(batch.commit());
        }

        for (const chunk of chunkArray(record.beforeUsers || [], 250)) {
          const batch = writeBatch(db);
          chunk.forEach(profile => {
            const { id, ...payload } = profile;
            batch.set(doc(db, colPath('users'), id), payload, { merge: true });
          });
          await safeAwait(batch.commit());
        }

        await safeAwait(setDoc(doc(db, colPath('safetyBackups'), record.id), {
          status: 'used',
          undoneAt: Date.now()
        }, { merge: true }));
        showToast('Undo complete.');
        return;
      }

      if (record.kind === 'snapshot') {
        if (!window.confirm(`Restore batch snapshot "${record.label}"? This will replace the live batch data.`)) {
          setIsBtnLoading(false);
          return;
        }

        for (const chunk of chunkArray(orders, 250)) {
          const batch = writeBatch(db);
          chunk.forEach(order => batch.delete(doc(db, colPath('orders'), order.id)));
          await safeAwait(batch.commit());
        }

        for (const chunk of chunkArray(record.ordersSnapshot || [], 250)) {
          const batch = writeBatch(db);
          chunk.forEach(order => {
            const { id, ...payload } = order;
            batch.set(doc(db, colPath('orders'), id), payload);
          });
          await safeAwait(batch.commit());
        }

        for (const chunk of chunkArray(record.usersSnapshot || [], 250)) {
          const batch = writeBatch(db);
          chunk.forEach(profile => {
            const { id, ...payload } = profile;
            batch.set(doc(db, colPath('users'), id), payload, { merge: true });
          });
          await safeAwait(batch.commit());
        }

        for (const chunk of chunkArray(products, 250)) {
          const batch = writeBatch(db);
          chunk.forEach(product => batch.delete(doc(db, colPath('products'), product.id)));
          await safeAwait(batch.commit());
        }

        for (const chunk of chunkArray(record.productsSnapshot || [], 250)) {
          const batch = writeBatch(db);
          chunk.forEach(product => {
            const { id, ...payload } = product;
            const nextRef = id ? doc(db, colPath('products'), id) : doc(collection(db, colPath('products')));
            batch.set(nextRef, payload);
          });
          await safeAwait(batch.commit());
        }

        if (record.settingsSnapshot) {
          await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), record.settingsSnapshot));
        }

        await safeAwait(setDoc(doc(db, colPath('safetyBackups'), record.id), {
          status: 'restored',
          restoredAt: Date.now()
        }, { merge: true }));
        showToast('Batch snapshot restored.');
      }
    } catch (error) {
      console.error(error);
      showToast('Could not restore that safety record.');
    }
    setIsBtnLoading(false);
  }

  function getAvailabilityMessage(prodName, pData, requestedQty = null) {
    if (!pData) return `${prodName}: product not found.`;
    const savedQty = existingOrderData.items[prodName] || 0;
    const nextQty = requestedQty == null ? savedQty : requestedQty;

    if (settings.paymentsOpen) {
      return `${prodName}: payments are open now. You cannot change this order anymore.`;
    }

    if (settings.addOnly && nextQty < savedQty) {
      return `${prodName}: you already have ${savedQty}. You can add more, but you cannot go below ${savedQty}.`;
    }

    if (pData.locked) {
      if (savedQty > 0) {
        return `${prodName}: this item is closed now. Keep it at ${savedQty}.`;
      }
      return `${prodName}: this item is closed now. Please pick another item.`;
    }

    if (pData.maxBoxes > 0) {
      const projectedTotal = requestedQty == null ? pData.totalVials : (pData.totalVials - savedQty + requestedQty);
      const maxTotal = pData.maxBoxes * SLOTS_PER_BATCH;
      const allowedQty = Math.max(0, maxTotal - (pData.totalVials - savedQty));

      if (projectedTotal > maxTotal || pData.statusText === 'Limit Reached') {
        if (allowedQty <= 0) {
          if (savedQty > 0) {
            return `${prodName}: this box is full. Keep it at ${savedQty}. You cannot add more now.`;
          }
          return `${prodName}: this box is full now. Please pick another item.`;
        }

        if (savedQty > 0) {
          return `${prodName}: you can only keep ${allowedQty} for this item now. Lower it to ${allowedQty} or less.`;
        }

        return `${prodName}: only ${allowedQty} vial${allowedQty === 1 ? '' : 's'} left for this item. Lower it to ${allowedQty} or less.`;
      }
    }

    if (pData.isClosed) {
      if (savedQty > 0) {
        return `${prodName}: this item cannot be changed now. Keep it at ${savedQty}.`;
      }
      return `${prodName}: this item is not available now. Please pick another item.`;
    }

    return `${prodName}: this number cannot be saved now. Please lower it and try again.`;
  }

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const senderName = customerHandle || customerName || 'Anonymous Buddy';
    try {
      setIsChatSending(true);
      await safeAwait(addDoc(collection(db, colPath('chats')), {
        text: chatInput.trim(),
        sender: senderName,
        senderId: currentChatIdentity,
        productRef: null,
        kind: 'message',
        timestamp: Date.now()
      }));
      setChatInput('');
      setIsChatOpen(true);
    } catch (err) {
      console.error(err);
      showToast("Chat could not send right now.");
    } finally {
      setIsChatSending(false);
    }
  };

  const handleSendHelpRequest = async (prod, missingSlots) => {
    const senderName = customerHandle || customerName || 'A Box Buddy';
    const textToSend = `Need ${missingSlots} more vial${missingSlots === 1 ? '' : 's'} of ${prod} to close this box.`;
    try {
      await safeAwait(addDoc(collection(db, colPath('chats')), {
        text: textToSend,
        sender: senderName,
        senderId: currentChatIdentity,
        productRef: prod,
        kind: 'help',
        timestamp: Date.now()
      }));
      setIsChatOpen(true);
      setShowHitListModal(false);
      showToast("Help request sent to the chat.");
    } catch (err) { console.error(err); }
  };

  function formatChatTimestamp(timestamp) {
    const diff = Date.now() - Number(timestamp || 0);
    if (diff < 60 * 1000) return 'just now';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  const createEditableCart = (itemsMap = {}) => {
    const prefill = {};
    Object.entries(itemsMap).forEach(([prod, qty]) => {
      if (qty > 0) prefill[prod] = { v: qty };
    });
    return prefill;
  };

  const handleAddFromChat = (prodName) => {
    const pData = enrichedProducts.find(p => p.name === prodName);
    if (!pData || pData.isClosed) {
      showToast(getAvailabilityMessage(prodName, pData), 6000);
      return;
    }

    const currentQty = cartItems[prodName]?.v || 0;
    if (currentQty === 0) {
      setCartItems(prev => ({ ...prev, [prodName]: { v: settings.minOrder } }));
    } else {
      setCartItems(prev => ({ ...prev, [prodName]: { v: (prev[prodName]?.v || 0) + 1 } }));
    }

    showToast(`Added ${prodName} to your cart.`);
    triggerShake(prodName);

    const prodEl = document.querySelector(`[data-name="${prodName}"]`);
    if (prodEl) prodEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };


  function handleAdminLogin(e) {
    if (e) e.preventDefault();
    if (adminPassword === (settings.adminPass || 'admin123')) {
      setIsAdminAuthenticated(true);
      setLoginError('');
      setAdminPassword('');
    } else {
      setLoginError('Incorrect password. Access denied.');
    }
  }

  function handleLookup() {
    if (!customerEmail) return;

    const cleanEmail = customerEmail.toLowerCase().trim();
    const profile = users.find(u => u.id === cleanEmail) || null;
    const userOrderRows = orders.filter(o => o.email === cleanEmail);
    const hasActiveOrders = userOrderRows.length > 0;
    const currentItems = {};
    userOrderRows.forEach(o => { currentItems[o.product] = (currentItems[o.product] || 0) + o.qty; });

    if (profile) {
      setCustomerName(profile.name || '');
      setCustomerHandle(profile.handle || '');
      setAddressForm({
        ...createEmptyAddressForm(),
        ...(profile.address || {}),
        partialShipPref: normalizePartialShipPreference(profile.address?.partialShipPref)
      });

      const atRisk = trimmingHitList.some(v => v.email === cleanEmail);
      if (settings.addOnly && atRisk && settings.storeOpen !== false) {
        showToast(`Urgent ${profile.name}: your vials are on the hit list.`);
      } else {
        showToast(`Welcome back, ${profile.name}. Profile loaded.`);
      }
    } else {
      if (hasActiveOrders) {
        setCustomerName(userOrderRows[0]?.name || '');
        setCustomerHandle(userOrderRows[0]?.handle || '');
        setAddressForm(createEmptyAddressForm());
      }
      showToast(
        hasActiveOrders
          ? "Existing order found. You can edit it below."
          : (settings.storeOpen !== false ? "No existing profile found. Welcome." : "No profile found for this email.")
      );
      if (!hasActiveOrders) {
        setCustomerName('');
        setCustomerHandle('');
        setAddressForm(createEmptyAddressForm());
      }
    }

    setCartInputDrafts({});

    if (!settings.paymentsOpen && settings.storeOpen !== false) {
      setCartItems(createEditableCart(currentItems));
      if (hasActiveOrders) {
        showToast(settings.addOnly ? "Your order is loaded. You can add more vials only." : "Your current order is loaded for editing.");
      }
    }
  }

  function triggerLockedQtyFeedback(prodName) {
    setShakingProd(prodName);
    setTimeout(() => setShakingProd(null), 500);
    showToast("Add-only mode keeps your saved vials locked in.");
  }

  function handleCartFocus(prodName, event) {
    const currentQty = cartItems[prodName]?.v || existingOrderData.items[prodName] || 0;
    setCartInputDrafts(prev => ({ ...prev, [prodName]: String(currentQty || '') }));
    if (event?.target?.select) event.target.select();
  }

  function handleCartChange(prodName, val) {
    const sanitized = String(val).replace(/[^\d]/g, '');
    setCartInputDrafts(prev => ({ ...prev, [prodName]: sanitized }));
    if (sanitized === '') return;

    let num = parseInt(sanitized, 10) || 0;
    if (num < 0) num = 0;
    const existingQty = existingOrderData.items[prodName] || 0;
    if (settings.addOnly && num < existingQty) {
      return;
    }
    setCartItems(prev => ({ ...prev, [prodName]: { v: num } }));
  }

  function handleCartBlur(prodName) {
    const cart = cartItems[prodName] || { v: 0 };
    const draftValue = cartInputDrafts[prodName];
    const usingDraft = draftValue !== undefined;
    const draftQty = draftValue === '' ? 0 : (parseInt(draftValue, 10) || 0);
    const totalVials = usingDraft ? draftQty : (cart.v || 0);
    const existingQty = existingOrderData.items[prodName] || 0;
    let nextQty = totalVials;

    if (settings.addOnly && nextQty < existingQty) {
      nextQty = existingQty;
      triggerLockedQtyFeedback(prodName);
    }

    if (nextQty > 0 && nextQty < settings.minOrder && !settings.addOnly) {
      showToast(`Minimum ${settings.minOrder} vials required per item.`);
      nextQty = settings.minOrder;
      setShakingProd(prodName);
      setTimeout(() => setShakingProd(null), 500);
    }

    setCartItems(prev => {
      const updated = { ...prev };
      if (nextQty <= 0) {
        delete updated[prodName];
      } else {
        updated[prodName] = { ...cart, v: nextQty };
      }
      return updated;
    });

    setCartInputDrafts(prev => {
      const updated = { ...prev };
      delete updated[prodName];
      return updated;
    });
  }

  function adjustCartItem(prodName, delta) {
    if (!isCartEditable) return;

    setCartItems(prev => {
      const existingQty = existingOrderData.items[prodName] || 0;
      const current = prev[prodName]?.v || existingQty || 0;
      let next = current + delta;

      if (settings.addOnly && next < existingQty) {
        triggerLockedQtyFeedback(prodName);
        return prev;
      } else if (!settings.addOnly && delta < 0 && current <= settings.minOrder) {
        next = 0;
      }

      if (next < 0) next = 0;

      const updated = { ...prev };
      if (next === 0) {
        delete updated[prodName];
      } else {
        updated[prodName] = { v: next };
      }
      return updated;
    });
  }

  async function cancelEntireOrder() {
    if (!customerEmail) { triggerAmbulance(); showToast("Enter your email first."); return; }

    const emailLower = customerEmail.toLowerCase().trim();
    const userOrderRows = orders.filter(o => o.email === emailLower);
    if (userOrderRows.length === 0) {
      showToast("There is no saved order to cancel.");
      return;
    }

    setIsBtnLoading(true);
    try {
      const customerProfile = users.find(profile => profile.id === emailLower) || { id: emailLower, name: customerName, handle: customerHandle };
      await createBatchSnapshot('Before customer order cancel', { action: 'cancel-order', email: emailLower });
      await createRecycleRecord({
        label: `Cancelled order for ${customerName || emailLower}`,
        recycleType: 'orders',
        ordersSnapshot: userOrderRows,
        userSnapshot: customerProfile,
        meta: { email: emailLower, name: customerName || '' }
      });
      const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
      for (const chunk of chunkArray(userOrderRows, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(o => batch.delete(doc(db, colPath('orders'), o.id)));
        await safeAwait(batch.commit());
      }

      await safeAwait(addDoc(collection(db, colPath('logs')), {
        timestamp: Date.now(),
        email: emailLower,
        name: customerName,
        action: "Cancelled Entire Order",
        details: "All items removed."
      }));

      setCartItems({});
      setCartInputDrafts({});
      setConfirmAction({ type: null, id: null });
      showToast("Order cancelled.");
    } catch (err) {
      console.error(err);
      showToast(`Error cancelling order: ${err.message}`);
    }
    setIsBtnLoading(false);
  }

  async function submitOrder() {
    if (isShopAccessLocked) { showToast("Enter the batch code from Discord first."); return; }
    if (!customerEmail) { triggerAmbulance(); showToast("Email address is required."); return; }
    if (customerEmail.toLowerCase().trim() !== customerEmailConfirm.toLowerCase().trim()) {
      triggerAmbulance(); showToast("Email addresses do not match."); return;
    }
    if (!customerName) { triggerAmbulance(); showToast("Your name is required."); return; }

    const emailLower = customerEmail.toLowerCase().trim();
    setIsBtnLoading(true);
    try {
      const errors = [];
      const newOrderItems = [];
      const timestamp = Date.now();
      let finalTotalQty = 0;

      if (settings.addOnly) {
        Object.entries(existingOrderData.items).forEach(([prodName, existingQty]) => {
          const finalQty = cartItems[prodName]?.v || 0;
          if (finalQty < existingQty) {
            errors.push({ product: prodName, message: `${prodName}: add-only mode keeps your saved ${existingQty} vials locked in.` });
          }
        });
      }

      Object.entries(cartItems).forEach(([prodName, amounts]) => {
        const qty = amounts.v || 0;
        const existingQty = existingOrderData.items[prodName] || 0;
        if (qty <= 0) return;

        if (!settings.addOnly && qty < settings.minOrder) {
          errors.push({ product: prodName, message: `${prodName}: minimum is ${settings.minOrder} vials.` });
        }

        finalTotalQty += qty;
        const pData = enrichedProducts.find(p => p.name === prodName);
        if (!pData) {
          errors.push({ product: prodName, message: `${prodName}: product not found.` });
          return;
        }
        const isKeepingSavedClosedQty = pData.isClosed && existingQty > 0 && qty === existingQty;
        if (pData.isClosed && !isKeepingSavedClosedQty) {
          errors.push({ product: prodName, message: getAvailabilityMessage(prodName, pData, qty) });
          return;
        }

        if (pData?.maxBoxes > 0 && (pData.totalVials - existingQty + qty) > (pData.maxBoxes * 10)) {
          errors.push({ product: prodName, message: getAvailabilityMessage(prodName, pData, qty) });
        }

        newOrderItems.push({ email: emailLower, name: customerName, handle: customerHandle, product: prodName, qty, timestamp });
      });

      if (finalTotalQty === 0) {
        triggerShake('products');
        showToast("Your cart is empty. Add items or use Cancel Entire Order.");
        setIsBtnLoading(false);
        return;
      }

      if (!settings.addOnly && finalTotalQty < settings.minOrder) {
        showToast(`Your total order must be at least ${settings.minOrder} vials.`);
        setIsBtnLoading(false);
        return;
      }

      if (errors.length > 0) {
        focusProductCard(errors[0].product);
        showToast(
          errors.length === 1
            ? errors[0].message
            : `${errors[0].message} Plus ${errors.length - 1} more issue${errors.length === 2 ? '' : 's'}.`,
          7000
        );
        setIsBtnLoading(false);
        return;
      }

      const toDelete = orders.filter(o => o.email === emailLower);
      for (const chunk of chunkArray(toDelete, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(o => batch.delete(doc(db, colPath('orders'), o.id)));
        await safeAwait(batch.commit());
      }

      for (const chunk of chunkArray(newOrderItems, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const ref = doc(collection(db, colPath('orders')));
          batch.set(ref, item);
        });
        await safeAwait(batch.commit());
      }

      const existingUser = users.find(u => u.id === emailLower);
      const userUpdatePayload = {
        name: customerName,
        handle: customerHandle,
        buyerReviewConfirmedAt: null
      };
      if (!existingUser || !existingUser.adminAssigned) {
        userUpdatePayload.adminAssigned = normalizedAdmins[Math.floor(Math.random() * normalizedAdmins.length)]?.name || "Admin";
      }
      if (!existingUser?.proofUrl && !existingUser?.isPaid) {
        userUpdatePayload.paymentSnapshot = null;
        userUpdatePayload.proofReview = '';
      }
      await safeAwait(setDoc(doc(db, colPath('users'), emailLower), userUpdatePayload, { merge: true }));

      const logDetails = newOrderItems.map(i => `${i.qty}x ${i.product}`).join(', ');
      const logAction = Object.keys(existingOrderData.items).length > 0 ? 'Updated Order' : 'Placed Order';
      await safeAwait(addDoc(collection(db, colPath('logs')), { timestamp: Date.now(), email: emailLower, name: customerName, action: logAction, details: logDetails }));

      triggerCelebration('order');
      setCartItems(createEditableCart(Object.fromEntries(newOrderItems.map(item => [item.product, item.qty]))));
      setCartInputDrafts({});
    } catch (err) { console.error(err); showToast(`Error saving: ${err.message}`); }
    setIsBtnLoading(false);
  }

  async function submitPayment() {
    if (showShopAccessGate) { showToast("Enter the batch code from Discord first."); return; }
    const errs = {};
    if (!addressForm.shipOpt) errs.shipOpt = true;
    if (!addressForm.partialShipPref) errs.partialShipPref = true;
    if (!addressForm.street?.trim()) errs.street = true;
    if (!addressForm.brgy?.trim()) errs.brgy = true;
    if (!addressForm.city?.trim()) errs.city = true;
    if (!addressForm.prov?.trim()) errs.prov = true;
    if (!addressForm.zip?.trim()) errs.zip = true;
    if (!addressForm.contact?.trim()) errs.contact = true;
    if (!proofFile) errs.proofFile = true;

    if (Object.keys(errs).length > 0) {
      setAddressErrors(errs);
      showToast("Please fill all required highlighted fields.");
      setTimeout(() => setAddressErrors({}), 600);
      return;
    }

    const emailLower = customerEmail.toLowerCase().trim();
    setIsBtnLoading(true);

    try {
      const fileExt = proofFile.name.split('.').pop();
      const fileName = `${emailLower}_${Date.now()}.${fileExt}`;
      const sRefPath = isCanvas ? `artifacts/${appId}/public/proofs/${fileName}` : `proofs/${fileName}`;
      const sRef = storageRef(storage, sRefPath);
      const currentProfile = users.find(u => u.id === emailLower) || {};
      const existingSnapshot = getFrozenPaymentSnapshot(currentProfile);
      const frozenSnapshot = existingSnapshot || buildPaymentSnapshot(existingOrderData.items, currentProfile.adminAssigned || currentCustomerRecord?.adminAssigned, emailLower);

      showToast("Uploading proof...");
      await uploadBytesResumable(sRef, proofFile);
      const downloadUrl = await getDownloadURL(sRef);

      await safeAwait(setDoc(doc(db, colPath('users'), emailLower), {
        address: addressForm,
        isPaid: true,
        proofReview: '',
        paymentSnapshot: frozenSnapshot,
        paymentSubmittedAt: Date.now(),
        proofUrl: downloadUrl
      }, { merge: true }));

      await safeAwait(addDoc(collection(db, colPath('logs')), { timestamp: Date.now(), email: emailLower, name: customerName, action: "Submitted Payment", details: `Amount: ₱${totalPHP.toLocaleString()} via ${addressForm.shipOpt}` }));

      triggerCelebration('payment');
      setShowPayModal(false);
      setProofFile(null);
    } catch (err) {
      console.error(err);
      if (err.code === 'storage/unauthorized') {
        showToast("Storage Error! Please check your Firebase Storage Rules.");
      } else {
        showToast("Error submitting payment.");
      }
    }
    setIsBtnLoading(false);
  }

  const saveEditedAddress = async () => {
    if (!editAddressForm.shipOpt || !editAddressForm.partialShipPref || !editAddressForm.street || !editAddressForm.brgy || !editAddressForm.city || !editAddressForm.contact) {
      showToast("Please fill all basic address fields."); return;
    }
    setIsBtnLoading(true);
    try {
      await safeAwait(setDoc(doc(db, colPath('users'), selectedProfileEmail.toLowerCase().trim()), { address: editAddressForm }, { merge: true }));
      showToast("Address successfully updated.");
      setIsEditingAddress(false);
    } catch (e) {
      showToast("Error updating address.");
    }
    setIsBtnLoading(false);
  };

  const startEditingAddress = (profile) => {
    setEditAddressForm({
      ...createEmptyAddressForm(),
      ...(profile.address || {}),
      partialShipPref: normalizePartialShipPreference(profile.address?.partialShipPref)
    });
    setIsEditingAddress(true);
  };

  function generateLabelsForCustomers(customers, emptyMessage = "No paid users with valid addresses to print.") {
    const printableUsers = customers.filter(c => c.isPaid && c.address?.street);
    if (printableUsers.length === 0) { showToast(emptyMessage); return; }
    buildAndPrintLabelsHTML(printableUsers);
  }

  function generateBulkLabels(customers = paymentCustomers) {
    generateLabelsForCustomers(customers, "No paid users with valid addresses to print.");
  }

  function generateSingleLabel(c) {
    if (!c.isPaid) { showToast("Mark this order paid first before printing a label."); return; }
    if (!c.address?.street) { showToast("This customer has no valid address to print."); return; }
    buildAndPrintLabelsHTML([c]);
  }

  function buildAndPrintLabelsHTML(usersToPrint) {
    let html = `
     <html><head><title>Shipping Labels - ${settings.batchName}</title>
     <style>
       body { font-family: 'Helvetica Neue', Helvetica, sans-serif; padding: 20px; background: #f0f0f0; } 
       .label-container { display: flex; flex-wrap: wrap; gap: 20px; justify-content: center; }
       .label { background: white; border: 2px dashed #000; border-radius: 12px; padding: 20px; width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); page-break-inside: avoid; margin-bottom: 20px; } 
       .label h2 { margin: 0 0 10px 0; border-bottom: 3px solid #D6006E; color: #000; padding-bottom: 5px; font-size: 24px; text-transform: uppercase; letter-spacing: 1px;} 
       .meta { color: #666; font-size: 14px; margin-bottom: 15px; }
       .address { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 16px; line-height: 1.5; color: #000; }
       .items { margin-top: 15px; } 
       .items ul { padding-left: 20px; margin: 5px 0; font-size: 14px; }
       .items li { margin-bottom: 4px; border-bottom: 1px solid #f0f0f0; padding-bottom: 2px; }
       .footer { margin-top: 15px; text-align: center; font-size: 12px; color: #D6006E; font-weight: bold; border-top: 1px solid #eee; padding-top: 10px;}
       @media print { body { background: white; padding: 0; } .label-container { gap: 10px; justify-content: flex-start; } .label { box-shadow: none; border: 1px solid #000; } }
     </style></head><body>
     <div class="label-container">`;

    usersToPrint.forEach(c => {
      const userOrders = orders.filter(o => o.email === c.email);
      html += `<div class="label">
            <h2>${c.name}</h2>
            <div class="meta">Handle: <strong>${c.handle || 'N/A'}</strong><br/>Email: ${c.email}</div>
            <div class="address">
               <strong>Ship via: ${c.address.shipOpt}</strong><br/><br/>
               ${getPartialShipPreferenceLabel(c.address.partialShipPref) ? `<strong>Shipping note:</strong> ${getPartialShipPreferenceLabel(c.address.partialShipPref)}<br/><br/>` : ''}
               ${c.address.street}<br/>
               ${c.address.brgy ? `${c.address.brgy}, ` : ''}${c.address.city}<br/>
               ${c.address.prov} ${c.address.zip}<br/><br/>
               Contact: <strong>${c.address.contact}</strong>
            </div>
            <div class="items"><strong>Order Contents:</strong><ul>`;
      userOrders.forEach(o => { html += `<li><strong>${o.qty}x</strong> ${o.product}</li>`; });
      html += `</ul></div><div class="footer">Bonded By Peptides | ${settings.batchName}</div></div>`;
    });

    html += '</div></body></html>';
    const win = window.open('', '_blank');
    if (!win) {
      showToast("Popup blocked. Please allow popups, then try printing again.");
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 1000);
  }

  const pushToGoogleSheets = async () => {
    if (!settings.gasWebAppUrl) {
      showToast("Please enter your Google Web App URL in Settings first.");
      return;
    }
    setIsBtnLoading(true);
    showToast("Pushing to Google Sheets...");

    try {
      const formattedCustomers = customerList.map(c => {
        return {
          Email: c.email,
          Name: c.name,
          Handle: c.handle || '',
          "Subtotal USD": c.subtotalUSD.toFixed(2),
          "Total USD": c.totalUSD.toFixed(2),
          "Total PHP": c.totalPHP,
          "Proof Link": c.proofUrl || '',
          "Assigned Admin": c.adminAssigned || '',
          "Bank Account": c.paymentBankDetails || '',
          "Label Link": "N/A (Generated on Demand)",
          Street: c.address?.street || '',
          Barangay: c.address?.brgy || '',
          City: c.address?.city || '',
          Province: c.address?.prov || '',
          Zip: c.address?.zip || '',
          Contact: c.address?.contact || '',
          "Shipping Option": c.address?.shipOpt || '',
          "Partial Ship": getPartialShipPreferenceLabel(c.address?.partialShipPref) || '',
          "Is Paid": c.isPaid ? 'TRUE' : 'FALSE'
        };
      });

      const response = await fetch(settings.gasWebAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'push', customers: formattedCustomers })
      });

      const result = await response.json();
      if (result.success) {
        showToast("Successfully pushed to Google Sheets.");
      } else {
        showToast("Error from Sheets: " + result.error);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to push. Check URL and permissions.");
    }
    setIsBtnLoading(false);
  };

  const pullFromGoogleSheets = async () => {
    if (!settings.gasWebAppUrl) {
      showToast("Please enter your Google Web App URL in Settings first.");
      return;
    }
    setIsBtnLoading(true);
    showToast("Pulling from Google Sheets...");

    try {
      const response = await fetch(settings.gasWebAppUrl);
      const result = await response.json();

      if (result.success && result.data) {
        const updates = result.data.map(row => ({
          email: String(row.Email || '').toLowerCase().trim(),
          adminAssigned: String(row['Assigned Admin'] || '').trim(),
          isPaid: String(row['Is Paid'] || '').toUpperCase() === 'TRUE',
          address: {
            street: String(row.Street || '').trim(),
            brgy: String(row.Barangay || '').trim(),
            city: String(row.City || '').trim(),
            prov: String(row.Province || '').trim(),
            zip: String(row.Zip || '').trim(),
            contact: String(row.Contact || '').trim(),
            shipOpt: String(row['Shipping Option'] || '').trim(),
            partialShipPref: normalizePartialShipPreference(row['Partial Ship'] || row['Shipping Note'] || ''),
          }
        })).filter(u => u.email);

        const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

        for (const chunk of chunkArray(updates, 250)) {
          const batch = writeBatch(db);
          chunk.forEach(upd => {
            const ref = doc(db, colPath('users'), upd.email);
            batch.set(ref, { adminAssigned: upd.adminAssigned, isPaid: upd.isPaid, address: upd.address }, { merge: true });
          });
          await safeAwait(batch.commit());
        }
        showToast("Successfully pulled and synced from Google Sheets.");
      } else {
        showToast("Error from Sheets: " + result.error);
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to pull. Check URL and permissions.");
    }
    setIsBtnLoading(false);
  };

  const exportCustomersCSVRows = (customers, filenamePrefix = 'BBP_Customers') => {
    const headers = ["Email", "Name", "Handle", "Subtotal USD", "Total USD", "Total PHP", "Proof Link", "Assigned Admin", "Bank Account", "Label Link", "Street", "Barangay", "City", "Province", "Zip", "Contact", "Shipping Option", "Partial Ship", "Is Paid"];
    let csvContent = headers.join(",") + "\n";

    customers.forEach(c => {
      const row = [
        `"${c.email}"`, `"${c.name}"`, `"${c.handle || ''}"`, `"${c.subtotalUSD.toFixed(2)}"`, `"${c.totalUSD.toFixed(2)}"`, `"${c.totalPHP}"`,
        `"${c.proofUrl || ''}"`, `"${c.adminAssigned || ''}"`, `"${c.paymentBankDetails || ''}"`, `"N/A (Generated on Demand)"`,
        `"${c.address?.street || ''}"`, `"${c.address?.brgy || ''}"`, `"${c.address?.city || ''}"`, `"${c.address?.prov || ''}"`,
        `"${c.address?.zip || ''}"`, `"${c.address?.contact || ''}"`, `"${c.address?.shipOpt || ''}"`, `"${getPartialShipPreferenceLabel(c.address?.partialShipPref) || ''}"`, `"${c.isPaid ? 'TRUE' : 'FALSE'}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filenamePrefix}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCustomersCSV = () => {
    exportCustomersCSVRows(customerList);
  };

  const clearActivityLogs = async () => {
    if (!sortedLogs.length) {
      showToast('No activity logs to clear.');
      return;
    }
    if (!window.confirm(`Clear ${sortedLogs.length} visible activity log${sortedLogs.length === 1 ? '' : 's'}?`)) return;

    setIsBtnLoading(true);
    try {
      for (const chunk of chunkArray(sortedLogs, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(log => batch.delete(doc(db, colPath('logs'), log.id)));
        await safeAwait(batch.commit());
      }
      showToast('Activity logs cleared.');
    } catch (error) {
      console.error(error);
      showToast('Could not clear the activity logs.');
    }
    setIsBtnLoading(false);
  };

  const deleteCustomerOrdersFromAdmin = async (customer) => {
    if (!customer?.email) return;

    setIsBtnLoading(true);
    try {
      const toDelete = orders.filter(order => order.email === customer.email);
      const customerProfile = users.find(profile => profile.id === customer.email) || { id: customer.email, name: customer.name || '', handle: customer.handle || '' };
      await createBatchSnapshot('Before admin deleted all order rows', { action: 'delete-all-orders', email: customer.email });
      await createRecycleRecord({
        label: `Deleted all active orders for ${customer.name || customer.email}`,
        recycleType: 'orders',
        ordersSnapshot: toDelete,
        userSnapshot: customerProfile,
        meta: { email: customer.email, name: customer.name || '' }
      });

      for (const chunk of chunkArray(toDelete, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(order => batch.delete(doc(db, colPath('orders'), order.id)));
        await safeAwait(batch.commit());
      }

      await safeAwait(addDoc(collection(db, colPath('logs')), {
        timestamp: Date.now(),
        email: customer.email,
        name: customer.name || '',
        action: 'Deleted All Active Orders',
        details: `Removed ${toDelete.length} row${toDelete.length === 1 ? '' : 's'} from Active Orders.`
      }));

      showToast('Orders deleted and sent to the recycle bin.');
    } catch (error) {
      console.error(error);
      showToast('Could not delete those orders.');
    }
    setIsBtnLoading(false);
  };

  const updateCustomerAdminAssignment = async (customer, adminName) => {
    if (!adminName) return;
    if (settings.paymentsOpen || customer.hasProof || customer.isPaid) {
      showToast("Admin routing is frozen once payment is in progress.");
      return;
    }

    try {
      await safeAwait(setDoc(doc(db, colPath('users'), customer.email), { adminAssigned: adminName, paymentSnapshot: null }, { merge: true }));
    } catch (error) {
      console.error(error);
      showToast("Could not update the assigned admin right now.");
    }
  };

  const assignAdminToCustomers = async (emails, adminName) => {
    if (!adminName) { showToast("Pick an admin first."); return; }
    if (emails.length === 0) { showToast("Select at least one order first."); return; }
    if (settings.paymentsOpen) { showToast("Admin routing is frozen while payments are live."); return; }

    setIsBtnLoading(true);
    try {
      const beforeUsers = users.filter(profile => emails.includes(profile.id));
      await createBatchSnapshot('Before bulk admin assignment', { action: 'bulk-assign-admin', emails, adminName });
      await createUndoRecord({
        actionType: 'bulk-assign-admin',
        label: `Undo admin assignment to ${adminName}`,
        beforeUsers,
        targetEmails: emails,
        meta: { adminName }
      });
      for (const chunk of chunkArray(emails, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(email => {
          batch.set(doc(db, colPath('users'), email), { adminAssigned: adminName, paymentSnapshot: null }, { merge: true });
        });
        await safeAwait(batch.commit());
      }
      setSelectedActiveOrders({});
      showToast(`${emails.length} order${emails.length === 1 ? '' : 's'} assigned to ${adminName}.`);
    } catch (error) {
      console.error(error);
      showToast("Could not assign admin right now.");
    }
    setIsBtnLoading(false);
  };

  const exportRawOrdersCSV = () => {
    const headers = ["Timestamp", "Email", "Name", "Handle", "Product", "Qty"];
    let csvContent = headers.join(",") + "\n";

    const sortedOrders = [...orders].sort((a, b) => a.timestamp - b.timestamp);

    sortedOrders.forEach(o => {
      const dateStr = new Date(o.timestamp).toLocaleString().replace(/,/g, '');
      const row = [
        `"${dateStr}"`, `"${o.email}"`, `"${o.name}"`, `"${o.handle || ''}"`, `"${o.product}"`, `"${o.qty}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BBP_Raw_Orders_Backup_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importCustomersCSV = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const rows = text.split(/\r?\n/);
        if (rows.length < 2) return;

        setIsBtnLoading(true);
        showToast("Syncing database from CSV...");

        const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
        const updates = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i].trim();
          if (!row) continue;
          const cols = parseCSVLine(row);
          if (cols.length >= 17 && cols[0].trim() !== '') {
            const email = cols[0].replace(/^"|"$/g, '').trim().toLowerCase();
            const adminAssigned = cols[7].replace(/^"|"$/g, '').trim();
            const street = cols[10].replace(/^"|"$/g, '').trim();
            const brgy = cols[11].replace(/^"|"$/g, '').trim();
            const city = cols[12].replace(/^"|"$/g, '').trim();
            const prov = cols[13].replace(/^"|"$/g, '').trim();
            const zip = cols[14].replace(/^"|"$/g, '').trim();
            const contact = cols[15].replace(/^"|"$/g, '').trim();
            const shipOpt = cols[16].replace(/^"|"$/g, '').trim();
            const isPaid = cols[17] ? cols[17].replace(/^"|"$/g, '').trim().toUpperCase() === 'TRUE' : false;

            const address = { street, brgy, city, prov, zip, contact, shipOpt };
            updates.push({ email, adminAssigned, isPaid, address });
          }
        }

        for (const chunk of chunkArray(updates, 250)) {
          const batch = writeBatch(db);
          chunk.forEach(upd => {
            const ref = doc(db, colPath('users'), upd.email);
            batch.set(ref, { adminAssigned: upd.adminAssigned, isPaid: upd.isPaid, address: upd.address }, { merge: true });
          });
          await safeAwait(batch.commit());
        }

        showToast("Customers synced successfully.");
      } catch (err) {
        console.error(err);
        showToast("Error syncing customers.");
      }
      setIsBtnLoading(false);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = null;
  };

  async function updateSetting(field, val) {
    const newSettings = { ...settings, [field]: val };
    setSettings(newSettings);
    await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), newSettings));
  }

  async function togglePaymentsWindow() {
    if (settings.paymentsOpen) {
      try {
        const nextSettings = { ...settings, paymentsOpen: false };
        await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), nextSettings));
        setSettings(nextSettings);
        showToast('Payment window closed. Frozen payment routes stay saved for already-routed buyers.');
      } catch (err) {
        console.error(err);
        showToast('Could not close the payment window right now.');
      }
      return;
    }

    const activeCustomers = customerList.filter(c => c.itemCount > 0);
    if (activeCustomers.length === 0) {
      showToast('No active orders to freeze for payment yet.');
      return;
    }

    const invalidCustomer = activeCustomers.find((customer) => {
      if (!customer.hasAssignedAdmin) return true;
      return !getSelectedAdminBankRoute(customer.adminAssigned, customer.email).hasRoute;
    });
    if (invalidCustomer) {
      showToast(`Cannot open payments yet. ${invalidCustomer.name || invalidCustomer.email} needs a stable admin with at least one bank or QR option.`);
      return;
    }

    setIsBtnLoading(true);
    try {
      await createBatchSnapshot('Before payment window opened', { action: 'open-payments' });
      for (const chunk of chunkArray(activeCustomers, 250)) {
        const batch = writeBatch(db);
        chunk.forEach((customer) => {
          const userProfile = users.find(u => u.id === customer.email) || {};
          const shouldPreserveExistingSnapshot = Boolean(userProfile.proofUrl || userProfile.isPaid);
          const paymentSnapshot = shouldPreserveExistingSnapshot && getFrozenPaymentSnapshot(userProfile)
            ? getFrozenPaymentSnapshot(userProfile)
            : buildPaymentSnapshot(customer.products, customer.adminAssigned, customer.email);
          batch.set(doc(db, colPath('users'), customer.email), { paymentSnapshot }, { merge: true });
        });
        await safeAwait(batch.commit());
      }

      const nextSettings = { ...settings, paymentsOpen: true, reviewStageOpen: false };
      await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), nextSettings));
      setSettings(nextSettings);
      showToast('Payment window opened. Totals, assigned admins, and payment routes are now frozen for this batch.');
    } catch (err) {
      console.error(err);
      showToast('Could not freeze payment routes. Payment window stayed closed.');
    }
    setIsBtnLoading(false);
  }

  async function executeTrim(victim) {
    if (!window.confirm(`Are you sure you want to completely CUT ${victim.amountToRemove} vials of ${victim.prod} from ${victim.handle || 'this customer'}?`)) return;
    if (victim.qty === victim.amountToRemove) {
      await safeAwait(deleteDoc(doc(db, colPath('orders'), victim.id)));
    } else {
      await safeAwait(setDoc(doc(db, colPath('orders'), victim.id), { qty: victim.qty - victim.amountToRemove }, { merge: true }));
    }
  }

  async function autoTrimAll() {
    if (!window.confirm('Auto-Trim will reduce or delete loose vials from the bottom up. Proceed?')) return;
    const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    try {
      for (const chunk of chunkArray(trimmingHitList, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(v => {
          if (v.qty === v.amountToRemove) {
            batch.delete(doc(db, colPath('orders'), v.id));
          } else {
            batch.set(doc(db, colPath('orders'), v.id), { qty: v.qty - v.amountToRemove }, { merge: true });
          }
        });
        await safeAwait(batch.commit());
      }
      showToast('Auto-Trim complete.');
    } catch (err) { console.error(err); showToast('Error during auto-trim.'); }
  }

  async function cutAllVisibleHitList() {
    if (!sortedHitList.length) {
      showToast('No visible hit list rows to cut.');
      return;
    }
    if (!window.confirm(`Cut all ${sortedHitList.length} visible hit list row${sortedHitList.length === 1 ? '' : 's'}?`)) return;

    try {
      const affectedOrderIds = new Set(sortedHitList.map(row => row.id));
      const beforeOrders = orders.filter(order => affectedOrderIds.has(order.id));
      const affectedEmails = Array.from(new Set(sortedHitList.map(row => row.email)));
      await createBatchSnapshot('Before bulk hit list cut', { action: 'bulk-cut-hit-list', rows: sortedHitList.length });
      await createUndoRecord({
        actionType: 'bulk-cut-hit-list',
        label: `Undo bulk cut of ${sortedHitList.length} hit list row${sortedHitList.length === 1 ? '' : 's'}`,
        beforeOrders,
        beforeUsers: users.filter(profile => affectedEmails.includes(profile.id)),
        targetEmails: affectedEmails,
        meta: { rows: sortedHitList.length }
      });
      for (const chunk of chunkArray(sortedHitList, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(v => {
          if (v.qty === v.amountToRemove) {
            batch.delete(doc(db, colPath('orders'), v.id));
          } else {
            batch.set(doc(db, colPath('orders'), v.id), { qty: v.qty - v.amountToRemove }, { merge: true });
          }
        });
        await safeAwait(batch.commit());
      }
      showToast('Visible hit list rows cut.');
    } catch (err) {
      console.error(err);
      showToast('Could not cut the visible rows.');
    }
  }

  async function syncCurrentBoxCaps() {
    if (!window.confirm('Set every product so the current box becomes the last allowed box? Empty products will be locked, and active products will stay open only until their current box is filled.')) return;
    let cappedCount = 0;
    let lockedEmptyCount = 0;
    const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    try {
      const updates = enrichedProducts.map(p => {
        const hasDemand = p.totalVials > 0;
        const nextMaxBoxes = hasDemand ? Math.ceil(p.totalVials / SLOTS_PER_BATCH) : 0;
        const nextLocked = !hasDemand;
        const nextSyncCapped = true;
        const changed = (p.maxBoxes || 0) !== nextMaxBoxes || Boolean(p.locked) !== nextLocked;
        return changed ? { id: p.id, nextMaxBoxes, nextLocked, nextSyncCapped, hasDemand } : null;
      }).filter(Boolean);

      for (const chunk of chunkArray(updates, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          batch.set(doc(db, colPath('products'), item.id), { maxBoxes: item.nextMaxBoxes, locked: item.nextLocked, syncCapped: item.nextSyncCapped }, { merge: true });
          if (item.hasDemand) cappedCount++;
          else lockedEmptyCount++;
        });
        await safeAwait(batch.commit());
      }

      showToast(
        updates.length > 0
          ? `Box caps synced. ${cappedCount} active products capped, ${lockedEmptyCount} empty products locked.`
          : 'Box caps already match the current orders.'
      );
    } catch (err) { console.error(err); showToast('Error syncing box caps.'); }
  }

  async function clearSyncedCaps() {
    if (!window.confirm('Clear synced caps only? This will remove sync-created caps and reopen products that were only locked by sync. Manual caps will stay untouched.')) return;
    const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    const taggedProducts = enrichedProducts.filter(p => p.syncCapped);
    let reopenedCount = 0;

    try {
      for (const chunk of chunkArray(taggedProducts, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(product => {
          batch.set(doc(db, colPath('products'), product.id), { maxBoxes: 0, locked: false, syncCapped: false }, { merge: true });
          reopenedCount++;
        });
        await safeAwait(batch.commit());
      }

      showToast(
        reopenedCount > 0
          ? `Cleared synced caps from ${reopenedCount} products.`
          : 'No synced caps are currently tagged.'
      );
    } catch (err) {
      console.error(err);
      showToast('Error clearing synced caps.');
    }
  }

  async function handleInventoryAvailability(product) {
    try {
      if (product.locked) {
        const unlockPayload = (product.maxBoxes || 0) > 0
          ? { locked: false, maxBoxes: 0, syncCapped: false }
          : { locked: false, syncCapped: false };
        await safeAwait(setDoc(doc(db, colPath('products'), product.id), unlockPayload, { merge: true }));
        showToast((product.maxBoxes || 0) > 0 ? `${product.name} reopened and uncapped.` : `${product.name} reopened.`);
        return;
      }

      if ((product.maxBoxes || 0) > 0) {
        await safeAwait(setDoc(doc(db, colPath('products'), product.id), { maxBoxes: 0, locked: false, syncCapped: false }, { merge: true }));
        showToast(`${product.name} cap removed. Buyers can keep adding beyond the synced box limit.`);
        return;
      }

      await safeAwait(setDoc(doc(db, colPath('products'), product.id), { locked: true, syncCapped: false }, { merge: true }));
      showToast(`${product.name} locked.`);
    } catch (err) {
      console.error(err);
      showToast('Error updating product availability.');
    }
  }

  async function handleManualMaxBoxesChange(product, nextValue) {
    try {
      await safeAwait(setDoc(doc(db, colPath('products'), product.id), { maxBoxes: nextValue, syncCapped: false }, { merge: true }));
    } catch (err) {
      console.error(err);
      showToast('Error updating max boxes.');
    }
  }

  async function resetSystem() {
    if (!window.confirm('RESET SYSTEM: This will archive all current orders into History and clear the board. Proceed?')) return;
    setIsBtnLoading(true);
    showToast('Archiving and resetting...');
    try {
      await createBatchSnapshot('Before system reset', { action: 'reset-system' });
      const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

      for (const chunk of chunkArray(orders, 200)) {
        const batch = writeBatch(db);
        chunk.forEach(o => {
          const histRef = doc(collection(db, colPath('history')));
          batch.set(histRef, { ...o, batchName: settings.batchName, archivedAt: Date.now() });
          batch.delete(doc(db, colPath('orders'), o.id));
        });
        await safeAwait(batch.commit());
      }

      for (const chunk of chunkArray(users, 400)) {
        const batch = writeBatch(db);
        chunk.forEach(u => batch.set(doc(db, colPath('users'), u.id), { isPaid: false, proofUrl: null, proofReview: '', paymentSnapshot: null, paymentSubmittedAt: null }, { merge: true }));
        await safeAwait(batch.commit());
      }

      for (const chunk of chunkArray(products, 400)) {
        const batch = writeBatch(db);
        chunk.forEach(p => batch.set(doc(db, colPath('products'), p.id), { locked: false, maxBoxes: 0, syncCapped: false }, { merge: true }));
        await safeAwait(batch.commit());
      }

      await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), { ...settings, paymentsOpen: false, reviewStageOpen: false, addOnly: false, storeOpen: true }));
      showToast('System reset and archived.');
    } catch (err) { console.error(err); showToast(`Error resetting system: ${err.message}`); }
    setIsBtnLoading(false);
  }

  async function seedDemoData() {
    setIsBtnLoading(true);
    showToast("Starting seed process...");
    try {
      await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), settings));
      const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

      const fullProductList = WIKI_DATA.map(w => ({ name: w.name, kit: 100, vial: 10 }));

      for (const chunk of chunkArray(products, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(p => batch.delete(doc(db, colPath('products'), p.id)));
        await safeAwait(batch.commit());
      }

      for (const chunk of chunkArray(fullProductList, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const ref = doc(collection(db, colPath('products')));
          batch.set(ref, { name: item.name, pricePerKitUSD: item.kit, pricePerVialUSD: item.vial, locked: false, maxBoxes: 0 });
        });
        await safeAwait(batch.commit());
      }

      for (const chunk of chunkArray(orders, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(o => batch.delete(doc(db, colPath('orders'), o.id)));
        await safeAwait(batch.commit());
      }

      const MOCK_ORDERS = [
        { email: 'nglln.sdr25@gmail.com', name: 'Angelyn Dela Rosa', handle: 'looms', product: 'Retatrutide', qty: 5 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'BPC-157', qty: 90 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'Tirzepatide', qty: 10 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'Semaglutide', qty: 20 },
        { email: 'gaizelanne.ella@gmail.com', name: 'Gaizel Anne Ella', handle: '@ms.gie28', product: 'GHK-Cu', qty: 2 },
        { email: 'gaizelanne.ella@gmail.com', name: 'Gaizel Anne Ella', handle: '@ms.gie28', product: 'L-Carnitine', qty: 2 },
        { email: 'gaizelanne.ella@gmail.com', name: 'Gaizel Anne Ella', handle: '@ms.gie28', product: 'Retatrutide', qty: 2 },
        { email: 'hazel.cabundoc@gmail.com', name: 'Love Cabundoc', handle: 'LOVE / ILYLOVEC', product: 'NAD+', qty: 10 },
        { email: 'hazel.cabundoc@gmail.com', name: 'Love Cabundoc', handle: 'LOVE / ILYLOVEC', product: 'Tirzepatide', qty: 6 },
        { email: 'marieletish@gmail.com', name: 'Let Miranda', handle: 'heyyy.ish', product: 'Cagrilintide', qty: 2 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: '5-amino-1mq', qty: 5 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'AOD 9604', qty: 5 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'Glutathione', qty: 2 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'KPV', qty: 3 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'PT-141 (Bremelanotide)', qty: 2 }
      ];

      for (const chunk of chunkArray(MOCK_ORDERS, 150)) {
        const batch = writeBatch(db);
        chunk.forEach(o => {
          let assignedAdmin = normalizedAdmins[Math.floor(Math.random() * normalizedAdmins.length)]?.name || "Admin";
          batch.set(doc(db, colPath('users'), o.email.toLowerCase()), {
            name: o.name, handle: o.handle, adminAssigned: assignedAdmin,
            address: { shipOpt: 'Lalamove', street: '123 Test St', city: 'Makati', prov: 'Metro Manila', zip: '1200', contact: '09171234567' }
          }, { merge: true });
          batch.set(doc(collection(db, colPath('orders'))), {
            email: o.email.toLowerCase(), name: o.name, handle: o.handle, product: o.product, qty: o.qty, timestamp: Date.now()
          });
        });
        await safeAwait(batch.commit());
      }

      showToast("Products and orders seeded.");
    } catch (err) {
      console.error(err);
      showToast(`Error seeding: ${err.message}`);
    }
    setIsBtnLoading(false);
  }

  function downloadCSVTemplate() {
    const headers = "Peptide Name,CODE,Price per KIT(USD),Price per vial (USD)\n";
    const sampleRow1 = "5-amino-1mq 5mg,5AM,60.00,6.00\n";
    const sampleRow2 = "BPC157 10mg,BC10,70.00,7.00\n";
    const blob = new Blob([headers + sampleRow1 + sampleRow2], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'BBP_Products_Template.csv');
    a.click();
  }

  async function handleFileUpload(e) {
    try {
      const file = e.target?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const rows = text.split(/\r?\n/);
          const newProducts = [];

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i].trim();
            if (!row) continue;

            const cols = parseCSVLine(row);

            if (cols.length >= 4 && cols[0].trim() !== '') {
              const name = cols[0].replace(/^"|"$/g, '').trim();
              const kitPriceRaw = cols[2].replace(/[^0-9.]/g, '');
              const vialPriceRaw = cols[3].replace(/[^0-9.]/g, '');

              let kit = parseFloat(kitPriceRaw) || 0;
              let vial = parseFloat(vialPriceRaw) || 0;

              if (kit === 0 && vial > 0) kit = vial * 10;
              if (vial === 0 && kit > 0) vial = kit / 10;

              newProducts.push({ name, pricePerKitUSD: kit, pricePerVialUSD: vial, locked: false, maxBoxes: 0 });
            }
          }

          if (newProducts.length > 0) {
            setIsBtnLoading(true);
            showToast("Uploading CSV...");

            const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

            for (const chunk of chunkArray(products, 250)) {
              const batch = writeBatch(db);
              chunk.forEach(p => batch.delete(doc(db, colPath('products'), p.id)));
              await safeAwait(batch.commit());
            }

            for (const chunk of chunkArray(newProducts, 250)) {
              const batch = writeBatch(db);
              chunk.forEach(p => {
                const ref = doc(collection(db, colPath('products')));
                batch.set(ref, p);
              });
              await safeAwait(batch.commit());
            }
            showToast(`Imported ${newProducts.length} products successfully.`);
            setIsBtnLoading(false);
          } else {
            showToast("No valid products found in CSV. Check your columns.");
          }
        } catch (err) {
          console.error(err);
          showToast(`Error saving products: ${err.message}`);
          setIsBtnLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      showToast("Error reading file");
    }
    if (e.target) e.target.value = null;
  }

  async function handleAddProduct() {
    if (!newProd.name || !newProd.vial) { showToast('Enter name and vial price!'); return; }
    await safeAwait(addDoc(collection(db, colPath('products')), {
      name: newProd.name,
      pricePerKitUSD: Number(newProd.kit) || (Number(newProd.vial) * 10),
      pricePerVialUSD: Number(newProd.vial),
      locked: false,
      maxBoxes: Number(newProd.max) || 0
    }));
    setNewProd({ name: '', kit: '', vial: '', max: '' });
    showToast('Product added.');
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.name) { showToast('Enter an Admin Name!'); return; }

    setIsBtnLoading(true);
    showToast('Saving admin and uploading QRs...');

    try {
      const uploadedBanks = await Promise.all(newAdmin.banks.map(async (b) => {
        let qrUrl = '';
        if (b.qrFile) {
          const fileExt = b.qrFile.name.split('.').pop();
          const fileName = `qr_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const sRefPath = isCanvas ? `artifacts/${appId}/public/qrs/${fileName}` : `qrs/${fileName}`;
          const sRef = storageRef(storage, sRefPath);
          await uploadBytesResumable(sRef, b.qrFile);
          qrUrl = await getDownloadURL(sRef);
        }
        return { details: b.details, qr: qrUrl };
      }));

      const validBanks = uploadedBanks.filter(b => b.details || b.qr);

      const updatedAdmins = [...normalizedAdmins, {
        name: newAdmin.name,
        banks: validBanks
      }];

      await updateSetting('admins', updatedAdmins);
      setNewAdmin({ name: '', banks: [{ details: '', qrFile: null }] });
      showToast('Admin added successfully.');
    } catch (err) {
      console.error(err);
      showToast('Error adding admin: ' + err.message);
    }
    setIsBtnLoading(false);
  };

  const reshuffleAdmins = async () => {
    // ... Function body not provided in original, kept to suppress errors if called ...
  };

  // âœ¨ NEW: Inline Admin Edit Logic
  const openAdminEditModal = (email) => {
    const userOrders = orders.filter(o => o.email === email);
    const initialCart = {};
    userOrders.forEach(o => {
      if (!initialCart[o.product]) initialCart[o.product] = 0;
      initialCart[o.product] += o.qty;
    });
    setAdminCart(initialCart);
    setAdminOrderEditTarget(email);
  };

  const handleAdminCartChange = (prod, qty) => {
    setAdminCart(prev => ({ ...prev, [prod]: parseInt(qty) || 0 }));
  };

  const saveAdminOrderEdit = async () => {
    setIsBtnLoading(true);
    try {
      const targetEmail = adminOrderEditTarget;
      const targetProfile = users.find(u => u.id === targetEmail) || {};

      const oldOrders = orders.filter(o => o.email === targetEmail);
      await createBatchSnapshot('Before admin cart edit', { action: 'admin-edit-cart', email: targetEmail });
      await createUndoRecord({
        actionType: 'admin-edit-cart',
        label: `Undo admin cart edit for ${targetProfile.name || targetEmail}`,
        beforeOrders: oldOrders,
        beforeUsers: [targetProfile],
        targetEmails: [targetEmail],
        replaceCustomerOrders: true,
        meta: { email: targetEmail, name: targetProfile.name || '' }
      });
      for (const chunk of chunkArray(oldOrders, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(o => batch.delete(doc(db, colPath('orders'), o.id)));
        await safeAwait(batch.commit());
      }

      const newOrders = [];
      const timestamp = Date.now();

      Object.entries(adminCart).forEach(([prod, qty]) => {
        if (qty > 0) {
          newOrders.push({ email: targetEmail, name: targetProfile.name || 'Unknown', handle: targetProfile.handle || '', product: prod, qty, timestamp });
        }
      });

      for (const chunk of chunkArray(newOrders, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(item => {
          const ref = doc(collection(db, colPath('orders')));
          batch.set(ref, item);
        });
        await safeAwait(batch.commit());
      }

      const nextItems = {};
      newOrders.forEach(item => {
        nextItems[item.product] = (nextItems[item.product] || 0) + item.qty;
      });
      const existingSnapshot = getFrozenPaymentSnapshot(targetProfile);
      const nextSnapshot = settings.paymentsOpen
        ? (() => {
          const rebuilt = buildPaymentSnapshot(nextItems, existingSnapshot?.adminAssigned || targetProfile.adminAssigned, targetEmail);
          if (!existingSnapshot) return rebuilt;
          return {
            ...rebuilt,
            adminAssigned: existingSnapshot.adminAssigned,
            bankIndex: existingSnapshot.bankIndex,
            bankDetails: existingSnapshot.bankDetails,
            bankQr: existingSnapshot.bankQr
          };
        })()
        : null;

      await safeAwait(setDoc(doc(db, colPath('users'), targetEmail), {
        paymentSnapshot: nextSnapshot,
        proofReview: '',
        proofUrl: null,
        isPaid: false,
        paymentSubmittedAt: null,
        buyerReviewConfirmedAt: null
      }, { merge: true }));

      await safeAwait(addDoc(collection(db, colPath('logs')), { timestamp: Date.now(), email: targetEmail, name: targetProfile.name || 'Unknown', action: "Admin Edited Order", details: `Cart updated via Admin Panel` }));

      showToast("Admin order update saved.");
      setAdminOrderEditTarget(null);
    } catch (err) {
      console.error(err);
      showToast("Error updating order.");
    }
    setIsBtnLoading(false);
  };


  // --- STYLES ---
  const originalInput = "w-full bg-[#FFF0F5] border-2 border-[#FFC0CB] rounded-2xl px-4 py-3 outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100 font-bold text-[#4A042A] text-sm shadow-inner placeholder:text-pink-300";
  const lockedAdminInput = `${originalInput} disabled:cursor-not-allowed disabled:opacity-60`;
  const customerFormInput = "w-full bg-white border-2 border-[#FFC0CB] rounded-2xl px-4 py-3 text-sm font-bold text-[#4A042A] outline-none shadow-[0_10px_24px_rgba(214,0,110,0.08)] transition-all duration-300 placeholder:text-pink-300 focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100 disabled:border-pink-100 disabled:bg-[#FFF7FA] disabled:text-[#9E2A5E] disabled:shadow-none disabled:cursor-not-allowed";
  const adminInputSm = "w-full bg-[#FFF0F5] border-2 border-[#FFC0CB] rounded-xl px-3 py-1.5 text-sm sm:text-xs outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100 font-bold text-[#4A042A]";
  const originalBtn = "bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white font-black px-6 py-2.5 rounded-full shadow-[0_16px_34px_rgba(255,20,147,0.22)] uppercase tracking-[0.16em] hover:translate-y-[-1px] hover:shadow-[0_20px_38px_rgba(255,20,147,0.26)] transition-all text-sm";

  // --- PREPARE DATA ---
  const userOrders = orders.filter(o => o.email === customerEmail.toLowerCase().trim());
  const existingMap = {};
  userOrders.forEach(o => { existingMap[o.product] = (existingMap[o.product] || 0) + o.qty; });

  const finalItems = {};
  if (settings.paymentsOpen || settings.storeOpen === false) {
    Object.assign(finalItems, existingMap);
  } else {
    Object.entries(cartItems).forEach(([p, a]) => {
      const q = a.v || 0;
      if (q > 0) finalItems[p] = q;
    });
  }

  let subtotalUSD = 0;
  const cartList = [];

  Object.entries(finalItems).forEach(([prod, qty]) => {
    const pData = products.find(p => p.name === prod);
    if (pData && qty > 0) {
      subtotalUSD += qty * pData.pricePerVialUSD;
      cartList.push({ product: prod, qty, price: pData.pricePerVialUSD, total: qty * pData.pricePerVialUSD });
    }
  });

  const currentCustomerRecord = customerList.find(c => c.email === customerEmail.toLowerCase().trim()) || null;
  const currentProfile = users.find(u => u.id === customerEmail.toLowerCase().trim()) || null;
  const currentBuyerReviewConfirmedAt = currentCustomerRecord?.buyerReviewConfirmedAt || null;
  const currentReviewReady = Boolean(currentCustomerRecord?.reviewReady);
  const lockedPaymentSnapshot = currentCustomerRecord?.paymentSnapshot || getFrozenPaymentSnapshot(currentProfile);
  const currentPaymentRoute = lockedPaymentSnapshot
    ? {
      adminAssigned: lockedPaymentSnapshot.adminAssigned || currentCustomerRecord?.adminAssigned || currentProfile?.adminAssigned || 'Admin',
      bankDetails: lockedPaymentSnapshot.bankDetails || '',
      bankQr: lockedPaymentSnapshot.bankQr || '',
      hasRoute: Boolean(lockedPaymentSnapshot.bankDetails || lockedPaymentSnapshot.bankQr)
    }
    : getSelectedAdminBankRoute(currentCustomerRecord?.adminAssigned || currentProfile?.adminAssigned, customerEmail);
  const totalPHP = lockedPaymentSnapshot?.totalPHP ?? ((subtotalUSD > 0 && settings.fxRate > 0 ? subtotalUSD + (settings.adminFeePhp / settings.fxRate) : 0) * settings.fxRate);
  const selectedVialCount = cartList.reduce((sum, item) => sum + item.qty, 0);
  const availableCatalogCount = filteredShopProducts.filter(p => !p.isClosed).length;
  const nearlyFullCount = filteredShopProducts.filter(p => !p.isClosed && p.slotsLeft > 0 && p.slotsLeft <= 3).length;
  const syncedCapCount = enrichedProducts.filter(p => p.syncCapped).length;
  const currentBatchOpenLines = enrichedProducts.filter(p => !p.isClosed).length;
  const currentBatchFillingLines = enrichedProducts.filter(p => !p.isClosed && Number(p.totalVials || 0) > 0).length;
  const currentBatchProtectedKits = enrichedProducts.reduce((sum, product) => sum + Number(product.boxes || 0), 0);
  const currentBatchOpenSpots = enrichedProducts
    .filter(p => !p.isClosed && p.totalVials > 0 && p.slotsLeft > 0)
    .reduce((sum, product) => sum + Number(product.slotsLeft || 0), 0);
  const inventoryFilterOptions = [
    { id: 'all', label: 'All' },
    { id: 'open', label: 'Open' },
    { id: 'capped', label: 'Capped' },
    { id: 'locked', label: 'Locked' },
    { id: 'filling', label: 'Filling' },
    { id: 'new', label: 'New Batch' }
  ];
  const inventorySortOptions = [
    { id: 'name', label: 'A-Z' },
    { id: 'attention', label: 'Needs Attention' },
    { id: 'slots-left', label: 'Fewest Slots Left' },
    { id: 'most-filled', label: 'Most Filled' },
    { id: 'capped-first', label: 'Capped First' },
    { id: 'locked-first', label: 'Locked First' }
  ];
  const activeOrdersFilterOptions = [
    { id: 'all', label: 'All', count: activeOrdersSummary.total },
    { id: 'unpaid', label: 'Unpaid', count: activeOrdersSummary.unpaid },
    { id: 'no-address', label: 'No Address', count: activeOrdersSummary.missingAddress },
    { id: 'no-admin', label: 'No Admin', count: activeOrdersSummary.unassignedAdmin },
    { id: 'has-proof', label: 'Has Proof', count: customerList.filter(c => c.hasProof).length },
    { id: 'ready', label: 'Ready', count: activeOrdersSummary.ready },
    { id: 'review-pending', label: 'Need Buyer Check', count: activeOrdersSummary.reviewPending },
    { id: 'buyer-review', label: 'Buyer Review', count: activeOrdersSummary.buyerReview },
    { id: 'review-ready', label: 'Buyer Confirmed', count: activeOrdersSummary.reviewReady },
    { id: 'high-total', label: 'High Total', count: customerList.filter(c => c.totalPHP >= 10000).length }
  ];
  const activeOrdersSortOptions = [
    { id: 'highest-total', label: 'Highest Total' },
    { id: 'newest', label: 'Newest' },
    { id: 'unpaid-first', label: 'Unpaid First' },
    { id: 'missing-address', label: 'Missing Address' },
    { id: 'unassigned-admin', label: 'No Admin First' },
    { id: 'most-items', label: 'Most Items' }
  ];
  const liveResultsLabel = filteredShopProducts.length === 1 ? '1 product' : `${filteredShopProducts.length} products`;
  const isStoreClosed = settings.storeOpen === false;
  const isShopAccessLocked = requiresShopAccessCode && !hasShopAccess;
  const isReviewStageOpen = Boolean(settings.reviewStageOpen) && !settings.paymentsOpen;
  const canBypassShopGate = isReviewStageOpen || settings.paymentsOpen;
  const showShopAccessGate = isShopAccessLocked && !canBypassShopGate;
  const showCatalogReference = !settings.paymentsOpen && (!isReviewStageOpen || hasShopAccess);
  const isOrderOnlyMode = settings.paymentsOpen || (isReviewStageOpen && !hasShopAccess);
  const hasExistingOrder = Object.keys(existingMap).length > 0;
  const isCartEditable = !settings.paymentsOpen && !settings.reviewStageOpen && settings.storeOpen !== false;
  const isHitListSaveReady = Boolean(
    customerName.trim() &&
    customerEmail.trim() &&
    customerEmailConfirm.trim() &&
    customerEmail.toLowerCase().trim() === customerEmailConfirm.toLowerCase().trim()
  );
  const isHeroCartCompact = !isStoreClosed && isHeroInView;
  const shopDesktopLayoutClass = 'flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_252px] xl:grid-cols-[minmax(0,1fr)_284px] gap-4 xl:gap-5 items-start';
  const desktopCartAsideClass = 'hidden lg:block sticky top-6 w-full self-start overflow-visible';
  const desktopCartShellClass = `shop-surface rounded-[30px] shadow-xl transition-all duration-300 ease-out ${isHeroCartCompact ? 'w-full p-5' : 'w-full lg:w-[328px] xl:w-[372px] p-6'}`;
  const desktopCartTitleClass = isHeroCartCompact
    ? 'brand-title mt-2 text-[1.45rem] leading-[0.98] text-[#D6006E] transition-all duration-300'
    : 'brand-title mt-2 text-[1.65rem] leading-[0.95] text-[#D6006E] transition-all duration-300';
  const heroPrimaryCtaLabel = settings.paymentsOpen
    ? 'Find My Order'
    : isReviewStageOpen
      ? 'Review My Order'
      : 'Start Order';
  const heroIntroCopy = settings.paymentsOpen
    ? 'Load your saved order with the same email, confirm the total, and upload payment proof here.'
    : isReviewStageOpen
      ? 'Review your saved order with the same email before payments open. Shopping is paused during this check window.'
      : 'Save your order, protect full kits, and come back with the same email when the payment window opens.';
  const orderCardEyebrow = settings.paymentsOpen
    ? 'Payment lookup'
    : isReviewStageOpen
      ? 'Review lookup'
      : settings.addOnly
        ? 'Add-only protection'
        : hasExistingOrder
          ? 'Current order loaded'
          : 'Order details';
  const orderCardTitle = settings.paymentsOpen
    ? (hasExistingOrder ? 'Complete your payment' : 'Find your saved order')
    : isReviewStageOpen
      ? (hasExistingOrder ? 'Review your order' : 'Find your saved order')
      : hasExistingOrder
        ? 'Update your order'
        : 'Start your order';
  const orderCardDescription = settings.paymentsOpen
    ? 'Use the same email from your saved order so the final total, route, and proof upload can load below.'
    : isReviewStageOpen
      ? 'Review stage is live. Buyer edits are frozen so everyone can check saved orders before payments open.'
      : settings.addOnly
        ? 'Your old numbers stay protected. You can add more, but you cannot reduce them.'
        : hasExistingOrder
          ? 'Your saved order is loaded below. Adjust what you need, then save.'
          : 'Enter your details, then choose your vial totals below.';
  const orderCardFlowLabel = settings.paymentsOpen ? 'Payments are open' : isReviewStageOpen ? 'Review stage live' : 'Ready to order';
  const orderCardFlowCopy = settings.paymentsOpen
    ? 'Your saved items are locked in. Use your email below to continue.'
    : isReviewStageOpen
      ? 'Saved orders are frozen so everyone can double-check what looks good before payments open.'
      : hasExistingOrder
      ? 'Your order is loaded. Update counts, then save.'
      : 'Choose vial totals, review the cart, and save.';
  const orderCardProfileCopy = customerProfile?.address?.street
    ? `Shipping set to ${customerProfile.address.city}.`
    : 'Address saves securely after payment.';
  const orderCardProtectionCopy = settings.addOnly
    ? 'Only increases are allowed right now so loose kits do not get worse.'
    : 'Every 10 vials makes 1 protected kit.';
  const orderCardStatus = settings.paymentsOpen
    ? 'Payments open'
    : isReviewStageOpen
      ? 'Review stage'
    : settings.addOnly
      ? 'Add-only mode'
      : hasExistingOrder
        ? 'Saved order'
        : 'New order';
  const getCustomerFormInputClass = (field) => [
    customerFormInput,
    shakingField === field ? 'animate-shake border-red-500 bg-red-50 text-red-700 placeholder:text-red-300' : ''
  ].filter(Boolean).join(' ');
  const selectedActiveOrderEmails = Object.keys(selectedActiveOrders).filter(email => selectedActiveOrders[email]);
  const areAllVisibleActiveOrdersSelected = activeOrdersList.length > 0 && activeOrdersList.every(c => selectedActiveOrders[c.email]);
  const availableUndoRecords = safetyRecords.filter(record => record.kind === 'undo' && record.status === 'available');
  const recycleBinRecords = safetyRecords.filter(record => record.kind === 'recycle');
  const snapshotRecords = safetyRecords.filter(record => record.kind === 'snapshot');
  const safetySummary = {
    undo: availableUndoRecords.length,
    recycle: recycleBinRecords.filter(record => record.status === 'available').length,
    snapshots: snapshotRecords.length,
    proofs: recycleBinRecords.filter(record => record.recycleType === 'proof').length
  };
  const renderAdminToggle = ({ label, description, active, activeText, inactiveText, onToggle, activeTone, inactiveTone }) => {
    const tone = active ? activeTone : inactiveTone;
    const statusText = active ? activeText : inactiveText;

    return (
      <div className={`rounded-2xl border p-4 transition-colors ${tone.panel}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-black text-[#4A042A]">{label}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 leading-relaxed">{description}</p>
            <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${tone.badge}`}>
              {statusText}
            </span>
          </div>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={active}
            className={`relative inline-flex h-8 w-14 shrink-0 rounded-full border-2 transition-all ${tone.track}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${active ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>
    );
  };

  const renderInventoryStatusBadge = (product) => {
    let label = product.statusText;
    let tone = 'border-emerald-200 bg-emerald-50 text-emerald-700';

    if (product.statusText === 'Payments Open') {
      label = 'Payments Live';
      tone = 'border-amber-200 bg-amber-50 text-amber-700';
    } else if (product.statusText === 'Limit Reached') {
      label = 'Cap Reached';
      tone = 'border-rose-200 bg-rose-50 text-rose-600';
    } else if (product.statusText === 'Locked') {
      tone = 'border-slate-200 bg-slate-100 text-slate-600';
    } else if (product.statusText === 'New Batch') {
      tone = 'border-violet-200 bg-violet-50 text-violet-600';
    } else if (product.statusText === 'Next Box Open') {
      label = 'Box Full';
      tone = 'border-sky-200 bg-sky-50 text-sky-600';
    }

    return (
      <span className={`inline-flex min-w-[112px] items-center justify-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${tone}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
        <span>{label}</span>
      </span>
    );
  };

  const renderInventoryCapSource = (product) => {
    if (!product.syncCapped && !(product.maxBoxes > 0)) return null;
    const tone = product.syncCapped
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-sky-200 bg-sky-50 text-sky-700';

    return (
      <span className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${tone}`}>
        {product.syncCapped ? 'Synced' : 'Manual'}
      </span>
    );
  };

  const getInventoryRowTone = (product) => {
    if (product.locked && product.totalVials === 0) return 'bg-slate-50/80 text-slate-500';
    if (product.statusKey === 'full') return 'bg-rose-50/55';
    if (!product.isClosed && product.totalVials > 0 && product.slotsLeft > 0) return 'bg-amber-50/45';
    if (!product.isClosed && product.totalVials > 0 && product.slotsLeft === 0) return 'bg-emerald-50/40';
    return 'bg-white';
  };

  const getActiveOrderRowTone = (customer) => {
    if (customer.statusKey === 'needs-changes') return 'bg-rose-50/60';
    if (customer.statusKey === 'review-pending') return 'bg-sky-50/55';
    if (customer.statusKey === 'buyer-review') return 'bg-amber-50/55';
    if (customer.statusKey === 'review-ready') return 'bg-emerald-50/45';
    if (customer.statusKey === 'needs-address') return 'bg-rose-50/55';
    if (customer.statusKey === 'needs-admin') return 'bg-sky-50/60';
    if (customer.statusKey === 'waiting-payment') return 'bg-amber-50/55';
    if (customer.statusKey === 'proof-sent') return 'bg-violet-50/55';
    if (customer.statusKey === 'ready') return 'bg-emerald-50/40';
    return 'bg-white';
  };

  const getPaymentRowTone = (customer) => {
    if (customer.paymentStatusKey === 'needs-recheck') return 'bg-rose-50/60';
    if (customer.paymentStatusKey === 'proof-sent') return 'bg-violet-50/55';
    if (customer.paymentStatusKey === 'waiting-payment') return 'bg-amber-50/55';
    if (customer.paymentStatusKey === 'needs-address') return 'bg-rose-50/45';
    if (customer.paymentStatusKey === 'needs-admin') return 'bg-sky-50/55';
    if (customer.paymentStatusKey === 'ready') return 'bg-emerald-50/40';
    return 'bg-white';
  };

  const renderSortableHeader = (label, key, sortState, setSortState, className = '') => {
    const isActive = sortState.key === key;
    const arrow = !isActive ? '↕' : sortState.direction === 'asc' ? '↑' : '↓';

    return (
      <th className={className}>
        <button
          type="button"
          onClick={() => setSortState(prev => getNextTableSort(prev, key))}
          className="inline-flex items-center gap-1 font-inherit uppercase tracking-widest"
        >
          <span>{label}</span>
          <span className={`text-[10px] ${isActive ? 'text-[#D6006E]' : 'text-slate-300'}`}>{arrow}</span>
        </button>
      </th>
    );
  };

  const renderCompactAdminStat = (label, value, tone = 'pink', hint = '') => {
    const tones = {
      pink: 'border-pink-100 bg-white text-[#D6006E]',
      blue: 'border-sky-100 bg-sky-50/70 text-sky-700',
      emerald: 'border-emerald-100 bg-emerald-50/70 text-emerald-700',
      amber: 'border-amber-100 bg-amber-50/70 text-amber-700',
      slate: 'border-slate-200 bg-slate-50/80 text-slate-700',
      rose: 'border-rose-100 bg-rose-50/70 text-rose-700',
      violet: 'border-violet-100 bg-violet-50/70 text-violet-700'
    };

    return (
      <div className={`rounded-[20px] border px-4 py-3 shadow-sm ${tones[tone] || tones.pink}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-75">{label}</p>
        <p className="mt-1 text-lg font-black leading-none">{value}</p>
        {hint ? <p className="mt-1 text-[10px] font-bold opacity-70">{hint}</p> : null}
      </div>
    );
  };

  const renderAuditDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-violet-100 bg-white px-4 py-3 text-left shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">Proof Submitted</p>
          <p className="mt-1 text-2xl font-black text-violet-700">₱{paymentAuditSummary.proofSubmittedPHP.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{paymentAuditSummary.proofSubmittedCount} with proof</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-white px-4 py-3 text-left shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Pending Review</p>
          <p className="mt-1 text-2xl font-black text-rose-700">₱{paymentAuditSummary.pendingReviewPHP.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{paymentAuditSummary.pendingReviewCount} awaiting admin action</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Still No Proof</p>
          <p className="mt-1 text-2xl font-black text-slate-700">₱{paymentAuditSummary.noProofPHP.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{paymentAuditSummary.noProofCount} still unpaid</p>
        </div>
      </div>

      <div className="bg-white rounded-[24px] border-2 border-pink-50 p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Audit Queue</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Use this when a bank total does not match. It groups the exact buyers still affecting each admin balance.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {paymentAuditByAdmin.map((admin) => {
            const visibleFlags = admin.flaggedBuyers
              .sort((left, right) => {
                const rank = (buyer) => {
                  if (buyer.flags.includes('Needs recheck')) return 0;
                  if (buyer.flags.includes('Pending review')) return 1;
                  if (buyer.flags.includes('No proof')) return 2;
                  if (buyer.flags.includes('Missing address')) return 3;
                  if (buyer.flags.includes('Needs admin')) return 4;
                  return 5;
                };
                return rank(left) - rank(right) || right.totalPHP - left.totalPHP || right.latestTimestamp - left.latestTimestamp;
              })
              .slice(0, 6);

            return (
              <div key={`audit-${admin.admin}`} className="rounded-[24px] border border-pink-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#4A042A]">{admin.admin}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{admin.buyers.length} buyer{admin.buyers.length === 1 ? '' : 's'} in this route</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPaymentFilterAdmin(admin.admin); setAdminTab('payments'); }}
                    className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-pink-600 transition-colors hover:border-pink-300"
                  >
                    Open in Payments
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {renderCompactAdminStat('Expected', `₱${admin.expectedPHP.toLocaleString()}`, 'pink', 'Target for this admin')}
                  {renderCompactAdminStat('Proofs In', `₱${admin.proofSubmittedPHP.toLocaleString()}`, 'violet', `${admin.buyers.filter(b => b.hasProof).length} submitted`)}
                  {renderCompactAdminStat('Approved', `₱${admin.paidPHP.toLocaleString()}`, 'emerald', `${admin.buyers.filter(b => b.isPaid).length} marked paid`)}
                  {renderCompactAdminStat('Gap', `₱${admin.proofGapPHP.toLocaleString()}`, admin.proofGapPHP > 0 ? 'amber' : 'emerald', admin.proofGapPHP > 0 ? 'Still missing proof' : 'All expected proof submitted')}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-violet-700">
                    ₱{admin.approvalGapPHP.toLocaleString()} awaiting approval
                  </span>
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${admin.flaggedCount > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    {admin.flaggedCount} flagged buyer{admin.flaggedCount === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {visibleFlags.length === 0 ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs font-black text-emerald-700">
                      No open audit flags here. This admin route is fully reconciled inside the app.
                    </div>
                  ) : (
                    visibleFlags.map((buyer) => (
                      <div key={`${admin.admin}-${buyer.email}`} className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-slate-800">{buyer.name}</p>
                            <p className="mt-0.5 text-[10px] font-bold text-slate-400">{buyer.email}</p>
                          </div>
                          <p className="text-sm font-black text-pink-600">₱{buyer.totalPHP.toLocaleString()}</p>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {buyer.flags.map((flag) => (
                            <span key={`${buyer.email}-${flag}`} className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                              flag === 'Needs recheck'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : flag === 'Pending review'
                                  ? 'border-violet-200 bg-violet-50 text-violet-700'
                                  : flag === 'No proof'
                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                    : flag === 'Missing address'
                                      ? 'border-rose-200 bg-rose-50 text-rose-700'
                                      : 'border-sky-200 bg-sky-50 text-sky-700'
                            }`}>
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                  {admin.flaggedBuyers.length > visibleFlags.length && (
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      +{admin.flaggedBuyers.length - visibleFlags.length} more flagged buyer{admin.flaggedBuyers.length - visibleFlags.length === 1 ? '' : 's'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  const renderPaymentsDashboard = () => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button onClick={() => setPaymentViewFilter('all')} className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition-all ${paymentViewFilter === 'all' ? 'border-pink-300 bg-white ring-2 ring-pink-100' : 'border-pink-100 bg-white hover:border-pink-200'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Amount</p>
          <p className="mt-1 text-2xl font-black text-[#D6006E]">₱{paymentSummary.totalExpectedPHP.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{customerList.length} customers</p>
        </button>
        <button onClick={() => setPaymentViewFilter('paid')} className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition-all ${paymentViewFilter === 'paid' ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100' : 'border-emerald-100 bg-white hover:border-emerald-200'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Paid Amount</p>
          <p className="mt-1 text-2xl font-black text-emerald-700">₱{paymentSummary.totalPaidPHP.toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{paymentSummary.paidCount} paid</p>
        </button>
        <button onClick={() => setPaymentViewFilter('unpaid')} className={`rounded-2xl border px-4 py-3 text-left shadow-sm transition-all ${paymentViewFilter === 'unpaid' ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-100' : 'border-amber-100 bg-white hover:border-amber-200'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Unpaid Amount</p>
          <p className="mt-1 text-2xl font-black text-amber-700">₱{(paymentSummary.totalExpectedPHP - paymentSummary.totalPaidPHP).toLocaleString()}</p>
          <p className="mt-1 text-[10px] font-bold text-slate-500">{paymentSummary.unpaidCount} unpaid</p>
        </button>
      </div>

      <div className="bg-white rounded-[24px] border-2 border-pink-50 p-4 shadow-sm space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Admin Breakdown</p>
              <p className="mt-1 text-xs font-bold text-slate-500">Tap an admin to filter the table below.</p>
            </div>
            {paymentFilterAdmin !== 'All' && (
              <button
                type="button"
                onClick={() => setPaymentFilterAdmin('All')}
                className="rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-pink-600 transition-colors hover:border-pink-300"
              >
                Clear Admin Filter
              </button>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {paymentAdminBreakdown.map(admin => {
              const isActive = paymentFilterAdmin === admin.admin;
              return (
                <button
                  key={admin.admin}
                  type="button"
                  onClick={() => setPaymentFilterAdmin(isActive ? 'All' : admin.admin)}
                  className={`rounded-2xl border p-4 text-left shadow-sm transition-all ${isActive ? 'border-pink-300 bg-pink-50 ring-2 ring-pink-100' : 'border-pink-100 bg-white hover:border-pink-200'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[#4A042A]">{admin.admin}</p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {admin.count} orders
                    </span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-[11px] font-bold">
                    <div className="flex items-center justify-between gap-3 text-slate-600">
                      <span>Total</span>
                      <span>₱{admin.expected.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-emerald-600">
                      <span>Paid</span>
                      <span>₱{admin.paid.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-amber-600">
                      <span>Unpaid</span>
                      <span>₱{(admin.expected - admin.paid).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                      {admin.paidCount} paid
                    </span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-700">
                      {admin.unpaidCount} unpaid
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden relative">
          {hoveredProof && (
            <div className="fixed z-[1000] pointer-events-none bg-white p-2 rounded-xl shadow-2xl border-4 border-pink-200"
              style={{ bottom: '40px', right: '40px' }}>
              <img src={hoveredProof} alt="Proof Preview" className="max-w-[350px] max-h-[450px] object-contain rounded-lg" />
              <p className="text-center text-xs font-bold text-pink-500 mt-2">Click to View Full Screen</p>
            </div>
          )}

          <table className="w-full text-left custom-table">
            <thead><tr>{renderSortableHeader('Customer', 'customer', paymentsTableSort, setPaymentsTableSort)}{renderSortableHeader('Assigned Admin', 'admin', paymentsTableSort, setPaymentsTableSort)}{renderSortableHeader('Total PHP', 'totalPHP', paymentsTableSort, setPaymentsTableSort, 'text-right')}{renderSortableHeader('Proof', 'proof', paymentsTableSort, setPaymentsTableSort, 'text-center')}{renderSortableHeader('Label', 'label', paymentsTableSort, setPaymentsTableSort, 'text-center')}{renderSortableHeader('Status', 'status', paymentsTableSort, setPaymentsTableSort)}<th className="text-center">Actions</th></tr></thead>
            <tbody className="divide-y divide-pink-50">
              {sortedPaymentCustomers.map(c => (
                <tr key={c.email} className={`${getPaymentRowTone(c)} transition-colors hover:bg-pink-50/30`}>
                  <td>
                    <button onClick={() => { setSelectedProfileEmail(c.email); setIsEditingAddress(false); }} className="font-bold text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">{c.name}</button>
                    <p className="text-[10px] text-slate-400">{c.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${c.hasAddress ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                        {c.hasAddress ? 'Address OK' : 'Missing Address'}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${c.hasProof ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                        {c.hasProof ? 'Proof On File' : 'No Proof'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col gap-2">
                      <select value={c.hasAssignedAdmin ? c.adminAssigned : ''} onChange={(e) => updateCustomerAdminAssignment(c, e.target.value)} disabled={settings.paymentsOpen || c.hasProof || c.isPaid} className="bg-[#FFF0F5] border border-[#FFC0CB] text-[#D6006E] text-[10px] font-black rounded-xl px-3 py-2 outline-none w-full max-w-[150px] disabled:cursor-not-allowed disabled:opacity-60">
                        <option value="" disabled>Select Admin...</option>
                        {normalizedAdmins.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                      </select>
                      {!c.hasAssignedAdmin && <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">No admin yet</span>}
                    </div>
                  </td>
                  <td className="text-right">
                    <p className="font-black text-pink-600">₱{c.totalPHP.toLocaleString()}</p>
                    <p className="mt-1 text-[10px] font-bold text-slate-400">{c.itemCount} item{c.itemCount === 1 ? '' : 's'}</p>
                  </td>
                  <td className="text-center">
                    {c.proofUrl ? (
                      <div className="flex flex-col items-center gap-1">
                        <button onClick={() => setFullScreenProof(c.proofUrl)}
                          onMouseEnter={() => setHoveredProof(c.proofUrl)}
                          onMouseLeave={() => setHoveredProof(null)}
                          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-violet-700 transition-colors hover:border-violet-300">
                          View
                        </button>
                        <button
                          onClick={() => removeCustomerProof(c)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700 transition-colors hover:border-rose-300"
                        >
                          Remove
                        </button>
                        {c.needsRecheck && <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">Recheck</span>}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">No Proof</span>
                    )}
                  </td>
                  <td className="text-center">
                    {c.readyForLabel ? (
                      <button onClick={() => generateSingleLabel(c)} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700 transition-colors hover:border-[#D6006E] hover:text-[#D6006E]">
                        Print
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[10px] italic">{c.hasAddress ? 'Pay first' : 'Need address'}</span>
                    )}
                  </td>
                  <td>
                    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${c.paymentStatusTone}`}>
                      {c.paymentStatusLabel}
                    </div>
                    <p className="mt-2 max-w-[180px] text-[10px] font-bold leading-relaxed text-slate-500">{c.paymentStatusHint}</p>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-col items-center gap-2">
                      <button
                        onClick={() => safeAwait(setDoc(doc(db, colPath('users'), c.email), { isPaid: !c.isPaid, proofReview: c.isPaid ? c.proofReview : '' }, { merge: true }))}
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors ${c.isPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300'}`}
                      >
                        {c.isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                      </button>
                      {c.hasProof && !c.isPaid && (
                        <button
                          onClick={() => safeAwait(setDoc(doc(db, colPath('users'), c.email), { isPaid: false, proofReview: c.needsRecheck ? '' : 'needs-recheck' }, { merge: true }))}
                          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-colors ${c.needsRecheck ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300' : 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300'}`}
                        >
                          {c.needsRecheck ? 'Clear Recheck' : 'Needs Recheck'}
                        </button>
                      )}
                      {c.hasProof && (
                        <button
                          onClick={() => removeCustomerProof(c)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700 transition-colors hover:border-rose-300"
                        >
                          Remove Proof
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {paymentCustomers.length === 0 && <tr><td colSpan="7" className="text-center p-8 text-pink-300 font-bold italic">No customers found matching filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  // --- RENDER ---
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        
        /* ðŸš€ SCROLL PERFORMANCE FIXES ðŸš€ */
        html { scroll-behavior: smooth; }
        body { 
          -webkit-overflow-scrolling: touch; 
          color: #4A042A;
        }
        body::before {
          content: '';
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background:
            radial-gradient(circle at 12% 12%, rgba(255,255,255,0.94), transparent 22%),
            radial-gradient(circle at 86% 10%, rgba(255,235,245,0.96), transparent 18%),
            radial-gradient(circle at 50% 100%, rgba(255,205,227,0.72), transparent 30%),
            linear-gradient(180deg, #FFF8FC 0%, #FFF0F5 42%, #FFE1EE 100%);
          z-index: -1;
          transform: translateZ(0); 
        }
        body::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px);
          background-size: 30px 30px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 82%);
          z-index: -1;
          pointer-events: none;
        }
        
        html, body { width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; overflow-x: clip !important; display: block !important; }
        #root { width: 100% !important; max-width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; text-align: left !important; display: block !important; }
        
        body, input, button, select, textarea, table, th, td, span, div { font-family: 'Quicksand', sans-serif !important; }

        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; appearance: textfield; }

        @media screen and (max-width: 768px) { input, select, textarea { font-size: 16px !important; } }

        /* âœ¨ NEW: Ambulance Shake & Flash Animation */
        @keyframes ambulanceFlash {
          0% { box-shadow: 0 0 0 0 rgba(255, 20, 147, 0.7); border-color: #FF1493; transform: translateX(0); }
          15% { box-shadow: 0 0 30px 10px rgba(255, 0, 0, 0.8); border-color: #FF0000; transform: translateX(-8px); }
          30% { box-shadow: 0 0 0 0 rgba(255, 20, 147, 0.7); border-color: #FF1493; transform: translateX(8px); }
          45% { box-shadow: 0 0 30px 10px rgba(255, 0, 0, 0.8); border-color: #FF0000; transform: translateX(-8px); }
          60% { box-shadow: 0 0 0 0 rgba(255, 20, 147, 0.7); border-color: #FF1493; transform: translateX(8px); }
          75% { box-shadow: 0 0 30px 10px rgba(255, 0, 0, 0.8); border-color: #FF0000; transform: translateX(-8px); }
          100% { box-shadow: 0 0 0 0 rgba(255, 20, 147, 0); border-color: #FFC0CB; transform: translateX(0); }
        }
        .animate-ambulance { animation: ambulanceFlash 0.8s cubic-bezier(.36,.07,.19,.97) both; background-color: #FFF0F5 !important; }
        
        /* âœ¨ NEW: Epic Unicorn Animation */
        @keyframes flyUnicorn {
          0% { transform: translate(-50vw, 80vh) rotate(-20deg) scale(0.8); }
          25% { transform: translate(10vw, 40vh) rotate(10deg) scale(1); }
          50% { transform: translate(50vw, 50vh) rotate(-10deg) scale(1.2); }
          75% { transform: translate(80vw, 20vh) rotate(15deg) scale(1); }
          100% { transform: translate(150vw, -10vh) rotate(0deg) scale(0.8); }
        }
        @keyframes fadeOut {
          to { opacity: 0; visibility: hidden; }
        }
        .unicorn-wrapper {
          position: absolute; top: 0; left: 0;
          animation: flyUnicorn 3.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          display: flex; align-items: center; z-index: 10001;
        }
        .unicorn-emoji {
          font-size: 8rem; filter: drop-shadow(0px 10px 20px rgba(255,20,147,0.4));
          z-index: 2; position: relative; line-height: 1; transform: scaleX(-1);
        }
        .rainbow-trail {
          position: absolute; left: 50%; top: 50%; transform: translateY(-50%);
          width: 150vw; height: 3rem;
          background: linear-gradient(90deg, rgba(255,0,0,0.7), rgba(255,165,0,0.7), rgba(255,255,0,0.7), rgba(0,128,0,0.7), rgba(0,0,255,0.7), rgba(75,0,130,0.7), rgba(238,130,238,0.7), transparent);
          border-radius: 50px; filter: blur(10px); z-index: 1;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; will-change: transform; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .brand-title, .brand-title * { font-family: 'Pacifico', cursive !important; }
        .brand-title { transform: rotate(-2deg); text-shadow: 0 10px 22px rgba(74, 4, 42, 0.12); }
        .section-title {
          font-family: 'Quicksand', sans-serif !important;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .hero-brand-title {
          color: #fff;
          text-shadow: 0 8px 24px rgba(214, 0, 110, 0.26), 0 2px 0 rgba(255,255,255,0.16);
        }
        .hero-support-text {
          color: #8F2C5D;
          text-shadow: 0 1px 0 rgba(255,255,255,0.28);
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,240,245,0.9));
          border: 2px solid rgba(255,192,203,0.82);
          border-radius: 1.75rem;
          box-shadow: 0 22px 48px rgba(214, 0, 110, 0.12);
          backdrop-filter: blur(18px);
          transition: all 0.3s ease;
        }
        .order-form-shell {
          position: relative;
          overflow: hidden;
          background: linear-gradient(180deg, rgba(255,255,255,0.97), rgba(255,240,245,0.9));
          border: 2px solid rgba(255,192,203,0.72);
          box-shadow: 0 26px 58px rgba(214, 0, 110, 0.12);
        }
        .order-form-shell::before {
          content: '';
          position: absolute;
          inset: -18% auto auto -10%;
          width: 18rem;
          height: 18rem;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.88), rgba(255,255,255,0));
          opacity: 0.82;
          pointer-events: none;
        }
        .order-form-shell::after {
          content: '';
          position: absolute;
          inset: auto -5% -28% auto;
          width: 20rem;
          height: 20rem;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,182,222,0.58), rgba(255,255,255,0));
          pointer-events: none;
        }
        .order-form-chip {
          background: rgba(255,255,255,0.84);
          border: 1px solid rgba(255,192,203,0.68);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), 0 10px 22px rgba(214, 0, 110, 0.08);
          backdrop-filter: blur(12px);
        }
        .order-input-panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,244,248,0.84));
          border: 1px solid rgba(255,192,203,0.56);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), 0 12px 26px rgba(214, 0, 110, 0.08);
          backdrop-filter: blur(12px);
        }
        .order-summary-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,244,248,0.84));
          border: 1px solid rgba(255,192,203,0.52);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), 0 10px 22px rgba(214, 0, 110, 0.07);
          backdrop-filter: blur(12px);
        }
        .order-step-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,245,249,0.82));
          border: 1px solid rgba(255,192,203,0.48);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 18px rgba(214, 0, 110, 0.06);
          backdrop-filter: blur(12px);
        }
        .hero-panel {
          position: relative;
          overflow: hidden;
          background: linear-gradient(145deg, rgba(255,255,255,0.44), rgba(255,240,245,0.22));
          border: 2px solid rgba(255,255,255,0.56);
          box-shadow: 0 24px 56px rgba(214, 0, 110, 0.14);
          backdrop-filter: blur(20px);
        }
        .hero-panel::before {
          content: '';
          position: absolute;
          inset: -4rem auto auto -4rem;
          width: 14rem;
          height: 14rem;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.42), rgba(255,255,255,0));
          pointer-events: none;
        }
        .hero-panel::after {
          content: '';
          position: absolute;
          inset: auto -5rem -5rem auto;
          width: 16rem;
          height: 16rem;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,171,221,0.56), rgba(255,255,255,0));
          pointer-events: none;
        }
        .hero-stat {
          background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,244,248,0.84));
          border: 1px solid rgba(255,192,203,0.56);
          box-shadow: 0 10px 22px rgba(214, 0, 110, 0.08);
          backdrop-filter: blur(12px);
        }
        .soft-panel {
          background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,242,247,0.84));
          border: 2px solid rgba(255,192,203,0.62);
          box-shadow: 0 18px 40px rgba(214, 0, 110, 0.1);
          backdrop-filter: blur(14px);
        }
        .shop-surface {
          background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,243,248,0.9));
          border: 2px solid rgba(255,192,203,0.68);
          box-shadow: 0 20px 44px rgba(214, 0, 110, 0.1);
          backdrop-filter: blur(16px);
        }
        .glass-note {
          background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,241,246,0.82));
          border: 1px solid rgba(255,192,203,0.58);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.86), 0 8px 18px rgba(214, 0, 110, 0.06);
          backdrop-filter: blur(12px);
        }
        .hero-chip {
          background: rgba(255,255,255,0.84);
          border: 1px solid rgba(255,192,203,0.62);
          box-shadow: 0 10px 22px rgba(214, 0, 110, 0.08);
          backdrop-filter: blur(12px);
        }
        .hero-divider {
          height: 1px;
          background: linear-gradient(90deg, rgba(255,192,203,0.72), rgba(255,192,203,0));
        }
        @keyframes bubbleIconTumble {
          0%, 100% { transform: rotate(0deg) scale(1); }
          20% { transform: rotate(-10deg) scale(1.02); }
          50% { transform: rotate(12deg) scale(1.08); }
          80% { transform: rotate(-6deg) scale(1.03); }
        }
        .background-bubble {
          position: absolute;
          top: 0;
          left: 0;
          will-change: transform;
          opacity: 0.94;
        }
        @media screen and (max-width: 640px) {
          .background-bubble {
            opacity: 0.97;
          }
          .hero-panel {
            background: linear-gradient(145deg, rgba(255,255,255,0.52), rgba(255,240,245,0.3));
          }
          .glass-card {
            background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,240,245,0.88));
          }
          .order-form-shell {
            background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,240,245,0.9));
          }
          .shop-surface {
            background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,243,248,0.9));
          }
          .soft-panel {
            background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,242,247,0.88));
          }
          .glass-note {
            background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,241,246,0.84));
          }
          .order-input-panel,
          .order-summary-card,
          .order-step-card {
            background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,244,248,0.84));
          }
          .hero-stat {
            background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,244,248,0.84));
          }
        }
        .bubble-floater-shell {
          position: relative;
          overflow: hidden;
        }
        .bubble-floater-shell::before {
          content: '';
          position: absolute;
          inset: 10% 14% auto auto;
          width: 38%;
          height: 38%;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255,255,255,0.9), rgba(255,255,255,0));
          opacity: 0.78;
          pointer-events: none;
        }
        .bubble-floater-shell::after {
          content: '';
          position: absolute;
          inset: auto auto 14% 12%;
          width: 24%;
          height: 24%;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.7);
          opacity: 0.5;
          pointer-events: none;
        }
        .bubble-floater-icon {
          animation: bubbleIconTumble 4.8s ease-in-out infinite;
          transform-origin: center;
          will-change: transform;
        }
        
        .hide-scroll { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        
        .admin-sidebar { width: 280px; background: #4A042A; flex-shrink: 0; }
        .nav-item.active { background: white; color: #D6006E; border-radius: 1rem 0 0 1rem; margin-right: -1.5rem; padding-right: 1.5rem; }
        .custom-table th { background: #FFF0F5; color: #D6006E; font-weight: 800; font-size: 10px; text-transform: uppercase; padding: 1rem; border-bottom: 2px solid #FFC0CB; }
        .custom-table td { padding: 1rem; border-bottom: 1px solid #FFE4E1; font-weight: 600; font-size: 13px; }
        .compact-table th { padding: 0.72rem 0.85rem; font-size: 9px; }
        .compact-table td { padding: 0.72rem 0.85rem; font-size: 12px; }
      `}} />

      {view === 'shop' && (
        <div ref={heroBubbleFieldRef} className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
          {HERO_CUTE_FLOATERS.map((item) => (
            <div
              key={item.id}
              ref={(node) => {
                if (node) heroBubbleNodesRef.current[item.id] = node;
                else delete heroBubbleNodesRef.current[item.id];
              }}
              className="background-bubble"
            >
              <div className={`bubble-floater-shell flex h-[82px] w-[82px] items-center justify-center rounded-full border border-white/50 bg-gradient-to-br ${item.tone} p-0 shadow-[0_12px_28px_rgba(214,0,110,0.08)] backdrop-blur-md sm:h-[98px] sm:w-[98px]`}>
                <span className="bubble-floater-icon block text-[32px] sm:text-[42px] leading-none opacity-80">{item.icon}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REFINED: Wiki + Calculator on Top-Left, fixed and scroll-reactive (HIDDEN ON STORE CLOSED) */}
      {view === 'shop' && settings.storeOpen !== false && (
        <div className="fixed top-2 left-2 sm:top-4 sm:left-4 z-[60] flex items-center gap-2">
          <button onClick={() => setShowWikiModal(true)} className={`bg-white/90 backdrop-blur-md text-[#D6006E] border-2 border-pink-200 shadow-md flex items-center justify-center hover:bg-white transition-all duration-300 ease-in-out ${isScrolled ? 'w-10 h-10 rounded-full px-0 opacity-60 hover:opacity-100' : 'px-4 py-2 rounded-full gap-2 hover:scale-105'}`}>
            <BookOpen size={16} className="shrink-0" />
            <span className={`font-black uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ${isScrolled ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Wiki</span>
          </button>
          <button onClick={() => setShowCalculatorModal(true)} className={`bg-white/90 backdrop-blur-md text-[#D6006E] border-2 border-pink-200 shadow-md flex items-center justify-center hover:bg-white transition-all duration-300 ease-in-out ${isScrolled ? 'w-10 h-10 rounded-full px-0 opacity-60 hover:opacity-100' : 'px-4 py-2 rounded-full gap-2 hover:scale-105'}`}>
            <Calculator size={16} className="shrink-0" />
            <span className={`font-black uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ${isScrolled ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Calc</span>
          </button>
        </div>
      )}

      {/* âœ¨ NEW: Floating Live Chat Button & Panel */}
      {view === 'shop' && hasShopAccess && (
        <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-[70] flex flex-col items-end">

          {/* Transparent Preview Bubble (Shows when chat is closed and a new message arrives) */}
          {!isChatOpen && latestChatPreview && (
            <button
              type="button"
              onClick={() => { setIsChatOpen(true); setLatestChatPreview(null); }}
              className="absolute bottom-16 right-0 bg-white/85 backdrop-blur-xl p-3 rounded-2xl rounded-br-none shadow-[0_8px_24px_rgba(255,20,147,0.18)] border border-pink-200 text-left text-xs w-60 animate-fadeIn z-0"
            >
              <span className="font-black text-[#D6006E] block mb-0.5">
                {latestChatPreview.sender || 'Box Buddy'} • {formatChatTimestamp(latestChatPreview.timestamp)}
              </span>
              <span className="text-slate-700 font-bold leading-tight line-clamp-3">{latestChatPreview.text}</span>
            </button>
          )}

          {isChatOpen && (
            <div ref={chatPanelRef} className="bg-white/72 backdrop-blur-2xl w-[360px] max-w-[calc(100vw-1.5rem)] h-[500px] rounded-[28px] shadow-[0_18px_48px_rgba(255,20,147,0.22)] mb-4 border border-white/80 flex flex-col overflow-hidden animate-fadeIn relative z-10">
              <div className="bg-gradient-to-r from-[#FF1493]/95 to-[#FF69B4]/92 text-white shadow-sm z-10">
                <div className="p-4 flex justify-between items-center gap-3">
                  <div className="flex items-center gap-2 font-black">
                    <MessageCircle size={18} /> Ka-Bonded Buddies
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="hover:scale-110 transition-transform text-2xl leading-none">&times;</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/35 flex flex-col hide-scroll">
                {recentChats.length === 0 ? (
                  <div className="m-auto max-w-[220px] text-center">
                    <div className="w-14 h-14 rounded-full bg-pink-50 border border-pink-100 text-[#D6006E] mx-auto flex items-center justify-center shadow-sm">
                      <MessageCircle size={22} />
                    </div>
                    <p className="mt-3 text-sm font-black text-[#4A042A]">No chat yet</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">Start the first message if you need help filling a box or want to check if someone else is joining.</p>
                  </div>
                ) : (
                  recentChats.map(c => {
                    const isOwnMessage = (c.senderId || '') === currentChatIdentity;
                    const isHelpRequest = c.kind === 'help' || Boolean(c.productRef);
                    return (
                      <div
                        key={c.id}
                        className={`max-w-[88%] ${isOwnMessage ? 'self-end' : 'self-start'}`}
                      >
                        <div className={`p-3 rounded-[20px] shadow-sm border relative ${isOwnMessage ? 'bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white border-pink-300 rounded-br-md' : isHelpRequest ? 'bg-amber-50/90 border-amber-100 rounded-tl-md' : 'bg-white/88 border-pink-100 rounded-tl-md'}`}>
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isOwnMessage ? 'text-white/85' : isHelpRequest ? 'text-amber-600' : 'text-pink-500'}`}>
                              {isOwnMessage ? 'You' : (c.sender || 'Box Buddy')}
                            </p>
                            <span className={`text-[9px] font-black ${isOwnMessage ? 'text-white/75' : 'text-slate-400'}`}>
                              {formatChatTimestamp(c.timestamp)}
                            </span>
                          </div>
                          <p className={`text-xs font-bold leading-relaxed break-words ${isOwnMessage ? 'text-white' : 'text-slate-700'}`}>{c.text}</p>
                        {c.productRef && (
                          <button onClick={() => handleAddFromChat(c.productRef)} className={`mt-2 w-full py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 shadow-sm hover:scale-[0.98] ${isOwnMessage ? 'bg-white/18 border border-white/25 text-white hover:bg-white/24' : 'bg-pink-50 hover:bg-pink-100 text-[#D6006E] border border-pink-200'}`}>
                            Add {c.productRef}
                          </button>
                        )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="p-3 bg-white/72 border-t border-white/80 flex gap-2 items-center z-10">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask for help or offer extra slots..." className="flex-1 bg-[#FFF0F5]/90 border border-[#FFC0CB] rounded-xl px-3 py-2.5 text-xs font-bold text-[#4A042A] outline-none focus:border-[#D6006E]" />
                <button type="submit" disabled={!chatInput.trim() || isChatSending} className="bg-[#D6006E] text-white p-2.5 rounded-xl disabled:opacity-50 hover:scale-105 transition-transform shadow-sm">
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
          <button ref={chatLauncherRef} onClick={() => { setIsChatOpen(!isChatOpen); if (!isChatOpen) setLatestChatPreview(null); }} className="bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(255,20,147,0.4)] hover:scale-105 transition-transform border-2 border-white relative z-10">
            <MessageCircle size={24} />
            {recentChats.length > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-[#D6006E] text-[10px] font-black flex items-center justify-center border border-pink-200 shadow-sm">
                {Math.min(recentChats.length, 99)}
              </span>
            )}
          </button>
        </div>
      )}

      {view === 'shop' ? (
        <div className="min-h-screen w-full text-[#4A042A] pb-24 lg:pb-8 selection:bg-pink-300 relative">

          <button onClick={() => setView('admin')} className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/30 backdrop-blur-sm text-[#4A042A] border border-[#4A042A]/20 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/60 transition-all hover:scale-105 z-[40]" title="Admin Access">
            <Lock size={16} />
          </button>

          <div className={`relative z-10 w-full mx-auto p-4 pt-16 sm:pt-10 ${isStoreClosed ? 'max-w-[1380px] xl:max-w-[1440px]' : 'max-w-[1280px]'}`}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-16 left-[-8%] h-52 w-52 rounded-full bg-white/30 blur-3xl" />
              <div className="absolute top-28 right-[-4%] h-64 w-64 rounded-full bg-[#FFD0E9]/50 blur-3xl" />
              <div className="absolute bottom-20 left-1/3 h-56 w-56 rounded-full bg-[#FFC4DD]/35 blur-3xl" />
            </div>

            <section ref={heroSectionRef} className="hero-panel rounded-[34px] p-4 sm:p-5 lg:px-6 lg:py-5 mb-5">
              <div className={`relative z-10 grid gap-4 ${isStoreClosed ? 'lg:grid-cols-[minmax(0,1.18fr)_360px] xl:grid-cols-[minmax(0,1.12fr)_400px] lg:items-stretch' : 'lg:grid-cols-[minmax(0,1.12fr)_360px] xl:grid-cols-[minmax(0,1.08fr)_400px] lg:items-stretch'}`}>
                <div className={`relative min-w-0 flex flex-col min-h-[300px] lg:min-h-[320px] ${isStoreClosed ? 'items-center text-center lg:items-start lg:text-left' : 'items-start text-left justify-between'}`}>
                  <div className={`hidden sm:flex flex-wrap items-center gap-3 w-full ${isStoreClosed ? 'justify-center lg:justify-start' : 'justify-start'}`}>
                    <span className="hero-chip inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[#8A1555] font-black text-[10px] uppercase tracking-[0.24em]">
                      {isStoreClosed ? 'Store Paused' : 'Live Group Buy'}
                    </span>
                    <span className="hero-chip inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[#8A1555] font-black text-[10px] uppercase tracking-[0.2em]">
                      {isStoreClosed ? 'History Still Open' : (settings.batchName || 'Current Batch')}
                    </span>
                  </div>

                  {isStoreClosed ? (
                    <>
                      <div className="w-full min-w-0 flex-1 flex flex-col justify-center items-center gap-2 text-center max-w-3xl mx-auto lg:max-w-[1100px] xl:max-w-[1180px] py-1 lg:mx-0 lg:items-start lg:text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D6006E]">BBP Group Buy</p>
                        <h1 className="brand-title mt-2 mb-0 pb-5 sm:pb-6 lg:pb-7 text-[2.95rem] sm:text-[4.1rem] lg:text-[5.75rem] xl:text-[6.2rem] lg:whitespace-nowrap lg:tracking-[-0.035em] leading-[1.06] text-[#D6006E]">
                          Bonded by Peptides
                        </h1>
                        <p className="mt-4 max-w-[38rem] text-[15px] sm:text-[18px] font-bold leading-relaxed text-[#8F2C5D]">
                          Ordering is paused right now, but your profile, order history, wiki, and calculator are still here while BBP gets the next batch ready.
                        </p>
                      </div>

                      <div className="hero-divider w-full mb-3" />

                      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 w-full">
                        <div className="hero-stat rounded-[24px] px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-500">Lookup</p>
                          <p className="mt-1 text-sm font-black text-[#4A042A]">Check saved profile</p>
                        </div>
                        <div className="hero-stat rounded-[24px] px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-500">History</p>
                          <p className="mt-1 text-sm font-black text-[#4A042A]">See old orders by email</p>
                        </div>
                        <div className="hero-stat rounded-[24px] px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-500">Wiki</p>
                          <p className="mt-1 text-sm font-black text-[#4A042A]">Peptide guide stays live</p>
                        </div>
                        <div className="hero-stat rounded-[24px] px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-500">Calculator</p>
                          <p className="mt-1 text-sm font-black text-[#4A042A]">Dose and draw helper</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-full min-w-0 flex-1 flex flex-col justify-center items-center gap-2 text-center max-w-[760px] lg:max-w-[980px] xl:max-w-[1080px] py-2 lg:items-start lg:text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D6006E]">BBP Group Buy</p>
                        <h1 className="brand-title mt-2 mb-0 pb-5 sm:pb-6 lg:pb-7 text-[2.95rem] sm:text-[4.1rem] lg:text-[4.7rem] xl:text-[5.05rem] lg:whitespace-nowrap leading-[1.08] text-[#D6006E]">
                          Bonded by Peptides
                        </h1>
                        <p className="mt-4 max-w-[38rem] text-[15px] sm:text-[18px] font-bold leading-relaxed text-[#8F2C5D]">
                          {heroIntroCopy}
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                          <button
                            onClick={() => document.getElementById('top-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_16px_32px_rgba(255,20,147,0.2)] transition-transform hover:translate-y-[-1px]"
                          >
                            {heroPrimaryCtaLabel}
                          </button>
                          {showCatalogReference && (
                            <button
                              onClick={() => document.getElementById('catalog-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                              className="bg-white/90 text-[#D6006E] border-2 border-[#FFC0CB] px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_10px_24px_rgba(255,20,147,0.08)] transition-transform hover:translate-y-[-1px]"
                            >
                              Browse Catalog
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="hero-divider w-full my-4" />

                      <div className="grid grid-cols-2 gap-3 w-full lg:grid-cols-4">
                        <div className="hero-stat rounded-[24px] px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-pink-500">Order Minimum</p>
                          <p className="mt-1 text-sm font-black text-[#4A042A]">{settings.minOrder} vials to save</p>
                        </div>
                        <div className="hero-stat rounded-[24px] px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-pink-500">Boxes Filling</p>
                          <p className="mt-1 text-sm font-black text-[#4A042A]">{currentBatchFillingLines} active right now</p>
                        </div>
                        <div className="hero-stat rounded-[24px] px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-pink-500">Cart So Far</p>
                          <p className="mt-1 text-sm font-black text-[#4A042A]">{selectedVialCount} vial{selectedVialCount === 1 ? '' : 's'} selected</p>
                        </div>
                        <div className="hero-stat rounded-[24px] px-4 py-3">
                          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-pink-500">Kit Protection</p>
                          <p className="mt-1 text-sm font-black text-[#4A042A]">Every 10 vials makes 1 kit</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {isStoreClosed && (
                <div className="soft-panel rounded-[28px] p-4 flex flex-col gap-3 text-center lg:text-left w-full min-w-0 overflow-hidden lg:self-center">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-[#D6006E] uppercase tracking-[0.28em]">
                      Profile, History, Wiki & Calculator
                    </p>
                    <h2 className="mt-2 text-[1.8rem] sm:text-[2rem] font-black text-[#4A042A] leading-[1.02]">
                      Closed for ordering
                    </h2>
                    <p className="mt-2 text-sm font-bold text-[#9E2A5E] leading-relaxed">
                      Ordering is paused, but your saved profile, order history, peptide wiki, and dose calculator are still available while the next batch is being prepared.
                    </p>
                  </div>

                    <div className="flex flex-col gap-2.5 min-w-0">
                      <div className="rounded-[22px] border border-[#FFB3D7] bg-gradient-to-r from-[#FFF1F8] via-[#FFE5F3] to-[#FFF7EF] px-4 py-3 text-left shadow-sm">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF7A59] to-[#FF1493] text-white shadow-[0_8px_18px_rgba(255,20,147,0.22)]">
                            <BookOpen size={18} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D6006E]">Wiki Still Open</p>
                            <p className="mt-1 text-xs font-bold text-[#7B1B53] leading-relaxed">Browse product notes, benefits, and handling guidance even while checkout is paused.</p>
                          </div>
                        </div>
                      </div>
                      <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} onBlur={handleLookup} className={`${originalInput} py-2.5`} placeholder="Enter your email" />
                      <button onClick={() => customerProfile && setSelectedProfileEmail(customerEmail)} disabled={!customerProfile} className="w-full bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white font-black py-3 text-xs rounded-2xl uppercase tracking-widest shadow-md transition-transform hover:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed">
                        View Profile & History
                      </button>
                      <button onClick={() => setShowWikiModal(true)} className="group w-full rounded-[24px] border border-white/35 bg-gradient-to-r from-[#FF7A59] via-[#FF4FA1] to-[#FF1493] px-4 py-4 text-white shadow-[0_16px_36px_rgba(255,20,147,0.24)] transition-transform hover:scale-[0.99]">
                        <span className="flex items-center justify-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/25">
                            <BookOpen size={17} />
                          </span>
                          <span className="min-w-0 text-left">
                            <span className="block text-[9px] font-black uppercase tracking-[0.24em] text-white/80">Browse Now</span>
                            <span className="mt-0.5 flex items-center gap-1 text-sm font-black uppercase tracking-[0.2em] text-white">
                              <span>Open Peptide Wiki</span>
                              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </span>
                        </span>
                      </button>
                      <button onClick={() => setShowCalculatorModal(true)} className="w-full rounded-[22px] border border-[#F5B9D6] bg-white/92 px-4 py-3.5 text-[#D6006E] shadow-sm transition-transform hover:scale-[0.99]">
                        <span className="flex items-center justify-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-50 ring-1 ring-pink-100">
                            <Calculator size={16} />
                          </span>
                          <span className="min-w-0 text-left">
                            <span className="block text-[9px] font-black uppercase tracking-[0.24em] text-pink-400">Dose Helper</span>
                            <span className="mt-0.5 block text-sm font-black uppercase tracking-[0.18em]">Open Peptide Calculator</span>
                          </span>
                        </span>
                      </button>
                      <div className="glass-note rounded-[20px] px-4 py-3 text-xs font-bold text-[#9E2A5E]">
                        {customerProfile ? 'Saved profile found. You can open your history now, or head straight into the wiki.' : 'No saved profile yet. You can still use the wiki now, or try the same email you used for your previous order.'}
                      </div>
                    </div>
                </div>
                )}
                {!isStoreClosed && (
                  <div className="soft-panel hidden lg:flex rounded-[30px] p-5 flex-col gap-4 w-full min-w-0 overflow-hidden lg:self-stretch bg-[linear-gradient(180deg,rgba(255,249,252,0.94),rgba(255,241,246,0.88))] border-[#F3C9D7] shadow-[0_18px_38px_rgba(214,0,110,0.09)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-[#B30065] uppercase tracking-[0.28em]">Current Batch</p>
                        <h2 className="mt-2 text-[1.8rem] sm:text-[2.15rem] font-black text-[#352C30] leading-[0.94] tracking-[-0.04em]">
                          {settings.batchName || 'Bonded Ledger'}
                        </h2>
                        <p className="mt-2 text-sm font-semibold text-[#63595D] leading-relaxed">
                          One place to save your order, watch the box fill, and come back for payment when the window opens.
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-gradient-to-br from-[#C41A76] to-[#E85A9D] px-4 py-3 text-right text-white shadow-[0_14px_26px_rgba(196,26,118,0.18)]">
                        <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/72">Cart Total</p>
                        <p className="mt-1 text-2xl font-black leading-none">₱{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[22px] border border-[#F1D8E2] bg-white/74 px-4 py-3 backdrop-blur-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-500">Payment Status</p>
                        <p className="mt-1 text-sm font-black text-[#352C30]">{settings.paymentsOpen ? 'Payment window is open' : 'Payment window still closed'}</p>
                      </div>
                      <div className="rounded-[22px] border border-[#F1D8E2] bg-white/74 px-4 py-3 backdrop-blur-sm">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-500">Near Capacity</p>
                        <p className="mt-1 text-sm font-black text-[#352C30]">{nearlyFullCount} product{nearlyFullCount === 1 ? '' : 's'} almost full</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-[24px] border border-[#ECD8E0] bg-white/72 px-4 py-4 backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#9E8A93]">Available Lines</p>
                        <p className="mt-3 text-[1.9rem] font-black leading-none text-[#352C30]">{currentBatchOpenLines}</p>
                        <p className="mt-2 text-[11px] font-semibold leading-snug text-[#63595D]">currently open in the live catalog</p>
                      </div>
                      <div className="rounded-[24px] border border-[#ECD8E0] bg-white/72 px-4 py-4 backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#9E8A93]">Protected Kits</p>
                        <p className="mt-3 text-[1.9rem] font-black leading-none text-[#352C30]">{currentBatchProtectedKits}</p>
                        <p className="mt-2 text-[11px] font-semibold leading-snug text-[#63595D]">full 10-vial kits already locked in</p>
                      </div>
                      <div className="rounded-[24px] border border-[#ECD8E0] bg-white/72 px-4 py-4 backdrop-blur-sm">
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#9E8A93]">Open Spots</p>
                        <p className="mt-3 text-[1.9rem] font-black leading-none text-[#352C30]">{currentBatchOpenSpots}</p>
                        <p className="mt-2 text-[11px] font-semibold leading-snug text-[#63595D]">slots still needed to close active boxes</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
            <h1 className="hidden brand-title text-2xl sm:text-4xl text-center text-white mb-2 flex items-center justify-center gap-3 mt-4 sm:mt-0">
              <span className="text-white/80">✨</span>
              <span>Bonded by Peptides</span>
              <span className="text-white/80">✨</span>
            </h1>
            <div className="hidden text-center mb-8">
              <span className="bg-white text-[#D6006E] px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider border-2 border-[#FF69B4] shadow-sm inline-block">
                {settings.batchName}
              </span>
            </div>

            {settings.storeOpen === false ? null : showShopAccessGate ? (
              <div className="shop-surface rounded-[30px] p-5 sm:p-6 shadow-sm relative z-10">
                <div className="mx-auto max-w-2xl rounded-[28px] border-2 border-pink-100 bg-white/92 p-5 sm:p-7 text-center shadow-[0_18px_40px_rgba(214,0,110,0.08)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#D6006E]">Private Batch Access</p>
                  <h2 className="mt-3 text-[1.8rem] sm:text-[2.3rem] font-black text-[#4A042A] leading-[1.02]">
                    Enter batch code
                  </h2>
                  <p className="mt-3 text-sm sm:text-base font-bold leading-relaxed text-[#8F2C5D]">
                    This catalog is private to the group. Get the current batch code from Discord, then enter it here.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="hero-chip inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[#8A1555] font-black text-[10px] uppercase tracking-[0.22em]">
                      For group members first
                    </span>
                    <span className="hero-chip inline-flex items-center justify-center rounded-full px-3 py-1.5 text-[#8A1555] font-black text-[10px] uppercase tracking-[0.22em]">
                      {settings.batchName || 'Current Batch'}
                    </span>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      unlockShopAccess();
                    }}
                    className="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]"
                  >
                    <input
                      type="text"
                      value={shopAccessCodeInput}
                      onChange={(e) => setShopAccessCodeInput(e.target.value)}
                      placeholder="Paste the batch code here"
                      className={`${customerFormInput} ${shakingField === 'shopAccessCode' ? 'animate-shake border-red-500 bg-red-50 text-red-700 placeholder:text-red-300' : ''}`}
                    />
                    <button type="submit" className={`${originalBtn} w-full justify-center`}>
                      Enter Shop
                    </button>
                  </form>

                  <p className="mt-4 text-xs font-bold text-[#9E2A5E]">
                    Use the latest batch code from Discord to enter this batch.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {settings.paymentsOpen && (
                  <div className="glass-note border-l-4 border-[#FF1493] p-3 rounded-[22px] mb-4 text-sm font-bold shadow-sm">Payments open: check your email below to pay.</div>
                )}
                {settings.addOnly && !settings.paymentsOpen && (
                  <div className="glass-note border-l-4 border-amber-500 p-4 rounded-[22px] mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                    <div className="text-sm font-black text-amber-600 mb-1">Add-only mode active</div>
                      <div className="text-xs font-bold text-slate-500">Your old numbers cannot go down now. You can only add more.</div>
                    </div>
                    <button onClick={() => setShowHitListModal(true)} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-200 transition-colors shadow-sm whitespace-nowrap">
                      View hit list
                    </button>
                  </div>
                )}
                {isReviewStageOpen && (
                  <div className="glass-note border-l-4 border-sky-500 p-4 rounded-[22px] mb-6 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-sky-700">Review stage is open</span>
                        {hasExistingOrder && (
                          <>
                            {currentBuyerReviewConfirmedAt && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                                Marked Looks Good
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="mt-2 text-xs font-bold text-slate-500">
                        {!hasExistingOrder
                          ? 'New orders are paused right now while admins review the saved batch before opening payments.'
                          : currentReviewReady
                            ? 'You already marked this saved order as looking good for the payment stage.'
                            : 'Open Review to inspect your saved order. If everything looks good, you can mark it below before payments open.'}
                      </div>
                    </div>
                    {hasExistingOrder ? (
                      <button
                        onClick={confirmBuyerReview}
                        disabled={currentReviewReady}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-colors hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {currentReviewReady ? 'Already Marked' : 'Looks Good To Me'}
                      </button>
                    ) : (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-sky-700">
                        Review Freeze
                      </span>
                    )}
                  </div>
                )}

                {/* âœ¨ FIXED: Tighter Desktop Sidebars */}
                <div className={shopDesktopLayoutClass}>
                  <div className="space-y-4 w-full">

                    {isCurrentUserAtRisk && (
                      <div className="glass-note border border-rose-300 p-4 rounded-[22px] shadow-sm animate-pulse flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-rose-700 font-black text-sm mb-1">Your vials are at risk</h3>
                          <p className="text-xs text-rose-600 font-bold">You have loose vials on the hit list. If the box does not fill, those loose vials may be cut. Try to help fill the box first.</p>
                        </div>
                        <button onClick={() => setShowHitListModal(true)} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-rose-700 whitespace-nowrap transition-transform hover:scale-105">
                          View hit list
                        </button>
                      </div>
                    )}

                    {/* âœ¨ IMPROVED: Order card with Ambulance Flash ID */}
                    <div id="top-form-card" className={`glass-card order-form-shell p-4 sm:p-5 shadow-xl ${showAmbulance ? 'animate-ambulance z-[100]' : ''}`}>
                      <div className="relative z-[1] flex flex-col gap-4">
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="order-form-chip inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E]">
                                {orderCardEyebrow}
                              </span>
                              <span className="order-form-chip inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#7A104C]">
                                {orderCardStatus}
                              </span>
                            </div>

                            <div className="max-w-2xl">
                              <h2 className="section-title text-[1.65rem] leading-[1.05] sm:text-[2.1rem] text-[#4A042A]">
                                {orderCardTitle}
                              </h2>
                              <p className="mt-2 max-w-[40rem] text-xs sm:text-sm font-bold leading-relaxed text-[#8F2C5D]">
                                {orderCardDescription}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 xl:max-w-[320px] xl:justify-end">
                            <button onClick={() => setShowHowTo(!showHowTo)} className="order-form-chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E] transition-colors hover:bg-white/90">
                              <BookOpen size={13} />
                              {showHowTo ? 'Hide Steps' : 'How It Works'}
                            </button>
                            {customerProfile && (
                              <button onClick={() => setSelectedProfileEmail(customerEmail)} className="order-form-chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E] transition-colors hover:bg-white/90">
                                <Users size={13} />
                                View Profile & History
                              </button>
                            )}
                            {hasExistingOrder && !settings.paymentsOpen && !settings.addOnly && !settings.reviewStageOpen && (
                              confirmAction.type === 'cancelOrder' && confirmAction.id === customerEmail.toLowerCase().trim() ? (
                                <>
                                  <button onClick={cancelEntireOrder} className="inline-flex items-center rounded-full bg-rose-500 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-sm transition-colors hover:bg-rose-600">
                                    Confirm Cancel
                                  </button>
                                  <button onClick={() => setConfirmAction({ type: null, id: null })} className="order-form-chip inline-flex items-center rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 transition-colors hover:bg-white/90">
                                    Keep Order
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => setConfirmAction({ type: 'cancelOrder', id: customerEmail.toLowerCase().trim() })} className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50/90 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-rose-600 transition-colors hover:bg-rose-100">
                                  Cancel Entire Order
                                </button>
                              )
                            )}
                          </div>
                        </div>

                        <div className="grid gap-3">
                          <div className="order-input-panel rounded-[26px] p-4">
                            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="max-w-xl">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D6006E]">Your details</p>
                                <p className="mt-1.5 text-xs font-bold leading-relaxed text-[#8F2C5D]">
                                  Use the same email as past orders so your profile can load.
                                </p>
                              </div>
                              <div className="inline-flex items-center gap-2 self-start rounded-full bg-[#4A042A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-sm">
                                <Lock size={12} />
                                Secure lookup
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                              <div className="sm:col-span-1">
                                <label className="mb-1 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D6006E]">Email address</label>
                                <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} onBlur={handleLookup} className={getCustomerFormInputClass('email')} placeholder="Enter email to lookup profile..." />
                              </div>
                              <div className="sm:col-span-1">
                                <label className="mb-1 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D6006E]">Confirm email</label>
                                <input type="email" value={customerEmailConfirm} onChange={e => setCustomerEmailConfirm(e.target.value)} className={getCustomerFormInputClass('emailConfirm')} placeholder="Type your email again..." />
                              </div>

                              <div className="sm:col-span-1">
                                <label className="mb-1 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D6006E]">Name</label>
                                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className={getCustomerFormInputClass('name')} placeholder="Full name" disabled={settings.paymentsOpen || settings.reviewStageOpen} />
                              </div>
                              <div className="sm:col-span-1">
                                <label className="mb-1 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D6006E]">Handle</label>
                                <input type="text" value={customerHandle} onChange={e => setCustomerHandle(e.target.value)} className={customerFormInput} placeholder="@username" disabled={settings.paymentsOpen || settings.reviewStageOpen} />
                              </div>
                            </div>
                          </div>

                          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="order-summary-card rounded-[22px] p-3.5">
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFE7F3] text-[#D6006E] shadow-inner">
                                  <ClipboardList size={16} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E]">{orderCardFlowLabel}</p>
                                  <p className="mt-1.5 text-xs font-black leading-snug text-[#4A042A]">{orderCardFlowCopy}</p>
                                </div>
                              </div>
                            </div>

                            <div className="order-summary-card rounded-[22px] p-3.5">
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDE8F4] text-[#B21764] shadow-inner">
                                  <Users size={16} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E]">Profile status</p>
                                  <p className="mt-1.5 text-xs font-black leading-snug text-[#4A042A]">{orderCardProfileCopy}</p>
                                </div>
                              </div>
                            </div>

                            <div className="order-summary-card rounded-[22px] p-3.5 sm:col-span-2 lg:col-span-1">
                              <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF2DE] text-amber-600 shadow-inner">
                                  <ShieldCheck size={16} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E]">Protection rule</p>
                                  <p className="mt-1.5 text-xs font-black leading-snug text-[#4A042A]">{orderCardProtectionCopy}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {showHowTo && (
                        <div className="relative z-[1] mt-3 order-input-panel rounded-[24px] p-4 animate-fadeIn">
                          <div className="mb-3 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D6006E]">Ordering steps</h4>
                              <p className="mt-1.5 text-xs font-bold leading-relaxed text-[#8F2C5D]">
                                Quick path from details to checkout.
                              </p>
                            </div>
                            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#B21764]">
                              <ArrowRight size={12} />
                              Details to checkout
                            </div>
                          </div>

                          <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
                            {[
                              ['01', 'Enter details', 'Use your regular email so your profile can load.'],
                              ['02', 'Choose vials', 'Every 10 vials makes 1 protected kit.'],
                              ['03', 'Save order', 'Submit your cart to lock in your spot.'],
                              ['04', 'Watch for payments', 'Wait for the payment announcement.'],
                              ['05', 'Return to pay', 'Use the same email and upload proof.'],
                            ].map(([step, title, copy]) => (
                              <div key={step} className="order-step-card rounded-[20px] p-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D6006E]">{step}</p>
                                <h5 className="mt-1.5 text-xs sm:text-sm font-black text-[#4A042A]">{title}</h5>
                                <p className="mt-1 text-[11px] font-bold leading-relaxed text-[#8F2C5D]">{copy}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div id="catalog-panel" className={`shop-surface rounded-[30px] shadow-sm relative z-10 transition-all duration-300 ${shakingField === 'products' ? 'animate-shake border-red-500 ring-4 ring-red-100' : ''}`}>
                      {isOrderOnlyMode ? (
                        <>
                          <div className="sticky top-0 z-30 px-3 py-3 sm:p-5 border-b border-white/60 flex flex-col gap-2 bg-white/45 backdrop-blur-2xl rounded-t-[30px] shadow-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className={`w-full sm:w-auto transition-all duration-300 ${isScrolled ? 'hidden sm:block' : 'block'}`}>
                                <h2 className="font-black text-[#D6006E] uppercase tracking-widest text-sm sm:text-base flex items-center gap-2 whitespace-nowrap">
                                  {settings.paymentsOpen ? <ShieldCheck size={22} className="text-emerald-500" /> : <ClipboardList size={22} className="text-sky-600" />}
                                  {settings.paymentsOpen ? 'Payment Window Live' : 'Review Window Live'}
                                </h2>
                                <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">
                                  {settings.paymentsOpen
                                    ? 'Catalog is hidden now so buyers stay focused on saved orders and payment.'
                                    : 'Catalog stays private unless the batch code was entered, but buyers can still review saved orders here.'}
                                </p>
                              </div>
                              <div className={`rounded-[22px] px-4 py-3 text-left sm:max-w-[260px] ${settings.paymentsOpen ? 'border border-emerald-200 bg-emerald-50' : 'border border-sky-200 bg-sky-50'}`}>
                                <p className={`text-[10px] font-black uppercase tracking-[0.22em] ${settings.paymentsOpen ? 'text-emerald-700' : 'text-sky-700'}`}>Next step</p>
                                <p className={`mt-1.5 text-xs font-black leading-relaxed ${settings.paymentsOpen ? 'text-emerald-900' : 'text-sky-900'}`}>
                                  {settings.paymentsOpen
                                    ? 'Use Review to confirm your saved order, then continue to Pay Now when you are ready.'
                                    : 'Load your saved order, check that everything looks right, and mark it if you are good before payments open.'}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-b-[30px] bg-white/10 p-3 sm:p-4">
                            {cartList.length === 0 ? (
                              <div className="rounded-[24px] border border-dashed border-pink-200 bg-white/80 px-5 py-10 text-center">
                                <p className="text-sm font-black text-[#4A042A]">Load your saved order first</p>
                                <p className="mt-2 text-xs font-bold leading-relaxed text-slate-500">
                                  Enter the same email you used for your order so the saved items, total, and payment details can appear here.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div className="rounded-[22px] border border-pink-100 bg-white/80 p-4 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E]">Saved items</p>
                                    <p className="mt-2 text-2xl font-black text-[#4A042A]">{cartList.length}</p>
                                    <p className="mt-1 text-xs font-bold text-slate-500">products in your locked order</p>
                                  </div>
                                  <div className="rounded-[22px] border border-pink-100 bg-white/80 p-4 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E]">Total vials</p>
                                    <p className="mt-2 text-2xl font-black text-[#4A042A]">{selectedVialCount}</p>
                                    <p className="mt-1 text-xs font-bold text-slate-500">{settings.paymentsOpen ? 'already frozen for this payment window' : 'currently saved in your review copy'}</p>
                                  </div>
                                  <div className="rounded-[22px] border border-pink-100 bg-white/80 p-4 shadow-sm">
                                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E]">{settings.paymentsOpen ? 'Amount due' : 'Current total'}</p>
                                    <p className="mt-2 text-2xl font-black text-[#4A042A]">₱{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="mt-1 text-xs font-bold text-slate-500">{settings.paymentsOpen ? 'includes admin fee' : 'review this total before payments open'}</p>
                                  </div>
                                </div>

                                <div className="rounded-[24px] border border-pink-100 bg-white/85 p-4 shadow-sm">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-[#D6006E]">Saved Order Snapshot</h3>
                                      <p className="mt-1 text-xs font-bold text-slate-500">
                                        {settings.paymentsOpen ? 'This is the order that will be used for payment.' : 'This is the saved order you are reviewing before payments open.'}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button onClick={() => setShowPreviewModal(true)} className="rounded-full border-2 border-pink-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#D6006E] shadow-sm hover:bg-pink-50">
                                        Review Saved Order
                                      </button>
                                      {settings.paymentsOpen ? (
                                        <button onClick={() => setShowPayModal(true)} className="rounded-full bg-[#008040] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-md hover:scale-[0.98] transition-transform active:scale-95">
                                          Pay Now
                                        </button>
                                      ) : (
                                        <button
                                          onClick={confirmBuyerReview}
                                          disabled={currentReviewReady}
                                          className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-colors hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          {currentReviewReady ? 'Already Marked' : 'Looks Good To Me'}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-4 grid gap-2">
                                    {cartList.map((item, idx) => (
                                      <div key={`${item.product}-${idx}`} className="flex items-center justify-between gap-3 rounded-[18px] border border-pink-50 bg-[#FFF8FC] px-3 py-2.5">
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-black text-[#4A042A]">{item.product}</p>
                                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">x{item.qty} locked in</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                          <p className="text-sm font-black text-[#D6006E]">${item.total.toFixed(2)}</p>
                                          <p className="mt-1 text-[10px] font-bold text-slate-400">${item.price.toFixed(2)} / vial</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="sticky top-0 z-30 px-3 py-1.5 sm:p-5 border-b border-white/60 flex flex-col sm:flex-row justify-between items-center gap-1.5 sm:gap-4 bg-white/45 backdrop-blur-2xl rounded-t-[30px] shadow-sm">
                            <div className={`w-full sm:w-auto transition-all duration-300 ${isScrolled ? 'hidden sm:block' : 'block'}`}>
                              <h2 className="font-black text-[#D6006E] uppercase tracking-widest text-sm sm:text-base flex items-center gap-2 whitespace-nowrap">
                                <Package size={22} className="text-[#FF1493]" /> Shop Catalog
                              </h2>
                              <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">
                                {liveResultsLabel} shown, {selectedVialCount} vials selected
                              </p>
                            </div>

                            <div className="flex-1 w-full flex flex-col gap-1 sm:gap-2">
                              <div className="flex gap-2 overflow-x-auto hide-scroll pb-1 pl-[106px] sm:pl-0">
                                {POPULAR_CATEGORIES.map(cat => (
                                  <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors border shadow-sm ${selectedCategory === cat ? 'bg-[#D6006E] text-white border-[#D6006E]' : 'bg-white text-slate-500 border-pink-100 hover:border-pink-300 hover:text-pink-600'}`}
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                              <div className="relative w-full">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search products..." className="w-full pl-11 pr-4 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold border-2 border-pink-200 outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100 transition-all bg-[#FFF0F5] placeholder:text-pink-300 text-[#4A042A] shadow-inner" />
                              </div>
                              {(searchQuery || selectedCategory !== 'All') && (
                                <div className="flex items-center justify-between gap-3 px-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Viewing {liveResultsLabel}
                                  </p>
                                  <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="text-[10px] font-black text-[#D6006E] uppercase tracking-widest hover:underline">
                                    Clear Filters
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {isReviewStageOpen && (
                            <div className="mx-2 mt-2 rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-left shadow-sm sm:mx-3 sm:mt-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-inner">
                                  <ClipboardList size={15} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-700">Reference only</p>
                                  <p className="mt-1.5 text-xs font-black leading-relaxed text-sky-900">
                                    Catalog stays visible during review so buyers can compare products and prices, but quantities are locked until payments open.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {products.length === 0 ? (
                            <div className="p-12 text-center text-pink-400 font-bold italic">No products available yet.</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 p-2 sm:p-3 bg-white/10 rounded-b-[30px]">
                              {filteredShopProducts.map(p => {
                                const cart = cartItems[p.name] || { v: 0 };
                                const active = cart.v > 0;
                                const exist = existingMap[p.name] || 0;
                                const productInfo = buildProductInfo(p.name);
                                const productImage = getProductImageSrc(productInfo);
                                const productImageSrc = getRealProductImageSrc(p.name, p.imageUrl || '');
                                const protectedKits = Math.floor((cart.v || 0) / 10);
                                const looseVials = (cart.v || 0) % 10;
                                const compactStatusText = p.statusKey === 'locked'
                                  ? 'locked'
                                  : p.statusKey === 'full'
                                    ? 'full'
                                    : p.totalVials === 0
                                      ? 'new'
                                      : p.slotsLeft === 0
                                        ? 'open'
                                        : `${p.slotsLeft} left`;

                                const bgClass = shakingProd === p.name ? 'animate-shake border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] z-20 bg-red-50'
                                  : (active ? 'bg-[#FFF0F5] border-[#D6006E] shadow-md scale-[1.01] z-10'
                                    : (exist > 0 ? 'bg-[#F0FDF4] border-[#4ADE80] shadow-sm'
                                      : 'bg-white border-[#FFE4E1] hover:border-pink-300'));

                                return (
                                  <div
                                    key={p.id}
                                    data-name={p.name}
                                    onClick={!isCartEditable ? () => showToast(isReviewStageOpen ? 'Review stage is live. Buyers cannot change quantities right now.' : 'This order is locked right now.', 5000) : (p.isClosed ? () => showToast(getAvailabilityMessage(p.name, p), 6000) : undefined)}
                                    className={`relative p-2 sm:p-2.5 rounded-2xl border-2 transition-all duration-300 overflow-hidden ${bgClass} ${(!isCartEditable || p.isClosed) ? 'cursor-not-allowed' : ''}`}
                                  >

                                    {exist > 0 && (
                                      <div className="bg-[#22C55E] text-white text-[9px] font-black uppercase px-2.5 py-1 -mx-2.5 sm:-mx-3 -mt-2.5 sm:-mt-3 mb-2 flex justify-between items-center shadow-sm">
                                        <span className="flex items-center gap-1">{active && cart.v !== exist ? 'You Have' : 'In Your Order'}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="bg-white/25 px-2 py-0.5 rounded-md">{exist} Vials</span>
                                          {active && cart.v !== exist && (
                                            <span className="bg-[#FFE066] text-[#7A4B00] px-2 py-0.5 rounded-md">Now {cart.v}</span>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-[40px_1fr_62px] gap-2 items-center">
                                      <img src={productImageSrc} alt={`${p.name} vial`} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = productImage; }} className="w-[40px] h-[52px] shrink-0 rounded-lg border border-pink-100 bg-white object-cover shadow-sm" />

                                      <div className={`min-w-0 ${(!isCartEditable || p.isClosed) ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <div className="flex items-start gap-1 min-w-0">
                                          <h3 className="font-black text-[16px] sm:text-[17px] text-[#4A042A] leading-[1.05] line-clamp-2 flex-1 min-w-0">{p.name}</h3>
                                          <button onClick={() => setQuickInfoProduct(productInfo)} className="shrink-0 rounded-full border border-pink-200 bg-pink-50 text-pink-600 w-4 h-4 flex items-center justify-center text-[9px] font-black leading-none hover:bg-pink-100 transition-colors" title="Learn more">
                                            ?
                                          </button>
                                        </div>

                                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                          <span className="bg-[#FF1493] text-white px-2 py-0.5 rounded-full text-[11px] font-black shadow-sm">${p.pricePerVialUSD.toFixed(2)} / vial</span>
                                          {productInfo.strength && (
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{productInfo.strength}</span>
                                          )}
                                        </div>

                                        <div className="hidden sm:block text-[10px] font-bold text-slate-600 leading-snug truncate mt-1">{productInfo.shortDesc}</div>

                                        <div className="flex items-center gap-2 mt-1 text-[8px] font-black uppercase tracking-widest">
                                          <span className={`${p.statusKey === 'available' ? 'text-emerald-600' : p.statusKey === 'full' ? 'text-rose-500' : p.statusKey === 'locked' ? 'text-slate-400' : 'text-violet-500'}`}>
                                            {compactStatusText}
                                          </span>
                                          <span className="text-pink-500">{protectedKits} kit</span>
                                          <span className="text-pink-400">{looseVials} loose</span>
                                        </div>
                                      </div>

                                      <div className={`flex flex-col items-end gap-1 ${(!isCartEditable || p.isClosed) ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400">Vials</span>
                                        <label className="bg-slate-50 border border-pink-100 rounded-lg px-1.5 py-1 flex items-center justify-end shadow-inner w-full">
                                          <input
                                            type="number"
                                            min="0"
                                            value={cartInputDrafts[p.name] ?? (cart.v || '')}
                                            onFocus={e => handleCartFocus(p.name, e)}
                                            onChange={e => handleCartChange(p.name, e.target.value)}
                                            onBlur={() => handleCartBlur(p.name)}
                                            className={`w-full text-right font-black text-[16px] outline-none bg-transparent placeholder:text-pink-200 ${shakingProd === p.name ? 'text-red-600' : 'text-[#D6006E]'}`}
                                            placeholder="0"
                                            disabled={!isCartEditable || p.isClosed}
                                          />
                                        </label>
                                        <span className="text-[7px] font-bold text-slate-400 whitespace-nowrap">10 = 1 kit</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <aside className={desktopCartAsideClass}>
                    <div className={desktopCartShellClass}>
                      <div className="border-b border-[#ECD8E0] pb-3 mb-4 text-center">
                        <h3 className={desktopCartTitleClass}>Your Cart</h3>
                      </div>
                      {settings.addOnly && hasExistingOrder && cartList.length > 0 && (
                        <div className="mb-3 rounded-xl bg-pink-50 border border-pink-100 px-3 py-2 text-[10px] font-bold text-[#9E2A5E] text-center">
                          Add-only mode is on. You can only add more.
                        </div>
                      )}
                      <div className="max-h-[350px] overflow-y-auto mb-4 space-y-2 pr-2 hide-scroll">
                        {cartList.length === 0 ? <div className="text-center text-pink-300 font-bold italic py-8">No items selected yet!</div> : cartList.map((i, idx) => (
                          <div key={idx} className="flex justify-between items-center gap-3 text-sm xl:text-base border-b border-pink-50 border-dashed pb-2">
                            <div className="min-w-0">
                              <div className="font-bold truncate">{i.product}</div>
                              {(existingMap[i.product] || 0) > 0 && (
                                <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-black uppercase tracking-wide">
                                  <span className="rounded-full bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5">
                                    You have {existingMap[i.product]}
                                  </span>
                                  {i.qty !== existingMap[i.product] && (
                                    <span className="rounded-full bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5">
                                      Now {i.qty}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {isCartEditable ? (
                                <div className={`flex items-center gap-1 justify-end mb-1 rounded-full px-1 py-0.5 transition-all ${shakingProd === i.product ? 'animate-shake bg-red-50 ring-2 ring-red-200' : ''}`}>
                                  <button onClick={() => adjustCartItem(i.product, -1)} className={`w-6 h-6 rounded-full border font-black leading-none transition-colors ${shakingProd === i.product ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-pink-200 bg-white text-[#D6006E] hover:bg-pink-50'}`}>
                                    -
                                  </button>
                                  <span className={`min-w-[34px] text-center font-black ${shakingProd === i.product ? 'text-red-600' : 'text-[#D6006E]'}`}>
                                    {i.qty}
                                  </span>
                                  <button onClick={() => adjustCartItem(i.product, 1)} className={`w-6 h-6 rounded-full border font-black leading-none transition-colors ${shakingProd === i.product ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-pink-200 bg-white text-[#D6006E] hover:bg-pink-50'}`}>
                                    +
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[#D6006E] font-black">x{i.qty}</span>
                              )}
                              <div className="mt-1 inline-flex items-center rounded-full bg-[#FFF0F5] border border-pink-100 px-2 py-0.5 text-[10px] text-[#D6006E] font-black">
                                Now x{i.qty} • ${(i.price * i.qty).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t-2 border-pink-100 space-y-1 text-sm xl:text-base">
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Subtotal</span><span>${subtotalUSD.toFixed(2)}</span></div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Admin Fee</span><span>₱{settings.adminFeePhp}</span></div>
                        <div className="flex flex-col items-end pt-2">
                          <span className="text-3xl xl:text-4xl font-black text-[#D6006E]">₱{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 mt-6">
                        <button onClick={() => setShowPreviewModal(true)} disabled={cartList.length === 0} className="w-full bg-white text-[#D6006E] border-2 border-pink-200 font-bold py-4 rounded-full uppercase tracking-widest text-sm shadow-sm hover:bg-pink-50 disabled:opacity-50 transition-transform hover:scale-[0.98] active:scale-95">Review</button>
                        {!settings.paymentsOpen ? (
                          isReviewStageOpen ? (
                            <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-sky-700">
                              Buyer edits paused during review
                            </div>
                          ) : (
                          <button onClick={submitOrder} disabled={isBtnLoading} className={`${originalBtn} w-full py-4`}>
                            {isBtnLoading ? "Saving..." : "Save Order"}
                          </button>
                          )
                        ) : (
                          <button onClick={() => setShowPayModal(true)} disabled={cartList.length === 0} className="w-full bg-[#008040] text-white font-bold py-4 rounded-full uppercase tracking-widest text-sm shadow-md hover:scale-[0.98] transition-transform active:scale-95 disabled:opacity-50">Pay Now</button>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </div>

          {/* Sticky Mobile Footer ONLY when Store is Open */}
          {settings.storeOpen !== false && !showShopAccessGate && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t-2 border-[#FF1493] p-4 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center gap-2">
              <div className="shrink-0">
                <div className="text-[10px] font-black text-[#D6006E] uppercase">Total Estimate</div>
                <div className="text-xl sm:text-2xl font-black text-[#D6006E]">₱{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              <div className="flex gap-2 w-full justify-end">
                <button onClick={() => setShowPreviewModal(true)} disabled={cartList.length === 0} className="bg-white text-[#D6006E] border-2 border-pink-200 px-3 sm:px-4 py-2 sm:py-3 rounded-full font-bold uppercase text-[10px] sm:text-sm shadow-sm disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">Review</button>

                {settings.paymentsOpen ? (
                  <button onClick={() => setShowPayModal(true)} disabled={cartList.length === 0} className="bg-[#008040] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold uppercase text-[10px] sm:text-sm shadow-md disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">Pay Now</button>
                ) : isReviewStageOpen ? (
                  <button disabled className="bg-sky-100 text-sky-700 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black uppercase text-[10px] sm:text-sm shadow-md opacity-70 whitespace-nowrap">
                    Review Freeze
                  </button>
                ) : (
                  <button onClick={submitOrder} disabled={isBtnLoading} className="bg-[#D6006E] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black uppercase text-[10px] sm:text-sm shadow-md disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">
                    {isBtnLoading ? 'Saving' : 'Save'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* âœ¨ MODALS FOR SHOP */}

          {/* âœ¨ IMPROVED: Sleek & compact Payment Modal */}
          {showPayModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-2 border-pink-200">
                <div className="bg-[#FFF0F5] p-4 flex justify-between items-center border-b border-[#FFC0CB]">
                  <h2 className="brand-title text-xl text-pink-600">Checkout</h2>
                  <button onClick={() => setShowPayModal(false)} className="text-pink-600 font-black text-2xl hover:scale-110 transition-transform">&times;</button>
                </div>
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 hide-scroll bg-white">

                  <div className="bg-pink-100 p-6 rounded-[24px] border-4 border-pink-200 text-center shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent"></div>
                    <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1 relative z-10">Total Amount to Pay</p>
                    <h3 className="text-3xl sm:text-4xl font-black text-[#D6006E] drop-shadow-sm relative z-10">₱{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase">Send Payment To</p>
                      <p className="font-black text-[#D6006E] text-xs">{currentPaymentRoute.adminAssigned || 'Admin'}</p>
                    </div>

                    {currentPaymentRoute.hasRoute ? (
                      <div className="flex flex-col gap-2">
                        {currentPaymentRoute.bankQr ? (
                          <img src={currentPaymentRoute.bankQr} alt="QR Code" className="w-full max-w-[160px] mx-auto rounded-lg border border-slate-100" />
                        ) : null}
                        {currentPaymentRoute.bankDetails ? (
                          <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                            <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap font-bold m-0">{currentPaymentRoute.bankDetails}</pre>
                          </div>
                        ) : null}
                        {lockedPaymentSnapshot ? (
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 text-center">Frozen for this payment window</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-rose-500 text-center py-2">No payment options configured.</p>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <select value={addressForm.shipOpt} onChange={e => setAddressForm({ ...addressForm, shipOpt: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#4A042A] outline-none transition-all ${addressErrors.shipOpt ? 'animate-shake border-red-500 bg-red-50' : 'border-slate-200 focus:border-[#D6006E]'}`}>
                        <option value="" disabled>Select Courier...</option>
                        {settings.shippingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <select value={addressForm.partialShipPref} onChange={e => setAddressForm({ ...addressForm, partialShipPref: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#4A042A] outline-none transition-all ${addressErrors.partialShipPref ? 'animate-shake border-red-500 bg-red-50' : 'border-slate-200 focus:border-[#D6006E]'}`}>
                        <option value="" disabled>If may maunang dumating...</option>
                        {PARTIAL_SHIP_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-700">
                      Minsan hiwa-hiwalay dumadating ang kits. Pili ka dito kung gusto mo i-ship agad yung ready na, or okay lang sayo maghintay hanggang kumpleto lahat.
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      <input type="text" value={addressForm.street} onChange={e => setAddressForm({ ...addressForm, street: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 transition-all ${addressErrors.street ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Street / Lot / Bldg *" />
                      <input type="text" value={addressForm.brgy} onChange={e => setAddressForm({ ...addressForm, brgy: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 sm:col-span-1 transition-all ${addressErrors.brgy ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Barangay *" />
                      <input type="text" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 sm:col-span-1 transition-all ${addressErrors.city ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="City *" />
                      <input type="text" value={addressForm.prov} onChange={e => setAddressForm({ ...addressForm, prov: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 sm:col-span-1 transition-all ${addressErrors.prov ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Province *" />
                      <input type="text" value={addressForm.zip} onChange={e => setAddressForm({ ...addressForm, zip: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 sm:col-span-1 transition-all ${addressErrors.zip ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Zip Code *" />
                      <input type="text" value={addressForm.contact} onChange={e => setAddressForm({ ...addressForm, contact: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 transition-all ${addressErrors.contact ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Contact # *" />
                    </div>
                  </div>

                  <div className={`bg-slate-50 p-2.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${addressErrors.proofFile ? 'animate-shake border-red-500 bg-red-50' : 'border-slate-200'}`}>
                    <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target?.files?.[0] || null)} className={`w-full text-xs font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:text-white cursor-pointer ${addressErrors.proofFile ? 'text-red-600 file:bg-red-500' : 'text-[#D6006E] file:bg-[#FF1493] hover:file:bg-[#D6006E]'}`} />
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">Your Order Summary</p>
                    {cartList.map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm font-bold text-[#4A042A] mb-1.5">
                        <span><span className="text-[#D6006E]">x{i.qty}</span> {i.product}</span>
                        <span className="text-slate-500">${(i.price * i.qty).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-200 mt-2">
                      <span>Admin Fee</span>
                      <span>₱{settings.adminFeePhp}</span>
                    </div>
                  </div>

                </div>
                <div className="p-4 border-t border-pink-100 bg-white">
                  <button onClick={submitPayment} disabled={isBtnLoading} className={`${originalBtn} w-full py-3`}>
                    {isBtnLoading ? 'Uploading...' : 'Complete Payment'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPreviewModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
                <div className="bg-[#FFF0F5] p-5 flex justify-between items-center border-b-2 border-[#FFC0CB]">
                  <div>
                    <h2 className="brand-title text-2xl text-pink-600">Order Confirmation</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-400 mt-1">
                      {settings.paymentsOpen
                        ? 'Check your saved order before payment'
                        : isReviewStageOpen
                          ? 'Review your saved order before payments open'
                          : 'Adjust quantities before you save'}
                    </p>
                  </div>
                  <button onClick={() => setShowPreviewModal(false)} className="text-pink-600 font-black text-2xl hover:scale-110 transition-transform">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 hide-scroll">
                  {cartList.length === 0 ? (
                    <p className="text-center text-pink-400 font-bold italic py-8">Your cart is empty!</p>
                  ) : (
                    cartList.map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-3 text-sm border-b border-pink-50 border-dashed pb-3">
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-[#4A042A]">{i.product}</div>
                          {(existingMap[i.product] || 0) > 0 && (
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-black uppercase tracking-wide">
                              <span className="rounded-full bg-sky-50 text-sky-700 border border-sky-100 px-2 py-0.5">
                                You have {existingMap[i.product]}
                              </span>
                              {i.qty !== existingMap[i.product] && (
                                <span className="rounded-full bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5">
                                  Now {i.qty}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {isCartEditable ? (
                            <div className={`flex items-center gap-1 justify-end mb-1 rounded-full px-1 py-0.5 transition-all ${shakingProd === i.product ? 'animate-shake bg-red-50 ring-2 ring-red-200' : ''}`}>
                              <button onClick={() => adjustCartItem(i.product, -1)} className={`w-7 h-7 rounded-full border font-black leading-none transition-colors ${shakingProd === i.product ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-pink-200 bg-white text-[#D6006E] hover:bg-pink-50'}`}>
                                -
                              </button>
                              <span className={`min-w-[36px] text-center font-black ${shakingProd === i.product ? 'text-red-600' : 'text-[#D6006E]'}`}>
                                {i.qty}
                              </span>
                              <button onClick={() => adjustCartItem(i.product, 1)} className={`w-7 h-7 rounded-full border font-black leading-none transition-colors ${shakingProd === i.product ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-pink-200 bg-white text-[#D6006E] hover:bg-pink-50'}`}>
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#D6006E] font-black">x{i.qty}</span>
                          )}
                          <div className="text-[11px] text-gray-500 font-bold">${(i.price * i.qty).toFixed(2)}</div>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="pt-4 space-y-2 text-sm border-t-2 border-pink-100">
                    <div className="flex justify-between font-bold text-gray-500 uppercase"><span>Subtotal</span><span>${subtotalUSD.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-gray-500 uppercase"><span>Admin Fee</span><span>₱{settings.adminFeePhp}</span></div>
                  </div>
                </div>
                <div className="p-6 border-t-2 border-pink-50 bg-[#FFF0F5]">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-pink-400">TOTAL PHP</span>
                    <span className="text-2xl font-black text-pink-600">₱{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!settings.paymentsOpen ? (
                      isReviewStageOpen ? (
                        <div className="w-full rounded-full border-2 border-sky-200 bg-sky-50 py-3 text-center text-sm font-black uppercase tracking-widest text-sky-700">
                          Review Only - Edits Paused
                        </div>
                      ) : (
                      <button onClick={submitOrder} disabled={isBtnLoading} className={originalBtn + " w-full"}>
                        {isBtnLoading ? 'Saving...' : 'Save Order'}
                      </button>
                      )
                    ) : (
                      <button onClick={() => { setShowPreviewModal(false); setShowPayModal(true); }} disabled={cartList.length === 0} className="w-full bg-[#008040] text-white font-bold py-3 rounded-full uppercase tracking-widest text-sm shadow-md disabled:opacity-50">
                        Pay Now
                      </button>
                    )}
                    <button onClick={() => setShowPreviewModal(false)} className="w-full rounded-full border-2 border-pink-200 bg-white py-3 text-sm font-black uppercase tracking-widest text-[#D6006E] hover:bg-pink-50">
                      {settings.paymentsOpen ? 'Close Review' : isReviewStageOpen ? 'Back to Review' : 'Continue Shopping'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* âœ¨ IMPROVED: Compact Hit List Modal */}
          {showHitListModal && (() => {
            const userEmailTrimmed = customerEmail.toLowerCase().trim();
            const modalHitGroups = Object.values(trimmingHitList.reduce((acc, item) => {
              const key = `${item.prod}||${item.boxNum}||${item.missingSlots}`;
              if (!acc[key]) {
                acc[key] = {
                  key,
                  prod: item.prod,
                  boxNum: item.boxNum,
                  missingSlots: item.missingSlots,
                  riskyVials: 0,
                  myRisk: false,
                  rows: []
                };
              }
              acc[key].rows.push(item);
              acc[key].riskyVials += Number(item.amountToRemove || 0);
              if (item.email === userEmailTrimmed) acc[key].myRisk = true;
              return acc;
            }, {})).map(group => ({
              ...group,
              customers: new Set(group.rows.map(row => row.email)).size,
              rows: [...group.rows].sort((a, b) => {
                const aIsMe = a.email === userEmailTrimmed;
                const bIsMe = b.email === userEmailTrimmed;
                if (aIsMe && !bIsMe) return -1;
                if (!aIsMe && bIsMe) return 1;
                const riskDiff = Number(b.amountToRemove || 0) - Number(a.amountToRemove || 0);
                if (riskDiff !== 0) return riskDiff;
                return (a.name || a.email).localeCompare(b.name || b.email);
              })
            })).sort((a, b) => {
              if (a.myRisk && !b.myRisk) return -1;
              if (!a.myRisk && b.myRisk) return 1;
              const urgencyDiff = Number(a.missingSlots || 0) - Number(b.missingSlots || 0);
              if (urgencyDiff !== 0) return urgencyDiff;
              const customerDiff = Number(b.customers || 0) - Number(a.customers || 0);
              if (customerDiff !== 0) return customerDiff;
              const productDiff = a.prod.localeCompare(b.prod);
              if (productDiff !== 0) return productDiff;
              return Number(a.boxNum || 0) - Number(b.boxNum || 0);
            });

            return (
              <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border-2 border-pink-200">
                  <div className="bg-[#FFF0F5] p-4 flex justify-between items-center border-b border-[#FFC0CB]">
                    <h2 className="brand-title text-xl text-rose-600 flex items-center gap-2"><AlertTriangle size={20} /> Boxes To Save</h2>
                    <button onClick={() => setShowHitListModal(false)} className="text-pink-600 font-black text-2xl hover:scale-110 transition-transform">&times;</button>
                  </div>
                  <div className="p-4 sm:p-5 overflow-y-auto bg-slate-50 hide-scroll">
                    <p className="mb-2 text-center text-[10px] font-bold text-slate-500">
                      Small view: use `+` or `-` here.
                    </p>
                    {modalHitGroups.length === 0 ? (
                      <div className="bg-emerald-50 p-6 rounded-xl text-center font-bold text-emerald-600 border border-emerald-200 uppercase tracking-widest text-[10px]">
                        All boxes are full. Nothing needs help right now.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {modalHitGroups.map((group) => {
                          const myCurrentQty = cartItems[group.prod]?.v || existingOrderData.items[group.prod] || 0;
                          const myExistingQty = existingOrderData.items[group.prod] || 0;
                          const canDecrease = isCartEditable && (!settings.addOnly ? myCurrentQty > 0 : myCurrentQty > myExistingQty);
                          const canIncrease = isCartEditable;
                          const pricePerVialUSD = Number(products.find(p => p.name === group.prod)?.pricePerVialUSD || 0);
                          return (
                            <details key={group.key} className={`rounded-lg border px-2.5 py-1.5 shadow-sm ${group.myRisk ? 'bg-rose-100 border-rose-400' : 'bg-white border-rose-100'}`}>
                              <summary className="list-none cursor-pointer">
                                <div className="min-w-0 text-[#4A042A]">
                                  <div className="min-w-0">
                                    <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[12px] font-black">
                                      <span className="min-w-0 flex-1 truncate">{group.prod}</span>
                                      <span className="shrink-0 rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#D6006E]">
                                        ${pricePerVialUSD.toFixed(2)} / vial • you {myCurrentQty}
                                      </span>
                                      {group.myRisk && (
                                        <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] uppercase tracking-widest text-rose-600">
                                          yours at risk
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="mt-1 flex items-center gap-1 overflow-x-auto hide-scroll whitespace-nowrap text-[10px] font-black uppercase tracking-widest">
                                    <span className="rounded-full border border-pink-200 bg-white px-2 py-1 text-rose-500">B{group.boxNum}</span>
                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">Need {group.missingSlots}</span>
                                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-500">Buyers {group.rows.length}</span>
                                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">Saved {myExistingQty}</span>
                                    <div className="ml-auto flex items-center gap-1 pl-1">
                                      <button
                                        onClick={(e) => { e.preventDefault(); adjustCartItem(group.prod, -1); }}
                                        disabled={!canDecrease}
                                        className="h-7 min-w-7 rounded-full border border-pink-200 bg-white px-1.5 text-[12px] font-black text-[#D6006E] transition-colors hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        -
                                      </button>
                                      <button
                                        onClick={(e) => { e.preventDefault(); confirmHitListIncrease(group.prod, 1, { missingSlots: group.missingSlots, boxNum: group.boxNum }); }}
                                        disabled={!canIncrease}
                                        className="h-7 min-w-7 rounded-full bg-[#FF1493] px-1.5 text-[12px] font-black text-white transition-colors hover:bg-[#D6006E] disabled:cursor-not-allowed disabled:opacity-40"
                                      >
                                        Add
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </summary>
                                <div className="mt-1.5 border-t border-rose-100 pt-1.5 space-y-1.5">
                                  <p className="text-[10px] font-bold leading-relaxed text-slate-500">
                                    If this box does not fill, the loose vials below may be cut. Try filling the box first. Admins should message buyers before removing loose vials.
                                  </p>
                                  {group.rows.map((row) => {
                                    const isMyItem = row.email === userEmailTrimmed;
                                    return (
                                    <div key={row.id} className={`flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[11px] ${isMyItem ? 'bg-rose-50 border border-rose-200' : 'bg-white border border-slate-200'}`}>
                                      <div className="min-w-0 truncate font-bold text-[#4A042A]">
                                        {row.handle || row.name || row.email}
                                        {isMyItem ? ' | yours' : ''}
                                      </div>
                                      <div className="shrink-0 font-black text-slate-500">
                                        at risk {row.amountToRemove}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-pink-100 bg-white space-y-2">
                    <p className="text-center text-[10px] font-bold text-slate-500">
                      Name + matching email are required before save will work.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={submitOrder}
                        disabled={isBtnLoading || !isHitListSaveReady || !isCartEditable}
                        className={`${originalBtn} w-full py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isReviewStageOpen ? 'Review Freeze' : isBtnLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button onClick={() => setShowHitListModal(false)} className="w-full py-3 text-sm rounded-full border-2 border-pink-200 bg-white text-[#D6006E] font-bold uppercase tracking-widest shadow-sm hover:bg-pink-50 transition-colors">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {pendingHitListAdd && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
              <div className="w-full max-w-sm rounded-[28px] border-2 border-pink-200 bg-white p-5 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D6006E]">Add More From Hit List</p>
                <h3 className="mt-2 text-xl font-black leading-tight text-[#4A042A]">{pendingHitListAdd.productName}</h3>
                <div className="mt-4 space-y-2 rounded-[22px] border border-pink-100 bg-[#FFF7FA] p-4 text-sm font-bold text-[#7B1B53]">
                  <div className="flex items-center justify-between gap-3">
                    <span>Price per vial • your qty now</span>
                    <span>${pendingHitListAdd.pricePerVialUSD.toFixed(2)} • {pendingHitListAdd.currentQty}</span>
                  </div>
                  {pendingHitListAdd.missingSlots > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span>{pendingHitListAdd.boxNum ? `Box ${pendingHitListAdd.boxNum}` : 'Current box'} still needs</span>
                      <span>{pendingHitListAdd.missingSlots} vial{pendingHitListAdd.missingSlots === 1 ? '' : 's'}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span>Add this many</span>
                    <div className="flex items-center gap-1 rounded-full border border-pink-200 bg-white px-1 py-1">
                      <button
                        onClick={() => setPendingHitListAdd(prev => {
                          const addQty = Math.max(1, (prev?.addQty || 1) - 1);
                          const nextQty = (prev?.currentQty || 0) + addQty;
                          const nextSubtotalUSD = (prev?.baseSubtotalUSD || 0) + ((prev?.pricePerVialUSD || 0) * addQty);
                          return {
                            ...prev,
                            addQty,
                            nextQty,
                            nextTotalPHP: lockedPaymentSnapshot?.totalPHP ?? ((nextSubtotalUSD > 0 && settings.fxRate > 0 ? nextSubtotalUSD + (settings.adminFeePhp / settings.fxRate) : 0) * settings.fxRate)
                          };
                        })}
                        className="h-8 w-8 rounded-full border border-pink-200 bg-white text-sm font-black text-[#D6006E] hover:bg-pink-50"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={pendingHitListAdd.addQty}
                        onChange={(e) => {
                          const addQty = Math.max(1, parseInt(e.target.value, 10) || 1);
                          const nextQty = pendingHitListAdd.currentQty + addQty;
                          const nextSubtotalUSD = pendingHitListAdd.baseSubtotalUSD + (pendingHitListAdd.pricePerVialUSD * addQty);
                          setPendingHitListAdd(prev => ({
                            ...prev,
                            addQty,
                            nextQty,
                            nextTotalPHP: lockedPaymentSnapshot?.totalPHP ?? ((nextSubtotalUSD > 0 && settings.fxRate > 0 ? nextSubtotalUSD + (settings.adminFeePhp / settings.fxRate) : 0) * settings.fxRate)
                          }));
                        }}
                        className="w-14 bg-transparent text-center text-sm font-black text-[#D6006E] outline-none"
                      />
                      <button
                        onClick={() => setPendingHitListAdd(prev => {
                          const addQty = Math.max(1, (prev?.addQty || 1) + 1);
                          const nextQty = (prev?.currentQty || 0) + addQty;
                          const nextSubtotalUSD = (prev?.baseSubtotalUSD || 0) + ((prev?.pricePerVialUSD || 0) * addQty);
                          return {
                            ...prev,
                            addQty,
                            nextQty,
                            nextTotalPHP: lockedPaymentSnapshot?.totalPHP ?? ((nextSubtotalUSD > 0 && settings.fxRate > 0 ? nextSubtotalUSD + (settings.adminFeePhp / settings.fxRate) : 0) * settings.fxRate)
                          };
                        })}
                        className="h-8 w-8 rounded-full border border-pink-200 bg-white text-sm font-black text-[#D6006E] hover:bg-pink-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Your qty after this</span>
                    <span>{pendingHitListAdd.nextQty}</span>
                  </div>
                  {pendingHitListAdd.missingSlots > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span>Needed left after this</span>
                      <span>
                        {Math.max(0, pendingHitListAdd.missingSlots - pendingHitListAdd.addQty)}
                        {pendingHitListAdd.addQty > pendingHitListAdd.missingSlots ? ` • +${pendingHitListAdd.addQty - pendingHitListAdd.missingSlots} extra` : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <span>Estimated total</span>
                    <span>₱{pendingHitListAdd.nextTotalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <p className="mt-3 text-xs font-bold leading-relaxed text-slate-500">
                  Pick how many vials you want to add, then save the updated total in one step.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setCartItems(prev => ({ ...prev, [pendingHitListAdd.productName]: { v: pendingHitListAdd.nextQty } }));
                      setCartInputDrafts(prev => {
                        const updated = { ...prev };
                        delete updated[pendingHitListAdd.productName];
                        return updated;
                      });
                      setPendingHitListAdd(null);
                    }}
                    className={`${originalBtn} w-full justify-center py-3 text-sm`}
                  >
                    Add To Cart
                  </button>
                  <button
                    onClick={() => setPendingHitListAdd(null)}
                    className="w-full rounded-full border-2 border-pink-200 bg-white py-3 text-sm font-black uppercase tracking-widest text-[#D6006E] hover:bg-pink-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCalculatorModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[390] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
                <div className="bg-gradient-to-r from-[#FF7A59] via-[#FF4FA1] to-[#FF1493] px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 relative">
                  <button onClick={() => setShowCalculatorModal(false)} className="absolute top-3 right-4 text-white/80 hover:text-white font-black text-[28px] leading-none hover:scale-110 transition-transform">&times;</button>
                  <div className="text-white pr-10 sm:pr-0">
                    <h2 className="brand-title text-[1.8rem] sm:text-[2.25rem] leading-[0.92] m-0 text-white shadow-none">Peptide Calculator</h2>
                    <p className="text-white/90 font-bold text-[12px] sm:text-[13px] mt-0.5 max-w-lg leading-snug">Calculate concentration, draw amount, and syringe units for peptide reconstitution.</p>
                    <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/72">Built for BBP using standard U-100 insulin syringe math.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <div className="rounded-[20px] border border-white/30 bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm min-w-[100px]">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Draw To</p>
                      <p className="mt-1 text-lg font-black leading-none">{peptideCalculator ? `${peptideCalculator.syringeUnits.toFixed(0)} units` : '--'}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/30 bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm min-w-[100px]">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Dose</p>
                      <p className="mt-1 text-lg font-black leading-none">{peptideCalculator ? `${peptideCalculator.doseMg}mg` : '--'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 hide-scroll space-y-5">
                  <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
                    <div className="bg-white rounded-[28px] border border-pink-100 shadow-sm p-5">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-500">Calculator Inputs</p>
                          <p className="mt-1 text-sm font-bold text-slate-500">Set your target dose, vial strength, and bacteriostatic water volume.</p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-5">
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D6006E]">Dose of Peptide</label>
                            <input type="number" min="0.01" step="0.01" value={calculatorDoseMg} onChange={e => setCalculatorDoseMg(Number(e.target.value) || 0)} className="w-24 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-right text-sm font-black text-[#4A042A] outline-none focus:border-[#D6006E]" />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {CALCULATOR_DOSE_PRESETS.map((dose) => (
                              <button
                                key={`dose-${dose}`}
                                type="button"
                                onClick={() => setCalculatorDoseMg(dose)}
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${calculatorDoseMg === dose ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-200 bg-white text-[#9E2A5E] hover:border-pink-300 hover:bg-pink-50'}`}
                              >
                                {dose}mg
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D6006E]">Strength of Peptide</label>
                            <input type="number" min="0.1" step="0.1" value={calculatorStrengthMg} onChange={e => setCalculatorStrengthMg(Number(e.target.value) || 0)} className="w-24 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-right text-sm font-black text-[#4A042A] outline-none focus:border-[#D6006E]" />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {CALCULATOR_STRENGTH_PRESETS.map((strength) => (
                              <button
                                key={`strength-${strength}`}
                                type="button"
                                onClick={() => setCalculatorStrengthMg(strength)}
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${calculatorStrengthMg === strength ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-200 bg-white text-[#9E2A5E] hover:border-pink-300 hover:bg-pink-50'}`}
                              >
                                {strength}mg
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D6006E]">Water of Peptide</label>
                            <input type="number" min="0.1" step="0.1" value={calculatorWaterMl} onChange={e => setCalculatorWaterMl(Number(e.target.value) || 0)} className="w-24 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-right text-sm font-black text-[#4A042A] outline-none focus:border-[#D6006E]" />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {CALCULATOR_WATER_PRESETS.map((water) => (
                              <button
                                key={`water-${water}`}
                                type="button"
                                onClick={() => setCalculatorWaterMl(water)}
                                className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${calculatorWaterMl === water ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-200 bg-white text-[#9E2A5E] hover:border-pink-300 hover:bg-pink-50'}`}
                              >
                                {water}mL
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[28px] border border-pink-100 shadow-sm p-5 space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-500">Results</p>
                        <p className="mt-1 text-sm font-bold text-slate-500">Use this as a quick reference for how much to draw into a 100-unit insulin syringe.</p>
                      </div>

                      {peptideCalculator ? (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-[22px] border border-pink-100 bg-pink-50/70 p-4 min-h-[124px] flex flex-col justify-between">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Peptide Dose</p>
                              <div className="mt-3">
                                <p className="text-2xl font-black leading-none text-[#D6006E]">{peptideCalculator.doseMg}mg</p>
                                <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">{peptideCalculator.doseMcg.toLocaleString()}mcg per shot</p>
                              </div>
                            </div>
                            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4 min-h-[124px] flex flex-col justify-between">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Draw Syringe To</p>
                              <div className="mt-3">
                                <p className="text-2xl font-black leading-none text-emerald-700">{peptideCalculator.syringeUnits.toFixed(0)} units</p>
                                <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">{peptideCalculator.drawMl.toFixed(2)}mL</p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-pink-100 bg-white p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Syringe Guide</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">100 units scale</p>
                            </div>
                            <div className="mt-4 relative">
                              <div className="flex items-center">
                                <div className="mr-3 flex w-14 shrink-0 items-center justify-end">
                                  <div className="h-[4px] w-6 rounded-full bg-pink-300" />
                                  <div className="relative h-7 w-7 rounded-full border-[3px] border-pink-300 bg-white shadow-sm">
                                    <span className="absolute inset-[6px] rounded-full border-2 border-pink-200" />
                                  </div>
                                </div>
                                <div className="relative h-[66px] flex-1 min-w-0">
                                  <div className="absolute inset-y-[8px] left-0 right-0 rounded-[10px] border-[3px] border-pink-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,244,248,0.94))] shadow-inner" />
                                  <div
                                    className="absolute inset-y-[16px] left-[8px] rounded-[6px] bg-gradient-to-r from-[#FF7A59] via-[#FF4FA1] to-[#FF1493] shadow-[0_8px_18px_rgba(255,20,147,0.18)]"
                                    style={{ width: `calc(${Math.max(2, Math.min(peptideCalculator.syringeUnits, 100))}% - 16px)` }}
                                  />
                                  <div
                                    className="absolute top-[11px] w-[8px] rounded-[4px] bg-[#4A042A] shadow-[0_4px_12px_rgba(74,4,42,0.18)]"
                                    style={{
                                      left: `calc(${Math.max(2, Math.min(peptideCalculator.syringeUnits, 100))}% - 4px)`,
                                      height: '32px'
                                    }}
                                  />
                                  <div className="absolute inset-x-[10px] top-[9px] bottom-[9px] flex items-stretch justify-between pointer-events-none">
                                    {Array.from({ length: 21 }).map((_, tickIndex) => (
                                      <div key={tickIndex} className="relative h-full">
                                        <span className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-pink-300/90 ${tickIndex % 5 === 0 ? 'top-[4px] h-[28px] w-[2px]' : 'top-[11px] h-[14px] w-[1.5px]'}`} />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="absolute -top-3 transition-all" style={{ left: `calc(${Math.max(4, Math.min(peptideCalculator.syringeUnits, 96))}% - 24px)` }}>
                                    <div className="rounded-full bg-[#4A042A] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg">
                                      {peptideCalculator.syringeUnits.toFixed(0)}u
                                    </div>
                                  </div>
                                </div>
                                <div className="ml-3 flex w-16 shrink-0 items-center">
                                  <div className="h-4 w-4 rounded-r-[6px] rounded-l-[3px] bg-pink-300 shadow-sm" />
                                  <div className="h-[3px] w-10 rounded-full bg-slate-400" />
                                  <div className="h-0 w-0 border-y-[3px] border-y-transparent border-l-[12px] border-l-slate-400" />
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between pl-[58px] pr-[64px] text-[10px] font-black uppercase tracking-widest text-slate-400">
                              <span>0</span>
                              <span>50</span>
                              <span>100</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 min-h-[138px] flex flex-col justify-between min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vial Contains</p>
                              <div className="mt-3">
                                <p className="text-[1.4rem] sm:text-[1.55rem] font-black leading-none text-slate-700 break-words">{peptideCalculator.strengthMg}mg</p>
                                <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">mixed with {peptideCalculator.waterMl}mL</p>
                              </div>
                            </div>
                            <div className="rounded-[22px] border border-blue-100 bg-blue-50/80 p-4 min-h-[138px] flex flex-col justify-between min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Concentration</p>
                              <div className="mt-3">
                                <p className="text-[1.25rem] sm:text-[1.45rem] font-black leading-tight text-blue-700 break-words">{peptideCalculator.concentrationMgPerMl.toFixed(2)}<span className="ml-1 text-[0.7em] uppercase tracking-[0.14em]">mg/mL</span></p>
                                <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">{peptideCalculator.concentrationMcgPerUnit.toFixed(1)}mcg per unit</p>
                              </div>
                            </div>
                            <div className="rounded-[22px] border border-amber-100 bg-amber-50/80 p-4 min-h-[138px] flex flex-col justify-between min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Approx Doses</p>
                              <div className="mt-3">
                                <p className="text-[1.4rem] sm:text-[1.55rem] font-black leading-none text-amber-700 break-words">{peptideCalculator.remainingDoses}</p>
                                <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">full doses from one vial</p>
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[22px] border border-pink-100 bg-pink-50/60 px-4 py-3 text-xs font-bold text-[#8F2C5D] leading-relaxed">
                            Formula: strength ÷ water = concentration, then dose ÷ concentration = draw amount. On a standard U-100 syringe, 1mL = 100 units.
                          </div>
                        </>
                      ) : (
                        <div className="rounded-[22px] border border-amber-100 bg-amber-50/80 px-4 py-6 text-center text-sm font-black text-amber-700">
                          Enter a dose, vial strength, and water volume to calculate your draw amount.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showWikiModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[400] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">

                <div className="bg-gradient-to-r from-[#FF1493] to-[#FF69B4] px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 relative">
                  <button onClick={() => setShowWikiModal(false)} className="absolute top-3 right-4 text-white/80 hover:text-white font-black text-[28px] leading-none hover:scale-110 transition-transform">&times;</button>
                  <div className="text-white pr-10 sm:pr-0">
                    <h2 className="brand-title text-[1.75rem] sm:text-[2.15rem] leading-[0.92] m-0 text-white shadow-none">Peptide Wiki</h2>
                    <p className="text-white/90 font-bold text-[12px] sm:text-[13px] mt-0.5 max-w-lg leading-snug">Quick product context, simple benefits, and handling notes in one place.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <div className="rounded-[20px] border border-white/30 bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm min-w-[98px]">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Entries</p>
                      <p className="mt-1 text-lg font-black leading-none">{filteredWikiData.length}</p>
                    </div>
                    <div className="rounded-[20px] border border-white/30 bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm min-w-[118px]">
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Focus</p>
                      <p className="mt-1 text-[12px] font-black leading-snug">{wikiTagFilter === 'All' ? 'All Categories' : wikiTagFilter}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFF0F5] px-4 py-2.5 border-b-2 border-[#FFC0CB] space-y-2.5">
                  <div className="relative w-full max-w-[720px] mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                    <input type="text" value={wikiSearchQuery} onChange={e => setWikiSearchQuery(e.target.value)} placeholder="Search by product, tag, or benefit..." className="w-full pl-11 pr-24 py-2 rounded-2xl text-[14px] font-bold border-2 border-pink-200 outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100 transition-all bg-white text-[#4A042A] shadow-sm" />
                    {(wikiSearchQuery || wikiTagFilter !== 'All') && (
                      <button
                        type="button"
                        onClick={() => { setWikiSearchQuery(''); setWikiTagFilter('All'); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#D6006E] transition-colors hover:bg-pink-100"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto hide-scroll pb-0.5">
                    {wikiFilterOptions.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setWikiTagFilter(tag)}
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-colors ${wikiTagFilter === tag ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-200 bg-white text-[#9E2A5E] hover:border-pink-300 hover:bg-pink-50'}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[10px] font-bold text-[#9E2A5E]">
                    {wikiTagFilter === 'All'
                      ? `Showing all ${filteredWikiData.length} wiki entries.`
                      : `Showing ${filteredWikiData.length} entries in ${wikiTagFilter}.`}
                  </p>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 hide-scroll">
                  {filteredWikiData.length === 0 ? (
                    <div className="text-center p-12 text-slate-400 font-bold italic">No wiki entries found for that search yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {filteredWikiData.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm hover:border-pink-300 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div>
                              <h3 className="font-black text-lg text-[#D6006E] leading-tight">{item.name}</h3>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {item.tags.map((tag, tIdx) => (
                                  <span key={tIdx} className="bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">{tag}</span>
                                ))}
                              </div>
                            </div>
                            {item.benefits?.[0] && (
                              <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                                {item.benefits[0]}
                              </span>
                            )}
                          </div>

                          {item.benefits?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {item.benefits.map((benefit, benefitIdx) => (
                                <span key={benefitIdx} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                  {benefit}
                                </span>
                              ))}
                            </div>
                          )}

                          <p className="text-sm text-slate-600 font-semibold leading-relaxed border-t border-slate-100 pt-3 mb-4">{item.desc}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {item.dosage && (
                              <div className="rounded-2xl bg-pink-50/70 border border-pink-100 p-3">
                                <div className="flex items-start gap-2">
                                  <Droplet size={14} className="text-pink-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest">Dosage</p>
                                    <p className="text-xs font-bold text-slate-700 leading-tight mt-1">{item.dosage}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {item.cycle && (
                              <div className="rounded-2xl bg-white border border-slate-200 p-3">
                                <div className="flex items-start gap-2">
                                  <Repeat size={14} className="text-[#D6006E] mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cycle</p>
                                    <p className="text-xs font-bold text-slate-700 leading-tight mt-1">{item.cycle}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {item.storage && (
                              <div className="rounded-2xl bg-blue-50/75 border border-blue-100 p-3">
                                <div className="flex items-start gap-2">
                                  <ThermometerSnowflake size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Storage</p>
                                    <p className="text-xs font-bold text-slate-700 leading-tight mt-1">{item.storage}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-center text-slate-400 font-bold mt-6 px-4">Disclaimer: The information provided is for educational and research purposes only. Always consult with a qualified healthcare professional.</p>
                </div>

              </div>
            </div>
          )}
        </div>
      ) : (
        /* --- ADMIN VIEW --- */
        !isAdminAuthenticated ? (
          <div className="min-h-screen w-full bg-[#FFF0F5] flex items-center justify-center p-4">
            <form onSubmit={handleAdminLogin} className="bg-white p-8 rounded-[32px] shadow-2xl w-full max-w-sm border-2 border-pink-600 text-center space-y-6">
              <div className="bg-pink-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto"><Lock className="text-pink-600" size={32} /></div>
              <div>
                <h2 className="brand-title text-3xl text-pink-600">Security Gate</h2>
                <p className="text-xs font-bold text-pink-400 uppercase tracking-widest mt-1">Verification Required</p>
              </div>
              <input type="password" autoFocus value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className={originalInput} placeholder="Password" />
              {loginError && <p className="text-xs font-bold text-rose-500">{loginError}</p>}
              <div className="flex flex-col gap-2 pt-4">
                <button type="submit" className={originalBtn}>Enter Dashboard</button>
                <button type="button" onClick={() => setView('shop')} className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 hover:underline">Cancel / Back to Shop</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="min-h-screen w-full flex bg-slate-50">
            <aside className="admin-sidebar hidden lg:flex flex-col p-6 text-white overflow-hidden">
              <div className="brand-title text-3xl text-center mb-8">BBP Core</div>

              <p className="text-[9px] font-black text-pink-300 uppercase tracking-widest mb-2 px-4 opacity-70">Logistics</p>
              <nav className="space-y-1 mb-6">
                {[
                  { id: 'overview', icon: <LayoutDashboard size={18} />, label: 'Inventory' },
                  { id: 'active-orders', icon: <ShoppingCart size={18} />, label: 'Active Orders' }, // âœ¨ NEW
                  { id: 'payments', icon: <BadgeDollarSign size={18} />, label: 'Payments' },
                  { id: 'audit', icon: <AlertTriangle size={18} />, label: 'Audit' },
                  { id: 'packing', icon: <ClipboardList size={18} />, label: 'Packing Guide' },
                  { id: 'trimming', icon: <Scissors size={18} />, label: 'Hit List' },
                  { id: 'safety', icon: <RotateCcw size={18} />, label: 'Admin Safety' }
                ].map(t => (
                  <button key={t.id} onClick={() => setAdminTab(t.id)} className={`nav-item w-full flex items-center gap-3 px-4 py-3 font-black text-xs uppercase tracking-widest transition-all ${adminTab === t.id ? 'active shadow-lg' : 'text-pink-300/60 hover:text-white'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </nav>

              <p className="text-[9px] font-black text-pink-300 uppercase tracking-widest mb-2 px-4 opacity-70">Records</p>
              <nav className="space-y-1 mb-6">
                {[
                  { id: 'customers', icon: <Users size={18} />, label: 'Customer DB' },
                  { id: 'logs', icon: <ScrollText size={18} />, label: 'Activity Logs' }
                ].map(t => (
                  <button key={t.id} onClick={() => setAdminTab(t.id)} className={`nav-item w-full flex items-center gap-3 px-4 py-3 font-black text-xs uppercase tracking-widest transition-all ${adminTab === t.id ? 'active shadow-lg' : 'text-pink-300/60 hover:text-white'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </nav>

              <p className="text-[9px] font-black text-pink-300 uppercase tracking-widest mb-2 px-4 opacity-70">Management</p>
              <nav className="space-y-1 flex-1">
                {[
                  { id: 'settings-core', icon: <Settings size={18} />, label: 'Core Settings' },
                  { id: 'settings-admins', icon: <ShieldCheck size={18} />, label: 'Admin Profiles' },
                  { id: 'settings-products', icon: <Package size={18} />, label: 'Products & Limits' }
                ].map(t => (
                  <button key={t.id} onClick={() => setAdminTab(t.id)} className={`nav-item w-full flex items-center gap-3 px-4 py-3 font-black text-xs uppercase tracking-widest transition-all ${adminTab === t.id ? 'active shadow-lg' : 'text-pink-300/60 hover:text-white'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </nav>

              <div className="pt-6 border-t border-white/10">
                <button onClick={() => setView('shop')} className="w-full flex items-center gap-3 px-4 py-3 text-pink-300/60 font-bold text-xs uppercase tracking-widest hover:text-white"><Home size={18} /> Shop View</button>
                <button onClick={() => setIsAdminAuthenticated(false)} className="w-full flex items-center gap-3 px-4 py-3 text-pink-300/60 font-bold text-xs uppercase tracking-widest hover:text-white"><LogOut size={18} /> Logout</button>
              </div>
            </aside>

            <main className="flex-1 h-screen overflow-y-auto p-4 lg:p-6 hide-scroll">
              <div className="lg:hidden flex items-center justify-between mb-4 bg-[#4A042A] p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-xl sticky top-2 z-50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button onClick={() => setView('shop')} className="text-white bg-white/10 p-1.5 sm:p-2 rounded-lg hover:bg-white/20 transition-colors"><Home size={18} /></button>
                  <span className="brand-title text-white text-lg sm:text-xl">BBP</span>
                </div>
                <select value={adminTab} onChange={e => setAdminTab(e.target.value)} className="bg-white text-[#D6006E] font-black text-[10px] uppercase tracking-widest px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl outline-none max-w-[130px] sm:max-w-none">
                  <option value="overview">Inventory</option>
                  <option value="active-orders">Active Orders</option>
                  <option value="payments">Payments</option>
                  <option value="audit">Audit</option>
                  <option value="packing">Packing</option>
                  <option value="trimming">Hit List</option>
                  <option value="safety">Admin Safety</option>
                  <option value="customers">Customers DB</option>
                  <option value="logs">Activity Logs</option>
                  <option value="settings-core">Settings</option>
                  <option value="settings-admins">Admins</option>
                  <option value="settings-products">Products</option>
                </select>
              </div>

              <div className="w-full max-w-[1280px] mx-auto relative">
                {!adminTab.includes('settings') && (
                  <div className="bg-white p-3 rounded-2xl shadow-sm border-2 border-pink-100 mb-6 flex items-center gap-3 sticky top-[70px] lg:top-0 z-40">
                    <Search size={20} className="text-pink-400 ml-2 shrink-0" />
                    <input type="text" value={adminGlobalSearch} onChange={e => setAdminGlobalSearch(e.target.value)} placeholder="Global Search (Ctrl+F equivalent)..." className="w-full text-sm font-bold text-[#4A042A] outline-none placeholder:text-pink-200 bg-transparent" />
                  </div>
                )}

                {adminTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Live Inventory Overview</h2>
                        <p className="text-sm font-bold text-slate-500 mt-1">Manage product availability, box limits, and synced box caps here.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {inventoryFilterOptions.map(option => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setAdminInventoryFilter(option.id)}
                              className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${adminInventoryFilter === option.id ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-100 bg-white text-slate-500 hover:border-pink-300 hover:text-pink-600'}`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full lg:w-auto lg:min-w-[520px]">
                        <div className="rounded-2xl border border-pink-100 bg-white px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Open Products</p>
                          <p className="mt-1 text-2xl font-black text-[#D6006E]">{enrichedProducts.filter(p => !p.isClosed).length}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Incomplete Boxes</p>
                          <p className="mt-1 text-2xl font-black text-amber-700">{enrichedProducts.filter(p => p.totalVials > 0 && p.slotsLeft > 0 && !p.isClosed).length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Locked</p>
                          <p className="mt-1 text-2xl font-black text-slate-700">{enrichedProducts.filter(p => p.locked).length}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Synced Caps</p>
                          <p className="mt-1 text-2xl font-black text-amber-700">{syncedCapCount}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
                      <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                        <table className="w-full text-left custom-table">
                          <thead><tr>{renderSortableHeader('Product', 'name', inventoryTableSort, setInventoryTableSort)}{renderSortableHeader('Availability', 'availability', inventoryTableSort, setInventoryTableSort, 'text-center')}{renderSortableHeader('Total Vials', 'totalVials', inventoryTableSort, setInventoryTableSort, 'text-center')}{renderSortableHeader('Full Boxes', 'boxes', inventoryTableSort, setInventoryTableSort, 'text-center')}{renderSortableHeader('Expected Boxes', 'expectedBoxes', inventoryTableSort, setInventoryTableSort, 'text-center')}{renderSortableHeader('Max Boxes', 'maxBoxes', inventoryTableSort, setInventoryTableSort, 'text-center')}{renderSortableHeader('Slots Left', 'slotsLeft', inventoryTableSort, setInventoryTableSort, 'text-center')}{renderSortableHeader('Status', 'statusText', inventoryTableSort, setInventoryTableSort, 'text-center')}</tr></thead>
                          <tbody className="divide-y divide-pink-50">
                            {sortedAdminProducts.map(p => (
                              <tr key={p.id} className={`${getInventoryRowTone(p)} transition-colors hover:bg-pink-50/70`}>
                                <td className="font-bold text-slate-900">{p.name}</td>
                                <td className="text-center">
                                  <button
                                    onClick={() => handleInventoryAvailability(p)}
                                    className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all hover:scale-105 shadow-sm ${p.locked
                                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                                      : (p.maxBoxes || 0) > 0
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                      }`}
                                  >
                                    {p.locked ? 'Locked' : (p.maxBoxes || 0) > 0 ? 'Capped' : 'Open'}
                                  </button>
                                </td>
                                <td className="text-center">{p.totalVials}</td>
                                <td className="text-center font-black text-pink-600">{p.boxes}</td>
                                <td className="text-center font-black text-indigo-600">{Math.ceil(p.totalVials / SLOTS_PER_BATCH)}</td>
                                <td className="text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <input type="number" className="w-16 border border-[#FFC0CB] bg-[#FFF0F5] rounded-lg p-1 text-center text-xs font-bold text-[#D6006E] outline-none focus:border-[#FF1493] focus:bg-white transition-colors" value={p.maxBoxes || ''} placeholder="0" onChange={e => handleManualMaxBoxesChange(p, Number(e.target.value) || 0)} />
                                    {renderInventoryCapSource(p)}
                                  </div>
                                </td>
                                <td className="text-center text-emerald-600">{p.slotsLeft === 0 ? 'Full' : `${p.slotsLeft}`}</td>
                                <td className="text-center">{renderInventoryStatusBadge(p)}</td>
                              </tr>
                            ))}
                            {filteredAdminProducts.length === 0 && <tr><td colSpan="8" className="text-center p-8 text-pink-300 font-bold italic">No products found.</td></tr>}
                          </tbody>
                        </table>
                      </div>

                      <aside className="space-y-4">
                        <section className="bg-white rounded-[24px] border-2 border-pink-50 p-5 shadow-sm">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-pink-600 border-b-2 border-pink-50 pb-3">Inventory Actions</h3>
                          <p className="mt-3 text-xs font-bold text-slate-500 leading-relaxed">Make the current box the last box for every product. Empty products get locked, and active products stay open only until their current box is filled.</p>
                          <div className="mt-3 rounded-2xl border border-pink-100 bg-pink-50/70 px-3 py-3 text-[11px] font-bold text-slate-600 leading-relaxed">
                            Example: 0 vials = locked. 2 vials = cap at 1 box. 12 vials = cap at 2 boxes.
                          </div>
                          <p className="mt-3 text-[11px] font-bold text-amber-700 leading-relaxed">If you need to reopen one product beyond that synced cap, click its amber <span className="uppercase tracking-widest">Capped</span> button in the table. Future syncs are now tagged so they can be undone safely.</p>
                          <button onClick={syncCurrentBoxCaps} className="mt-4 w-full rounded-2xl bg-pink-100 text-pink-600 font-black uppercase text-[10px] tracking-widest border border-pink-200 py-4 hover:bg-pink-200 transition-colors">
                            Sync Current Box Caps
                          </button>
                          <button onClick={clearSyncedCaps} className="mt-2 w-full rounded-2xl bg-white text-slate-600 font-black uppercase text-[10px] tracking-widest border border-slate-200 py-3 hover:border-pink-200 hover:text-pink-600 transition-colors">
                            Clear Synced Caps
                          </button>
                          <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">
                            {syncedCapCount} synced product{syncedCapCount === 1 ? '' : 's'} tagged
                          </p>
                        </section>

                        <section className="bg-white rounded-[24px] border-2 border-pink-50 p-5 shadow-sm">
                          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-pink-600 border-b-2 border-pink-50 pb-3">Status Guide</h3>
                          <div className="mt-3 space-y-2 text-xs font-bold text-slate-600">
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                              <span>New Batch</span>
                              <span className="text-violet-500 uppercase text-[10px] tracking-widest">No vials yet</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                              <span>Slots Left</span>
                              <span className="text-emerald-600 uppercase text-[10px] tracking-widest">Still filling</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                              <span>Next Box Open</span>
                              <span className="text-emerald-600 uppercase text-[10px] tracking-widest">Current box full</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                              <span>Cap Reached</span>
                              <span className="text-rose-500 uppercase text-[10px] tracking-widest">No new box opens</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                              <span>Capped Button</span>
                              <span className="text-amber-600 uppercase text-[10px] tracking-widest">Click to remove cap</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                              <span>Locked / Payments Open</span>
                              <span className="text-slate-500 uppercase text-[10px] tracking-widest">Closed to edits</span>
                            </div>
                          </div>
                        </section>
                      </aside>
                    </div>
                  </div>
                )}

                {/* âœ¨ NEW: ACTIVE ORDERS TAB */}
                {adminTab === 'active-orders' && (
                  <div className="space-y-5">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Current Active Orders</h2>

                      {/* âœ¨ MOVED FROM CUSTOMER DB: Sheet and CSV buttons */}
                      <div className="flex flex-wrap gap-2">
                        {settings.googleSheetUrl && (
                          <a href={settings.googleSheetUrl} target="_blank" rel="noreferrer" className="bg-white border-2 border-[#D6006E] text-[#D6006E] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-pink-50 transition-colors flex items-center gap-2">
                            Open Sheet
                          </a>
                        )}
                        <button onClick={exportRawOrdersCSV} className="bg-rose-50 border-2 border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-rose-500 transition-colors flex items-center gap-2">
                          Backup Raw Orders
                        </button>
                        <button onClick={exportCustomersCSV} className="bg-white border-2 border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-emerald-500 transition-colors">
                          Export CSV
                        </button>
                        <label className={`bg-emerald-50 border-2 border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-emerald-500 transition-colors cursor-pointer ${isBtnLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {isBtnLoading ? 'Syncing...' : 'Sync Changes from CSV'}
                          <input type="file" accept=".csv" onChange={importCustomersCSV} className="hidden" disabled={isBtnLoading} />
                        </label>
                        {settings.gasWebAppUrl && (
                          <>
                            <button onClick={pushToGoogleSheets} disabled={isBtnLoading} className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50">
                              {isBtnLoading ? 'Pushing...' : 'Push to Sheets'}
                            </button>
                            <button onClick={pullFromGoogleSheets} disabled={isBtnLoading} className="bg-blue-50 border-2 border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-blue-500 transition-colors flex items-center gap-2 disabled:opacity-50">
                              {isBtnLoading ? 'Pulling...' : 'Pull from Sheets'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-5 gap-2.5">
                      <button onClick={() => setActiveOrdersFilter('all')} className={`rounded-[24px] border-2 px-4 py-3 text-left shadow-sm transition-all ${activeOrdersFilter === 'all' ? 'border-pink-300 bg-white ring-2 ring-pink-100' : 'border-pink-100 bg-white hover:border-pink-200'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Customers</p>
                        <p className="mt-1 text-xl font-black text-[#D6006E]">{activeOrdersSummary.total}</p>
                      </button>
                      <button onClick={() => setActiveOrdersFilter('unpaid')} className={`rounded-[24px] border-2 px-4 py-3 text-left shadow-sm transition-all ${activeOrdersFilter === 'unpaid' ? 'border-amber-300 bg-amber-50 ring-2 ring-amber-100' : 'border-amber-100 bg-white hover:border-amber-200'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Waiting Payment</p>
                        <p className="mt-1 text-xl font-black text-amber-700">{activeOrdersSummary.unpaid}</p>
                      </button>
                      <button onClick={() => setActiveOrdersFilter('no-address')} className={`rounded-[24px] border-2 px-4 py-3 text-left shadow-sm transition-all ${activeOrdersFilter === 'no-address' ? 'border-rose-300 bg-rose-50 ring-2 ring-rose-100' : 'border-rose-100 bg-white hover:border-rose-200'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Missing Address</p>
                        <p className="mt-1 text-xl font-black text-rose-700">{activeOrdersSummary.missingAddress}</p>
                      </button>
                      <button onClick={() => setActiveOrdersFilter('no-admin')} className={`rounded-[24px] border-2 px-4 py-3 text-left shadow-sm transition-all ${activeOrdersFilter === 'no-admin' ? 'border-sky-300 bg-sky-50 ring-2 ring-sky-100' : 'border-sky-100 bg-white hover:border-sky-200'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-sky-600">Needs Admin</p>
                        <p className="mt-1 text-xl font-black text-sky-700">{activeOrdersSummary.unassignedAdmin}</p>
                      </button>
                      <button onClick={() => setActiveOrdersFilter('ready')} className={`rounded-[24px] border-2 px-4 py-3 text-left shadow-sm transition-all ${activeOrdersFilter === 'ready' ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100' : 'border-emerald-100 bg-white hover:border-emerald-200'}`}>
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Ready to Ship</p>
                        <p className="mt-1 text-xl font-black text-emerald-700">{activeOrdersSummary.ready}</p>
                      </button>
                    </div>

                    <div className="bg-white rounded-[24px] border-2 border-pink-50 p-4 shadow-sm space-y-4">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Quick Filters</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {activeOrdersFilterOptions.map(option => (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => setActiveOrdersFilter(option.id)}
                                  className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${activeOrdersFilter === option.id ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-100 bg-pink-50/60 text-slate-500 hover:border-pink-200 hover:text-pink-600'}`}
                                >
                                  {option.label} <span className="ml-1 opacity-75">{option.count}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="xl:max-w-[420px] w-full rounded-[24px] border border-slate-200 bg-slate-50/80 p-3.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Bulk Actions</p>
                              <p className="mt-1 text-xs font-black text-slate-800">{selectedActiveOrderEmails.length} selected</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedActiveOrders(areAllVisibleActiveOrdersSelected ? {} : Object.fromEntries(activeOrdersList.map(c => [c.email, true])))}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800"
                              >
                                {areAllVisibleActiveOrdersSelected ? 'Clear Visible' : 'Select Visible'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedActiveOrders({})}
                                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-rose-200 hover:text-rose-500"
                              >
                                Reset
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                            <select value={bulkAssignAdmin} onChange={(e) => setBulkAssignAdmin(e.target.value)} className="flex-1 rounded-2xl border border-[#FFC0CB] bg-white px-3 py-1.5 text-xs font-black text-[#4A042A] outline-none focus:border-[#D6006E]">
                              <option value="">Assign selected to...</option>
                              {normalizedAdmins.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => assignAdminToCustomers(selectedActiveOrderEmails, bulkAssignAdmin)}
                              disabled={isBtnLoading || settings.paymentsOpen || selectedActiveOrderEmails.length === 0 || !bulkAssignAdmin}
                              className="rounded-2xl bg-[#D6006E] px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-opacity disabled:opacity-40"
                            >
                              Assign
                            </button>
                          </div>

                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => exportCustomersCSVRows(activeOrdersList, 'BBP_Active_Orders_Filtered')}
                              className="rounded-2xl border border-emerald-200 bg-white px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-colors hover:border-emerald-300"
                            >
                              Export Filtered
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border-2 border-pink-50 overflow-hidden">
                        <table className="w-full text-left custom-table">
                          <thead>
                            <tr>
                              <th className="w-12 text-center">Pick</th>
                              {renderSortableHeader('Customer', 'customer', activeOrdersTableSort, setActiveOrdersTableSort)}
                              {renderSortableHeader('Order Items', 'items', activeOrdersTableSort, setActiveOrdersTableSort)}
                              {renderSortableHeader('Status', 'status', activeOrdersTableSort, setActiveOrdersTableSort)}
                              {renderSortableHeader('Assigned Admin', 'admin', activeOrdersTableSort, setActiveOrdersTableSort)}
                              <th>Notes</th>
                              {renderSortableHeader('Total PHP', 'totalPHP', activeOrdersTableSort, setActiveOrdersTableSort, 'text-center')}
                              <th className="text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-pink-50">
                            {sortedActiveOrders.map(c => {
                              const isExpanded = Boolean(expandedActiveOrders[c.email]);
                              const visibleItems = isExpanded ? c.itemEntries : c.itemEntries.slice(0, 3);

                              return (
                                <tr key={c.email} className={`${getActiveOrderRowTone(c)} align-top transition-colors hover:bg-pink-50/30`}>
                                  <td className="text-center">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(selectedActiveOrders[c.email])}
                                      onChange={(e) => setSelectedActiveOrders(prev => ({ ...prev, [c.email]: e.target.checked }))}
                                      className="h-4 w-4 rounded border-pink-300 text-[#D6006E] focus:ring-pink-300"
                                    />
                                  </td>
                                  <td className="py-3">
                                    <button onClick={() => { setSelectedProfileEmail(c.email); setIsEditingAddress(false); }} className="font-black text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">
                                      {c.name}
                                    </button>
                                    <p className="mt-0.5 text-[10px] font-bold text-slate-400">{c.email}</p>
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-sky-700">
                                        {c.totalVials} vials
                                      </span>
                                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                                        {c.itemCount} item{c.itemCount === 1 ? '' : 's'}
                                      </span>
                                      {c.handle && (
                                        <span className="rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#D6006E]">
                                          {c.handle}
                                        </span>
                                      )}
                                      {c.hasProof && (
                                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-violet-700">
                                          Proof Sent
                                        </span>
                                      )}
                                      {settings.reviewStageOpen && (
                                        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                                          c.buyerReviewConfirmedAt
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : 'border-sky-200 bg-sky-50 text-sky-700'
                                        }`}>
                                          {c.buyerReviewConfirmedAt ? 'Buyer Confirmed' : 'Needs Buyer Check'}
                                        </span>
                                      )}
                                      {settings.reviewStageOpen && c.buyerReviewConfirmedAt && (
                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-700">
                                          Looks Good
                                        </span>
                                      )}
                                    </div>
                                    <p className="mt-1.5 text-[10px] font-bold text-slate-400">
                                      Updated {c.latestTimestamp ? new Date(c.latestTimestamp).toLocaleString() : 'No timestamp'}
                                    </p>
                                  </td>
                                  <td className="py-3">
                                    <div className="flex flex-wrap gap-1 py-0.5">
                                      {visibleItems.map(([pName, qty]) => (
                                        <span key={pName} className="bg-[#FFF0F5] border border-[#FFC0CB] text-[#D6006E] px-2 py-0.5 rounded-md text-[9px] font-black">
                                          {qty}x {pName}
                                        </span>
                                      ))}
                                    </div>
                                    {c.itemEntries.length > 3 && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedActiveOrders(prev => ({ ...prev, [c.email]: !prev[c.email] }))}
                                        className="mt-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:border-pink-200 hover:text-pink-600"
                                      >
                                        {isExpanded ? 'Hide Items' : `View All ${c.itemEntries.length}`}
                                      </button>
                                    )}
                                  </td>
                                  <td className="py-3">
                                    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${c.statusTone}`}>
                                      {c.statusLabel}
                                    </div>
                                  </td>
                                  <td className="py-3">
                                    <select value={c.hasAssignedAdmin ? c.adminAssigned : ''} onChange={(e) => updateCustomerAdminAssignment(c, e.target.value)} disabled={settings.paymentsOpen || c.hasProof || c.isPaid} className="bg-[#FFF0F5] border border-[#FFC0CB] text-[#D6006E] text-[10px] font-black rounded-xl px-3 py-1.5 outline-none w-full max-w-[160px] disabled:cursor-not-allowed disabled:opacity-60">
                                      <option value="" disabled>Select Admin...</option>
                                      {normalizedAdmins.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                                    </select>
                                  </td>
                                  <td className="py-3">
                                    <div className="min-w-[220px] max-w-[280px] space-y-2">
                                      <textarea
                                        value={adminNoteDrafts[c.email] ?? c.adminNotes ?? ''}
                                        onChange={(e) => setAdminNoteDrafts(prev => ({ ...prev, [c.email]: e.target.value }))}
                                        rows={2}
                                        className="w-full rounded-2xl border border-pink-100 bg-[#FFF9FC] px-3 py-2 text-xs font-bold text-[#4A042A] outline-none focus:border-[#D6006E]"
                                        placeholder="Order note..."
                                      />
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => saveAdminNote(c, adminNoteDrafts[c.email] ?? '')}
                                          className="inline-flex items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#D6006E] transition-colors hover:border-pink-300"
                                        >
                                          <Save size={12} /> Save
                                        </button>
                                        {c.adminNotes && (
                                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saved</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center py-3">
                                    <p className="font-black text-base text-pink-600">₱{c.totalPHP.toLocaleString()}</p>
                                    {!c.isPaid && <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-600">Unpaid</p>}
                                  </td>
                                  <td className="text-center py-3">
                                    <div className="flex flex-col items-center justify-center gap-1.5">
                                      {settings.reviewStageOpen && !settings.paymentsOpen && !c.isPaid && (
                                        <p className="max-w-[170px] text-[9px] font-bold text-slate-400">
                                          Buyer: {c.buyerReviewConfirmedAt ? new Date(c.buyerReviewConfirmedAt).toLocaleString() : 'Waiting'}
                                        </p>
                                      )}
                                      <button onClick={() => openAdminEditModal(c.email)} className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 flex items-center gap-1 shadow-sm transition-colors">
                                        <Edit3 size={12} /> Edit Cart
                                      </button>
                                      <div className="flex items-center justify-center gap-2">
                                        {confirmAction.type === 'deleteAllOrders' && confirmAction.id === c.email ? (
                                          <div className="flex gap-1 justify-center animate-fadeIn bg-rose-50 p-1 rounded-lg border border-rose-200">
                                            <button onClick={async () => {
                                              await deleteCustomerOrdersFromAdmin(c);
                                              setConfirmAction({ type: null, id: null });
                                            }} className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-rose-600">YES</button>
                                            <button onClick={() => setConfirmAction({ type: null, id: null })} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-black hover:bg-slate-300">NO</button>
                                          </div>
                                        ) : (
                                          <button onClick={() => setConfirmAction({ type: 'deleteAllOrders', id: c.email })} className="text-slate-300 hover:text-rose-500 hover:scale-110 transition-transform bg-transparent border-none p-1" title="Delete All Items"><Trash2 size={16} /></button>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {activeOrdersList.length === 0 && <tr><td colSpan="8" className="text-center p-8 text-pink-300 font-bold italic">No active orders found.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {adminTab === 'logs' && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Activity Logs</h2>
                        <button
                          type="button"
                          onClick={clearActivityLogs}
                          disabled={isBtnLoading || !sortedLogs.length}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 shadow-sm transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Clear Activity Logs
                        </button>
                      </div>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {renderCompactAdminStat('Visible Logs', logsSummary.total, 'pink', 'Matches current search')}
                        {renderCompactAdminStat('Today', logsSummary.today, 'blue', 'Logged today')}
                        {renderCompactAdminStat('Customers', logsSummary.customers, 'emerald', 'Unique emails')}
                        {renderCompactAdminStat('Latest', logsSummary.latest, 'slate', 'Most recent action')}
                      </div>
                    </div>
                    <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                      <table className="w-full text-left custom-table compact-table">
                        <thead><tr>{renderSortableHeader('Date & Time', 'timestamp', logsTableSort, setLogsTableSort)}{renderSortableHeader('Customer', 'customer', logsTableSort, setLogsTableSort)}{renderSortableHeader('Action', 'action', logsTableSort, setLogsTableSort)}{renderSortableHeader('Details', 'details', logsTableSort, setLogsTableSort)}</tr></thead>
                        <tbody className="divide-y divide-pink-50">
                          {sortedLogs.length === 0 ? <tr><td colSpan="4" className="text-center p-8 text-pink-300 font-bold italic">No activity logged yet.</td></tr> :
                            sortedLogs.map(log => (
                              <tr key={log.id} className="hover:bg-pink-50/20">
                                <td className="text-xs text-slate-500 font-bold whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td>
                                  <strong className="text-slate-900">{log.name || 'Unknown'}</strong>
                                  <br /><span className="text-[10px] text-slate-400">{log.email}</span>
                                </td>
                                <td><span className={`text-[9px] font-black uppercase px-2 py-1 rounded shadow-sm ${log.action.includes('Cancel') || log.action.includes('Delete') ? 'bg-rose-100 text-rose-600' : (log.action.includes('Payment') ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600')}`}>{log.action}</span></td>
                                <td className="text-xs text-slate-600 font-medium max-w-xs break-words">{log.details}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminTab === 'payments' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Customer Payments Management</h2>

                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => generateBulkLabels(paymentCustomers)} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-[#D6006E] hover:text-[#D6006E] transition-colors flex items-center gap-2">
                          <Printer size={16} /> Bulk Print Labels
                        </button>
                        <button onClick={() => setShowAllProofsModal(true)} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-[#D6006E] hover:text-[#D6006E] transition-colors flex items-center gap-2">
                          <ImageIcon size={16} /> View All Proofs
                        </button>

                        {!settings.paymentsOpen && (
                          <button onClick={reshuffleAdmins} disabled={isBtnLoading} className="bg-indigo-50 border-2 border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-indigo-500 hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50">
                            Reshuffle Admins
                          </button>
                        )}
                      </div>
                    </div>

                    {renderPaymentsDashboard()}
                  </div>
                )}

                {adminTab === 'audit' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Payment Audit</h2>
                        <p className="text-sm font-bold text-slate-500 mt-1">Reconcile expected totals, proofs received, and approval gaps by admin route.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setAdminTab('payments'); setPaymentFilterAdmin('All'); }}
                        className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-[#D6006E] hover:text-[#D6006E] transition-colors"
                      >
                        Back to Payments
                      </button>
                    </div>

                    {renderAuditDashboard()}
                  </div>
                )}

                {adminTab === 'packing' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Packing Logistics Guide</h2>
                        <p className="text-sm font-black text-indigo-600 mt-1 bg-indigo-50 inline-block px-3 py-1 rounded-lg border border-indigo-100">Total Physical Boxes to Receive: {totalPhysicalBoxesToReceive}</p>
                      </div>
                      <button onClick={generateBulkLabels} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-[#D6006E] hover:text-[#D6006E] transition-colors flex items-center gap-2">
                        <Printer size={16} /> Bulk Print Labels
                      </button>
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      {renderCompactAdminStat('Pack Rows', packingSummary.rows, 'pink', 'Visible assignments')}
                      {renderCompactAdminStat('Products', packingSummary.products, 'blue', 'Unique products')}
                      {renderCompactAdminStat('Customers', packingSummary.customers, 'emerald', 'Unique buyers')}
                      {renderCompactAdminStat('Physical Boxes', packingSummary.boxes, 'violet', 'Receive count')}
                    </div>

                    <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                      <table className="w-full text-left custom-table compact-table">
                        <thead><tr style={{ background: '#F3E5F5' }}>{renderSortableHeader('Product', 'product', packingTableSort, setPackingTableSort)}{renderSortableHeader('Box #', 'box', packingTableSort, setPackingTableSort, 'text-center')}{renderSortableHeader('Customer', 'customer', packingTableSort, setPackingTableSort)}{renderSortableHeader('Take', 'take', packingTableSort, setPackingTableSort, 'text-center')}</tr></thead>
                        <tbody className="divide-y divide-pink-50">
                          {sortedPackingRows.map(row => (
                            <tr key={row.key}>
                              <td className="font-black text-[#4A042A]">
                                {row.product}
                                <div className="text-[9px] text-indigo-500 uppercase tracking-widest mt-0.5">Expect {Math.ceil((enrichedProducts.find(ep => ep.name === row.product)?.totalVials || 0) / SLOTS_PER_BATCH)} Box(es)</div>
                              </td>
                              <td className="text-center font-bold text-pink-600">Box {row.box}</td>
                              <td>
                                <button onClick={() => { setSelectedProfileEmail(row.email); setIsEditingAddress(false); }} className="font-bold text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">{row.name}</button>
                                <br /><span className="text-[10px]">{row.email}</span>
                              </td>
                              <td className="text-center font-black text-lg">{row.take}</td>
                            </tr>
                          ))}
                          {sortedPackingRows.length === 0 && <tr><td colSpan="4" className="text-center p-8 text-pink-300 font-bold italic">No orders found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminTab === 'trimming' && (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center gap-3 flex-wrap">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Loose Vial Hit List</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button onClick={copyTrimListForDiscord} className="rounded-xl border border-pink-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#D6006E] shadow-sm transition-colors hover:bg-pink-50">
                            Copy for Discord
                          </button>
                          <button onClick={cutAllVisibleHitList} disabled={!sortedHitList.length} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 shadow-sm transition-colors hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed">
                            Cut All Visible
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {renderCompactAdminStat('At-Risk Rows', hitListSummary.rows, 'rose', 'Visible after search')}
                        {renderCompactAdminStat('Products', hitListSummary.products, 'amber', 'Need fill help')}
                        {renderCompactAdminStat('Buyers', hitListSummary.customers, 'blue', 'Affected customers')}
                        {renderCompactAdminStat('Cut Risk', `${hitListSummary.riskyVials} vials`, 'pink', 'If not filled')}
                      </div>
                    </div>
                    {filteredHitList.length === 0 ? (
                      <div className="bg-emerald-50 p-12 rounded-[24px] text-center font-bold text-emerald-600 border-2 border-emerald-100 uppercase tracking-widest text-xs">No loose vials matching your search.</div>
                    ) : (
                      <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                        <table className="w-full text-left custom-table compact-table">
                          <thead><tr style={{ background: '#FEF2F2' }}>{renderSortableHeader('Product', 'prod', trimmingTableSort, setTrimmingTableSort)}{renderSortableHeader('Status', 'status', trimmingTableSort, setTrimmingTableSort)}{renderSortableHeader('Target Customer', 'customer', trimmingTableSort, setTrimmingTableSort)}<th className="text-center" style={{ color: '#D32F2F' }}>Action</th></tr></thead>
                          <tbody className="divide-y divide-pink-50">
                            {sortedHitList.map((v, i) => (
                              <tr key={v.id}>
                                <td className="font-bold">
                                  <div>{v.prod}</div>
                                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-pink-500">
                                    ${Number(enrichedProducts.find(product => product.name === v.prod)?.pricePerVialUSD || 0).toFixed(2)} / vial
                                  </div>
                                </td>
                                <td className="text-[10px] font-black text-rose-500 uppercase">
                                  <div>Box {v.boxNum} needs {v.missingSlots} more</div>
                                  <div className="mt-1 text-[9px] normal-case tracking-normal text-slate-500">
                                    If this box does not fill, these loose vials may be cut.
                                  </div>
                                </td>
                                <td>
                                  <button onClick={() => { setSelectedProfileEmail(v.email); setIsEditingAddress(false); }} className="font-bold text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">{v.handle || 'Guest'}</button>
                                  <p className="text-[10px] text-slate-400">{v.email}</p>
                                </td>
                                <td className="text-center">
                                  {confirmAction.type === 'trim' && confirmAction.id === v.id ? (
                                    <div className="flex gap-1 items-center justify-center animate-fadeIn bg-rose-50 p-1 rounded-lg border border-rose-200 w-max mx-auto">
                                      <span className="text-[9px] font-bold text-rose-700 uppercase mr-1">Sure?</span>
                                      <button onClick={() => { executeTrim(v); setConfirmAction({ type: null, id: null }); }} className="bg-rose-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase hover:bg-rose-700">Yes</button>
                                      <button onClick={() => setConfirmAction({ type: null, id: null })} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-black uppercase hover:bg-slate-300">No</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setConfirmAction({ type: 'trim', id: v.id })} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-transform">Cut {v.amountToRemove} Vials</button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {adminTab === 'safety' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Admin Safety & Recovery</h2>
                        <p className="mt-1 text-sm font-bold text-slate-500">Recycle bin, proof recovery, batch snapshots, and one-click undo for the latest risky admin actions.</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setIsBtnLoading(true);
                          try {
                            await createBatchSnapshot('Manual admin snapshot', { action: 'manual-snapshot' });
                            showToast('Batch snapshot saved.');
                          } catch (error) {
                            console.error(error);
                            showToast('Could not save a batch snapshot.');
                          }
                          setIsBtnLoading(false);
                        }}
                        disabled={isBtnLoading}
                        className="rounded-2xl border border-pink-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#D6006E] shadow-sm transition-colors hover:border-pink-300 disabled:opacity-50"
                      >
                        Save Snapshot Now
                      </button>
                    </div>

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      {renderCompactAdminStat('Undo Ready', safetySummary.undo, 'amber', 'Bulk cuts and bulk edits')}
                      {renderCompactAdminStat('Recycle Bin', safetySummary.recycle, 'rose', 'Deleted orders and proof refs')}
                      {renderCompactAdminStat('Snapshots', safetySummary.snapshots, 'blue', 'Saved before risky actions')}
                      {renderCompactAdminStat('Proof Refs', safetySummary.proofs, 'violet', 'Can be restored')}
                    </div>

                    <section className="rounded-[24px] border-2 border-pink-50 bg-white p-4 shadow-sm space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Undo Queue</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">Use this for recent bulk cuts or admin-side bulk edits that should roll back immediately.</p>
                      </div>
                      {availableUndoRecords.length === 0 ? (
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4 text-sm font-black text-emerald-700">
                          No undo actions are waiting right now.
                        </div>
                      ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {availableUndoRecords.map(record => (
                            <div key={record.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                              <p className="text-sm font-black text-[#4A042A]">{record.label}</p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">{new Date(record.createdAt).toLocaleString()}</p>
                              <p className="mt-2 text-xs font-bold text-slate-500">
                                {(record.beforeOrders || []).length} order row{(record.beforeOrders || []).length === 1 ? '' : 's'} and {(record.beforeUsers || []).length} profile{(record.beforeUsers || []).length === 1 ? '' : 's'} saved.
                              </p>
                              <button
                                type="button"
                                onClick={() => restoreSafetyRecord(record)}
                                disabled={isBtnLoading}
                                className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-amber-700 transition-colors hover:border-amber-300 disabled:opacity-50"
                              >
                                <RotateCcw size={13} /> Undo
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-[24px] border-2 border-pink-50 bg-white p-4 shadow-sm space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Recycle Bin</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">Deleted orders and removed proof references land here first so they can be restored safely.</p>
                      </div>
                      {recycleBinRecords.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-500">
                          Nothing has been deleted yet in this batch.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {recycleBinRecords.slice(0, 12).map(record => (
                            <div key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                              <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div>
                                  <p className="text-sm font-black text-[#4A042A]">{record.label}</p>
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    {new Date(record.createdAt).toLocaleString()} • {record.recycleType === 'proof' ? 'Proof Reference' : `${(record.ordersSnapshot || []).length} order row${(record.ordersSnapshot || []).length === 1 ? '' : 's'}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${record.status === 'restored' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                    {record.status === 'restored' ? 'Restored' : 'Available'}
                                  </span>
                                  {record.status !== 'restored' && (
                                    <button
                                      type="button"
                                      onClick={() => restoreSafetyRecord(record)}
                                      disabled={isBtnLoading}
                                      className="rounded-full border border-pink-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#D6006E] transition-colors hover:border-pink-300 disabled:opacity-50"
                                    >
                                      Restore
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="rounded-[24px] border-2 border-pink-50 bg-white p-4 shadow-sm space-y-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Batch Snapshots</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">Automatic backups are created before major admin actions. Restore with care because it replaces the live batch.</p>
                      </div>
                      {snapshotRecords.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-black text-slate-500">
                          No snapshots saved yet.
                        </div>
                      ) : (
                        <div className="grid gap-3 lg:grid-cols-2">
                          {snapshotRecords.slice(0, 12).map(record => (
                            <div key={record.id} className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-black text-[#4A042A]">{record.label}</p>
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-sky-700">{new Date(record.createdAt).toLocaleString()}</p>
                                </div>
                                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${record.status === 'restored' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-sky-200 bg-white text-sky-700'}`}>
                                  {record.status === 'restored' ? 'Restored' : 'Snapshot'}
                                </span>
                              </div>
                              <p className="mt-2 text-xs font-bold text-slate-500">
                                {(record.summary?.orders || 0)} orders, {(record.summary?.users || 0)} active profiles, {(record.summary?.products || 0)} products.
                              </p>
                              <button
                                type="button"
                                onClick={() => restoreSafetyRecord(record)}
                                disabled={isBtnLoading}
                                className="mt-3 rounded-full border border-sky-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-sky-700 transition-colors hover:border-sky-300 disabled:opacity-50"
                              >
                                Restore Snapshot
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* âœ¨ REFACTORED: PURE CUSTOMER DATABASE */}
                {adminTab === 'customers' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registered Customers Database</h2>
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      {renderCompactAdminStat('Profiles', customerSummary.total, 'pink', 'Visible customers')}
                      {renderCompactAdminStat('With Address', customerSummary.withAddress, 'emerald', 'Ready records')}
                      {renderCompactAdminStat('Missing Address', customerSummary.noAddress, 'amber', 'Needs update')}
                      {renderCompactAdminStat('With Handle', customerSummary.withHandle, 'blue', 'Saved social handle')}
                    </div>

                    <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                      <table className="w-full text-left custom-table compact-table">
                        <thead>
                          <tr>
                            {renderSortableHeader('Customer Info', 'name', customersTableSort, setCustomersTableSort)}
                            {renderSortableHeader('Saved Address', 'address', customersTableSort, setCustomersTableSort)}
                            <th className="text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-pink-50">
                          {sortedRegisteredUsers.map(u => {
                            return (
                              <tr key={u.id} className="hover:bg-pink-50/20">
                                <td>
                                  <button onClick={() => { setSelectedProfileEmail(u.id); setIsEditingAddress(false); }} className="font-bold text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">{u.name}</button>
                                  <p className="text-[10px] text-slate-400">{u.id}</p>
                                  {u.handle && <p className="text-[10px] text-[#D6006E] font-bold">{u.handle}</p>}
                                </td>
                                <td className="text-[10px] text-slate-500">{u.address?.street ? `${u.address.street}, ${u.address.brgy ? u.address.brgy + ', ' : ''}${u.address.city} (${u.address.shipOpt})${getPartialShipPreferenceLabel(u.address?.partialShipPref) ? ` • ${getPartialShipPreferenceLabel(u.address?.partialShipPref)}` : ''}` : <span className="italic opacity-40">No address on file</span>}</td>
                                <td className="text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    {confirmAction.type === 'deleteCustomer' && confirmAction.id === u.id ? (
                                      <div className="flex gap-1 justify-center animate-fadeIn bg-rose-50 p-1 rounded-lg border border-rose-200">
                                        <button onClick={async () => {
                                          await safeAwait(deleteDoc(doc(db, colPath('users'), u.id)));
                                          setConfirmAction({ type: null, id: null });
                                          showToast("Customer profile deleted.");
                                        }} className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-rose-600">YES</button>
                                        <button onClick={() => setConfirmAction({ type: null, id: null })} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-black hover:bg-slate-300">NO</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => setConfirmAction({ type: 'deleteCustomer', id: u.id })} className="text-slate-300 hover:text-rose-500 hover:scale-110 transition-transform bg-transparent border-none p-1" title="Delete Profile"><Trash2 size={16} /></button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {sortedRegisteredUsers.length === 0 && <tr><td colSpan="3" className="text-center p-8 text-pink-300 font-bold italic">No registered customers found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminTab === 'settings-core' && (
                  <div className="space-y-6 pb-20 max-w-5xl mx-auto">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Core System Settings</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50 space-y-6 h-full">
                        <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">Global Constants</h3>
                        {settings.paymentsOpen && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-700">
                            Payment mode is live. Pricing and routing controls are locked until the payment window is closed.
                          </div>
                        )}

                        <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Batch Name</label><input type="text" className={lockedAdminInput} value={settings.batchName} onChange={e => updateSetting('batchName', e.target.value)} disabled={settings.paymentsOpen} /></div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Discord Batch Code</label>
                          <input
                            type="text"
                            className={lockedAdminInput}
                            value={settings.shopAccessCode || ''}
                            onChange={e => updateSetting('shopAccessCode', e.target.value)}
                            placeholder="Leave blank to keep the shop public"
                            disabled={settings.paymentsOpen}
                          />
                          <p className="mt-1 text-[10px] font-bold text-slate-400">If this is filled, buyers need the current Discord code before they can enter the shop.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Exchange Rate (1$ = ?)</label><input type="number" className={lockedAdminInput} value={settings.fxRate} onChange={e => updateSetting('fxRate', Number(e.target.value))} disabled={settings.paymentsOpen} /></div>
                          <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Admin Fee (PHP)</label><input type="number" className={lockedAdminInput} value={settings.adminFeePhp} onChange={e => updateSetting('adminFeePhp', Number(e.target.value))} disabled={settings.paymentsOpen} /></div>
                        </div>
                        <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Minimum Vials Per Order</label><input type="number" className={lockedAdminInput} value={settings.minOrder} onChange={e => updateSetting('minOrder', Number(e.target.value))} disabled={settings.paymentsOpen} /></div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Shipping Options (Comma-Separated)</label>
                          <input
                            type="text"
                            className={lockedAdminInput}
                            value={(settings.shippingOptions || []).join(', ')}
                            onChange={e => updateSetting('shippingOptions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder="e.g. Lalamove, LBC, J&T, Pickup"
                            disabled={settings.paymentsOpen}
                          />
                        </div>
                        <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Dashboard Password</label><input type="text" className={lockedAdminInput} value={settings.adminPass} onChange={e => updateSetting('adminPass', e.target.value)} disabled={settings.paymentsOpen} /></div>
                      </section>

                      <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50 space-y-4 h-full flex flex-col">
                        <div className="border-b-2 border-pink-50 pb-3">
                          <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em]">Store Modes</h3>
                          <p className="mt-2 text-xs font-bold text-slate-500">These are whole-store states. Product and box locking lives in Inventory.</p>
                        </div>

                        <div className="space-y-3">
                          {renderAdminToggle({
                            label: 'Store Access',
                            description: 'Controls whether buyers can browse the catalog and save orders.',
                            active: settings.storeOpen !== false,
                            activeText: 'Enabled',
                            inactiveText: 'Disabled',
                            onToggle: () => updateSetting('storeOpen', settings.storeOpen === false ? true : false),
                            activeTone: {
                              panel: 'bg-emerald-50 border-emerald-200',
                              badge: 'bg-emerald-100 text-emerald-700',
                              track: 'border-emerald-400 bg-emerald-500'
                            },
                            inactiveTone: {
                              panel: 'bg-rose-50 border-rose-200',
                              badge: 'bg-rose-100 text-rose-700',
                              track: 'border-rose-300 bg-rose-200'
                            }
                          })}

                          {renderAdminToggle({
                            label: 'Review Stage',
                            description: 'Freezes buyer edits so everyone can double-check saved orders before payments.',
                            active: settings.reviewStageOpen,
                            activeText: 'Enabled',
                            inactiveText: 'Disabled',
                            onToggle: toggleReviewStageWindow,
                            activeTone: {
                              panel: 'bg-sky-50 border-sky-200',
                              badge: 'bg-sky-100 text-sky-700',
                              track: 'border-sky-400 bg-sky-500'
                            },
                            inactiveTone: {
                              panel: 'bg-slate-50 border-slate-200',
                              badge: 'bg-slate-100 text-slate-600',
                              track: 'border-slate-300 bg-slate-200'
                            }
                          })}

                          {renderAdminToggle({
                            label: 'Payment Window',
                            description: 'Switches the buyer flow from ordering to payment submission.',
                            active: settings.paymentsOpen,
                            activeText: 'Enabled',
                            inactiveText: 'Disabled',
                            onToggle: togglePaymentsWindow,
                            activeTone: {
                              panel: 'bg-emerald-50 border-emerald-200',
                              badge: 'bg-emerald-100 text-emerald-700',
                              track: 'border-emerald-400 bg-emerald-500'
                            },
                            inactiveTone: {
                              panel: 'bg-slate-50 border-slate-200',
                              badge: 'bg-slate-100 text-slate-600',
                              track: 'border-slate-300 bg-slate-200'
                            }
                          })}

                          {renderAdminToggle({
                            label: 'Add-Only Protection',
                            description: 'Locks saved quantities so buyers can only add more vials near cutoff.',
                            active: settings.addOnly,
                            activeText: 'Enabled',
                            inactiveText: 'Disabled',
                            onToggle: () => updateSetting('addOnly', !settings.addOnly),
                            activeTone: {
                              panel: 'bg-amber-50 border-amber-200',
                              badge: 'bg-amber-100 text-amber-700',
                              track: 'border-amber-400 bg-amber-500'
                            },
                            inactiveTone: {
                              panel: 'bg-slate-50 border-slate-200',
                              badge: 'bg-slate-100 text-slate-600',
                              track: 'border-slate-300 bg-slate-200'
                            }
                          })}
                        </div>

                      </section>
                    </div>

                    <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50 space-y-4">
                      <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">System Utilities</h3>

                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 mb-4">
                        <h4 className="text-[10px] font-black text-[#D6006E] uppercase tracking-widest">Google Sheets Integration</h4>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Apps Script Web App URL</label>
                          <input type="url" className={adminInputSm} value={settings.gasWebAppUrl || ''} onChange={e => updateSetting('gasWebAppUrl', e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Google Sheet URL (For quick access)</label>
                          <input type="url" className={adminInputSm} value={settings.googleSheetUrl || ''} onChange={e => updateSetting('googleSheetUrl', e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                        </div>
                      </div>

                      <div className="hidden lg:block pt-4 border-t-2 border-pink-50">
                        <button onClick={seedDemoData} disabled={isBtnLoading} className="w-full py-3 rounded-xl bg-slate-100 text-slate-600 font-black uppercase text-[10px] tracking-widest border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50">
                          {isBtnLoading ? "Seeding..." : "Seed Full Product List & Mock Orders"}
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-2 font-bold">Testing utility only. Injects demo products and mock orders.</p>
                      </div>
                    </section>

                    <section className="bg-rose-50 p-6 rounded-2xl shadow-sm border-2 border-rose-200 space-y-4">
                      <div className="border-b border-rose-200 pb-3">
                        <h3 className="font-black text-xs text-rose-600 uppercase tracking-[0.2em]">Danger Zone</h3>
                        <p className="text-xs font-bold text-rose-500 mt-2">Use these only when you are intentionally closing a batch or resetting your testing environment.</p>
                      </div>

                      <button onClick={resetSystem} disabled={isBtnLoading} className="w-full py-4 rounded-2xl bg-white text-rose-600 font-black uppercase text-[10px] tracking-widest border border-rose-300 hover:bg-rose-100 transition-colors disabled:opacity-50">
                        Reset System
                      </button>
                    </section>
                  </div>
                )}

                {adminTab === 'settings-admins' && (
                  <div className="space-y-6 max-w-3xl mx-auto pb-20">
                    <div className="space-y-3">
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Admin Profiles & Banks</h2>
                      {settings.paymentsOpen && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black text-amber-700">
                          Admin bank profiles are locked while payments are open so the payment destination cannot drift mid-window.
                        </div>
                      )}
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {renderCompactAdminStat('Admins', adminProfilesSummary.total, 'pink', 'Saved profiles')}
                        {renderCompactAdminStat('Bank Options', adminProfilesSummary.bankOptions, 'blue', 'Across all admins')}
                        {renderCompactAdminStat('QR Uploaded', adminProfilesSummary.qrCount, 'emerald', 'Payment QR slots')}
                        {renderCompactAdminStat('Need QR', adminProfilesSummary.noQrProfiles, 'amber', 'Profiles without QR')}
                      </div>
                    </div>
                    <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50">
                      <div className="bg-[#FFF0F5] border-2 border-[#FFC0CB] rounded-xl p-4 max-h-[400px] overflow-y-auto mb-6 space-y-4">
                        {normalizedAdmins.map((a, idx) => (
                          <div key={idx} className="flex gap-3 justify-between items-start border-b border-pink-100 pb-4">
                            <div className="w-full pr-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <strong className="text-[#4A042A] text-base">{a.name}</strong>
                                <span className="rounded-full border border-pink-200 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#D6006E]">
                                  {(a.banks || []).length} option{(a.banks || []).length === 1 ? '' : 's'}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                {a.banks.map((bank, bIdx) => (
                                  <div key={bIdx} className="bg-white p-3 rounded-lg border border-pink-50 shadow-sm">
                                    <span className="text-[9px] font-black text-pink-400 uppercase">Option {bIdx + 1}</span>
                                    <div className="text-[10px] text-gray-600 break-words mt-1">
                                      {bank.qr ? <span className="text-emerald-600 font-bold flex items-center gap-1 mb-1"><ImageIcon size={10} /> QR Uploaded</span> : null}
                                      {bank.details ? <span className={bank.qr ? 'block' : ''}>{bank.details}</span> : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* âœ¨ FIXED: Inline Confirmation for Admin Delete */}
                            {confirmAction.type === 'deleteAdmin' && confirmAction.id === idx ? (
                              <div className="flex gap-2 items-center animate-fadeIn bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                <span className="text-[9px] font-bold text-rose-700 uppercase">Remove?</span>
                                <button onClick={() => {
                                  const newArr = [...normalizedAdmins]; newArr.splice(idx, 1); updateSetting('admins', newArr);
                                  setConfirmAction({ type: null, id: null });
                                }} disabled={settings.paymentsOpen} className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed">YES</button>
                                <button onClick={() => setConfirmAction({ type: null, id: null })} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-black hover:bg-slate-300">NO</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmAction({ type: 'deleteAdmin', id: idx })} disabled={settings.paymentsOpen} className="text-rose-500 font-bold hover:text-rose-700 bg-white border border-rose-100 rounded-lg p-2.5 hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100">Remove</button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Add New Admin</h4>
                        <input type="text" className={`${adminInputSm} disabled:opacity-60 disabled:cursor-not-allowed`} placeholder="Admin Name" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} disabled={settings.paymentsOpen} />

                        <div className="space-y-4 border-t border-slate-200 pt-4">
                          {newAdmin.banks.map((bank, index) => (
                            <div key={index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Payment Option {index + 1}</p>
                                {newAdmin.banks.length > 1 && (
                                  <button onClick={() => {
                                    const newBanks = [...newAdmin.banks];
                                    newBanks.splice(index, 1);
                                    setNewAdmin({ ...newAdmin, banks: newBanks });
                                  }} disabled={settings.paymentsOpen} className="text-red-500 text-xs font-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline">Remove Option</button>
                                )}
                              </div>
                              <textarea className={`${adminInputSm} mb-3 disabled:opacity-60 disabled:cursor-not-allowed`} placeholder="Bank Details (e.g. BDO: 123...)" value={bank.details} onChange={e => {
                                const newBanks = [...newAdmin.banks];
                                newBanks[index].details = e.target.value;
                                setNewAdmin({ ...newAdmin, banks: newBanks });
                              }} rows={2} disabled={settings.paymentsOpen} />
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-2">Upload QR Code Image</label>
                                <input type="file" accept="image/*" onChange={e => {
                                  const newBanks = [...newAdmin.banks];
                                  newBanks[index].qrFile = e.target.files[0];
                                  setNewAdmin({ ...newAdmin, banks: newBanks });
                                }} disabled={settings.paymentsOpen} className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed" />
                              </div>
                            </div>
                          ))}
                          <button onClick={() => {
                            if (newAdmin.banks.length >= 4) {
                              showToast("Maximum of 4 payment options allowed.");
                              return;
                            }
                            setNewAdmin({ ...newAdmin, banks: [...newAdmin.banks, { details: '', qrFile: null }] });
                          }} disabled={settings.paymentsOpen} className="text-xs font-bold text-[#D6006E] bg-pink-50 px-4 py-3 rounded-xl w-full hover:bg-pink-100 border border-pink-200 border-dashed transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">+ Add Another Bank Option</button>
                        </div>

                        <button onClick={handleAddAdmin} disabled={isBtnLoading || settings.paymentsOpen} className="bg-[#FF1493] text-white font-black uppercase tracking-widest py-3 rounded-xl text-sm hover:bg-[#D6006E] transition-colors shadow-md mt-4 hover:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                          {isBtnLoading ? 'Uploading QRs...' : 'Save New Admin Profile'}
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {adminTab === 'settings-products' && (
                  <div className="space-y-6 pb-20 max-w-5xl mx-auto">
                    <div className="space-y-3">
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Product Catalog Management</h2>
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        {renderCompactAdminStat('Catalog Items', productCatalogSummary.total, 'pink', 'All saved products')}
                        {renderCompactAdminStat('Visible', productCatalogSummary.visible, 'blue', 'Matches search')}
                        {renderCompactAdminStat('Avg Price', `$${productCatalogSummary.average.toFixed(2)}`, 'emerald', 'Per vial')}
                        {renderCompactAdminStat('Highest', `$${productCatalogSummary.highest.toFixed(2)}`, 'amber', 'Top vial price')}
                      </div>
                    </div>
                    <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50 space-y-4">

                      <div className="flex justify-between items-center mb-4 border-b border-pink-100 pb-4 gap-4 flex-wrap">
                        <h3 className="m-0 border-none p-0 font-black text-sm text-pink-600 uppercase tracking-[0.2em]">Live Products <span className="text-[10px] text-pink-400 normal-case ml-2 bg-pink-50 px-2 py-1 rounded-full">({products.length} Total)</span></h3>
                        <div className="relative w-full sm:w-auto min-w-[300px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={16} />
                          <input type="text" value={adminSettingsProductSearch} onChange={e => setAdminSettingsProductSearch(e.target.value)} placeholder="Search to edit product..." className={`${adminInputSm} pl-10 m-0 py-2`} />
                        </div>
                      </div>

                      <div className="overflow-x-auto border-2 border-pink-100 rounded-2xl mb-6 max-h-[500px] overflow-y-auto shadow-inner">
                        <table className="w-full text-sm text-left custom-table compact-table">
                          <thead className="sticky top-0 shadow-sm bg-[#FFF0F5] z-10">
                            <tr>{renderSortableHeader('Name', 'name', productsTableSort, setProductsTableSort)}{renderSortableHeader('Price (Vial)', 'price', productsTableSort, setProductsTableSort)}<th className="text-center">Delete</th></tr>
                          </thead>
                          <tbody className="bg-white">
                            {sortedSettingsProducts.map(p => (
                              <tr key={p.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                <td className="font-bold text-[#4A042A] text-sm">{p.name}</td>
                                <td className="text-[#D6006E] font-bold text-sm">${p.pricePerVialUSD.toFixed(2)}</td>
                                <td className="text-center">
                                  {confirmAction.type === 'deleteProduct' && confirmAction.id === p.id ? (
                                    <div className="flex gap-1 justify-center animate-fadeIn bg-rose-50 p-1 rounded-lg border border-rose-200">
                                      <button onClick={() => { safeAwait(deleteDoc(doc(db, colPath('products'), p.id))); setConfirmAction({ type: null, id: null }); }} className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-rose-600">YES</button>
                                      <button onClick={() => setConfirmAction({ type: null, id: null })} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-black hover:bg-slate-300">NO</button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setConfirmAction({ type: 'deleteProduct', id: p.id })} className="text-slate-300 hover:text-rose-500 hover:scale-110 transition-transform bg-transparent border-none p-1"><Trash size={16} /></button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {sortedSettingsProducts.length === 0 && <tr><td colSpan="3" className="text-center p-8 text-pink-300 font-bold italic">No products found.</td></tr>}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-8 pt-6 border-t-2 border-pink-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-[#FFF0F5] p-6 rounded-2xl border border-[#FFC0CB]">
                        <div>
                          <h4 className="text-sm font-black text-[#D6006E] mb-1">Bulk Upload via CSV</h4>
                          <p className="text-xs font-bold text-slate-500 max-w-sm">Columns must match the exact template format. <br /><span className="text-rose-500 font-black">Warning: Uploading replaces your entire current catalog.</span></p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <button onClick={downloadCSVTemplate} className="flex-1 sm:flex-none bg-white border-2 border-[#FFC0CB] text-[#D6006E] px-4 py-2 rounded-xl font-bold hover:bg-pink-50 transition-colors text-xs whitespace-nowrap shadow-sm hover:scale-[0.98]">
                            Get Template
                          </button>
                          <label className={`flex-1 sm:flex-none text-center bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition-transform text-xs whitespace-nowrap shadow-md hover:scale-[0.98] ${isBtnLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isBtnLoading ? 'Uploading...' : 'Upload CSV & Replace'}
                            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={isBtnLoading} />
                          </label>
                        </div>
                      </div>

                    </section>
                  </div>
                )}

              </div>
            </main>
          </div>
        )
      )}

      {/* âœ¨ NEW: ADMIN INLINE EDIT MODAL */}
      {adminOrderEditTarget && (() => {
        const targetProfile = users.find(u => u.id === adminOrderEditTarget) || { name: 'Unknown User' };

        const filteredModalProducts = enrichedProducts
          .filter(p => !adminModalSearchQuery || p.name.toLowerCase().includes(adminModalSearchQuery.toLowerCase()))
          .sort((a, b) => {
            // Pin items they already ordered to the top
            const inOrderA = orders.some(o => o.email === adminOrderEditTarget && o.product === a.name);
            const inOrderB = orders.some(o => o.email === adminOrderEditTarget && o.product === b.name);

            if (inOrderA && !inOrderB) return -1;
            if (!inOrderA && inOrderB) return 1;

            // Alphabetical sorting for the rest
            return a.name.localeCompare(b.name);
          });

        return (
          <div className="fixed inset-0 bg-[#4A042A]/90 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
            <div className="bg-slate-50 rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
              <div className="bg-white p-5 flex justify-between items-center border-b-2 border-slate-200">
                <div>
                  <h2 className="brand-title text-xl text-[#D6006E] m-0">Editing Active Order</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">{targetProfile.name} ({adminOrderEditTarget})</p>
                </div>
                <button onClick={() => { setAdminOrderEditTarget(null); setAdminModalSearchQuery(''); }} className="text-slate-400 hover:text-[#D6006E] font-black text-3xl transition-colors">&times;</button>
              </div>

              <div className="bg-[#FFF0F5] p-4 border-b border-pink-100 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={16} />
                  <input type="text" value={adminModalSearchQuery} onChange={e => setAdminModalSearchQuery(e.target.value)} placeholder="Search products to add/edit..." className={`${adminInputSm} pl-10 border-pink-200 m-0 py-2 shadow-inner`} />
                </div>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto flex-1 hide-scroll">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredModalProducts.map(p => {
                    const currentQty = adminCart[p.name] || 0;
                    const isSelected = currentQty > 0;

                    return (
                      <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${isSelected ? 'bg-pink-50 border-pink-400 shadow-sm' : 'bg-white border-slate-200 hover:border-pink-300'}`}>
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className={`font-black text-sm truncate ${isSelected ? 'text-[#D6006E]' : 'text-slate-700'}`}>{p.name}</h4>
                          <p className="text-[10px] font-bold text-slate-400">${p.pricePerVialUSD.toFixed(2)} / vial</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleAdminCartChange(p.name, Math.max(0, currentQty - 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-600 font-black flex items-center justify-center hover:bg-slate-100 active:scale-95">-</button>
                          <input type="number" value={currentQty || ''} onChange={e => handleAdminCartChange(p.name, e.target.value)} className="w-12 h-8 text-center font-black text-[#D6006E] bg-transparent border-b-2 border-pink-200 outline-none focus:border-[#D6006E]" placeholder="0" />
                          <button onClick={() => handleAdminCartChange(p.name, currentQty + 1)} className="w-8 h-8 rounded-lg bg-pink-600 border border-pink-600 text-white font-black flex items-center justify-center hover:bg-pink-700 active:scale-95">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredModalProducts.length === 0 && <p className="text-center text-slate-400 italic font-bold py-8">No products found matching your search.</p>}
              </div>

              <div className="p-5 border-t-2 border-slate-200 bg-white flex justify-end gap-3">
                <button onClick={() => { setAdminOrderEditTarget(null); setAdminModalSearchQuery(''); }} className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={saveAdminOrderEdit} disabled={isBtnLoading} className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-gradient-to-r from-[#FF1493] to-[#FF69B4] shadow-md hover:scale-[0.98] transition-transform disabled:opacity-50">
                  {isBtnLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* âœ¨ FULL SCREEN PROOF MODAL */}
      {fullScreenProof && (
        <div className="fixed inset-0 bg-black/90 z-[2000] flex flex-col items-center justify-center p-4 cursor-pointer" onClick={() => setFullScreenProof(null)}>
          <button className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/80 hover:text-white text-4xl font-black transition-colors">&times;</button>
          <img src={fullScreenProof} alt="Full Screen Proof" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}

      {/* âœ¨ ALL PROOFS GALLERY MODAL */}
      {showAllProofsModal && (
        <div className="fixed inset-0 bg-[#4A042A]/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-[32px] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col h-[90vh] border-4 border-white">
            <div className="bg-white p-5 flex justify-between items-center border-b-2 border-slate-200">
              <h2 className="brand-title text-2xl text-[#D6006E]">All Payment Proofs</h2>
              <button onClick={() => setShowAllProofsModal(false)} className="text-slate-400 hover:text-[#D6006E] font-black text-3xl transition-colors">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 hide-scroll">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {customerList.filter(c => c.proofUrl).length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400 font-bold italic">No proofs uploaded yet.</div>
                ) : (
                  customerList.filter(c => c.proofUrl).map((c, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col group">
                      <button onClick={() => setFullScreenProof(c.proofUrl)} className="flex-1 min-h-[150px] bg-slate-100 rounded-xl overflow-hidden mb-2 relative cursor-zoom-in border-none p-0 m-0">
                        <img src={c.proofUrl} alt="Proof" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <p className="text-[10px] font-black text-slate-800 truncate">{c.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{c.email}</p>
                      <span className="mt-1 bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded text-[8px] font-black uppercase text-center">Proof On File</span>
                      <button
                        onClick={() => removeCustomerProof(c)}
                        className="mt-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rose-700 transition-colors hover:border-rose-300"
                      >
                        Remove Proof
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* âœ¨ NEW: Quick Info Product Modal */}
      {quickInfoProduct && (
        <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setQuickInfoProduct(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-pink-100 relative animate-fadeIn" onClick={e => e.stopPropagation()}>
            <button onClick={() => setQuickInfoProduct(null)} className="absolute top-4 right-4 text-slate-400 hover:text-[#D6006E] font-black text-2xl transition-colors">&times;</button>

            <div className="p-6">
              <h3 className="font-black text-2xl text-[#D6006E] mb-2">{quickInfoProduct.displayName || quickInfoProduct.name}</h3>
              {quickInfoProduct.strength && (
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 mb-3">{quickInfoProduct.strength}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-4">
                {quickInfoProduct.tags.map((tag, tIdx) => (
                  <span key={tIdx} className="bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">{tag}</span>
                ))}
              </div>

              {quickInfoProduct.benefits?.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {quickInfoProduct.benefits.map((benefit, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black uppercase tracking-widest text-pink-500">Benefit</p>
                      <p className="text-[10px] font-bold text-slate-600 mt-1">{benefit}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-slate-700 font-semibold leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {quickInfoProduct.desc}
              </p>

              <div className="space-y-3">
                {quickInfoProduct.dosage && (
                  <div className="flex items-start gap-3">
                    <div className="bg-pink-100 p-2 rounded-lg text-pink-600 shrink-0"><Droplet size={16} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dosage</p>
                      <p className="text-xs font-bold text-slate-700">{quickInfoProduct.dosage}</p>
                    </div>
                  </div>
                )}
                {quickInfoProduct.cycle && (
                  <div className="flex items-start gap-3">
                    <div className="bg-pink-100 p-2 rounded-lg text-pink-600 shrink-0"><Repeat size={16} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cycle</p>
                      <p className="text-xs font-bold text-slate-700">{quickInfoProduct.cycle}</p>
                    </div>
                  </div>
                )}
                {quickInfoProduct.storage && (
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-500 shrink-0"><ThermometerSnowflake size={16} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Storage</p>
                      <p className="text-xs font-bold text-slate-700">{quickInfoProduct.storage}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1">Kit Rule</p>
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">{quickInfoProduct.protectionNote}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Viewer Modal */}
      {selectedProfileEmail && (() => {
        const profile = users.find(u => u.id === selectedProfileEmail.toLowerCase().trim()) || { id: selectedProfileEmail, name: 'Unknown Customer' };
        const curOrders = orders.filter(o => o.email === selectedProfileEmail.toLowerCase().trim());
        const histOrders = history.filter(o => o.email === selectedProfileEmail.toLowerCase().trim());

        return (
          <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
              <div className="bg-[#FFF0F5] p-4 sm:p-5 flex justify-between items-center border-b-2 border-[#FFC0CB]">
                <h2 className="brand-title text-2xl text-[#D6006E]">Profile & History</h2>
                <button onClick={() => { setSelectedProfileEmail(null); setIsEditingAddress(false); }} className="text-pink-600 font-black text-2xl hover:text-pink-800 transition-colors hover:scale-110">&times;</button>
              </div>
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50 hide-scroll">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm">
                    <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">Customer Details</p>
                    <p className="font-black text-lg text-[#4A042A]">{profile.name}</p>
                    <p className="text-xs text-slate-500 font-bold">{profile.id}</p>
                    <p className="text-xs text-[#D6006E] font-black mt-1">{profile.handle || 'No handle provided'}</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm relative">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Saved Address</p>
                      {!isEditingAddress && (
                        <button onClick={() => startEditingAddress(profile)} className="text-[#D6006E] text-[10px] font-black uppercase hover:underline">Edit</button>
                      )}
                    </div>

                    {isEditingAddress ? (
                      <div className="space-y-2 mt-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select value={editAddressForm.shipOpt} onChange={e => setEditAddressForm({ ...editAddressForm, shipOpt: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none">
                            <option value="" disabled>Select Courier...</option>
                            {settings.shippingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                          <select value={editAddressForm.partialShipPref} onChange={e => setEditAddressForm({ ...editAddressForm, partialShipPref: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none">
                            <option value="" disabled>If may maunang dumating...</option>
                            {PARTIAL_SHIP_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </div>
                        <input type="text" value={editAddressForm.street} onChange={e => setEditAddressForm({ ...editAddressForm, street: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Street & Barangay" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={editAddressForm.city} onChange={e => setEditAddressForm({ ...editAddressForm, city: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="City" />
                          <input type="text" value={editAddressForm.prov} onChange={e => setEditAddressForm({ ...editAddressForm, prov: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Province" />
                          <input type="text" value={editAddressForm.zip} onChange={e => setEditAddressForm({ ...editAddressForm, zip: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Zip Code" />
                          <input type="text" value={editAddressForm.contact} onChange={e => setEditAddressForm({ ...editAddressForm, contact: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Contact #" />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={saveEditedAddress} disabled={isBtnLoading} className="flex-1 bg-[#D6006E] text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-pink-700">{isBtnLoading ? 'Saving...' : 'Save'}</button>
                          <button onClick={() => setIsEditingAddress(false)} className="flex-1 bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-slate-300">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      profile.address?.street ? (
                        <p className="text-xs font-bold text-slate-700 leading-tight">
                          {profile.address.street}<br />
                          {profile.address.brgy ? `${profile.address.brgy}, ` : ''}{profile.address.city}<br />
                          {profile.address.prov} {profile.address.zip}<br />
                          <span className="text-emerald-600 mt-1 inline-block">Courier: {profile.address.shipOpt}</span><br />
                          {getPartialShipPreferenceLabel(profile.address.partialShipPref) ? <><span className="text-[#D6006E]">Shipping note: {getPartialShipPreferenceLabel(profile.address.partialShipPref)}</span><br /></> : null}
                          <span className="text-slate-500">Contact: {profile.address.contact}</span>
                        </p>
                      ) : <p className="text-xs text-slate-400 italic">No address on file</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-sm text-[#D6006E] uppercase tracking-widest mb-2 border-b-2 border-pink-100 pb-1">Current Active Orders</h3>
                  {curOrders.length === 0 ? <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-200">No active orders in this batch.</p> : (
                    <div className="bg-white border-2 border-pink-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-[#FFF0F5] text-[#D6006E] text-[10px] uppercase"><tr><th className="p-2 sm:p-3">Product</th><th className="p-2 sm:p-3 text-center">Qty</th></tr></thead>
                        <tbody>
                          {curOrders.map(o => <tr key={o.id} className="border-t border-pink-50"><td className="p-2 sm:p-3 font-bold text-slate-800 text-xs sm:text-sm">{o.product}</td><td className="p-2 sm:p-3 text-center font-black text-[#D6006E] text-base">{o.qty}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-black text-sm text-slate-500 uppercase tracking-widest mb-2 border-b-2 border-slate-200 pb-1">Past Order History</h3>
                  {histOrders.length === 0 ? <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-200">No past orders found.</p> : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase"><tr><th className="p-2 sm:p-3">Batch</th><th className="p-2 sm:p-3">Product</th><th className="p-2 sm:p-3 text-center">Qty</th></tr></thead>
                        <tbody>
                          {histOrders.map(o => <tr key={o.id} className="border-t border-slate-100"><td className="p-2 sm:p-3 text-[10px] sm:text-xs text-slate-500 font-bold">{o.batchName || 'Unknown'}</td><td className="p-2 sm:p-3 font-bold text-slate-700 text-xs sm:text-sm">{o.product}</td><td className="p-2 sm:p-3 text-center font-black text-slate-500 text-sm">{o.qty}</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[10000] w-[min(92vw,680px)] px-3">
          <div className="rounded-[22px] border border-white/55 bg-white/68 backdrop-blur-2xl px-4 py-3 shadow-[0_18px_45px_rgba(214,0,110,0.16)] animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/55 text-pink-600 border border-pink-100/70">
                <AlertTriangle size={16} />
              </div>
              <p className="text-sm font-black text-[#4A042A] leading-snug whitespace-pre-wrap">{toast}</p>
            </div>
          </div>
        </div>
      )}

      {/* âœ¨ NEW: Celebration Overlay with UNICORN */}
      {celebration.show && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] animate-fadeIn"></div>

          <div className="unicorn-wrapper">
            <div className="rainbow-trail"></div>
            <div className="unicorn-emoji">🦄</div>
          </div>

          {/* âœ¨ FIXED: Perfectly Centered Celebration Text */}
          <div className="absolute inset-0 flex items-center justify-center z-10 w-full px-4" style={{ animation: 'fadeIn 0.5s ease-out forwards, fadeOut 0.5s ease-in forwards 3s' }}>
            <h2 className="brand-title text-5xl sm:text-7xl text-[#D6006E] drop-shadow-xl filter text-center m-0 p-0 w-full leading-tight">
              {celebration.type === 'payment' ? 'Payment Sent!' : 'Order Saved!'}
            </h2>
          </div>
        </div>
      )}
    </>
  );
}
