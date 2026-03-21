import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  ShieldCheck, Store, Settings, Info, LayoutDashboard,
  BadgeDollarSign, Scissors, ClipboardList, Users,
  Lock, Package, Search, ArrowRight, CreditCard,
  Home, LogOut, Trash2, ChevronRight, BookOpen, Printer, ImageIcon,
  Droplet, Repeat, ThermometerSnowflake, Sparkles, AlertTriangle,
  MessageCircle, Send, ScrollText, Edit3, Trash, ShoppingCart
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
const CUTE_PLEAS = [
  "Pls help me complete the box! 🥺",
  "Don't let my vials get cut! ✂️",
  "I really need this product! 💖",
  "Save my spot! 🙏",
  "Looking for box buddies! 👯‍♀️",
  "Help! I don't wanna be trimmed! 😭"
];

// ✨ SUPERCHARGED KNOWLEDGE BASE
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
  { name: "Vasopressin (VP)", tags: ["Cognition", "Memory", "Focus"], desc: "A natural hormone that regulates water retention and blood pressure, used off-label for significant improvements in memory recall and mental alertness.", dosage: "10mcg to 20mcg (Nasal Spray)", cycle: "As needed", storage: "Refrigerate" }
];

const findWikiEntry = (pName) => {
  if (!pName) return null;
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-0]/g, '');
  const pClean = clean(pName);
  return WIKI_DATA.find(w => {
    const wClean = clean(w.name);
    return pClean.includes(wClean) || wClean.includes(pClean);
  });
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
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHitListModal, setShowHitListModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showWikiModal, setShowWikiModal] = useState(false);
  const [showAllProofsModal, setShowAllProofsModal] = useState(false);
  const [selectedProfileEmail, setSelectedProfileEmail] = useState(null);
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  const [proofFile, setProofFile] = useState(null);

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
  const [latestChatPreview, setLatestChatPreview] = useState(null);
  const chatEndRef = useRef(null);

  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editAddressForm, setEditAddressForm] = useState({ shipOpt: '', street: '', brgy: '', city: '', prov: '', zip: '', contact: '' });

  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [paymentFilterStatus, setPaymentFilterStatus] = useState('All');
  const [paymentFilterAdmin, setPaymentFilterAdmin] = useState('All');

  // ✨ NEW: Admin Inline Order Editing State
  const [adminOrderEditTarget, setAdminOrderEditTarget] = useState(null);
  const [adminCart, setAdminCart] = useState({});
  const [adminModalSearchQuery, setAdminModalSearchQuery] = useState('');

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);

  // Initializing with an empty array for admins
  const [settings, setSettings] = useState({
    batchName: '🎀 Sample Group Buy Batch 🎀',
    fxRate: 60,
    adminFeePhp: 150,
    minOrder: 3,
    storeOpen: true,
    paymentsOpen: false,
    addOnly: false,
    gasWebAppUrl: '',
    googleSheetUrl: '',
    proofFolder: 'proof of payments',
    labelsFolder: 'Order Labels',
    adminPass: 'admin123',
    shippingOptions: ["Lalamove", "LBC", "J&T", "Pickup"],
    admins: []
  });

  const [customerEmail, setCustomerEmail] = useState('');
  const [customerEmailConfirm, setCustomerEmailConfirm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerHandle, setCustomerHandle] = useState('');
  const [action, setAction] = useState('');
  const [cartItems, setCartItems] = useState({});
  const [addressForm, setAddressForm] = useState({ shipOpt: '', street: '', brgy: '', city: '', prov: '', zip: '', contact: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [wikiSearchQuery, setWikiSearchQuery] = useState('');
  const [adminGlobalSearch, setAdminGlobalSearch] = useState('');
  const [adminSettingsProductSearch, setAdminSettingsProductSearch] = useState('');

  // ✨ NEW: Customer UX States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [quickInfoProduct, setQuickInfoProduct] = useState(null);
  const POPULAR_CATEGORIES = ["All", "Weight Loss", "Healing", "Anti-Aging", "Muscle Growth", "Brain Health", "Skin"];

  const [newProd, setNewProd] = useState({ name: '', kit: '', vial: '', max: '' });
  const [newAdmin, setNewAdmin] = useState({ name: '', banks: [{ details: '', qrFile: null }] });
  const [isScrolled, setIsScrolled] = useState(false);

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
    const unsubChats = onSnapshot(collection(db, colPath('chats')), (snap) => {
      const arr = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a, b) => a.timestamp - b.timestamp);
      setChats(arr);
    });

    return () => { unsubSettings(); unsubProducts(); unsubOrders(); unsubUsers(); unsubHistory(); unsubChats(); unsubLogs(); };
  }, [user]);

  useEffect(() => {
    if (chats.length > 0 && !isChatOpen) {
      const newestChat = chats[chats.length - 1];
      if (Date.now() - newestChat.timestamp < 10000) {
        setLatestChatPreview(newestChat);
        const timer = setTimeout(() => setLatestChatPreview(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [chats, isChatOpen]);

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, isChatOpen]);

  const normalizedAdmins = useMemo(() => {
    return (settings.admins || []).map(a => {
      if (a.banks) return a;
      const banks = [];
      if (a.bank1 || a.qr1) banks.push({ details: a.bank1 || '', qr: a.qr1 || '' });
      if (a.bank2 || a.qr2) banks.push({ details: a.bank2 || '', qr: a.qr2 || '' });
      return { name: a.name, banks };
    });
  }, [settings.admins]);

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
      if (settings.paymentsOpen) { statusKey = 'locked'; statusText = '🔒 Payments Open'; }
      else if (isClosed && limitReached && p.maxBoxes > 0) { statusKey = 'full'; statusText = '⛔ Limit Reached'; }
      else if (p.locked) { statusKey = 'locked'; statusText = '🔒 Locked'; }
      else if (totalVials === 0) { statusKey = 'none'; statusText = '⚪ New Batch'; }
      else if (slotsLeft === 0) { statusKey = 'available'; statusText = '🟢 Next Box Open'; }
      else { statusKey = 'available'; statusText = `🟢 ${slotsLeft} slots left`; }

      return { ...p, totalVials, boxes, slotsLeft, isClosed, statusKey, statusText, openBatchLabel: (!isClosed) ? `Box ${boxes + 1}` : '' };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, orders, settings.paymentsOpen]);

  // ✨ NEW: Calculate exactly how many physical boxes will arrive from the supplier
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

  const customerList = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!map[o.email]) map[o.email] = { email: o.email, name: o.name, handle: o.handle, products: {} };
      if (!map[o.email].products[o.product]) map[o.email].products[o.product] = 0;
      map[o.email].products[o.product] += o.qty;
    });

    return Object.values(map).map(c => {
      let sub = 0;
      Object.entries(c.products).forEach(([pName, qty]) => {
        const pData = products.find(p => p.name === pName);
        if (pData) sub += qty * pData.pricePerVialUSD;
      });
      const tUSD = sub > 0 ? sub + (settings.adminFeePhp / settings.fxRate) : 0;
      const profile = users.find(u => u.id === c.email) || {};
      return { ...c, totalPHP: tUSD * settings.fxRate, isPaid: profile.isPaid || false, adminAssigned: profile.adminAssigned || "Unassigned", proofUrl: profile.proofUrl || null, address: profile.address || null };
    });
  }, [orders, products, settings, users]);

  const filteredAdminProducts = useMemo(() => {
    return enrichedProducts.filter(p => !adminGlobalSearch || p.name.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
  }, [enrichedProducts, adminGlobalSearch]);

  const filteredCustomerList = useMemo(() => {
    return customerList.filter(c => !adminGlobalSearch || c.name.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || c.email.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
  }, [customerList, adminGlobalSearch]);

  const filteredPackingOrders = useMemo(() => {
    return orders.filter(o => !adminGlobalSearch || o.product.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || o.name.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || o.email.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
  }, [orders, adminGlobalSearch]);

  const filteredHitList = useMemo(() => {
    return trimmingHitList.filter(v => !adminGlobalSearch || v.prod.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || v.name.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || v.email.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
  }, [trimmingHitList, adminGlobalSearch]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => !adminGlobalSearch || u.name?.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || u.id?.toLowerCase().includes(adminGlobalSearch.toLowerCase()) || u.handle?.toLowerCase().includes(adminGlobalSearch.toLowerCase()));
  }, [users, adminGlobalSearch]);

  // ✨ IMPROVED: Added Category Filtering
  const filteredShopProducts = useMemo(() => {
    let filtered = enrichedProducts;
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => {
        const wikiEntry = findWikiEntry(p.name);
        return wikiEntry && wikiEntry.tags.some(t => t.toLowerCase().includes(selectedCategory.toLowerCase()));
      });
    }
    return filtered;
  }, [enrichedProducts, searchQuery, selectedCategory]);

  const filteredSettingsProducts = useMemo(() => {
    return products
      .filter(p => !adminSettingsProductSearch || p.name.toLowerCase().includes(adminSettingsProductSearch.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, adminSettingsProductSearch]);

  const filteredWikiData = useMemo(() => {
    let data = WIKI_DATA;
    if (wikiSearchQuery) {
      const lowerQuery = wikiSearchQuery.toLowerCase();
      data = WIKI_DATA.filter(w =>
        w.name.toLowerCase().includes(lowerQuery) ||
        w.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
        w.desc.toLowerCase().includes(lowerQuery)
      );
    }
    return data.sort((a, b) => a.name.localeCompare(b.name));
  }, [wikiSearchQuery]);

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

  // --- ACTIONS & ANIMATIONS ---
  function triggerShake(field) {
    setShakingField(field);
    setTimeout(() => setShakingField(null), 500);
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

  function showToast(msg) {
    setToast(String(msg));
    setTimeout(() => setToast(null), 3000);
  }

  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;

    const senderName = customerHandle || customerName || 'Anonymous Buddy';
    try {
      await safeAwait(addDoc(collection(db, colPath('chats')), {
        text: chatInput.trim(),
        sender: senderName,
        productRef: null,
        timestamp: Date.now()
      }));
      setChatInput('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendHelpRequest = async (prod, missingSlots) => {
    const senderName = customerHandle || customerName || 'A Box Buddy';
    const textToSend = `Help! I need ${missingSlots} more slots of ${prod} to complete my box! 🙏`;
    try {
      await safeAwait(addDoc(collection(db, colPath('chats')), {
        text: textToSend,
        sender: senderName,
        productRef: prod,
        timestamp: Date.now()
      }));
      setIsChatOpen(true);
      setShowHitListModal(false);
      showToast("Help request sent to the chat! 📣");
    } catch (err) { console.error(err); }
  };

  const handleAddFromChat = (prodName) => {
    const pData = enrichedProducts.find(p => p.name === prodName);
    if (!pData || pData.isClosed) {
      showToast(`${prodName} is full or closed! 🔒`);
      return;
    }

    if (!action) setAction('add');

    const currentQty = (cartItems[prodName]?.k || 0) * 10 + (cartItems[prodName]?.v || 0);
    if (currentQty === 0) {
      setCartItems(prev => ({ ...prev, [prodName]: { k: 0, v: settings.minOrder } }));
    } else {
      setCartItems(prev => ({ ...prev, [prodName]: { k: prev[prodName]?.k || 0, v: Math.min((prev[prodName]?.v || 0) + 1, 9) } }));
    }

    showToast(`Added ${prodName} to your cart! 💖`);
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

  // ✨ IMPROVED: Smart Auto-Action Selection
  function handleLookup() {
    if (!customerEmail) return;

    // Auto-format email
    const cleanEmail = customerEmail.toLowerCase().trim();
    const profile = users.find(u => u.id === cleanEmail) || null;
    const hasActiveOrders = orders.some(o => o.email === cleanEmail);

    if (profile) {
      setCustomerName(profile.name || '');
      setCustomerHandle(profile.handle || '');
      if (profile.address) setAddressForm(profile.address);

      const atRisk = trimmingHitList.some(v => v.email === cleanEmail);
      if (settings.addOnly && atRisk && settings.storeOpen !== false) {
        showToast(`🚨 URGENT ${profile.name}: Your vials are on the Hit List!`);
      } else {
        showToast(`Welcome back, ${profile.name}! 💖 Profile loaded.`);
      }

      // Smart Auto-Select
      if (!settings.paymentsOpen && action === '') {
        const newAction = settings.addOnly ? 'add' : 'replace';
        setAction(newAction);
        if (newAction === 'replace' && hasActiveOrders) {
          // Manually trigger cart load since handleActionChange won't fire automatically here
          const prefill = {};
          const userOrders = orders.filter(o => o.email === cleanEmail);
          userOrders.forEach(o => { prefill[o.product] = { k: Math.floor(o.qty / 10), v: o.qty % 10 }; });
          setCartItems(prefill);
        }
      }
    } else {
      showToast(settings.storeOpen !== false ? "No existing profile found. Welcome! ✨" : "No profile found for this email.");
      if (!settings.paymentsOpen && action === '' && !settings.addOnly) {
        setAction('replace');
      }
    }
  }

  function handleActionChange(newAction) {
    setAction(newAction);
    if (newAction === 'replace') {
      const prefill = {};
      Object.entries(existingOrderData.items).forEach(([prod, qty]) => {
        prefill[prod] = { k: Math.floor(qty / 10), v: qty % 10 };
      });
      setCartItems(prefill);
      showToast("Order loaded for editing 📝");
    } else {
      setCartItems({});
    }
  }

  function handleCartChange(prodName, field, val) {
    if (!action && !settings.paymentsOpen) {
      triggerAmbulance();
      showToast("🚨 PLEASE CHOOSE AN ACTION FIRST! 🚨");
      return;
    }

    let num = parseInt(val) || 0;
    if (field === 'v' && num > 9) { num = 9; showToast("Use Kits for 10+ vials ✨"); }
    setCartItems(prev => ({ ...prev, [prodName]: { k: prev[prodName]?.k || 0, v: prev[prodName]?.v || 0, [field]: num } }));
  }

  function handleCartBlur(prodName) {
    const cart = cartItems[prodName];
    if (!cart) return;

    let k = cart.k || 0;
    let v = cart.v || 0;
    const totalVials = (k * 10) + v;

    if (totalVials > 0 && totalVials < settings.minOrder && !settings.addOnly) {
      showToast(`Minimum ${settings.minOrder} vials required per item! 🎀`);
      setCartItems(prev => ({ ...prev, [prodName]: { ...cart, v: settings.minOrder } }));
      setShakingProd(prodName);
      setTimeout(() => setShakingProd(null), 500);
    }
  }

  async function submitOrder() {
    if (!customerEmail) { triggerAmbulance(); showToast("Email Address is required! 💌"); return; }
    if (customerEmail.toLowerCase().trim() !== customerEmailConfirm.toLowerCase().trim()) {
      triggerAmbulance(); showToast("Email addresses do not match! ❌"); return;
    }
    if (!customerName) { triggerAmbulance(); showToast("Your Name is required! 🌸"); return; }
    if (!action) { triggerAmbulance(); showToast("Please choose an Action! ⚡"); return; }

    const emailLower = customerEmail.toLowerCase().trim();
    setIsBtnLoading(true);
    try {
      const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

      if (action === 'cancel') {
        const toDelete = orders.filter(o => o.email === emailLower);
        for (const chunk of chunkArray(toDelete, 250)) {
          const batch = writeBatch(db);
          chunk.forEach(o => batch.delete(doc(db, colPath('orders'), o.id)));
          await safeAwait(batch.commit());
        }

        await safeAwait(addDoc(collection(db, colPath('logs')), { timestamp: Date.now(), email: emailLower, name: customerName, action: "Cancelled Entire Order", details: "All items removed." }));

        showToast("Order Cancelled.");
        setCartItems({}); setIsBtnLoading(false); return;
      }

      const errors = []; const newOrderItems = []; const timestamp = Date.now();
      let newlyAddedQty = 0;

      Object.entries(cartItems).forEach(([prodName, amounts]) => {
        const qty = ((amounts.k || 0) * 10) + (amounts.v || 0);
        if (qty <= 0) return;

        if (!settings.addOnly && qty < settings.minOrder) {
          errors.push(`${prodName} requires at least ${settings.minOrder} vials.`);
        }

        newlyAddedQty += qty;
        const pData = enrichedProducts.find(p => p.name === prodName);
        if (pData?.isClosed) return;

        if (pData?.maxBoxes > 0 && (pData.totalVials - (action === 'replace' ? (existingOrderData.items[prodName] || 0) : 0) + qty) > (pData.maxBoxes * 10)) {
          errors.push(`${prodName}: Exceeds batch limit.`);
        }
        newOrderItems.push({ email: emailLower, name: customerName, handle: customerHandle, product: prodName, qty, timestamp });
      });

      if (action === 'replace' && newlyAddedQty === 0) {
        triggerShake('products');
        showToast("Your cart is empty! Add items or choose 'Cancel Order'. 🛍️");
        setIsBtnLoading(false);
        return;
      }
      if (action === 'add' && newlyAddedQty === 0) {
        triggerShake('products');
        showToast("No new items added to your order! 🛍️");
        setIsBtnLoading(false);
        return;
      }

      let finalTotalQty = 0;
      if (action === 'replace') {
        finalTotalQty = newlyAddedQty;
      } else if (action === 'add') {
        const existingTotal = Object.values(existingOrderData.items).reduce((a, b) => a + b, 0);
        finalTotalQty = existingTotal + newlyAddedQty;
      }

      if (!settings.addOnly && finalTotalQty < settings.minOrder) {
        showToast(`Your total order must be at least ${settings.minOrder} vials! 🎀`);
        setIsBtnLoading(false);
        return;
      }

      if (errors.length > 0) { showToast(errors.join(' | ')); setIsBtnLoading(false); return; }

      if (action === 'replace') {
        const toDelete = orders.filter(o => o.email === emailLower);
        for (const chunk of chunkArray(toDelete, 250)) {
          const batch = writeBatch(db);
          chunk.forEach(o => batch.delete(doc(db, colPath('orders'), o.id)));
          await safeAwait(batch.commit());
        }
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
      const userUpdatePayload = { name: customerName, handle: customerHandle };
      if (!existingUser || !existingUser.adminAssigned) {
        userUpdatePayload.adminAssigned = normalizedAdmins[Math.floor(Math.random() * normalizedAdmins.length)]?.name || "Admin";
      }
      await safeAwait(setDoc(doc(db, colPath('users'), emailLower), userUpdatePayload, { merge: true }));

      const logDetails = newOrderItems.map(i => `${i.qty}x ${i.product}`).join(', ');
      await safeAwait(addDoc(collection(db, colPath('logs')), { timestamp: Date.now(), email: emailLower, name: customerName, action: action === 'replace' ? 'Placed Order' : 'Added to Order', details: logDetails }));

      triggerCelebration('order');

      setCartItems({}); if (action === 'replace') setAction('');
    } catch (err) { console.error(err); showToast(`Error saving: ${err.message}`); }
    setIsBtnLoading(false);
  }

  async function submitPayment() {
    const errs = {};
    if (!addressForm.shipOpt) errs.shipOpt = true;
    if (!addressForm.street?.trim()) errs.street = true;
    if (!addressForm.brgy?.trim()) errs.brgy = true;
    if (!addressForm.city?.trim()) errs.city = true;
    if (!addressForm.prov?.trim()) errs.prov = true;
    if (!addressForm.zip?.trim()) errs.zip = true;
    if (!addressForm.contact?.trim()) errs.contact = true;
    if (!proofFile) errs.proofFile = true;

    if (Object.keys(errs).length > 0) {
      setAddressErrors(errs);
      showToast("Please fill all required highlighted fields! 🏠");
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

      showToast("Uploading proof... ☁️");
      await uploadBytesResumable(sRef, proofFile);
      const downloadUrl = await getDownloadURL(sRef);

      await safeAwait(setDoc(doc(db, colPath('users'), emailLower), {
        address: addressForm,
        isPaid: true,
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
    if (!editAddressForm.shipOpt || !editAddressForm.street || !editAddressForm.brgy || !editAddressForm.city || !editAddressForm.contact) {
      showToast("Please fill all basic address fields."); return;
    }
    setIsBtnLoading(true);
    try {
      await safeAwait(setDoc(doc(db, colPath('users'), selectedProfileEmail.toLowerCase().trim()), { address: editAddressForm }, { merge: true }));
      showToast("Address successfully updated! 🏠✅");
      setIsEditingAddress(false);
    } catch (e) {
      showToast("Error updating address.");
    }
    setIsBtnLoading(false);
  };

  const startEditingAddress = (profile) => {
    setEditAddressForm(profile.address || { shipOpt: '', street: '', brgy: '', city: '', prov: '', zip: '', contact: '' });
    setIsEditingAddress(true);
  };

  function generateBulkLabels() {
    const paidUsers = customerList.filter(c => c.isPaid && c.address?.street);
    if (paidUsers.length === 0) { showToast("No paid users with valid addresses to print! ❌"); return; }
    buildAndPrintLabelsHTML(paidUsers);
  }

  function generateSingleLabel(c) {
    if (!c.address?.street) { showToast("This customer has no valid address to print! ❌"); return; }
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
               <strong>📦 Ship via: ${c.address.shipOpt}</strong><br/><br/>
               ${c.address.street}<br/>
               ${c.address.brgy ? `${c.address.brgy}, ` : ''}${c.address.city}<br/>
               ${c.address.prov} ${c.address.zip}<br/><br/>
               📞 <strong>${c.address.contact}</strong>
            </div>
            <div class="items"><strong>Order Contents:</strong><ul>`;
      userOrders.forEach(o => { html += `<li><strong>${o.qty}x</strong> ${o.product}</li>`; });
      html += `</ul></div><div class="footer">Bonded By Peptides • ${settings.batchName}</div></div>`;
    });

    html += '</div></body></html>';
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 1000);
  }

  const pushToGoogleSheets = async () => {
    if (!settings.gasWebAppUrl) {
      showToast("Please enter your Google Web App URL in Settings first! ⚙️");
      return;
    }
    setIsBtnLoading(true);
    showToast("Pushing to Google Sheets... ☁️");

    try {
      const formattedCustomers = customerList.map(c => {
        const subtotalUSD = c.totalPHP / settings.fxRate - (settings.adminFeePhp / settings.fxRate);
        const totalUSD = c.totalPHP / settings.fxRate;
        const adminData = normalizedAdmins.find(a => a.name === c.adminAssigned);
        const bankAcc = adminData?.banks?.[0]?.details || '';

        return {
          Email: c.email,
          Name: c.name,
          Handle: c.handle || '',
          "Subtotal USD": subtotalUSD.toFixed(2),
          "Total USD": totalUSD.toFixed(2),
          "Total PHP": c.totalPHP,
          "Proof Link": c.proofUrl || '',
          "Assigned Admin": c.adminAssigned || '',
          "Bank Account": bankAcc,
          "Label Link": "N/A (Generated on Demand)",
          Street: c.address?.street || '',
          Barangay: c.address?.brgy || '',
          City: c.address?.city || '',
          Province: c.address?.prov || '',
          Zip: c.address?.zip || '',
          Contact: c.address?.contact || '',
          "Shipping Option": c.address?.shipOpt || '',
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
        showToast("✅ Successfully pushed to Google Sheets!");
      } else {
        showToast("❌ Error from Sheets: " + result.error);
      }
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to push. Check URL and permissions.");
    }
    setIsBtnLoading(false);
  };

  const pullFromGoogleSheets = async () => {
    if (!settings.gasWebAppUrl) {
      showToast("Please enter your Google Web App URL in Settings first! ⚙️");
      return;
    }
    setIsBtnLoading(true);
    showToast("Pulling from Google Sheets... ☁️");

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
        showToast("✅ Successfully pulled & synced from Google Sheets!");
      } else {
        showToast("❌ Error from Sheets: " + result.error);
      }
    } catch (error) {
      console.error(error);
      showToast("❌ Failed to pull. Check URL and permissions.");
    }
    setIsBtnLoading(false);
  };

  const exportCustomersCSV = () => {
    const headers = ["Email", "Name", "Handle", "Subtotal USD", "Total USD", "Total PHP", "Proof Link", "Assigned Admin", "Bank Account", "Label Link", "Street", "Barangay", "City", "Province", "Zip", "Contact", "Shipping Option", "Is Paid"];
    let csvContent = headers.join(",") + "\n";

    customerList.forEach(c => {
      const subtotalUSD = c.totalPHP / settings.fxRate - (settings.adminFeePhp / settings.fxRate);
      const totalUSD = c.totalPHP / settings.fxRate;
      const adminData = normalizedAdmins.find(a => a.name === c.adminAssigned);
      const bankAcc = adminData?.banks?.[0]?.details || '';

      const row = [
        `"${c.email}"`, `"${c.name}"`, `"${c.handle || ''}"`, `"${subtotalUSD.toFixed(2)}"`, `"${totalUSD.toFixed(2)}"`, `"${c.totalPHP}"`,
        `"${c.proofUrl || ''}"`, `"${c.adminAssigned || ''}"`, `"${bankAcc}"`, `"N/A (Generated on Demand)"`,
        `"${c.address?.street || ''}"`, `"${c.address?.brgy || ''}"`, `"${c.address?.city || ''}"`, `"${c.address?.prov || ''}"`,
        `"${c.address?.zip || ''}"`, `"${c.address?.contact || ''}"`, `"${c.address?.shipOpt || ''}"`, `"${c.isPaid ? 'TRUE' : 'FALSE'}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BBP_Customers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        showToast("Syncing Database from CSV... ⏳");

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

        showToast("✅ Customers synced successfully!");
      } catch (err) {
        console.error(err);
        showToast("❌ Error syncing customers.");
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

  async function executeTrim(victim) {
    if (!window.confirm(`Are you sure you want to completely CUT ${victim.amountToRemove} vials of ${victim.prod} from ${victim.handle || 'this customer'}?`)) return;
    if (victim.qty === victim.amountToRemove) {
      await safeAwait(deleteDoc(doc(db, colPath('orders'), victim.id)));
    } else {
      await safeAwait(setDoc(doc(db, colPath('orders'), victim.id), { qty: victim.qty - victim.amountToRemove }, { merge: true }));
    }
  }

  async function autoTrimAll() {
    if (!window.confirm('⚠️ Auto-Trim will reduce/delete loose vials from the bottom up. Proceed?')) return;
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
      showToast('Auto-Trim Complete! ✂️');
    } catch (err) { console.error(err); showToast('Error during auto-trim.'); }
  }

  async function runCutoff() {
    if (!window.confirm('Are you sure you want to run Cutoff? This will lock all products that have open boxes!')) return;
    let lockedCount = 0;
    const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
    try {
      const toLock = enrichedProducts.filter(p => (!p.locked && p.maxBoxes > 0 && p.totalVials > 0 && p.slotsLeft > 0 && p.boxes < p.maxBoxes));
      for (const chunk of chunkArray(toLock, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(p => {
          batch.set(doc(db, colPath('products'), p.id), { locked: true }, { merge: true });
          lockedCount++;
        });
        await safeAwait(batch.commit());
      }
      showToast(lockedCount > 0 ? `Cutoff Complete! Locked ${lockedCount} products.` : `Cutoff Complete! No open boxes needed locking.`);
    } catch (err) { console.error(err); showToast("Error running cutoff."); }
  }

  async function resetSystem() {
    if (!window.confirm('🚨 RESET SYSTEM: This will archive all current orders into History and clear the board. Proceed?')) return;
    setIsBtnLoading(true);
    showToast('Archiving and resetting... ⏳');
    try {
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
        chunk.forEach(u => batch.set(doc(db, colPath('users'), u.id), { isPaid: false, proofUrl: null }, { merge: true }));
        await safeAwait(batch.commit());
      }

      for (const chunk of chunkArray(products, 400)) {
        const batch = writeBatch(db);
        chunk.forEach(p => batch.set(doc(db, colPath('products'), p.id), { locked: false }, { merge: true }));
        await safeAwait(batch.commit());
      }

      await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), { ...settings, paymentsOpen: false, addOnly: false, storeOpen: true }));
      showToast('✅ System Reset & Archived!');
    } catch (err) { console.error(err); showToast(`❌ Error resetting system: ${err.message}`); }
    setIsBtnLoading(false);
  }

  async function seedDemoData() {
    setIsBtnLoading(true);
    showToast("Starting Seed Process... Please Wait ⏳");
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

      showToast("Products & Orders Seeded! 🎉");
    } catch (err) {
      console.error(err);
      showToast(`❌ Error seeding: ${err.message}`);
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
            showToast("Uploading CSV... ⏳");

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
            showToast(`✅ Imported ${newProducts.length} products successfully!`);
            setIsBtnLoading(false);
          } else {
            showToast("❌ No valid products found in CSV. Check your columns.");
          }
        } catch (err) {
          console.error(err);
          showToast(`❌ Error saving products: ${err.message}`);
          setIsBtnLoading(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      console.error(err);
      showToast("❌ Error reading file");
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
    showToast('Product added! ✅');
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.name) { showToast('Enter an Admin Name!'); return; }

    setIsBtnLoading(true);
    showToast('Saving admin & uploading QRs... ⏳');

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
      showToast('Admin added successfully! ✅');
    } catch (err) {
      console.error(err);
      showToast('Error adding admin: ' + err.message);
    }
    setIsBtnLoading(false);
  };

  const reshuffleAdmins = async () => {
    // ... Function body not provided in original, kept to suppress errors if called ...
  };

  // ✨ NEW: Inline Admin Edit Logic
  const openAdminEditModal = (email) => {
    const userOrders = orders.filter(o => o.email === email);
    const initialCart = {};
    userOrders.forEach(o => { initialCart[o.product] = o.qty; });
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
      const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

      // 1. Delete old orders for this user
      const oldOrders = orders.filter(o => o.email === targetEmail);
      for (const chunk of chunkArray(oldOrders, 250)) {
        const batch = writeBatch(db);
        chunk.forEach(o => batch.delete(doc(db, colPath('orders'), o.id)));
        await safeAwait(batch.commit());
      }

      // 2. Insert new orders
      const newOrders = [];
      const timestamp = Date.now();
      const targetProfile = users.find(u => u.id === targetEmail) || {};

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

      await safeAwait(addDoc(collection(db, colPath('logs')), { timestamp: Date.now(), email: targetEmail, name: targetProfile.name || 'Unknown', action: "Admin Edited Order", details: `Cart updated via Admin Panel` }));

      showToast("Admin Order Update Saved! ✅");
      setAdminOrderEditTarget(null);
    } catch (err) {
      console.error(err);
      showToast("Error updating order.");
    }
    setIsBtnLoading(false);
  };


  // --- STYLES ---
  const originalInput = "w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-2xl px-4 py-3 outline-none focus:border-[#D6006E] font-bold text-[#4A042A] text-sm";
  const adminInputSm = "w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-lg px-3 py-1.5 text-sm sm:text-xs outline-none focus:border-[#D6006E] font-bold text-[#4A042A]";
  const originalBtn = "bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white font-bold px-6 py-2.5 rounded-full shadow-[0_4px_10px_rgba(255,20,147,0.3)] uppercase tracking-wider hover:scale-[0.98] transition-all text-sm";

  // --- PREPARE DATA ---
  const userOrders = orders.filter(o => o.email === customerEmail.toLowerCase().trim());
  const existingMap = {};
  userOrders.forEach(o => existingMap[o.product] = o.qty);

  const finalItems = {};
  if (settings.paymentsOpen || action === '' || action === 'cancel' || settings.storeOpen === false) {
    Object.assign(finalItems, existingMap);
  } else if (action === 'replace') {
    Object.entries(cartItems).forEach(([p, a]) => {
      const q = (a.k || 0) * 10 + (a.v || 0);
      if (q > 0) finalItems[p] = q;
    });
  } else if (action === 'add') {
    Object.assign(finalItems, existingMap);
    Object.entries(cartItems).forEach(([p, a]) => {
      const q = (a.k || 0) * 10 + (a.v || 0);
      if (q > 0) finalItems[p] = (finalItems[p] || 0) + q;
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

  const totalPHP = (subtotalUSD > 0 ? subtotalUSD + (settings.adminFeePhp / settings.fxRate) : 0) * settings.fxRate;

  // --- RENDER ---
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        
        /* 🚀 SCROLL PERFORMANCE FIXES 🚀 */
        html { scroll-behavior: smooth; }
        body { 
          -webkit-overflow-scrolling: touch; 
        }
        body::before {
          content: '';
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(135deg, #FFC3EB 0%, #FF8EBD 100%);
          z-index: -1;
          transform: translateZ(0); 
        }
        
        html, body { width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; overflow-x: clip !important; display: block !important; }
        #root { width: 100% !important; max-width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; text-align: left !important; display: block !important; }
        
        body, input, button, select, textarea, table, th, td, span, div { font-family: 'Quicksand', sans-serif !important; }

        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; appearance: textfield; }

        @media screen and (max-width: 768px) { input, select, textarea { font-size: 16px !important; } }

        /* ✨ NEW: Ambulance Shake & Flash Animation */
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
        
        /* ✨ NEW: Epic Unicorn Animation */
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
        .brand-title { transform: rotate(-2deg); text-shadow: 2px 2px 0px rgba(0,0,0,0.1); }
        .glass-card { background: white; border: 2px solid #FF1493; border-radius: 1rem; transition: all 0.3s ease; }
        
        .hide-scroll { -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        
        .admin-sidebar { width: 280px; background: #4A042A; flex-shrink: 0; }
        .nav-item.active { background: white; color: #D6006E; border-radius: 1rem 0 0 1rem; margin-right: -1.5rem; padding-right: 1.5rem; }
        .custom-table th { background: #FFF0F5; color: #D6006E; font-weight: 800; font-size: 10px; text-transform: uppercase; padding: 1rem; border-bottom: 2px solid #FFC0CB; }
        .custom-table td { padding: 1rem; border-bottom: 1px solid #FFE4E1; font-weight: 600; font-size: 13px; }
      `}} />

      {/* REFINED: Wiki on Top-Left, fixed and scroll-reactive (HIDDEN ON STORE CLOSED) */}
      {view === 'shop' && settings.storeOpen !== false && (
        <div className="fixed top-2 left-2 sm:top-4 sm:left-4 z-[60]">
          <button onClick={() => setShowWikiModal(true)} className={`bg-white/90 backdrop-blur-md text-[#D6006E] border-2 border-pink-200 shadow-md flex items-center justify-center hover:bg-white transition-all duration-300 ease-in-out ${isScrolled ? 'w-10 h-10 rounded-full px-0 opacity-60 hover:opacity-100' : 'px-4 py-2 rounded-full gap-2 hover:scale-105'}`}>
            <BookOpen size={16} className="shrink-0" />
            <span className={`font-black uppercase tracking-widest text-[10px] sm:text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ${isScrolled ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Wiki</span>
          </button>
        </div>
      )}

      {/* ✨ NEW: Floating Live Chat Button & Panel */}
      {view === 'shop' && (
        <div className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-[70] flex flex-col items-end">

          {/* Transparent Preview Bubble (Shows when chat is closed and a new message arrives) */}
          {!isChatOpen && latestChatPreview && (
            <div className="absolute bottom-16 right-0 bg-white/90 backdrop-blur-md p-3 rounded-2xl rounded-br-none shadow-[0_4px_15px_rgba(255,20,147,0.2)] border-2 border-pink-200 text-xs w-56 animate-fadeIn z-0 pointer-events-none">
              <span className="font-black text-[#D6006E] block mb-0.5">{latestChatPreview.sender}</span>
              <span className="text-slate-700 font-bold leading-tight">{latestChatPreview.text}</span>
            </div>
          )}

          {isChatOpen && (
            <div className="bg-white/95 backdrop-blur-xl w-[340px] max-w-[calc(100vw-2rem)] h-[450px] rounded-[24px] shadow-[0_10px_40px_rgba(255,20,147,0.3)] mb-4 border-2 border-pink-200 flex flex-col overflow-hidden animate-fadeIn relative z-10">
              <div className="bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white p-4 font-black flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-2"><MessageCircle size={18} /> Box Buddies Chat</div>
                <button onClick={() => setIsChatOpen(false)} className="hover:scale-110 transition-transform">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 flex flex-col hide-scroll">
                {chats.length === 0 ? (
                  <div className="m-auto text-center text-slate-400 font-bold text-xs italic">No messages yet. Ask for help filling your box! 🦄</div>
                ) : (
                  chats.map(c => {
                    const isSystemAlert = c.text.includes('🚨');
                    return (
                      <div key={c.id} className={`p-3 rounded-2xl rounded-tl-none shadow-sm border relative max-w-[90%] self-start ${isSystemAlert ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-pink-100'}`}>
                        <p className={`text-[9px] font-black mb-1 uppercase tracking-widest ${isSystemAlert ? 'text-indigo-500' : 'text-pink-500'}`}>{c.sender}</p>
                        <p className="text-xs font-bold text-slate-700 leading-relaxed break-words">{c.text}</p>
                        {c.productRef && (
                          <button onClick={() => handleAddFromChat(c.productRef)} className="mt-2 w-full bg-pink-50 hover:bg-pink-100 text-[#D6006E] border border-pink-200 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 shadow-sm hover:scale-[0.98]">
                            ➕ Add to Cart
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleSendChat} className="p-3 bg-white border-t-2 border-pink-100 flex gap-2 items-center z-10">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type a message..." className="flex-1 bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none focus:border-[#D6006E]" />
                <button type="submit" disabled={!chatInput.trim()} className="bg-[#D6006E] text-white p-2 rounded-xl disabled:opacity-50 hover:scale-105 transition-transform shadow-sm">
                  <Send size={16} />
                </button>
              </form>
            </div>
          )}
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(255,20,147,0.4)] hover:scale-105 transition-transform border-2 border-white relative z-10">
            <MessageCircle size={24} />
          </button>
        </div>
      )}

      {view === 'shop' ? (
        <div className="min-h-screen w-full text-[#4A042A] pb-24 lg:pb-8 selection:bg-pink-300 relative">

          <button onClick={() => setView('admin')} className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/30 backdrop-blur-sm text-[#4A042A] border border-[#4A042A]/20 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/60 transition-all hover:scale-105 z-[40]" title="Admin Access">
            <Lock size={16} />
          </button>

          {/* ✨ FIXED: Reduced container max width to max-w-[1280px] to tighten Desktop layouts */}
          <div className="w-full max-w-[1280px] mx-auto p-4 pt-16 sm:pt-10 relative">
            <h1 className="brand-title text-2xl sm:text-4xl text-center text-white mb-2 flex items-center justify-center gap-3 mt-4 sm:mt-0">
              ✨ Bonded <span className="text-sm font-black uppercase tracking-widest text-white/80 transform translate-y-2" style={{ fontFamily: "'Quicksand', sans-serif !important" }}>by</span> Peptides ✨
            </h1>
            <div className="text-center mb-8">
              <span className="bg-white text-[#D6006E] px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider border-2 border-[#FF69B4] shadow-sm inline-block">
                {settings.batchName}
              </span>
            </div>

            {settings.storeOpen === false ? (
              <div className="glass-card p-6 sm:p-10 shadow-lg max-w-xl mx-auto text-center mt-8 mb-24 relative overflow-hidden bg-white/95 backdrop-blur-md">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FF1493] to-[#FFC3EB]"></div>
                <Package size={48} className="mx-auto text-pink-200 mb-4" />
                <h2 className="brand-title text-2xl sm:text-3xl text-[#D6006E] mb-4">The Group Buy is Closed! 🌸</h2>
                <p className="text-sm sm:text-base text-gray-600 font-bold mb-8 leading-relaxed">
                  All orders have been finalized and the current batch is being processed.
                  Thank you for participating! You can still check your profile, saved shipping address, and past order history below.
                </p>

                <div className="max-w-sm mx-auto space-y-4 bg-slate-50 p-6 rounded-2xl border border-pink-100 shadow-inner">
                  <div>
                    <label className="block text-[10px] font-black text-[#D6006E] uppercase mb-2 text-center tracking-widest">💌 Enter your Email to view history</label>
                    <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} onBlur={handleLookup} className={`${originalInput} text-center ${shakingField === 'email' ? 'animate-shake border-red-500 bg-red-50' : ''}`} placeholder="your@email.com" />
                  </div>

                  {customerProfile ? (
                    <button onClick={() => setSelectedProfileEmail(customerEmail)} className="w-full bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white font-black py-3 text-sm rounded-xl uppercase tracking-widest shadow-md hover:scale-[0.98] transition-transform flex items-center justify-center gap-2 mt-4">
                      <Users size={18} /> View Profile & History
                    </button>
                  ) : (
                    <p className="text-[10px] text-pink-400 font-bold italic mt-4 px-4">Enter an email with past orders to unlock your profile dashboard.</p>
                  )}
                </div>

                {/* ✨ NEW: Massive Wiki Button for Closed Store */}
                <div className="mt-8 pt-8 border-t-2 border-pink-100/50 max-w-lg mx-auto">
                  <h3 className="text-sm font-black text-[#D6006E] uppercase tracking-widest mb-4">📚 Browse our Knowledge Base</h3>
                  <button onClick={() => setShowWikiModal(true)} className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black py-4 px-6 rounded-2xl uppercase tracking-widest shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 text-sm sm:text-base border-2 border-indigo-400">
                    <BookOpen size={24} /> Open Peptide Wiki
                  </button>
                </div>
              </div>
            ) : (
              <>
                {settings.paymentsOpen && (
                  <div className="bg-white border-l-4 border-[#FF1493] p-3 rounded-lg mb-4 text-sm font-bold shadow-sm">🔒 PAYMENTS OPEN: Check email below to pay.</div>
                )}
                {settings.addOnly && !settings.paymentsOpen && (
                  <div className="bg-white border-l-4 border-amber-500 p-4 rounded-2xl mb-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="text-sm font-black text-amber-600 mb-1">⚠️ ADD-ONLY MODE ACTIVE</div>
                      <div className="text-xs font-bold text-slate-500">No edits allowed. Help save incomplete boxes!</div>
                    </div>
                    <button onClick={() => setShowHitListModal(true)} className="bg-amber-100 text-amber-700 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-200 transition-colors shadow-sm whitespace-nowrap">
                      ✂️ View Hit List
                    </button>
                  </div>
                )}

                {/* ✨ FIXED: Tighter Desktop Sidebars */}
                <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 items-start">
                  <div className="space-y-4 w-full">

                    {isCurrentUserAtRisk && (
                      <div className="bg-rose-100 border-2 border-rose-500 p-4 rounded-2xl shadow-sm animate-pulse flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-rose-700 font-black text-sm mb-1">🚨 YOUR VIALS ARE AT RISK!</h3>
                          <p className="text-xs text-rose-600 font-bold">You have loose vials on the Hit List. If the box isn't completed before cutoff, they will be deleted. Help fill the box!</p>
                        </div>
                        <button onClick={() => setShowHitListModal(true)} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-rose-700 whitespace-nowrap transition-transform hover:scale-105">
                          Click Here 👉 View Hit List
                        </button>
                      </div>
                    )}

                    {/* ✨ IMPROVED: Action card with Ambulance Flash ID */}
                    <div id="top-form-card" className={`glass-card p-6 shadow-sm ${showAmbulance ? 'animate-ambulance z-[100]' : ''}`}>
                      {/* ✨ FIXED: Side-by-side Email & Confirm Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">💌 Email Address</label>
                          <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} onBlur={handleLookup} className={`${originalInput} transition-all duration-300 ${shakingField === 'email' ? 'animate-shake border-red-500 bg-red-50 text-red-700 placeholder:text-red-300' : ''}`} placeholder="Enter email to lookup profile..." />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">💌 Confirm Email</label>
                          <input type="email" value={customerEmailConfirm} onChange={e => setCustomerEmailConfirm(e.target.value)} className={`${originalInput} transition-all duration-300 ${shakingField === 'emailConfirm' ? 'animate-shake border-red-500 bg-red-50 text-red-700 placeholder:text-red-300' : ''}`} placeholder="Type your email again..." />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">🌸 Name</label>
                          <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className={`${originalInput} transition-all duration-300 ${shakingField === 'name' ? 'animate-shake border-red-500 bg-red-50 text-red-700 placeholder:text-red-300' : ''}`} placeholder="Full name" disabled={settings.paymentsOpen} />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">💬 Handle</label>
                          <input type="text" value={customerHandle} onChange={e => setCustomerHandle(e.target.value)} className={originalInput} placeholder="@username" disabled={settings.paymentsOpen} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">⚡ Action</label>
                          <select value={action} onChange={e => handleActionChange(e.target.value)} className={`${originalInput} transition-all duration-300 ${shakingField === 'action' ? 'animate-shake border-red-500 bg-red-50 text-red-700' : ''}`} disabled={settings.paymentsOpen}>
                            <option value="" disabled>Choose an action...</option>
                            <option value="replace" disabled={settings.addOnly}>Create / Replace Order</option>
                            <option value="add">Add Items (Keep Existing)</option>
                            <option value="cancel" disabled={settings.addOnly}>Cancel Order</option>
                          </select>
                        </div>
                      </div>

                      {/* ✨ FIXED: Added How It Works Toggle */}
                      <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-[#9E2A5E] bg-[#FFF0F5] p-3 rounded-xl border border-[#FFC0CB] font-semibold">
                        <div className="flex flex-col gap-1">
                          <span>{customerProfile?.address?.street ? `✅ Profile Active: Shipping to ${customerProfile.address.city}` : "ℹ️ New customer? Your address will be saved securely upon payment."}</span>
                          <button onClick={() => setShowHowTo(!showHowTo)} className="text-[#D6006E] font-black hover:underline text-left w-max">❓ How does this work?</button>
                        </div>
                        {customerProfile && (
                          <button onClick={() => setSelectedProfileEmail(customerEmail)} className="text-[#D6006E] font-black hover:underline flex items-center gap-1 whitespace-nowrap bg-white px-2 py-1 rounded-md border border-pink-200 shadow-sm mt-2 sm:mt-0"><Users size={12} /> View Profile & History</button>
                        )}
                      </div>

                      {/* ✨ NEW: How It Works Inline Box */}
                      {showHowTo && (
                        <div className="mt-3 p-4 bg-white border-2 border-pink-200 rounded-xl text-sm text-[#4A042A] animate-fadeIn shadow-sm">
                          <h4 className="font-black text-[#D6006E] mb-2 uppercase tracking-widest text-[10px]">🎀 Ordering Steps</h4>
                          <ol className="list-decimal pl-5 space-y-1.5 font-bold text-xs">
                            <li>Enter your Email & Name.</li>
                            <li>Pick your items (Minimum {settings.minOrder} vials).</li>
                            <li>Click "Submit Order 💖" to save your spot.</li>
                            <li>Wait for the "Payments Open" announcement.</li>
                            <li>Come back, enter your email, and click "Pay 💸" to upload proof!</li>
                          </ol>
                        </div>
                      )}
                    </div>

                    <div className={`bg-white rounded-3xl border-2 shadow-sm relative z-10 transition-all duration-300 ${shakingField === 'products' ? 'animate-shake border-red-500 ring-4 ring-red-100' : 'border-[#FF1493]'}`}>
                      <div className="sticky top-0 z-30 px-3 py-1.5 sm:p-5 border-b-2 border-[#FFC0CB] flex flex-col sm:flex-row justify-between items-center gap-1.5 sm:gap-4 bg-white/95 backdrop-blur-xl rounded-t-2xl shadow-sm">
                        <h2 className={`font-black text-[#D6006E] uppercase tracking-widest text-sm sm:text-base items-center gap-2 whitespace-nowrap transition-all duration-300 ${isScrolled ? 'hidden sm:flex' : 'flex'}`}>
                          <Package size={22} className="text-[#FF1493]" /> Shop Catalog
                        </h2>

                        {/* ✨ NEW: Category Filter Pills */}
                        <div className="flex-1 w-full flex flex-col gap-1 sm:gap-2">
                          <div className="flex gap-2 overflow-x-auto hide-scroll pb-1">
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
                        </div>
                      </div>

                      {products.length === 0 ? (
                        <div className="p-12 text-center text-pink-400 font-bold italic">No products available yet.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-4 bg-slate-50/50 rounded-b-2xl">
                          {filteredShopProducts.map(p => {
                            const cart = cartItems[p.name] || { k: 0, v: 0 };
                            const active = cart.k > 0 || cart.v > 0;
                            const exist = existingMap[p.name] || 0;
                            const wiki = findWikiEntry(p.name);

                            const bgClass = shakingProd === p.name ? 'animate-shake border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] z-20 bg-red-50'
                              : (active ? 'bg-[#FFF0F5] border-[#D6006E] shadow-md scale-[1.01] z-10'
                                : (exist > 0 ? 'bg-[#F0FDF4] border-[#4ADE80] shadow-sm'
                                  : 'bg-white border-[#FFE4E1] hover:border-pink-300'));

                            return (
                              <div key={p.id} data-name={p.name} className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 overflow-hidden ${bgClass}`}>

                                {exist > 0 && (
                                  <div className="bg-[#22C55E] text-white text-[9px] sm:text-[10px] font-black uppercase px-3 py-1.5 -mx-3 sm:-mx-4 -mt-3 sm:-mt-4 mb-3 flex justify-between items-center shadow-sm">
                                    <span className="flex items-center gap-1">✨ Already In Your Order</span>
                                    <span className="bg-white/25 px-2 py-0.5 rounded-md">{exist} Vials</span>
                                  </div>
                                )}

                                <div className="flex justify-between items-start mb-2 sm:mb-4 gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-black text-sm sm:text-base text-[#4A042A] leading-tight">{p.name}</h3>
                                      {/* ✨ NEW: Quick Info Button */}
                                      <button onClick={() => setQuickInfoProduct(wiki)} className="text-pink-400 hover:text-[#D6006E] transition-colors p-1" title="View Details">
                                        <Info size={16} />
                                      </button>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5">
                                      <span className="bg-[#FF1493] text-white px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-xs font-bold shadow-sm">${p.pricePerVialUSD.toFixed(2)} / vial</span>
                                    </div>
                                  </div>
                                  <span className={`shrink-0 text-[8px] sm:text-[10px] font-black uppercase px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-sm whitespace-nowrap ${p.statusKey === 'available' ? 'bg-[#E6F6EC] text-[#079E51] border-[#bbf7d0]' : p.statusKey === 'full' ? 'bg-[#FFEBEE] text-[#D32F2F] border-[#ffcdd2]' : p.statusKey === 'locked' ? 'bg-gray-100 text-gray-500 border-gray-300' : 'bg-[#F3E5F5] text-[#7B1FA2] border-[#e1bee7]'}`}>
                                    {p.statusText}
                                  </span>
                                </div>

                                <div className={`flex gap-2 sm:gap-3 ${p.isClosed ? 'opacity-40 pointer-events-none' : ''}`}>
                                  <label className="bg-slate-50 border border-pink-100 rounded-md sm:rounded-lg p-1 sm:p-1.5 flex-1 flex justify-between items-center transition-colors focus-within:border-pink-400 focus-within:bg-white shadow-inner cursor-text">
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase text-pink-400 ml-1 shrink-0">Kits<span className="hidden sm:inline"> (10x)</span></span>
                                    <input type="number" min="0" value={cart.k || ''} onChange={e => handleCartChange(p.name, 'k', e.target.value)} onBlur={() => handleCartBlur(p.name)} className={`w-full ml-1 sm:ml-2 text-right font-black text-base outline-none bg-transparent placeholder:text-pink-200 ${shakingProd === p.name ? 'text-red-600' : 'text-[#D6006E]'}`} placeholder="0" disabled={p.isClosed} />
                                  </label>
                                  <label className="bg-slate-50 border border-pink-100 rounded-md sm:rounded-lg p-1 sm:p-1.5 flex-1 flex justify-between items-center transition-colors focus-within:border-pink-400 focus-within:bg-white shadow-inner cursor-text">
                                    <span className="text-[8px] sm:text-[9px] font-black uppercase text-pink-400 ml-1 shrink-0">Vials<span className="hidden sm:inline"> (1x)</span></span>
                                    <input type="number" min="0" max="9" value={cart.v || ''} onChange={e => handleCartChange(p.name, 'v', e.target.value)} onBlur={() => handleCartBlur(p.name)} className={`w-full ml-1 sm:ml-2 text-right font-black text-base outline-none bg-transparent placeholder:text-pink-200 ${shakingProd === p.name ? 'text-red-600' : 'text-[#D6006E]'}`} placeholder="0" disabled={p.isClosed} />
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <aside className="hidden lg:block sticky top-6 w-full self-start">
                    <div className="glass-card p-6 shadow-xl">
                      <h3 className="brand-title text-2xl text-[#D6006E] border-b-2 border-pink-100 pb-2 mb-4 text-center">Your Cart 🛍️</h3>
                      <div className="max-h-[350px] overflow-y-auto mb-4 space-y-2 pr-2 hide-scroll">
                        {cartList.length === 0 ? <div className="text-center text-pink-300 font-bold italic py-8">No items selected yet!</div> : cartList.map((i, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm xl:text-base border-b border-pink-50 border-dashed pb-2">
                            <div className="font-bold">{i.product}</div>
                            <div className="text-right">
                              <span className="text-[#D6006E] font-black">x{i.qty}</span>
                              <span className="text-gray-400 ml-2 font-bold">${(i.price * i.qty).toFixed(2)}</span>
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
                        <button onClick={() => setShowPreviewModal(true)} disabled={cartList.length === 0} className="w-full bg-white text-[#D6006E] border-2 border-pink-200 font-bold py-4 rounded-full uppercase tracking-widest text-sm shadow-sm hover:bg-pink-50 disabled:opacity-50 transition-transform hover:scale-[0.98] active:scale-95">Preview 👀</button>
                        {!settings.paymentsOpen ? (
                          <button onClick={submitOrder} disabled={isBtnLoading} className={`${originalBtn} w-full py-4`}>
                            {isBtnLoading ? "Saving... ⏳" : action === 'cancel' ? "Confirm Cancel" : "Submit Order 💖"}
                          </button>
                        ) : (
                          <button onClick={() => setShowPayModal(true)} disabled={cartList.length === 0} className="w-full bg-[#008040] text-white font-bold py-4 rounded-full uppercase tracking-widest text-sm shadow-md hover:scale-[0.98] transition-transform active:scale-95 disabled:opacity-50">Pay Now 💸</button>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )}
          </div>

          {/* Sticky Mobile Footer ONLY when Store is Open */}
          {settings.storeOpen !== false && (
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t-2 border-[#FF1493] p-4 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center gap-2">
              <div className="shrink-0">
                <div className="text-[10px] font-black text-[#D6006E] uppercase">Total Estimate</div>
                <div className="text-xl sm:text-2xl font-black text-[#D6006E]">₱{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>

              <div className="flex gap-2 w-full justify-end">
                <button onClick={() => setShowPreviewModal(true)} disabled={cartList.length === 0} className="bg-white text-[#D6006E] border-2 border-pink-200 px-3 sm:px-4 py-2 sm:py-3 rounded-full font-bold uppercase text-[10px] sm:text-sm shadow-sm disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">Preview 👀</button>

                {settings.paymentsOpen ? (
                  <button onClick={() => setShowPayModal(true)} disabled={cartList.length === 0} className="bg-[#008040] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold uppercase text-[10px] sm:text-sm shadow-md disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">Pay Now 💸</button>
                ) : (
                  <button onClick={submitOrder} disabled={isBtnLoading} className="bg-[#D6006E] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black uppercase text-[10px] sm:text-sm shadow-md disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">
                    {action === 'cancel' ? 'Cancel' : 'Submit 💖'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ✨ MODALS FOR SHOP */}

          {/* ✨ IMPROVED: Sleek & compact Payment Modal */}
          {showPayModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-2 border-pink-200">
                <div className="bg-[#FFF0F5] p-4 flex justify-between items-center border-b border-[#FFC0CB]">
                  <h2 className="brand-title text-xl text-pink-600">Checkout 💸</h2>
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
                      {(() => {
                        const assignedAdminName = customerList.find(c => c.email === customerEmail.toLowerCase().trim())?.adminAssigned || "Admin";
                        return <p className="font-black text-[#D6006E] text-xs">{assignedAdminName}</p>;
                      })()}
                    </div>

                    {(() => {
                      const assignedAdminName = customerList.find(c => c.email === customerEmail.toLowerCase().trim())?.adminAssigned || "Admin";
                      const adminObj = normalizedAdmins.find(a => a.name === assignedAdminName) || normalizedAdmins[0] || { name: "Admin", banks: [] };

                      const hash = customerEmail.toLowerCase().trim().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                      const availableBanks = adminObj.banks || [];
                      const selectedBank = availableBanks.length > 0 ? availableBanks[hash % availableBanks.length] : null;

                      return selectedBank ? (
                        <div className="flex flex-col gap-2">
                          {selectedBank.qr ? (
                            <img src={selectedBank.qr} alt="QR Code" className="w-full max-w-[160px] mx-auto rounded-lg border border-slate-100" />
                          ) : null}
                          {selectedBank.details ? (
                            <div className="bg-slate-50 p-2 rounded border border-slate-100 text-center">
                              <pre className="font-mono text-xs text-slate-700 whitespace-pre-wrap font-bold m-0">{selectedBank.details}</pre>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-rose-500 text-center py-2">No payment options configured.</p>
                      );
                    })()}
                  </div>

                  <div className="space-y-2.5">
                    <select value={addressForm.shipOpt} onChange={e => setAddressForm({ ...addressForm, shipOpt: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none transition-all ${addressErrors.shipOpt ? 'animate-shake border-red-500 bg-red-50' : 'border-slate-200 focus:border-[#D6006E]'}`}>
                      <option value="" disabled>Select Courier...</option>
                      {settings.shippingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
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
                    {isBtnLoading ? 'Uploading... ⏳' : 'Complete Payment ✅'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPreviewModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
                <div className="bg-[#FFF0F5] p-5 flex justify-between items-center border-b-2 border-[#FFC0CB]">
                  <h2 className="brand-title text-2xl text-pink-600">Cart Preview 👀</h2>
                  <button onClick={() => setShowPreviewModal(false)} className="text-pink-600 font-black text-2xl hover:scale-110 transition-transform">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 hide-scroll">
                  {cartList.length === 0 ? (
                    <p className="text-center text-pink-400 font-bold italic py-8">Your cart is empty!</p>
                  ) : (
                    cartList.map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b border-pink-50 border-dashed pb-3">
                        <div className="font-bold text-[#4A042A] pr-4">{i.product}</div>
                        <div className="text-right shrink-0">
                          <span className="text-[#D6006E] font-black mr-2">x{i.qty}</span>
                          <span className="text-gray-500 font-bold">${(i.price * i.qty).toFixed(2)}</span>
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
                  <button onClick={() => setShowPreviewModal(false)} className={originalBtn + " w-full"}>Close & Continue</button>
                </div>
              </div>
            </div>
          )}

          {/* ✨ IMPROVED: Compact Hit List Modal */}
          {showHitListModal && (() => {
            const userEmailTrimmed = customerEmail.toLowerCase().trim();
            const sortedHitList = [...trimmingHitList].sort((a, b) => {
              const aIsMe = a.email === userEmailTrimmed;
              const bIsMe = b.email === userEmailTrimmed;
              if (aIsMe && !bIsMe) return -1;
              if (!aIsMe && bIsMe) return 1;
              return 0;
            });

            return (
              <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[24px] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border-2 border-pink-200">
                  <div className="bg-[#FFF0F5] p-4 flex justify-between items-center border-b border-[#FFC0CB]">
                    <h2 className="brand-title text-xl text-rose-600 flex items-center gap-2"><AlertTriangle size={20} /> Elimination List</h2>
                    <button onClick={() => setShowHitListModal(false)} className="text-pink-600 font-black text-2xl hover:scale-110 transition-transform">&times;</button>
                  </div>
                  <div className="p-4 sm:p-5 overflow-y-auto bg-slate-50 hide-scroll">
                    <p className="text-xs font-bold text-slate-600 mb-4 text-center">
                      These boxes are incomplete! If they aren't filled before cutoff, the loose vials at the bottom will be trimmed.
                    </p>
                    {sortedHitList.length === 0 ? (
                      <div className="bg-emerald-50 p-6 rounded-xl text-center font-bold text-emerald-600 border border-emerald-200 uppercase tracking-widest text-[10px]">
                        ✅ All boxes are perfectly full! No one is getting cut.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sortedHitList.map((v, i) => {
                          const isMyItem = v.email === userEmailTrimmed;
                          return (
                            <div key={i} className={`p-3 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${isMyItem ? 'bg-rose-100 border-rose-400 shadow-md' : 'bg-white border-rose-100 shadow-sm'}`}>
                              <div className="flex-1 w-full">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-[#4A042A] text-sm">{v.prod}</h4>
                                  {isMyItem && <span className="bg-rose-500 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse shadow-sm">Yours</span>}
                                </div>
                                <p className="text-[9px] font-bold text-rose-500 uppercase mt-0.5 mb-2">Needs {v.missingSlots} more for Box {v.boxNum}</p>

                                {/* ✨ Ask for help button integrated into hit list */}
                                <button onClick={() => handleSendHelpRequest(v.prod, v.missingSlots)} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 flex items-center gap-1.5 transition-colors shadow-sm w-max">
                                  <MessageCircle size={12} /> Ask for Help in Chat
                                </button>
                              </div>
                              <div className="text-left sm:text-right mt-2 sm:mt-0 bg-rose-50 sm:bg-transparent p-2 sm:p-0 rounded border sm:border-0 border-rose-100 w-full sm:w-auto">
                                <p className="font-bold text-slate-700 text-xs">{v.handle || 'Guest'}</p>

                                {/* ✨ FIXED: Inline Confirmation for Trimming */}
                                {confirmAction.type === 'trim' && confirmAction.id === v.id ? (
                                  <div className="flex gap-1 justify-end items-center mt-1 animate-fadeIn">
                                    <span className="text-[9px] font-bold text-rose-700 uppercase mr-1">Sure?</span>
                                    <button onClick={() => { executeTrim(v); setConfirmAction({ type: null, id: null }); }} className="bg-rose-600 text-white px-2 py-1 rounded text-[9px] font-black uppercase hover:bg-rose-700">Yes</button>
                                    <button onClick={() => setConfirmAction({ type: null, id: null })} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-black uppercase hover:bg-slate-300">No</button>
                                  </div>
                                ) : (
                                  <button onClick={() => setConfirmAction({ type: 'trim', id: v.id })} className="text-rose-600 font-black text-[10px] bg-rose-50 sm:bg-white px-2 py-0.5 rounded mt-0.5 border border-rose-100 shadow-inner inline-block hover:bg-rose-100 transition-colors">Cut {v.amountToRemove} vials</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-pink-100 bg-white">
                    <button onClick={() => setShowHitListModal(false)} className={`${originalBtn} w-full py-3 text-sm`}>Close & Go Shop 🛍️</button>
                  </div>
                </div>
              </div>
            );
          })()}

          {showWikiModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[400] flex items-center justify-center p-4">
              <div className="bg-white rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">

                <div className="bg-gradient-to-r from-[#FF1493] to-[#FF69B4] p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative">
                  <button onClick={() => setShowWikiModal(false)} className="absolute top-4 right-4 text-white/80 hover:text-white font-black text-3xl hover:scale-110 transition-transform">&times;</button>
                  <div className="text-white">
                    <h2 className="brand-title text-3xl sm:text-4xl m-0 text-white shadow-none">Peptide Wiki 📖</h2>
                    <p className="text-white/90 font-bold text-sm mt-2 max-w-md">Your quick-reference knowledge base for understanding the benefits and uses of the compounds we offer.</p>
                  </div>
                </div>

                <div className="bg-[#FFF0F5] p-4 border-b-2 border-[#FFC0CB]">
                  <div className="relative w-full max-w-md mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                    <input type="text" value={wikiSearchQuery} onChange={e => setWikiSearchQuery(e.target.value)} placeholder="Search by name, tag, or benefit..." className="w-full pl-11 pr-4 py-3 rounded-2xl text-base font-bold border-2 border-pink-200 outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100 transition-all bg-white text-[#4A042A] shadow-sm" />
                  </div>
                </div>

                <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 hide-scroll">
                  {filteredWikiData.length === 0 ? (
                    <div className="text-center p-12 text-slate-400 font-bold italic">No peptides found matching your search.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredWikiData.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-pink-100 shadow-sm hover:border-pink-300 transition-colors">
                          <div className="flex flex-col mb-3">
                            <h3 className="font-black text-lg text-[#D6006E]">{item.name}</h3>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {item.tags.map((tag, tIdx) => (
                                <span key={tIdx} className="bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">{tag}</span>
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 font-semibold leading-relaxed border-t border-slate-100 pt-3 mb-3">{item.desc}</p>

                          <div className="bg-slate-50 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {item.dosage && (
                              <div className="flex items-start gap-2">
                                <Droplet size={14} className="text-pink-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dosage</p>
                                  <p className="text-xs font-bold text-slate-700 leading-tight">{item.dosage}</p>
                                </div>
                              </div>
                            )}
                            {item.cycle && (
                              <div className="flex items-start gap-2">
                                <Repeat size={14} className="text-pink-500 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cycle</p>
                                  <p className="text-xs font-bold text-slate-700 leading-tight">{item.cycle}</p>
                                </div>
                              </div>
                            )}
                            {item.storage && (
                              <div className="flex items-start gap-2 sm:col-span-2 mt-1 border-t border-slate-200 pt-2">
                                <ThermometerSnowflake size={14} className="text-blue-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Storage</p>
                                  <p className="text-xs font-bold text-slate-700 leading-tight">{item.storage}</p>
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
                <button type="button" onClick={() => setView('shop')} className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2 hover:underline">🛍️ Cancel / Back to Shop</button>
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
                  { id: 'active-orders', icon: <ShoppingCart size={18} />, label: 'Active Orders' }, // ✨ NEW
                  { id: 'payments', icon: <BadgeDollarSign size={18} />, label: 'Payments' },
                  { id: 'packing', icon: <ClipboardList size={18} />, label: 'Packing Guide' },
                  { id: 'trimming', icon: <Scissors size={18} />, label: 'Hit List' }
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
                  <option value="packing">Packing</option>
                  <option value="trimming">Hit List</option>
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
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Live Inventory Overview</h2>
                    <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                      <table className="w-full text-left custom-table">
                        <thead><tr><th>Product</th><th className="text-center">Total Vials</th><th className="text-center">Full Boxes</th><th className="text-center">Expected Boxes</th><th className="text-center">Max Boxes</th><th className="text-center">Slots Left</th><th>Status</th></tr></thead>
                        <tbody className="divide-y divide-pink-50">
                          {filteredAdminProducts.map(p => (
                            <tr key={p.id} className="hover:bg-pink-50/20">
                              <td className="font-bold text-slate-900">{p.name}</td>
                              <td className="text-center">{p.totalVials}</td>
                              <td className="text-center font-black text-pink-600">{p.boxes}</td>
                              <td className="text-center font-black text-indigo-600">{Math.ceil(p.totalVials / SLOTS_PER_BATCH)}</td>
                              <td className="text-center">
                                <input type="number" className="w-16 border border-[#FFC0CB] bg-[#FFF0F5] rounded-lg p-1 text-center text-xs font-bold text-[#D6006E] outline-none focus:border-[#FF1493] focus:bg-white transition-colors" value={p.maxBoxes || ''} placeholder="∞" onChange={e => safeAwait(setDoc(doc(db, colPath('products'), p.id), { maxBoxes: Number(e.target.value) || 0 }, { merge: true }))} />
                              </td>
                              <td className="text-center text-emerald-600">{p.slotsLeft === 0 ? 'Full' : `${p.slotsLeft}`}</td>
                              <td><span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-pink-200 text-pink-600">{p.statusText}</span></td>
                            </tr>
                          ))}
                          {filteredAdminProducts.length === 0 && <tr><td colSpan="7" className="text-center p-8 text-pink-300 font-bold italic">No products found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ✨ NEW: ACTIVE ORDERS TAB */}
                {adminTab === 'active-orders' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Current Active Orders</h2>

                      {/* ✨ MOVED FROM CUSTOMER DB: Sheet and CSV buttons */}
                      <div className="flex flex-wrap gap-2">
                        {settings.googleSheetUrl && (
                          <a href={settings.googleSheetUrl} target="_blank" rel="noreferrer" className="bg-white border-2 border-[#D6006E] text-[#D6006E] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-pink-50 transition-colors flex items-center gap-2">
                            📊 Open Sheet
                          </a>
                        )}
                        <button onClick={exportRawOrdersCSV} className="bg-rose-50 border-2 border-rose-200 text-rose-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-rose-500 transition-colors flex items-center gap-2">
                          🆘 Backup Raw Orders
                        </button>
                        <button onClick={exportCustomersCSV} className="bg-white border-2 border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-emerald-500 transition-colors">
                          📥 Export CSV
                        </button>
                        <label className={`bg-emerald-50 border-2 border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-emerald-500 transition-colors cursor-pointer ${isBtnLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {isBtnLoading ? '⏳ Syncing...' : '📂 Sync Changes from CSV'}
                          <input type="file" accept=".csv" onChange={importCustomersCSV} className="hidden" disabled={isBtnLoading} />
                        </label>
                        {settings.gasWebAppUrl && (
                          <>
                            <button onClick={pushToGoogleSheets} disabled={isBtnLoading} className="bg-emerald-50 border-2 border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-emerald-500 transition-colors flex items-center gap-2 disabled:opacity-50">
                              {isBtnLoading ? '⏳ Pushing...' : '⬆️ Push to Sheets'}
                            </button>
                            <button onClick={pullFromGoogleSheets} disabled={isBtnLoading} className="bg-blue-50 border-2 border-blue-200 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-blue-500 transition-colors flex items-center gap-2 disabled:opacity-50">
                              {isBtnLoading ? '⏳ Pulling...' : '⬇️ Pull from Sheets'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                      <table className="w-full text-left custom-table">
                        <thead><tr><th>Customer Info</th><th>Order Items</th><th>Assigned Admin</th><th className="text-center">Total PHP</th><th className="text-center">Actions</th></tr></thead>
                        <tbody className="divide-y divide-pink-50">
                          {filteredCustomerList.map(c => {
                            const itemEntries = Object.entries(c.products);
                            if (itemEntries.length === 0) return null;

                            return (
                              <tr key={c.email} className="hover:bg-pink-50/20">
                                <td>
                                  <button onClick={() => { setSelectedProfileEmail(c.email); setIsEditingAddress(false); }} className="font-bold text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">{c.name}</button>
                                  <p className="text-[10px] text-slate-400">{c.email}</p>
                                  {c.handle && <p className="text-[10px] text-[#D6006E] font-bold">{c.handle}</p>}
                                </td>
                                <td>
                                  <div className="flex flex-wrap gap-1.5 py-1">
                                    {itemEntries.map(([pName, qty]) => (
                                      <span key={pName} className="bg-[#FFF0F5] border border-[#FFC0CB] text-[#D6006E] px-2 py-1 rounded-md text-[10px] font-black">
                                        {qty}x {pName}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  <select value={c.adminAssigned || ''} onChange={(e) => safeAwait(setDoc(doc(db, colPath('users'), c.email), { adminAssigned: e.target.value }, { merge: true }))} className="bg-[#FFF0F5] border border-[#FFC0CB] text-[#D6006E] text-[10px] font-black rounded px-2 py-1 outline-none w-full max-w-[140px]">
                                    <option value="" disabled>Select Admin...</option>
                                    {normalizedAdmins.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                                  </select>
                                </td>
                                <td className="text-center font-black text-pink-600">₱{c.totalPHP.toLocaleString()}</td>
                                <td className="text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => openAdminEditModal(c.email)} className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 flex items-center gap-1 shadow-sm transition-colors">
                                      <Edit3 size={12} /> Edit Cart
                                    </button>

                                    {confirmAction.type === 'deleteAllOrders' && confirmAction.id === c.email ? (
                                      <div className="flex gap-1 justify-center animate-fadeIn bg-rose-50 p-1 rounded-lg border border-rose-200">
                                        <button onClick={async () => {
                                          setIsBtnLoading(true);
                                          try {
                                            const toDelete = orders.filter(o => o.email === c.email);
                                            const batch = writeBatch(db);
                                            toDelete.forEach(o => batch.delete(doc(db, colPath('orders'), o.id)));
                                            await safeAwait(batch.commit());
                                            showToast("Orders deleted.");
                                          } catch (e) { console.error(e); }
                                          setIsBtnLoading(false);
                                          setConfirmAction({ type: null, id: null });
                                        }} className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-rose-600">YES</button>
                                        <button onClick={() => setConfirmAction({ type: null, id: null })} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-black hover:bg-slate-300">NO</button>
                                      </div>
                                    ) : (
                                      <button onClick={() => setConfirmAction({ type: 'deleteAllOrders', id: c.email })} className="text-slate-300 hover:text-rose-500 hover:scale-110 transition-transform bg-transparent border-none p-1" title="Delete All Items"><Trash2 size={16} /></button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {filteredCustomerList.length === 0 && <tr><td colSpan="5" className="text-center p-8 text-pink-300 font-bold italic">No active orders found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminTab === 'logs' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">System Activity Logs</h2>
                    <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                      <table className="w-full text-left custom-table">
                        <thead><tr><th>Date & Time</th><th>Customer</th><th>Action</th><th>Details</th></tr></thead>
                        <tbody className="divide-y divide-pink-50">
                          {logs.length === 0 ? <tr><td colSpan="4" className="text-center p-8 text-pink-300 font-bold italic">No activity logged yet.</td></tr> :
                            logs.map(log => (
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

                      <div className="flex gap-2">
                        <button onClick={generateBulkLabels} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-[#D6006E] hover:text-[#D6006E] transition-colors flex items-center gap-2">
                          <Printer size={16} /> Bulk Print Labels
                        </button>
                        <button onClick={() => setShowAllProofsModal(true)} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-[#D6006E] hover:text-[#D6006E] transition-colors flex items-center gap-2">
                          <ImageIcon size={16} /> View All Proofs
                        </button>

                        {!settings.paymentsOpen && (
                          <button onClick={reshuffleAdmins} disabled={isBtnLoading} className="bg-indigo-50 border-2 border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-indigo-500 hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50">
                            🔄 Reshuffle Admins
                          </button>
                        )}
                      </div>
                    </div>

                    {(() => {
                      const totalExpectedPHP = customerList.reduce((acc, c) => acc + c.totalPHP, 0);
                      const totalPaidPHP = customerList.filter(c => c.isPaid).reduce((acc, c) => acc + c.totalPHP, 0);

                      const adminBreakdown = {};
                      customerList.forEach(c => {
                        const admin = c.adminAssigned || "Unassigned";
                        if (!adminBreakdown[admin]) adminBreakdown[admin] = { expected: 0, paid: 0, count: 0 };
                        adminBreakdown[admin].expected += c.totalPHP;
                        if (c.isPaid) adminBreakdown[admin].paid += c.totalPHP;
                        adminBreakdown[admin].count += 1;
                      });

                      const displayCustomerList = filteredCustomerList.filter(c => {
                        if (paymentFilterStatus === 'Paid' && !c.isPaid) return false;
                        if (paymentFilterStatus === 'Unpaid' && c.isPaid) return false;
                        if (paymentFilterAdmin !== 'All' && c.adminAssigned !== paymentFilterAdmin) return false;
                        return true;
                      });

                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div onClick={() => setPaymentFilterStatus('All')} className={`bg-white p-6 rounded-2xl border-2 shadow-sm cursor-pointer transition-all hover:scale-105 ${paymentFilterStatus === 'All' ? 'border-pink-400 ring-4 ring-pink-100' : 'border-pink-50'}`}>
                              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Expected</h4>
                              <p className="text-2xl font-black text-[#D6006E]">₱{totalExpectedPHP.toLocaleString()}</p>
                            </div>
                            <div onClick={() => setPaymentFilterStatus('Paid')} className={`bg-white p-6 rounded-2xl border-2 shadow-sm cursor-pointer transition-all hover:scale-105 ${paymentFilterStatus === 'Paid' ? 'border-emerald-400 ring-4 ring-emerald-100' : 'border-emerald-100'}`}>
                              <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Total Paid ✅</h4>
                              <p className="text-2xl font-black text-emerald-600">₱{totalPaidPHP.toLocaleString()}</p>
                            </div>
                            <div onClick={() => setPaymentFilterStatus('Unpaid')} className={`bg-white p-6 rounded-2xl border-2 shadow-sm cursor-pointer transition-all hover:scale-105 ${paymentFilterStatus === 'Unpaid' ? 'border-amber-400 ring-4 ring-amber-100' : 'border-amber-100'}`}>
                              <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Pending Balance ❌</h4>
                              <p className="text-2xl font-black text-amber-600">₱{(totalExpectedPHP - totalPaidPHP).toLocaleString()}</p>
                            </div>
                          </div>

                          <div className="bg-white p-6 rounded-2xl border-2 border-pink-50 shadow-sm mb-6">
                            <div className="flex justify-between items-center mb-4 border-b border-pink-100 pb-2">
                              <h4 className="text-sm font-black text-[#4A042A] uppercase tracking-widest">Load Balancing & Admin Breakdown</h4>
                              {paymentFilterAdmin !== 'All' && <button onClick={() => setPaymentFilterAdmin('All')} className="text-[10px] text-pink-500 font-bold hover:underline bg-pink-50 px-2 py-1 rounded">Clear Filter ✖</button>}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                              {Object.entries(adminBreakdown).map(([admin, data]) => {
                                const isActive = paymentFilterAdmin === admin;
                                return (
                                  <div key={admin} onClick={() => setPaymentFilterAdmin(isActive ? 'All' : admin)} className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-105 ${isActive ? 'bg-pink-50 border-pink-400 ring-2 ring-pink-200' : 'bg-[#FFF0F5] border-[#FFC0CB]'}`}>
                                    <p className="font-black text-[#D6006E] mb-3">{admin} <span className="text-[10px] text-pink-400 ml-1">({data.count} orders)</span></p>
                                    <div className="flex justify-between text-xs font-bold text-[#4A042A] mb-1"><span>Expected:</span> <span>₱{data.expected.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-xs font-bold text-emerald-600 border-t border-pink-100 pt-1"><span>Collected:</span> <span>₱{data.paid.toLocaleString()}</span></div>
                                  </div>
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
                              <thead><tr><th>Customer</th><th>Assigned Admin</th><th className="text-right">Total PHP</th><th className="text-center">Proof</th><th className="text-center">Label</th><th className="text-center">Status</th></tr></thead>
                              <tbody className="divide-y divide-pink-50">
                                {displayCustomerList.map(c => (
                                  <tr key={c.email}>
                                    <td>
                                      <button onClick={() => { setSelectedProfileEmail(c.email); setIsEditingAddress(false); }} className="font-bold text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">{c.name}</button>
                                      <p className="text-[10px] text-slate-400">{c.email}</p>
                                    </td>
                                    <td><span className="bg-[#FFF0F5] px-2 py-1 rounded text-[10px] font-black text-pink-600 border border-pink-100">{c.adminAssigned}</span></td>
                                    <td className="text-right font-black text-pink-600">₱{c.totalPHP.toLocaleString()}</td>
                                    <td className="text-center">
                                      {c.proofUrl ? (
                                        <button onClick={() => setFullScreenProof(c.proofUrl)}
                                          onMouseEnter={() => setHoveredProof(c.proofUrl)}
                                          onMouseLeave={() => setHoveredProof(null)}
                                          className="text-[#D6006E] font-bold text-[10px] uppercase tracking-widest hover:underline cursor-pointer bg-transparent border-none m-0 p-0">
                                          Hover 👀
                                        </button>
                                      ) : (
                                        <span className="text-slate-400 text-[10px] italic">No Proof</span>
                                      )}
                                    </td>
                                    <td className="text-center">
                                      {c.address?.street ? (
                                        <button onClick={() => generateSingleLabel(c)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                          🖨️ Print
                                        </button>
                                      ) : (
                                        <span className="text-slate-400 text-[10px] italic">No Address</span>
                                      )}
                                    </td>
                                    <td className="text-center">
                                      <button onClick={() => safeAwait(setDoc(doc(db, colPath('users'), c.email), { isPaid: !c.isPaid }, { merge: true }))} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:scale-105 ${c.isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                        {c.isPaid ? 'PAID ✅' : 'PENDING ❌'}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                                {displayCustomerList.length === 0 && <tr><td colSpan="6" className="text-center p-8 text-pink-300 font-bold italic">No customers found matching filters.</td></tr>}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {adminTab === 'packing' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Packing Logistics Guide</h2>
                        <p className="text-sm font-black text-indigo-600 mt-1 bg-indigo-50 inline-block px-3 py-1 rounded-lg border border-indigo-100">📦 Total Physical Boxes to Receive: {totalPhysicalBoxesToReceive}</p>
                      </div>
                      <button onClick={generateBulkLabels} className="bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-[#D6006E] hover:text-[#D6006E] transition-colors flex items-center gap-2">
                        <Printer size={16} /> Bulk Print Labels
                      </button>
                    </div>

                    <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                      <table className="w-full text-left custom-table">
                        <thead><tr style={{ background: '#F3E5F5' }}><th style={{ color: '#7B1FA2' }}>Product</th><th className="text-center" style={{ color: '#7B1FA2' }}>Box #</th><th style={{ color: '#7B1FA2' }}>Customer</th><th className="text-center" style={{ color: '#7B1FA2' }}>Take</th></tr></thead>
                        <tbody className="divide-y divide-pink-50">
                          {Object.keys(filteredPackingOrders.reduce((acc, o) => { if (!acc[o.product]) acc[o.product] = []; acc[o.product].push(o); return acc; }, {})).sort().map(prod => {
                            let box = 1; let slots = 10;
                            return filteredPackingOrders.filter(o => o.product === prod).map(o => {
                              let rows = []; let q = o.qty;
                              while (q > 0) {
                                if (slots === 0) { box++; slots = 10; }
                                let alloc = Math.min(q, slots); slots -= alloc;
                                rows.push(
                                  <tr key={`${o.id}-${box}`}>
                                    <td className="font-black text-[#4A042A]">
                                      {prod}
                                      <div className="text-[9px] text-indigo-500 uppercase tracking-widest mt-0.5">Expect {Math.ceil((enrichedProducts.find(ep => ep.name === prod)?.totalVials || 0) / SLOTS_PER_BATCH)} Box(es)</div>
                                    </td>
                                    <td className="text-center font-bold text-pink-600">Box {box}</td>
                                    <td>
                                      <button onClick={() => { setSelectedProfileEmail(o.email); setIsEditingAddress(false); }} className="font-bold text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">{o.name}</button>
                                      <br /><span className="text-[10px]">{o.email}</span>
                                    </td>
                                    <td className="text-center font-black text-lg">{alloc}</td>
                                  </tr>
                                );
                                q -= alloc;
                              } return rows;
                            });
                          })}
                          {filteredPackingOrders.length === 0 && <tr><td colSpan="4" className="text-center p-8 text-pink-300 font-bold italic">No orders found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {adminTab === 'trimming' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center"><h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Loose Vial Hit List</h2></div>
                    {filteredHitList.length === 0 ? (
                      <div className="bg-emerald-50 p-12 rounded-[24px] text-center font-bold text-emerald-600 border-2 border-emerald-100 uppercase tracking-widest text-xs">✅ No loose vials matching your search.</div>
                    ) : (
                      <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                        <table className="w-full text-left custom-table">
                          <thead><tr style={{ background: '#FEF2F2' }}><th style={{ color: '#D32F2F' }}>⚠️ Product</th><th style={{ color: '#D32F2F' }}>Status</th><th style={{ color: '#D32F2F' }}>Target Customer</th><th className="text-center" style={{ color: '#D32F2F' }}>Action</th></tr></thead>
                          <tbody className="divide-y divide-pink-50">
                            {filteredHitList.map((v, i) => (
                              <tr key={v.id}>
                                <td className="font-bold">{v.prod}</td>
                                <td className="text-[10px] font-black text-rose-500 uppercase">Box {v.boxNum} needs {v.missingSlots} more</td>
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

                {/* ✨ REFACTORED: PURE CUSTOMER DATABASE */}
                {adminTab === 'customers' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registered Customers Database</h2>
                    </div>

                    <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                      <table className="w-full text-left custom-table">
                        <thead><tr><th>Customer Info</th><th>Saved Address</th><th className="text-center">Actions</th></tr></thead>
                        <tbody className="divide-y divide-pink-50">
                          {filteredUsers.map(u => {
                            return (
                              <tr key={u.id} className="hover:bg-pink-50/20">
                                <td>
                                  <button onClick={() => { setSelectedProfileEmail(u.id); setIsEditingAddress(false); }} className="font-bold text-slate-900 hover:text-pink-600 hover:underline text-left cursor-pointer bg-transparent border-none p-0 m-0">{u.name}</button>
                                  <p className="text-[10px] text-slate-400">{u.id}</p>
                                  {u.handle && <p className="text-[10px] text-[#D6006E] font-bold">{u.handle}</p>}
                                </td>
                                <td className="text-[10px] text-slate-500">{u.address?.street ? `${u.address.street}, ${u.address.brgy ? u.address.brgy + ', ' : ''}${u.address.city} (${u.address.shipOpt})` : <span className="italic opacity-40">No address on file</span>}</td>
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
                          {filteredUsers.length === 0 && <tr><td colSpan="3" className="text-center p-8 text-pink-300 font-bold italic">No registered customers found.</td></tr>}
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

                        <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Batch Name</label><input type="text" className={originalInput} value={settings.batchName} onChange={e => updateSetting('batchName', e.target.value)} /></div>

                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Exchange Rate (1$ = ?)</label><input type="number" className={originalInput} value={settings.fxRate} onChange={e => updateSetting('fxRate', Number(e.target.value))} /></div>
                          <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Admin Fee (PHP)</label><input type="number" className={originalInput} value={settings.adminFeePhp} onChange={e => updateSetting('adminFeePhp', Number(e.target.value))} /></div>
                        </div>
                        <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Minimum Vials Per Order</label><input type="number" className={originalInput} value={settings.minOrder} onChange={e => updateSetting('minOrder', Number(e.target.value))} /></div>
                        <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Dashboard Password</label><input type="text" className={originalInput} value={settings.adminPass} onChange={e => updateSetting('adminPass', e.target.value)} /></div>
                      </section>

                      <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50 space-y-4 h-full flex flex-col">
                        <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">Mode Toggles & Actions</h3>

                        <button onClick={() => updateSetting('storeOpen', settings.storeOpen === false ? true : false)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest border-2 ${settings.storeOpen !== false ? 'bg-emerald-50 border-emerald-600 text-emerald-600' : 'bg-rose-50 border-rose-600 text-rose-600'} hover:scale-[0.98] transition-transform shadow-sm`}>
                          {settings.storeOpen !== false ? '🟢 Store is OPEN' : '🛑 Store is CLOSED'}
                        </button>

                        <button onClick={() => updateSetting('paymentsOpen', !settings.paymentsOpen)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest border-2 ${settings.paymentsOpen ? 'bg-rose-50 border-rose-600 text-rose-600' : 'bg-emerald-50 border-emerald-600 text-emerald-600'} hover:scale-[0.98] transition-transform`}>
                          {settings.paymentsOpen ? '🔒 Close Payments' : '🟢 Open Payments'}
                        </button>
                        <button onClick={() => updateSetting('addOnly', !settings.addOnly)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest border-2 ${settings.addOnly ? 'bg-amber-50 border-amber-600 text-amber-600' : 'bg-slate-50 border-slate-600 text-slate-600'} hover:scale-[0.98] transition-transform`}>
                          {settings.addOnly ? '⚠️ Disable Add-Only' : '⏳ Enable Add-Only'}
                        </button>
                        <div className="grid grid-cols-2 gap-4 mt-auto pt-2">
                          <button onClick={runCutoff} className="py-4 rounded-2xl bg-pink-100 text-pink-600 font-black uppercase text-[10px] tracking-widest border border-pink-200 hover:bg-pink-200 transition-colors hover:scale-105">🛑 Run Cutoff</button>
                          <button onClick={resetSystem} disabled={isBtnLoading} className="py-4 rounded-2xl bg-rose-100 text-rose-600 font-black uppercase text-[10px] tracking-widest border border-rose-200 hover:bg-rose-200 transition-colors disabled:opacity-50 hover:scale-105">🚨 Reset System</button>
                        </div>
                      </section>
                    </div>

                    <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50 space-y-4">
                      <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">System Utilities</h3>

                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 mb-4">
                        <h4 className="text-[10px] font-black text-[#D6006E] uppercase tracking-widest">📊 Google Sheets Integration</h4>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Apps Script Web App URL</label>
                          <input type="url" className={adminInputSm} value={settings.gasWebAppUrl || ''} onChange={e => updateSetting('gasWebAppUrl', e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Google Sheet URL (For quick access)</label>
                          <input type="url" className={adminInputSm} value={settings.googleSheetUrl || ''} onChange={e => updateSetting('googleSheetUrl', e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Shipping Options (Comma-Separated)</label>
                          <input
                            type="text"
                            className={originalInput}
                            value={(settings.shippingOptions || []).join(', ')}
                            onChange={e => updateSetting('shippingOptions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                            placeholder="e.g. Lalamove, LBC, J&T, Pickup"
                          />
                        </div>
                        <div className="pt-4 border-t-2 border-pink-50">
                          <button onClick={seedDemoData} disabled={isBtnLoading} className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black uppercase text-xs tracking-widest shadow-lg hover:scale-[0.98] transition-transform disabled:opacity-50">
                            {isBtnLoading ? "Seeding... ⏳" : "🚀 Seed Full Product List & Mock Orders"}
                          </button>
                          <p className="text-[10px] text-center text-slate-400 mt-2 font-bold">Injects 100+ products and ~100 mock orders to test math.</p>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {adminTab === 'settings-admins' && (
                  <div className="space-y-6 max-w-3xl mx-auto pb-20">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Admin Profiles & Banks</h2>
                    <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50">
                      <div className="bg-[#FFF0F5] border-2 border-[#FFC0CB] rounded-xl p-4 max-h-[400px] overflow-y-auto mb-6 space-y-4">
                        {normalizedAdmins.map((a, idx) => (
                          <div key={idx} className="flex justify-between items-start border-b border-pink-100 pb-4">
                            <div className="w-full pr-4">
                              <strong className="text-[#4A042A] text-base">{a.name}</strong>
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
                            {/* ✨ FIXED: Inline Confirmation for Admin Delete */}
                            {confirmAction.type === 'deleteAdmin' && confirmAction.id === idx ? (
                              <div className="flex gap-2 items-center animate-fadeIn bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                                <span className="text-[9px] font-bold text-rose-700 uppercase">Remove?</span>
                                <button onClick={() => {
                                  const newArr = [...normalizedAdmins]; newArr.splice(idx, 1); updateSetting('admins', newArr);
                                  setConfirmAction({ type: null, id: null });
                                }} className="bg-rose-500 text-white px-2 py-1 rounded text-[9px] font-black hover:bg-rose-600">YES</button>
                                <button onClick={() => setConfirmAction({ type: null, id: null })} className="bg-slate-200 text-slate-700 px-2 py-1 rounded text-[9px] font-black hover:bg-slate-300">NO</button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmAction({ type: 'deleteAdmin', id: idx })} className="text-rose-500 font-bold hover:text-rose-700 bg-white border border-rose-100 rounded-lg p-2.5 hover:scale-110 transition-transform">❌</button>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Add New Admin</h4>
                        <input type="text" className={adminInputSm} placeholder="Admin Name" value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} />

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
                                  }} className="text-red-500 text-xs font-bold hover:underline">Remove Option</button>
                                )}
                              </div>
                              <textarea className={`${adminInputSm} mb-3`} placeholder="Bank Details (e.g. BDO: 123...)" value={bank.details} onChange={e => {
                                const newBanks = [...newAdmin.banks];
                                newBanks[index].details = e.target.value;
                                setNewAdmin({ ...newAdmin, banks: newBanks });
                              }} rows={2} />
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-2">Upload QR Code Image</label>
                                <input type="file" accept="image/*" onChange={e => {
                                  const newBanks = [...newAdmin.banks];
                                  newBanks[index].qrFile = e.target.files[0];
                                  setNewAdmin({ ...newAdmin, banks: newBanks });
                                }} className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-pink-100 file:text-pink-700 hover:file:bg-pink-200 cursor-pointer" />
                              </div>
                            </div>
                          ))}
                          <button onClick={() => {
                            if (newAdmin.banks.length >= 4) {
                              showToast("Maximum of 4 payment options allowed.");
                              return;
                            }
                            setNewAdmin({ ...newAdmin, banks: [...newAdmin.banks, { details: '', qrFile: null }] });
                          }} className="text-xs font-bold text-[#D6006E] bg-pink-50 px-4 py-3 rounded-xl w-full hover:bg-pink-100 border border-pink-200 border-dashed transition-colors shadow-sm">+ Add Another Bank Option</button>
                        </div>

                        <button onClick={handleAddAdmin} disabled={isBtnLoading} className="bg-[#FF1493] text-white font-black uppercase tracking-widest py-3 rounded-xl text-sm hover:bg-[#D6006E] transition-colors shadow-md mt-4 hover:scale-[0.98] disabled:opacity-50">
                          {isBtnLoading ? 'Uploading QRs... ⏳' : '➕ Save New Admin Profile'}
                        </button>
                      </div>
                    </section>
                  </div>
                )}

                {adminTab === 'settings-products' && (
                  <div className="space-y-6 pb-20 max-w-5xl mx-auto">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Product Catalog Management</h2>
                    <section className="bg-white p-6 rounded-2xl shadow-sm border-2 border-pink-50 space-y-4">

                      <div className="flex justify-between items-center mb-4 border-b border-pink-100 pb-4 gap-4 flex-wrap">
                        <h3 className="m-0 border-none p-0 font-black text-sm text-pink-600 uppercase tracking-[0.2em]">Live Products <span className="text-[10px] text-pink-400 normal-case ml-2 bg-pink-50 px-2 py-1 rounded-full">({products.length} Total)</span></h3>
                        <div className="relative w-full sm:w-auto min-w-[300px]">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={16} />
                          <input type="text" value={adminSettingsProductSearch} onChange={e => setAdminSettingsProductSearch(e.target.value)} placeholder="Search to edit product..." className={`${adminInputSm} pl-10 m-0 py-2`} />
                        </div>
                      </div>

                      <div className="overflow-x-auto border-2 border-pink-100 rounded-2xl mb-6 max-h-[500px] overflow-y-auto shadow-inner">
                        <table className="w-full text-sm text-left custom-table">
                          <thead className="sticky top-0 shadow-sm bg-[#FFF0F5] z-10">
                            <tr><th>Name</th><th>Price (Vial)</th><th className="text-center">Status</th><th className="text-center">Del</th></tr>
                          </thead>
                          <tbody className="bg-white">
                            {filteredSettingsProducts.map(p => (
                              <tr key={p.id} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                                <td className="font-bold text-[#4A042A] text-sm">{p.name}</td>
                                <td className="text-[#D6006E] font-bold text-sm">${p.pricePerVialUSD.toFixed(2)}</td>
                                <td className="text-center">
                                  <button onClick={() => safeAwait(setDoc(doc(db, colPath('products'), p.id), { locked: !p.locked }, { merge: true }))} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all hover:scale-105 shadow-sm ${p.locked ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                    {p.locked ? 'LOCKED' : 'OPEN'}
                                  </button>
                                </td>
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
                            {filteredSettingsProducts.length === 0 && <tr><td colSpan="4" className="text-center p-8 text-pink-300 font-bold italic">No products found.</td></tr>}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-8 pt-6 border-t-2 border-pink-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-[#FFF0F5] p-6 rounded-2xl border border-[#FFC0CB]">
                        <div>
                          <h4 className="text-sm font-black text-[#D6006E] mb-1">Bulk Upload via CSV</h4>
                          <p className="text-xs font-bold text-slate-500 max-w-sm">Columns must match the exact template format. <br /><span className="text-rose-500 font-black">⚠️ Warning: Uploading replaces your ENTIRE current catalog!</span></p>
                        </div>
                        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                          <button onClick={downloadCSVTemplate} className="flex-1 sm:flex-none bg-white border-2 border-[#FFC0CB] text-[#D6006E] px-4 py-2 rounded-xl font-bold hover:bg-pink-50 transition-colors text-xs whitespace-nowrap shadow-sm hover:scale-[0.98]">
                            📥 Get Template
                          </button>
                          <label className={`flex-1 sm:flex-none text-center bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white px-4 py-2 rounded-xl font-bold cursor-pointer transition-transform text-xs whitespace-nowrap shadow-md hover:scale-[0.98] ${isBtnLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {isBtnLoading ? '⏳ Uploading...' : '📂 Upload CSV & Replace'}
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

      {/* ✨ NEW: ADMIN INLINE EDIT MODAL */}
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
                  <h2 className="brand-title text-xl text-[#D6006E] m-0">Editing Active Order ✏️</h2>
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
                  {isBtnLoading ? 'Saving... ⏳' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ✨ FULL SCREEN PROOF MODAL */}
      {fullScreenProof && (
        <div className="fixed inset-0 bg-black/90 z-[2000] flex flex-col items-center justify-center p-4 cursor-pointer" onClick={() => setFullScreenProof(null)}>
          <button className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/80 hover:text-white text-4xl font-black transition-colors">&times;</button>
          <img src={fullScreenProof} alt="Full Screen Proof" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}

      {/* ✨ ALL PROOFS GALLERY MODAL */}
      {showAllProofsModal && (
        <div className="fixed inset-0 bg-[#4A042A]/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-[32px] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col h-[90vh] border-4 border-white">
            <div className="bg-white p-5 flex justify-between items-center border-b-2 border-slate-200">
              <h2 className="brand-title text-2xl text-[#D6006E]">📸 All Payment Proofs</h2>
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
                      <span className="mt-1 bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[8px] font-black uppercase text-center">Paid</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✨ NEW: Quick Info Product Modal */}
      {quickInfoProduct && (
        <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setQuickInfoProduct(null)}>
          <div className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-pink-100 relative animate-fadeIn" onClick={e => e.stopPropagation()}>
            <button onClick={() => setQuickInfoProduct(null)} className="absolute top-4 right-4 text-slate-400 hover:text-[#D6006E] font-black text-2xl transition-colors">&times;</button>

            <div className="p-6">
              <h3 className="font-black text-2xl text-[#D6006E] mb-3">{quickInfoProduct.name}</h3>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {quickInfoProduct.tags.map((tag, tIdx) => (
                  <span key={tIdx} className="bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">{tag}</span>
                ))}
              </div>

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
                <h2 className="brand-title text-2xl text-[#D6006E]">👤 Profile & History</h2>
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
                        <button onClick={() => startEditingAddress(profile)} className="text-[#D6006E] text-[10px] font-black uppercase hover:underline">✏️ Edit</button>
                      )}
                    </div>

                    {isEditingAddress ? (
                      <div className="space-y-2 mt-2">
                        <select value={editAddressForm.shipOpt} onChange={e => setEditAddressForm({ ...editAddressForm, shipOpt: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none">
                          <option value="" disabled>Select Courier...</option>
                          {settings.shippingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <input type="text" value={editAddressForm.street} onChange={e => setEditAddressForm({ ...editAddressForm, street: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Street & Barangay" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={editAddressForm.city} onChange={e => setEditAddressForm({ ...editAddressForm, city: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="City" />
                          <input type="text" value={editAddressForm.prov} onChange={e => setEditAddressForm({ ...editAddressForm, prov: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Province" />
                          <input type="text" value={editAddressForm.zip} onChange={e => setEditAddressForm({ ...editAddressForm, zip: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Zip Code" />
                          <input type="text" value={editAddressForm.contact} onChange={e => setEditAddressForm({ ...editAddressForm, contact: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Contact #" />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={saveEditedAddress} disabled={isBtnLoading} className="flex-1 bg-[#D6006E] text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-pink-700">{isBtnLoading ? 'Saving...' : '💾 Save'}</button>
                          <button onClick={() => setIsEditingAddress(false)} className="flex-1 bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-slate-300">✖ Cancel</button>
                        </div>
                      </div>
                    ) : (
                      profile.address?.street ? (
                        <p className="text-xs font-bold text-slate-700 leading-tight">
                          {profile.address.street}<br />
                          {profile.address.brgy ? `${profile.address.brgy}, ` : ''}{profile.address.city}<br />
                          {profile.address.prov} {profile.address.zip}<br />
                          <span className="text-emerald-600 mt-1 inline-block">Courier: {profile.address.shipOpt}</span><br />
                          <span className="text-slate-500">📞 {profile.address.contact}</span>
                        </p>
                      ) : <p className="text-xs text-slate-400 italic">No address on file</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-sm text-[#D6006E] uppercase tracking-widest mb-2 border-b-2 border-pink-100 pb-1">📦 Current Active Orders</h3>
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
                  <h3 className="font-black text-sm text-slate-500 uppercase tracking-widest mb-2 border-b-2 border-slate-200 pb-1">🕰️ Past Order History</h3>
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

      {/* ✨ NEW: Celebration Overlay with UNICORN */}
      {celebration.show && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] animate-fadeIn"></div>

          <div className="unicorn-wrapper">
            <div className="rainbow-trail"></div>
            <div className="unicorn-emoji">🦄</div>
          </div>

          {/* ✨ FIXED: Perfectly Centered Celebration Text */}
          <div className="absolute inset-0 flex items-center justify-center z-10 w-full px-4" style={{ animation: 'fadeIn 0.5s ease-out forwards, fadeOut 0.5s ease-in forwards 3s' }}>
            <h2 className="brand-title text-5xl sm:text-7xl text-[#D6006E] drop-shadow-xl filter text-center m-0 p-0 w-full leading-tight">
              {celebration.type === 'payment' ? 'Payment Sent! 💸' : 'Order Saved! 💖'}
            </h2>
          </div>
        </div>
      )}
    </>
  );
}