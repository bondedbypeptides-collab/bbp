import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc, writeBatch } from 'firebase/firestore';
import { 
  ShieldCheck, Store, Settings, Info, LayoutDashboard, 
  BadgeDollarSign, Scissors, ClipboardList, Users, 
  Lock, Package, Search, ArrowRight, CreditCard, 
  Home, LogOut, Trash2, ChevronRight 
} from 'lucide-react';

// --- FIREBASE SETUP ---
// 🔥 Your Real Firebase Config for Netlify & Stackblitz 🔥
const userFirebaseConfig = {
  apiKey: "AIzaSyBtqinodXxcYU4U5F-LoImCOj681KlZ9w4",
  authDomain: "bonded-by-peptides.firebaseapp.com",
  projectId: "bonded-by-peptides",
  storageBucket: "bonded-by-peptides.firebasestorage.app",
  messagingSenderId: "840550043632",
  appId: "1:840550043632:web:d935ae58a19ed96893d735",
  measurementId: "G-6NMJD9WTS6"
};

// Auto-detect if we are in the Canvas or deployed live on Netlify
const isCanvas = typeof __firebase_config !== 'undefined';
const firebaseConfig = isCanvas ? JSON.parse(__firebase_config) : userFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ✨ FIXED DATABASE PATH LOGIC: Uses root collections when live on Netlify to prevent rule blocks
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

// ✨ Safe Async Wrapper to prevent infinite hanging if Firebase blocks the request
const safeAwait = (promise, ms = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout! Check your Firebase Firestore rules or internet connection.")), ms))
  ]);
};

// ✨ Robust CSV Parser to prevent browser freezing on bad formatting
const parseCSVLine = (text) => {
  let ret = [], inQuote = false, value = '';
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    if (inQuote) {
      if (char === '"' && text[i+1] === '"') { value += '"'; i++; }
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
  const [adminTab, setAdminTab] = useState('settings'); 
  const [toast, setToast] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showHitListModal, setShowHitListModal] = useState(false);
  const [isBtnLoading, setIsBtnLoading] = useState(false);

  // Admin Security State
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Database State
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]); 
  const [history, setHistory] = useState([]); 
  const [settings, setSettings] = useState({
    batchName: '🎀 Sample Group Buy Batch 🎀',
    fxRate: 60,
    adminFeePhp: 150,
    minOrder: 3,
    paymentsOpen: false,
    addOnly: false,
    proofFolder: 'proof of payments',
    labelsFolder: 'Order Labels',
    adminPass: 'admin123', 
    shippingOptions: ["Lalamove", "LBC", "J&T", "Pickup"],
    admins: [
      { name: "Admin Jane", bank1: "BDO: 00123456789", qr1: "", bank2: "GCash: 09171234567", qr2: "" },
      { name: "Admin John", bank1: "BPI: 98765432100", qr1: "", bank2: "Maya: 09189876543", qr2: "" }
    ]
  });

  // Shop Form State
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerHandle, setCustomerHandle] = useState('');
  const [action, setAction] = useState('');
  const [cartItems, setCartItems] = useState({}); 
  const [addressForm, setAddressForm] = useState({ shipOpt: '', street: '', brgy: '', city: '', prov: '', zip: '', contact: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [adminUserSearch, setAdminUserSearch] = useState('');

  // Admin New Product/Admin State
  const [newProd, setNewProd] = useState({ name: '', kit: '', vial: '', max: '' });
  const [newAdmin, setNewAdmin] = useState({ name: '', bank1: '', qr1: '', bank2: '', qr2: '' });

  // --- AUTHENTICATION ---
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

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(collection(db, colPath('settings')), (snap) => { snap.forEach(d => { if (d.id === 'main') setSettings(d.data()); }); });
    const unsubProducts = onSnapshot(collection(db, colPath('products')), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setProducts(arr); });
    const unsubOrders = onSnapshot(collection(db, colPath('orders')), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setOrders(arr); });
    const unsubUsers = onSnapshot(collection(db, colPath('users')), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setUsers(arr); });
    const unsubHistory = onSnapshot(collection(db, colPath('history')), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setHistory(arr); });
    return () => { unsubSettings(); unsubProducts(); unsubOrders(); unsubUsers(); unsubHistory(); };
  }, [user]);

  // --- DERIVED STATE ---
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
    });
  }, [products, orders, settings.paymentsOpen]);

  const trimmingHitList = useMemo(() => {
    const productStats = {}; const customerTotals = {};
    orders.forEach(o => {
      if(!productStats[o.product]) productStats[o.product] = 0;
      productStats[o.product] += o.qty;
      const key = `${o.email}||${o.product}`;
      if(!customerTotals[key]) customerTotals[key] = 0;
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
    [...orders].sort((a,b) => b.timestamp - a.timestamp).forEach(row => {
      if(!toTrim[row.product] || toTrim[row.product] <= 0) return;
      const custTotal = customerTotals[`${row.email}||${row.product}`];
      if(custTotal % 10 === 0 || row.qty % 10 === 0) return; 
      
      const amountToRemove = Math.min(toTrim[row.product], row.qty % 10);
      if(amountToRemove > 0) {
        victims.push({
          id: row.id, prod: row.product, boxNum: openBoxNumbers[row.product], 
          missingSlots: 10 - (productStats[row.product] % 10),
          name: row.name, email: row.email, qty: row.qty, amountToRemove
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
      return { ...c, totalPHP: tUSD * settings.fxRate, isPaid: profile.isPaid || false, adminAssigned: profile.adminAssigned || "Unassigned" };
    });
  }, [orders, products, settings, users]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return enrichedProducts;
    return enrichedProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [enrichedProducts, searchQuery]);

  const filteredUsers = useMemo(() => {
    if (!adminUserSearch) return users;
    return users.filter(u => 
      u.name?.toLowerCase().includes(adminUserSearch.toLowerCase()) || 
      u.id?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
      u.handle?.toLowerCase().includes(adminUserSearch.toLowerCase())
    );
  }, [users, adminUserSearch]);

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

  // --- ACTIONS ---
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleAdminLogin = (e) => {
    if (e) e.preventDefault();
    if (adminPassword === (settings.adminPass || 'admin123')) {
      setIsAdminAuthenticated(true);
      setLoginError('');
      setAdminPassword('');
    } else {
      setLoginError('Incorrect password. Access denied.');
    }
  };

  const handleLookup = () => {
    if (!customerEmail) return;
    if (customerProfile) {
      setCustomerName(customerProfile.name || '');
      setCustomerHandle(customerProfile.handle || '');
      if (customerProfile.address) setAddressForm(customerProfile.address);
      
      const atRisk = trimmingHitList.some(v => v.email === customerEmail.toLowerCase().trim());
      if (settings.addOnly && atRisk) {
        showToast(`🚨 URGENT ${customerProfile.name}: Your vials are on the Hit List!`);
      } else {
        showToast(`Welcome back, ${customerProfile.name}! 💖 Profile loaded.`);
      }
      
      if (settings.addOnly && !settings.paymentsOpen) setAction('add');
    } else {
      showToast("No existing profile found. Welcome! ✨");
    }
  };

  const handleActionChange = (newAction) => {
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
  };

  const handleCartChange = (prodName, field, val) => {
    let num = parseInt(val) || 0;
    if (field === 'v' && num > 9) { num = 9; showToast("Use Kits for 10+ vials ✨"); }
    setCartItems(prev => ({ ...prev, [prodName]: { k: prev[prodName]?.k || 0, v: prev[prodName]?.v || 0, [field]: num } }));
  };

  const submitOrder = async () => {
    if (!customerEmail || !customerName || !action) { showToast("Please fill all fields! 🌸"); return; }
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
         showToast("Order Cancelled.");
         setCartItems({}); setIsBtnLoading(false); return;
      }
      
      const errors = []; const newOrderItems = []; const timestamp = Date.now();
      let totalRequestedVials = 0;

      Object.entries(cartItems).forEach(([prodName, amounts]) => {
        const qty = ((amounts.k || 0) * 10) + (amounts.v || 0);
        if (qty <= 0) return;
        totalRequestedVials += qty;
        const pData = enrichedProducts.find(p => p.name === prodName);
        if (pData?.isClosed) return;
        
        if (pData?.maxBoxes > 0 && (pData.totalVials - (action==='replace'?(existingOrderData.items[prodName]||0):0) + qty) > (pData.maxBoxes * 10)) {
           errors.push(`${prodName}: Exceeds batch limit.`);
        }
        newOrderItems.push({ email: emailLower, name: customerName, handle: customerHandle, product: prodName, qty, timestamp });
      });

      if (!settings.addOnly && action !== 'cancel' && totalRequestedVials < settings.minOrder) {
        showToast(`Your total cart must have at least ${settings.minOrder} vials! 🎀`);
        setIsBtnLoading(false);
        return;
      }

      if (errors.length > 0) { showToast(errors.join(' | ')); setIsBtnLoading(false); return; }
      if (newOrderItems.length === 0 && action === 'add') { showToast("No items added!"); setIsBtnLoading(false); return; }

      // Database Commit with Batched Writes
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

      let assignedAdmin = users.find(u => u.id === emailLower)?.adminAssigned || settings.admins[Math.floor(Math.random() * settings.admins.length)]?.name || "Admin";
      await safeAwait(setDoc(doc(db, colPath('users'), emailLower), { name: customerName, handle: customerHandle, adminAssigned: assignedAdmin }, { merge: true }));
      showToast("Order Submitted! 🎉");
      setCartItems({}); if (action === 'replace') setAction('');
    } catch (err) { console.error(err); showToast(`Error saving: ${err.message}`); }
    setIsBtnLoading(false);
  };

  const submitPayment = async () => {
    if (!addressForm.shipOpt || !addressForm.street || !addressForm.city || !addressForm.contact) { showToast("Missing fields! 🏠"); return; }
    const emailLower = customerEmail.toLowerCase().trim();
    try {
       await safeAwait(setDoc(doc(db, colPath('users'), emailLower), { address: addressForm, isPaid: true, proofUrl: 'mock_receipt.jpg' }, { merge: true }));
       showToast("Payment submitted! ✅");
       setShowPayModal(false);
    } catch (err) { showToast("Error submitting payment."); }
  };

  const updateSetting = async (field, val) => {
    const newSettings = { ...settings, [field]: val };
    setSettings(newSettings);
    await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), newSettings));
  };

  const executeTrim = async (victim) => {
    if (victim.qty === victim.amountToRemove) {
      await safeAwait(deleteDoc(doc(db, colPath('orders'), victim.id)));
    } else {
      await safeAwait(setDoc(doc(db, colPath('orders'), victim.id), { qty: victim.qty - victim.amountToRemove }, { merge: true }));
    }
  };

  const autoTrimAll = async () => {
    if(!window.confirm('⚠️ Auto-Trim will reduce/delete loose vials from the bottom up. Proceed?')) return;
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
    } catch(err) { console.error(err); showToast('Error during auto-trim.'); }
  };

  const runCutoff = async () => {
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
    } catch(err) { console.error(err); showToast("Error running cutoff."); }
  };

  const resetSystem = async () => {
    if(!window.confirm('🚨 RESET SYSTEM: This will archive all current orders into History and clear the board. Proceed?')) return;
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

      await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), { ...settings, paymentsOpen: false, addOnly: false }));
      showToast('✅ System Reset & Archived!');
    } catch (err) { console.error(err); showToast(`❌ Error resetting system: ${err.message}`); }
    setIsBtnLoading(false);
  };

  // ✨ SAFELY BATCHED DATA SEEDER
  const seedDemoData = async () => {
    setIsBtnLoading(true);
    showToast("Starting Seed Process... Please Wait ⏳");
    try {
      await safeAwait(setDoc(doc(db, colPath('settings'), 'main'), settings));
      const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

      const fullProductList = [
        { name: "5-amino-1mq 5mg", kit: 60, vial: 6 },
        { name: "5-amino-1mq 50mg", kit: 80, vial: 8 },
        { name: "AA Water 10 ml", kit: 10, vial: 1 },
        { name: "AA Water 3 ml", kit: 8, vial: 0.8 },
        { name: "AHKCU 100mg", kit: 65, vial: 6.5 },
        { name: "AICAR", kit: 60, vial: 6 },
        { name: "AOD 9604", kit: 95, vial: 9.5 },
        { name: "ARA290 10mg", kit: 70, vial: 7 },
        { name: "Bacteriostatic Water 10ml", kit: 14, vial: 1.4 },
        { name: "Bacteriostatic Water 3ml", kit: 5, vial: 0.5 },
        { name: "Bacteriostatic Water 5ml", kit: 9, vial: 0.9 },
        { name: "BPC157 5mg", kit: 40, vial: 4 },
        { name: "BPC157 10mg", kit: 70, vial: 7 },
        { name: "Cagri-Sema 10g", kit: 190, vial: 19 },
        { name: "Cagri-Sema 5g", kit: 100, vial: 10 },
        { name: "Cagrilintide 10mg", kit: 150, vial: 15 },
        { name: "Cagrilintide 5mg", kit: 90, vial: 9 },
        { name: "Cerebrolysin 60mg", kit: 50, vial: 8.4 },
        { name: "CJC No DAC 5mg + IPA5mg blend", kit: 85, vial: 8.5 },
        { name: "CJC-1295 with DAC 5 mg", kit: 130, vial: 13 },
        { name: "CJC-1295 No DAC 5mg", kit: 68, vial: 6.8 },
        { name: "CJC-1295 No DAC 10mg", kit: 130, vial: 13 },
        { name: "DSIP 5mg", kit: 32, vial: 3.2 },
        { name: "Epithalon 10mg", kit: 45, vial: 4.5 },
        { name: "Epithalon 50mg", kit: 120, vial: 12 },
        { name: "GHKCU Powder 1 gram", kit: 60, vial: 6 },
        { name: "GHK-Cu 100mg", kit: 48, vial: 4.8 },
        { name: "GHK-Cu 50mg", kit: 24, vial: 2.4 },
        { name: "GHRP-2 Acetate 5mg", kit: 20, vial: 2 },
        { name: "GHRP-2 Acetate 10mg", kit: 40, vial: 4 },
        { name: "GKP70", kit: 140, vial: 14 },
        { name: "GLOW 50mg", kit: 160, vial: 16 },
        { name: "GLOW 70mg", kit: 180, vial: 18 },
        { name: "Glutathione 1500mg", kit: 85, vial: 8.5 },
        { name: "HHB", kit: 210, vial: 21 },
        { name: "HCG 10000IU", kit: 120, vial: 12 },
        { name: "HCG 5000IU", kit: 60, vial: 6 },
        { name: "HGH 191AA (Somatropin) (Customized Order) 10 iu", kit: 50, vial: 5 },
        { name: "HGH 191AA (Somatropin) (Customized Order) 15 iu", kit: 70, vial: 7 },
        { name: "IGF-1LR3", kit: 190, vial: 19 },
        { name: "Ipamorelin 5mg", kit: 30, vial: 3 },
        { name: "Ipamorelin 10mg", kit: 50, vial: 5 },
        { name: "KissPeptin-10 5mg", kit: 48, vial: 4.8 },
        { name: "KissPeptin-10 10mg", kit: 90, vial: 9 },
        { name: "KLOW BPC 10mg+Tb500 10mg+GHK-Cu50mg+KPV10mg", kit: 220, vial: 22 },
        { name: "KPV 5mg", kit: 35, vial: 3.5 },
        { name: "KPV 10mg", kit: 55, vial: 5.5 },
        { name: "L-carnatine 500mg/vial", kit: 80, vial: 8 },
        { name: "Lemon Bottle 10ml", kit: 70, vial: 7 },
        { name: "Lipo-C 120mg", kit: 70, vial: 7 },
        { name: "Lipo-C 216mg", kit: 90, vial: 9 },
        { name: "Lipo-C Fat Blaster", kit: 110, vial: 11 },
        { name: "MOTS-c 10mg", kit: 50, vial: 5 },
        { name: "MOTS-c 40mg", kit: 190, vial: 19 },
        { name: "NAD+ 100mg", kit: 50, vial: 5 },
        { name: "NAD+ 500mg", kit: 70, vial: 7 },
        { name: "Oxytocin Acetate*2mg", kit: 24, vial: 2.4 },
        { name: "Pharma Bac", kit: 8.5, vial: 0.85 },
        { name: "Pinealon 10 mg", kit: 64, vial: 6.4 },
        { name: "Pinealon 20 mg", kit: 95, vial: 9.5 },
        { name: "Pinealon 5 mg", kit: 40, vial: 4 },
        { name: "PT-141 10 mg", kit: 62, vial: 6.2 },
        { name: "Retatrutide 5mg", kit: 68, vial: 6.8 },
        { name: "Retatrutide 10mg", kit: 100, vial: 10 },
        { name: "Retatrutide 15mg", kit: 140, vial: 14 },
        { name: "Retatrutide 20mg", kit: 170, vial: 17 },
        { name: "Retatrutide 24mg", kit: 190, vial: 19 },
        { name: "Retatrutide 30mg", kit: 245, vial: 24.5 },
        { name: "Retatrutide 36mg", kit: 260, vial: 26 },
        { name: "Retatrutide 40mg", kit: 330, vial: 33 },
        { name: "Retatrutide 50mg", kit: 375, vial: 37.5 },
        { name: "Retatrutide 60mg", kit: 390, vial: 39 },
        { name: "Selank 5mg", kit: 40, vial: 4 },
        { name: "Selank 11mg", kit: 75, vial: 7.5 },
        { name: "Semaglutide 5mg", kit: 38, vial: 3.8 },
        { name: "Semaglutide 10mg", kit: 52, vial: 5.2 },
        { name: "Semaglutide 15mg", kit: 68, vial: 6.8 },
        { name: "Semaglutide 20mg", kit: 90, vial: 9 },
        { name: "Semaglutide 30mg", kit: 116, vial: 11.6 },
        { name: "Semax 5mg", kit: 35, vial: 3.5 },
        { name: "Semax 11mg", kit: 53, vial: 5.3 },
        { name: "Sermorelin Acetate 5mg", kit: 50, vial: 5 },
        { name: "SLU-PP-332", kit: 140, vial: 14 },
        { name: "Snap-8 10mg", kit: 45, vial: 4.5 },
        { name: "SS-31 10mg", kit: 70, vial: 7 },
        { name: "SS-31 50mg", kit: 340, vial: 34 },
        { name: "TB10mg+BPC10mg blend", kit: 160, vial: 16 },
        { name: "TB500 10mg", kit: 130, vial: 13 },
        { name: "TB500 5mg", kit: 65, vial: 6.5 },
        { name: "TB5mg+BPC 5mg blend", kit: 80, vial: 8 },
        { name: "Tesamorelin 5mg", kit: 90, vial: 9 },
        { name: "Tesamorelin 10mg", kit: 170, vial: 17 },
        { name: "Tesamorelin 15mg", kit: 230, vial: 23 },
        { name: "Thymalin 10mg", kit: 48, vial: 4.8 },
        { name: "Thymosin Alpha-1 5mg", kit: 78, vial: 7.8 },
        { name: "Thymosin Alpha-1 10mg", kit: 155, vial: 15.5 },
        { name: "Tirzepatide 5mg", kit: 40, vial: 4 },
        { name: "Tirzepatide 10mg", kit: 62, vial: 6.2 },
        { name: "Tirzepatide 15mg", kit: 75, vial: 7.5 },
        { name: "Tirzepatide 20mg", kit: 90, vial: 9 },
        { name: "Tirzepatide 30mg", kit: 115, vial: 11.5 },
        { name: "Tirzepatide 40mg", kit: 145, vial: 14.5 },
        { name: "Tirzepatide 45mg", kit: 160, vial: 16 },
        { name: "Tirzepatide 50mg", kit: 170, vial: 17 },
        { name: "Tirzepatide 60mg", kit: 200, vial: 20 },
        { name: "VP5mg", kit: 80, vial: 8 },
        { name: "VP10mg", kit: 150, vial: 15 }
      ];

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
        { email: 'nglln.sdr25@gmail.com', name: 'Angelyn Dela Rosa', handle: 'looms', product: 'Retatrutide 20mg', qty: 5 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'Bacteriostatic Water 3ml', qty: 90 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'Tirzepatide 15mg', qty: 10 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'Tirzepatide 30mg', qty: 20 },
        { email: 'gaizelanne.ella@gmail.com', name: 'Gaizel Anne Ella', handle: '@ms.gie28', product: 'GHK-Cu 50mg', qty: 2 },
        { email: 'gaizelanne.ella@gmail.com', name: 'Gaizel Anne Ella', handle: '@ms.gie28', product: 'Lipo-C 120mg', qty: 2 },
        { email: 'gaizelanne.ella@gmail.com', name: 'Gaizel Anne Ella', handle: '@ms.gie28', product: 'Retatrutide 10mg', qty: 2 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: '5-amino-1mq 50mg', qty: 5 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'GHK-Cu 50mg', qty: 10 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'Bacteriostatic Water 3ml', qty: 10 },
        { email: 'hazel.cabundoc@gmail.com', name: 'Love Cabundoc', handle: 'LOVE / ILYLOVEC', product: 'Bacteriostatic Water 3ml', qty: 10 },
        { email: 'hazel.cabundoc@gmail.com', name: 'Love Cabundoc', handle: 'LOVE / ILYLOVEC', product: 'Tirzepatide 15mg', qty: 6 },
        { email: 'hazel.cabundoc@gmail.com', name: 'Love Cabundoc', handle: 'LOVE / ILYLOVEC', product: 'Tirzepatide 20mg', qty: 10 },
        { email: 'marieletish@gmail.com', name: 'Let Miranda', handle: 'heyyy.ish', product: 'Cagrilintide 5mg', qty: 2 },
        { email: 'marieletish@gmail.com', name: 'Let Miranda', handle: 'heyyy.ish', product: 'Lipo-C 120mg', qty: 2 },
        { email: 'marieletish@gmail.com', name: 'Let Miranda', handle: 'heyyy.ish', product: 'Retatrutide 10mg', qty: 3 },
        { email: 'vinamarie.t@gmail.com', name: 'Vina Marie Trinidad', handle: 'Inah.T', product: 'Pharma Bac', qty: 10 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: '5-amino-1mq 50mg', qty: 5 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'AOD 9604', qty: 5 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'Bacteriostatic Water 3ml', qty: 100 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'Cagrilintide 10mg', qty: 5 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'Retatrutide 10mg', qty: 5 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'Tirzepatide 15mg', qty: 25 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'Tirzepatide 20mg', qty: 5 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'Tirzepatide 30mg', qty: 25 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'Glutathione 1500mg', qty: 2 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'KPV 10mg', qty: 3 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'PT-141 10 mg', qty: 2 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'Retatrutide 5mg', qty: 3 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'Retatrutide 10mg', qty: 2 },
        { email: 'crishleyva@gmail.com', name: 'Kim Crisha Leyva', handle: '@Mikavyel', product: 'MOTS-c 10mg', qty: 3 },
        { email: 'crishleyva@gmail.com', name: 'Kim Crisha Leyva', handle: '@Mikavyel', product: 'Pharma Bac', qty: 10 },
        { email: 'karenlucillescabusa@gmail.com', name: 'Karen Lucille Escabusa', handle: '@iyenamazing', product: 'AHKCU 100mg', qty: 3 },
        { email: 'karenlucillescabusa@gmail.com', name: 'Karen Lucille Escabusa', handle: '@iyenamazing', product: 'AOD 9604', qty: 2 },
        { email: 'karenlucillescabusa@gmail.com', name: 'Karen Lucille Escabusa', handle: '@iyenamazing', product: 'DSIP 5mg', qty: 2 },
        { email: 'karenlucillescabusa@gmail.com', name: 'Karen Lucille Escabusa', handle: '@iyenamazing', product: 'GHK-Cu 100mg', qty: 3 },
        { email: 'karenlucillescabusa@gmail.com', name: 'Karen Lucille Escabusa', handle: '@iyenamazing', product: 'Glutathione 1500mg', qty: 3 },
        { email: 'karenlucillescabusa@gmail.com', name: 'Karen Lucille Escabusa', handle: '@iyenamazing', product: 'Pharma Bac', qty: 5 },
        { email: 'karenlucillescabusa@gmail.com', name: 'Karen Lucille Escabusa', handle: '@iyenamazing', product: 'SLU-PP-332', qty: 2 },
        { email: 'karenlucillescabusa@gmail.com', name: 'Karen Lucille Escabusa', handle: '@iyenamazing', product: 'Snap-8 10mg', qty: 3 },
        { email: 'ebronamita@gmail.com', name: 'Amita Ebron', handle: 'Amii', product: 'Pharma Bac', qty: 5 },
        { email: 'clarizza.garcia1@gmail.com', name: 'Clarizza Garcia', handle: 'Fugazzi', product: 'Bacteriostatic Water 3ml', qty: 10 },
        { email: 'clarizza.garcia1@gmail.com', name: 'Clarizza Garcia', handle: 'Fugazzi', product: 'CJC No DAC 5mg + IPA5mg blend', qty: 2 },
        { email: 'clarizza.garcia1@gmail.com', name: 'Clarizza Garcia', handle: 'Fugazzi', product: 'KPV 10mg', qty: 4 },
        { email: 'clarizza.garcia1@gmail.com', name: 'Clarizza Garcia', handle: 'Fugazzi', product: 'Retatrutide 10mg', qty: 2 },
        { email: 'arazoerika03@gmail.com', name: 'Erika Arazo', handle: 'gabdlp25', product: 'Bacteriostatic Water 3ml', qty: 10 },
        { email: 'arazoerika03@gmail.com', name: 'Erika Arazo', handle: 'gabdlp25', product: 'Tirzepatide 20mg', qty: 10 },
        { email: 'antonetteperido@gmail.com', name: 'Maan Perido', handle: 'MaanP', product: '5-amino-1mq 50mg', qty: 3 },
        { email: 'antonetteperido@gmail.com', name: 'Maan Perido', handle: 'MaanP', product: 'Bacteriostatic Water 3ml', qty: 10 },
        { email: 'antonetteperido@gmail.com', name: 'Maan Perido', handle: 'MaanP', product: 'Snap-8 10mg', qty: 5 },
        { email: 'svcafino@gmail.com', name: 'Steffany Cafino', handle: 'LaChica', product: 'Bacteriostatic Water 3ml', qty: 10 },
        { email: 'svcafino@gmail.com', name: 'Steffany Cafino', handle: 'LaChica', product: 'Tirzepatide 30mg', qty: 10 },
        { email: 'veronicacmdrvmendoza@gmail.con', name: 'Veronica Christiane Marie V Mendoza', handle: 'NikkiVMen', product: 'Tirzepatide 15mg', qty: 2 },
        { email: 'jenellenival25@gmail.com', name: 'Jenelle Patricia Nival', handle: '@notjen', product: 'AHKCU 100mg', qty: 2 },
        { email: 'jenellenival25@gmail.com', name: 'Jenelle Patricia Nival', handle: '@notjen', product: 'Tirzepatide 45mg', qty: 2 },
        { email: 'jenellenival25@gmail.com', name: 'Jenelle Patricia Nival', handle: '@notjen', product: 'AOD 9604', qty: 2 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'Bacteriostatic Water 10ml', qty: 10 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'GHK-Cu 50mg', qty: 2 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'KPV 10mg', qty: 2 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'NAD+ 500mg', qty: 2 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'Pharma Bac', qty: 10 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'Selank 5mg', qty: 2 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'Semax 5mg', qty: 2 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'Thymosin Alpha-1 10mg', qty: 3 },
        { email: 'chechiecarlos@gmail.com', name: 'Cecile Carlos', handle: '@cheeky25', product: 'Tirzepatide 30mg', qty: 3 },
        { email: 'ciara.albino92@gmail.com', name: 'Ciara Dawn Albino', handle: 'Cici', product: 'AOD 9604', qty: 2 },
        { email: 'ciara.albino92@gmail.com', name: 'Ciara Dawn Albino', handle: 'Cici', product: 'KPV 10mg', qty: 2 },
        { email: 'ciara.albino92@gmail.com', name: 'Ciara Dawn Albino', handle: 'Cici', product: 'Lipo-C 120mg', qty: 2 },
        { email: 'ciara.albino92@gmail.com', name: 'Ciara Dawn Albino', handle: 'Cici', product: 'MOTS-c 10mg', qty: 3 },
        { email: 'ciara.albino92@gmail.com', name: 'Ciara Dawn Albino', handle: 'Cici', product: 'SS-31 10mg', qty: 3 },
        { email: 'ciara.albino92@gmail.com', name: 'Ciara Dawn Albino', handle: 'Cici', product: 'Tirzepatide 30mg', qty: 10 },
        { email: 'jalexander1111999@gmail.com', name: 'Jean Marie Alexander', handle: 'JM A', product: 'AOD 9604', qty: 5 },
        { email: 'maryannsoliscatalan@gmail.com', name: 'Mary Ann Catalan', handle: '@itsmhean', product: 'Bacteriostatic Water 3ml', qty: 10 },
        { email: 'maryannsoliscatalan@gmail.com', name: 'Mary Ann Catalan', handle: '@itsmhean', product: 'KissPeptin-10 10mg', qty: 5 },
        { email: 'maryannsoliscatalan@gmail.com', name: 'Mary Ann Catalan', handle: '@itsmhean', product: 'Tirzepatide 30mg', qty: 10 },
        { email: 'cdmentrada@gmail.com', name: 'Clarice', handle: 'ClaDia', product: 'CJC No DAC 5mg + IPA5mg blend', qty: 2 },
        { email: 'cdmentrada@gmail.com', name: 'Clarice', handle: 'ClaDia', product: 'Epithalon 10mg', qty: 6 },
        { email: 'cdmentrada@gmail.com', name: 'Clarice', handle: 'ClaDia', product: 'Pharma Bac', qty: 10 },
        { email: 'cdmentrada@gmail.com', name: 'Clarice', handle: 'ClaDia', product: 'Retatrutide 30mg', qty: 2 },
        { email: 'cdmentrada@gmail.com', name: 'Clarice', handle: 'ClaDia', product: 'Selank 5mg', qty: 2 },
        { email: 'cdmentrada@gmail.com', name: 'Clarice', handle: 'ClaDia', product: 'Semax 5mg', qty: 2 },
        { email: 'cdmentrada@gmail.com', name: 'Clarice', handle: 'ClaDia', product: 'Thymosin Alpha-1 5mg', qty: 2 },
        { email: '0429jmdantes@gmail.com', name: 'JM Dantes', handle: 'JM Dantes', product: 'GHK-Cu 100mg', qty: 5 },
        { email: '0429jmdantes@gmail.com', name: 'JM Dantes', handle: 'JM Dantes', product: 'NAD+ 100mg', qty: 5 },
        { email: 'jyamwilliams@gmail.com', name: 'Hannah Santos', handle: 'xxfelina_', product: 'Bacteriostatic Water 3ml', qty: 35 },
        { email: 'jyamwilliams@gmail.com', name: 'Hannah Santos', handle: 'xxfelina_', product: 'Pharma Bac', qty: 5 },
        { email: 'jyamwilliams@gmail.com', name: 'Hannah Santos', handle: 'xxfelina_', product: 'Tirzepatide 15mg', qty: 5 },
        { email: 'jyamwilliams@gmail.com', name: 'Hannah Santos', handle: 'xxfelina_', product: 'Tirzepatide 20mg', qty: 10 },
        { email: 'jyamwilliams@gmail.com', name: 'Hannah Santos', handle: 'xxfelina_', product: 'Tirzepatide 30mg', qty: 15 },
        { email: 'icah_sulat@yahoo.com', name: 'April Sulat', handle: 'lavander_bunny_', product: 'Pharma Bac', qty: 2 }
      ];

      for (const chunk of chunkArray(MOCK_ORDERS, 150)) {
         const batch = writeBatch(db);
         chunk.forEach(o => {
            let assignedAdmin = settings.admins[Math.floor(Math.random() * settings.admins.length)]?.name || "Admin";
            batch.set(doc(db, colPath('users'), o.email.toLowerCase()), { 
               name: o.name, handle: o.handle, adminAssigned: assignedAdmin, 
               address: { shipOpt: 'Lalamove', street: '123 Test St', city: 'Makati', contact: '09171234567' }
            }, { merge: true });
            batch.set(doc(collection(db, colPath('orders'))), { 
               email: o.email.toLowerCase(), name: o.name, handle: o.handle, product: o.product, qty: o.qty, timestamp: Date.now() 
            });
         });
         await safeAwait(batch.commit());
      }

      showToast("Massive Product & Mock Order List Seeded! 🎉");
    } catch(err) {
      console.error(err);
      showToast(`❌ Error seeding: ${err.message}`);
    }
    setIsBtnLoading(false);
  };

  // --- CSV UPLOAD LOGIC ---
  const downloadCSVTemplate = () => {
    const headers = "Peptide Name,CODE,Price per KIT(USD),Price per vial (USD)\n";
    const sampleRow1 = "5-amino-1mq 5mg,5AM,60.00,6.00\n";
    const sampleRow2 = "BPC157 10mg,BC10,70.00,7.00\n";
    const blob = new Blob([headers + sampleRow1 + sampleRow2], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'BBP_Products_Template.csv');
    a.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
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
          
          if(kit === 0 && vial > 0) kit = vial * 10;
          if(vial === 0 && kit > 0) vial = kit / 10;
          
          newProducts.push({ name, pricePerKitUSD: kit, pricePerVialUSD: vial, locked: false, maxBoxes: 0 });
        }
      }
      
      if (newProducts.length > 0) {
        setIsBtnLoading(true);
        showToast("Uploading CSV... ⏳");
        try {
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
        } catch(err) {
          console.error(err);
          showToast(`❌ Error saving products: ${err.message}`);
        }
        setIsBtnLoading(false);
      } else {
        showToast("❌ No valid products found in CSV. Check your columns.");
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleAddProduct = async () => {
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
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.name) { showToast('Enter an Admin Name!'); return; }
    const updatedAdmins = [...settings.admins, { 
      name: newAdmin.name, 
      bank1: newAdmin.bank1 || '', 
      qr1: newAdmin.qr1 || '', 
      bank2: newAdmin.bank2 || '',
      qr2: newAdmin.qr2 || ''
    }];
    await updateSetting('admins', updatedAdmins);
    setNewAdmin({ name: '', bank1: '', qr1: '', bank2: '', qr2: '' });
    showToast('Admin added successfully! ✅');
  };

  // --- STYLES ---
  const originalInput = "w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-2xl px-4 py-3 outline-none focus:border-[#D6006E] font-bold text-[#4A042A]";
  const adminInputSm = "w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs outline-none focus:border-[#D6006E] font-bold text-[#4A042A]";
  const originalBtn = "bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white font-bold px-6 py-4 rounded-full shadow-[0_4px_10px_rgba(255,20,147,0.3)] uppercase tracking-wider disabled:opacity-50 hover:scale-[0.98] transition-all";

  // --- PREPARE DATA ---
  const userOrders = orders.filter(o => o.email === customerEmail.toLowerCase().trim());
  const existingMap = {};
  userOrders.forEach(o => existingMap[o.product] = o.qty);

  let subtotalUSD = 0;
  const cartList = [];
  const finalItems = (settings.paymentsOpen || action === '') ? existingMap : (action === 'replace' ? Object.fromEntries(Object.entries(cartItems).map(([p, a]) => [p, (a.k||0)*10+(a.v||0)])) : existingMap);
  
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
      {/* 🚀 GLOBAL CSS INJECTION TO FORCE FONTS PROPERLY ACROSS BOTH VIEWS 🚀 */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        
        /* CRITICAL STRETCH FIXES FOR VITE */
        html, body { width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; overflow-x: hidden !important; display: block !important; }
        #root { width: 100% !important; max-width: 100% !important; min-height: 100vh !important; margin: 0 !important; padding: 0 !important; text-align: left !important; display: block !important; }
        
        /* Force Quicksand Everywhere */
        body, input, button, select, textarea, table, th, td, span, div { 
          font-family: 'Quicksand', sans-serif !important; 
        }
        
        /* Force Pacifico only on specific elements */
        .brand-title, .brand-title * { 
          font-family: 'Pacifico', cursive !important; 
        }
        
        .brand-title { transform: rotate(-2deg); text-shadow: 2px 2px 0px rgba(0,0,0,0.1); }
        .glass-card { background: white; border: 2px solid #FF1493; border-radius: 1.5rem; }
        .hide-scroll::-webkit-scrollbar { display: none; }
        
        /* Admin specific styles */
        .admin-sidebar { width: 280px; background: #4A042A; flex-shrink: 0; }
        .nav-item.active { background: white; color: #D6006E; border-radius: 1rem 0 0 1rem; margin-right: -1.5rem; padding-right: 1.5rem; }
        .custom-table th { background: #FFF0F5; color: #D6006E; font-weight: 800; font-size: 10px; text-transform: uppercase; padding: 1rem; border-bottom: 2px solid #FFC0CB; }
        .custom-table td { padding: 1rem; border-bottom: 1px solid #FFE4E1; font-weight: 600; font-size: 13px; }
      `}} />

      {view === 'shop' ? (
        <div className="min-h-screen w-full text-[#4A042A] pb-24 lg:pb-8 selection:bg-pink-300" style={{ background: 'linear-gradient(135deg, #FFC3EB 0%, #FF8EBD 100%)', backgroundAttachment: 'fixed' }}>
          <div className="w-full max-w-[1600px] mx-auto p-4 pt-6">
            <h1 className="brand-title text-3xl sm:text-5xl text-center text-white mb-2 flex items-center justify-center gap-3">
              ✨ Bonded <span className="text-sm font-black uppercase tracking-widest text-white/80 transform translate-y-2" style={{fontFamily: "'Quicksand', sans-serif !important"}}>by</span> Peptides ✨
            </h1>
            <div className="text-center mb-8">
              <span className="bg-white text-[#D6006E] px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider border-2 border-[#FF69B4] shadow-sm inline-block">
                {settings.batchName}
              </span>
            </div>

            {/* Banners */}
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

            <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_450px] gap-6">
              <div className="space-y-4 w-full">
                
                {/* ✨ NEW: User is at risk banner directly above their form */}
                {isCurrentUserAtRisk && (
                   <div className="bg-rose-100 border-2 border-rose-500 p-4 rounded-2xl shadow-sm animate-pulse flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                     <div>
                       <h3 className="text-rose-700 font-black text-sm mb-1">🚨 YOUR VIALS ARE AT RISK!</h3>
                       <p className="text-xs text-rose-600 font-bold">You have loose vials on the Hit List. If the box isn't completed before cutoff, they will be deleted. Help fill the box!</p>
                     </div>
                     <button onClick={() => setShowHitListModal(true)} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-rose-700 whitespace-nowrap">
                       View Hit List
                     </button>
                   </div>
                )}

                <div className="glass-card p-6 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">💌 Email Address</label>
                      <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} onBlur={handleLookup} className={originalInput} placeholder="Enter email to lookup profile..."/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">🌸 Name</label>
                      <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className={originalInput} placeholder="Full name" disabled={settings.paymentsOpen}/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">💬 Handle</label>
                      <input type="text" value={customerHandle} onChange={e => setCustomerHandle(e.target.value)} className={originalInput} placeholder="@username" disabled={settings.paymentsOpen}/>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">⚡ Action</label>
                      <select value={action} onChange={e => handleActionChange(e.target.value)} className={originalInput} disabled={settings.paymentsOpen}>
                        <option value="" disabled>Choose an action...</option>
                        <option value="replace" disabled={settings.addOnly}>Create / Replace Order</option>
                        <option value="add">Add Items (Keep Existing)</option>
                        <option value="cancel" disabled={settings.addOnly}>Cancel Order</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b-2 border-[#FFE4E1] flex justify-between items-center bg-[#FFF0F5]">
                     <h2 className="font-bold text-pink-600 uppercase tracking-widest text-sm flex items-center gap-2"><Package size={18}/> Shop Catalog</h2>
                     <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search..." className="bg-white px-3 py-1 rounded-full text-xs font-bold border border-[#FFC0CB] outline-none w-32 focus:w-48 transition-all"/>
                  </div>
                  
                  {products.length === 0 ? (
                    <div className="p-12 text-center text-pink-400 font-bold italic">No products available yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                      {filteredProducts.map(p => {
                         const cart = cartItems[p.name] || { k:0, v:0 };
                         const active = cart.k > 0 || cart.v > 0;
                         const exist = existingMap[p.name] || 0;
                         return (
                          <div key={p.id} className={`p-4 border-b md:border-r border-[#FFE4E1] flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-colors ${active ? 'bg-[#FFF0F5]' : 'bg-white'}`}>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-base md:text-lg leading-tight">{p.name}</h3>
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${p.statusKey === 'available' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{p.statusText}</span>
                              </div>
                              <div className="flex gap-2 text-xs font-bold text-[#9E2A5E]">
                                <span className="bg-[#FF69B4] text-white px-2 py-0.5 rounded-full">${p.pricePerVialUSD.toFixed(2)} / vial</span>
                                {exist > 0 && <span className="bg-[#9C27B0] text-white px-2 py-0.5 rounded-full">📦 Has {exist}</span>}
                              </div>
                            </div>
                            <div className={`flex gap-2 ${p.isClosed ? 'opacity-40 pointer-events-none' : ''}`}>
                              <div className="bg-white border-2 border-[#FFC0CB] rounded-xl p-1 text-center w-20 xl:w-24">
                                <span className="block text-[8px] font-black uppercase text-pink-400">Kits (10x)</span>
                                <input type="number" min="0" value={cart.k || ''} onChange={e=>handleCartChange(p.name, 'k', e.target.value)} className="w-full text-center font-bold text-lg text-pink-600 outline-none bg-transparent" placeholder="0" disabled={p.isClosed}/>
                              </div>
                              <div className="bg-white border-2 border-[#FFC0CB] rounded-xl p-1 text-center w-20 xl:w-24">
                                <span className="block text-[8px] font-black uppercase text-pink-400">Vials (1x)</span>
                                <input type="number" min="0" max="9" value={cart.v || ''} onChange={e=>handleCartChange(p.name, 'v', e.target.value)} className="w-full text-center font-bold text-lg text-pink-600 outline-none bg-transparent" placeholder="0" disabled={p.isClosed}/>
                              </div>
                            </div>
                          </div>
                         );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="hidden lg:block sticky top-6 w-full">
                <div className="glass-card p-6 shadow-xl">
                  <h3 className="brand-title text-2xl text-[#D6006E] border-b-2 border-pink-100 pb-2 mb-4 text-center">Your Cart 🛍️</h3>
                  <div className="max-h-[350px] overflow-y-auto mb-4 space-y-2 pr-2">
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
                      <span className="text-3xl xl:text-4xl font-black text-[#D6006E]">₱{totalPHP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                  </div>
                  <button onClick={submitOrder} disabled={isBtnLoading || (cartList.length === 0 && action !== 'cancel')} className={originalBtn + " w-full mt-6 py-5"}>
                    {isBtnLoading ? "Saving... ⏳" : action === 'cancel' ? "Confirm Cancel" : "Submit Order 💖"}
                  </button>
                  {settings.paymentsOpen && cartList.length > 0 && (
                     <button onClick={()=>setShowPayModal(true)} className="w-full mt-2 bg-[#008040] text-white font-bold py-5 rounded-full uppercase tracking-widest text-sm shadow-md">Pay Now 💸</button>
                  )}
                </div>
              </aside>
            </div>
          </div>

          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#FF1493] p-4 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center">
            <div>
              <div className="text-[10px] font-black text-[#D6006E] uppercase">Total Estimate</div>
              <div className="text-2xl font-black text-[#D6006E]">₱{totalPHP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            </div>
            {settings.paymentsOpen ? (
              <button onClick={() => setShowPayModal(true)} disabled={cartList.length===0} className="bg-[#008040] text-white px-6 py-3 rounded-full font-bold uppercase text-sm shadow-md disabled:opacity-50">Pay Now 💸</button>
            ) : (
              <button onClick={submitOrder} disabled={cartList.length === 0 && action !== 'cancel'} className="bg-[#D6006E] text-white px-6 py-3 rounded-full font-black uppercase text-sm shadow-md disabled:opacity-50">
                {action === 'cancel' ? 'Cancel' : 'Submit 💖'}
              </button>
            )}
          </div>

          <button onClick={()=>setView('admin')} className="fixed bottom-24 lg:bottom-6 right-4 bg-[#4A042A] text-white px-5 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl z-[40] flex items-center gap-2">
             <Lock size={14}/> Admin Access
          </button>

          {showPayModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
                  <div className="bg-[#FFF0F5] p-5 flex justify-between items-center border-b-2 border-[#FFC0CB]">
                     <h2 className="brand-title text-2xl text-pink-600">Checkout 💸</h2>
                     <button onClick={()=>setShowPayModal(false)} className="text-pink-600 font-black text-2xl">&times;</button>
                  </div>
                  <div className="p-6 overflow-y-auto space-y-6">
                     
                     {/* ✨ Updated QR Code Priority Logic in Checkout */}
                     <div className="bg-[#E6F6EC] p-4 rounded-2xl border-2 border-[#bbf7d0]">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Send Payment To</p>
                        
                        {(() => {
                           const assignedAdminName = customerList.find(c => c.email === customerEmail.toLowerCase().trim())?.adminAssigned || "Admin";
                           const adminObj = settings.admins.find(a => a.name === assignedAdminName) || settings.admins[0];
                           
                           return (
                             <div>
                               <p className="font-bold text-emerald-900 mb-3">{adminObj?.name || "Admin"}</p>
                               
                               <div className="space-y-4">
                                 {/* Bank 1 / QR 1 */}
                                 {(adminObj?.bank1 || adminObj?.qr1) && (
                                   <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 border-b border-emerald-50 pb-1">Option 1</p>
                                      {adminObj.qr1 ? (
                                        <img src={adminObj.qr1} alt="QR Code 1" className="w-full max-w-[200px] mx-auto rounded-lg" />
                                      ) : (
                                        <pre className="font-mono text-xs text-emerald-700 whitespace-pre-wrap">{adminObj.bank1}</pre>
                                      )}
                                   </div>
                                 )}

                                 {/* Bank 2 / QR 2 */}
                                 {(adminObj?.bank2 || adminObj?.qr2) && (
                                   <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 border-b border-emerald-50 pb-1">Option 2</p>
                                      {adminObj.qr2 ? (
                                        <img src={adminObj.qr2} alt="QR Code 2" className="w-full max-w-[200px] mx-auto rounded-lg" />
                                      ) : (
                                        <pre className="font-mono text-xs text-emerald-700 whitespace-pre-wrap">{adminObj.bank2}</pre>
                                      )}
                                   </div>
                                 )}
                               </div>
                             </div>
                           );
                        })()}
                     </div>

                     <div className="space-y-3">
                        <select value={addressForm.shipOpt} onChange={e=>setAddressForm({...addressForm, shipOpt:e.target.value})} className={originalInput}>
                          <option value="" disabled>Select Courier...</option>
                          {settings.shippingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <input type="text" value={addressForm.street} onChange={e=>setAddressForm({...addressForm, street:e.target.value})} className={originalInput} placeholder="Street & Barangay" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" value={addressForm.city} onChange={e=>setAddressForm({...addressForm, city:e.target.value})} className={originalInput} placeholder="City" />
                          <input type="text" value={addressForm.contact} onChange={e=>setAddressForm({...addressForm, contact:e.target.value})} className={originalInput} placeholder="Contact #" />
                        </div>
                     </div>
                  </div>
                  <div className="p-6 border-t-2 border-pink-50 bg-[#FFF0F5]">
                     <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-pink-400">TOTAL PHP</span>
                        <span className="text-2xl font-black text-pink-600">₱{totalPHP.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                     </div>
                     <button onClick={submitPayment} className={originalBtn + " w-full"}>Upload Proof & Complete ✅</button>
                  </div>
               </div>
            </div>
          )}

          {/* ✨ NEW: Public Hit List Modal (For Add-Only Mode) */}
          {showHitListModal && (
            <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
               <div className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
                  <div className="bg-[#FFF0F5] p-5 flex justify-between items-center border-b-2 border-[#FFC0CB]">
                     <h2 className="brand-title text-2xl text-rose-600">✂️ Elimination Hit List</h2>
                     <button onClick={()=>setShowHitListModal(false)} className="text-pink-600 font-black text-2xl">&times;</button>
                  </div>
                  <div className="p-6 overflow-y-auto bg-slate-50 hide-scroll">
                     <p className="text-sm font-bold text-slate-600 mb-6 text-center">
                       The following boxes are incomplete! If they aren't filled before cutoff, the loose vials at the bottom of the list will be trimmed. Buy the missing slots to save them!
                     </p>
                     {trimmingHitList.length === 0 ? (
                       <div className="bg-emerald-50 p-8 rounded-2xl text-center font-bold text-emerald-600 border-2 border-emerald-100 uppercase tracking-widest text-xs">
                         ✅ All boxes are perfectly full! No one is getting cut.
                       </div>
                     ) : (
                       <div className="space-y-4">
                         {trimmingHitList.map((v, i) => (
                           <div key={i} className="bg-white p-4 rounded-2xl border-2 border-rose-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                             <div>
                               <h4 className="font-black text-[#4A042A] text-lg">{v.prod}</h4>
                               <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 inline-block px-2 py-1 rounded-md mt-1">Needs {v.missingSlots} more to complete Box {v.boxNum}</p>
                             </div>
                             
                             {/* ✨ NEW: Cute Speech Bubble Callout */}
                             <div className="relative w-full sm:w-auto mt-6 sm:mt-0">
                               <div className="absolute -top-8 right-2 sm:-top-8 sm:right-2 bg-[#FFF0F5] border border-[#FFC0CB] text-[#D6006E] text-[9px] px-3 py-1.5 rounded-2xl rounded-br-none shadow-sm italic whitespace-nowrap z-10 font-bold">
                                 💬 "{CUTE_PLEAS[i % CUTE_PLEAS.length]}"
                               </div>
                               <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 w-full text-center sm:text-right">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">On the chopping block</p>
                                 <p className="font-bold text-slate-700 text-sm"><strong>{v.name}</strong> <span className="text-rose-600 font-black ml-1 bg-rose-100 px-2 py-0.5 rounded">-{v.amountToRemove} vials</span></p>
                               </div>
                             </div>
                             
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                  <div className="p-4 border-t-2 border-pink-50 bg-[#FFF0F5] text-center">
                     <button onClick={()=>setShowHitListModal(false)} className={originalBtn + " w-full max-w-sm mx-auto"}>Close & Go Shop 🛍️</button>
                  </div>
               </div>
            </div>
          )}

          {toast && (
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] bg-white border-2 border-pink-600 text-pink-600 px-6 py-3 rounded-full shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2">
              <Info size={16}/> {toast}
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
                  <button type="button" onClick={() => setView('shop')} className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">🛍️ Cancel / Back to Shop</button>
                </div>
             </form>
          </div>
        ) : (
          <div className="min-h-screen w-full flex bg-slate-50">
            <aside className="admin-sidebar hidden lg:flex flex-col p-6 text-white overflow-hidden">
               <div className="brand-title text-3xl text-center mb-12">BBP Core</div>
               <nav className="space-y-1 flex-1">
                  {[
                    { id: 'overview', icon: <LayoutDashboard size={20}/>, label: 'Inventory' },
                    { id: 'payments', icon: <BadgeDollarSign size={20}/>, label: 'Payments' },
                    { id: 'packing', icon: <ClipboardList size={20}/>, label: 'Packing Guide' },
                    { id: 'trimming', icon: <Scissors size={20}/>, label: 'Hit List' },
                    { id: 'customers', icon: <Users size={20}/>, label: 'Customer DB' },
                    { id: 'settings', icon: <Settings size={20}/>, label: 'System' }
                  ].map(t => (
                    <button key={t.id} onClick={() => setAdminTab(t.id)} className={`nav-item w-full flex items-center gap-3 px-4 py-4 font-black text-xs uppercase tracking-widest transition-all ${adminTab === t.id ? 'active shadow-lg' : 'text-pink-300/60 hover:text-white'}`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
               </nav>
               <div className="pt-6 border-t border-white/10">
                  <button onClick={() => setView('shop')} className="w-full flex items-center gap-3 px-4 py-3 text-pink-300/60 font-bold text-xs uppercase tracking-widest hover:text-white"><Home size={18}/> Shop View</button>
                  <button onClick={() => setIsAdminAuthenticated(false)} className="w-full flex items-center gap-3 px-4 py-3 text-pink-300/60 font-bold text-xs uppercase tracking-widest hover:text-white"><LogOut size={18}/> Logout</button>
               </div>
            </aside>

            <main className="flex-1 h-screen overflow-y-auto p-4 lg:p-10">
               <div className="lg:hidden flex items-center justify-between mb-8 bg-[#4A042A] p-4 rounded-2xl shadow-xl">
                  <span className="brand-title text-white text-xl">BBP</span>
                  <select value={adminTab} onChange={e => setAdminTab(e.target.value)} className="bg-white text-[#D6006E] font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl outline-none">
                     <option value="overview">Inventory</option>
                     <option value="payments">Payments</option>
                     <option value="packing">Packing</option>
                     <option value="trimming">Hit List</option>
                     <option value="customers">Customers</option>
                     <option value="settings">Settings</option>
                  </select>
               </div>

               <div className="w-full max-w-[1600px] mx-auto">
                 {adminTab === 'overview' && (
                   <div className="space-y-6">
                     <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Live Inventory Overview</h2>
                     <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                        <table className="w-full text-left custom-table">
                           <thead><tr><th>Product</th><th className="text-center">Total Vials</th><th className="text-center">Full Boxes</th><th className="text-center">Slots Left</th><th>Status</th></tr></thead>
                           <tbody className="divide-y divide-pink-50">
                              {enrichedProducts.map(p => (
                                <tr key={p.id} className="hover:bg-pink-50/20">
                                   <td className="font-bold text-slate-900">{p.name}</td>
                                   <td className="text-center">{p.totalVials}</td>
                                   <td className="text-center font-black text-pink-600">{p.boxes}</td>
                                   <td className="text-center text-emerald-600">{p.slotsLeft === 0 ? 'Full' : `${p.slotsLeft}`}</td>
                                   <td><span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-pink-200 text-pink-600">{p.statusText}</span></td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                   </div>
                 )}

                 {adminTab === 'payments' && (
                   <div className="space-y-6">
                      <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Customer Payments Management</h2>
                      
                      {/* ✨ NEW: Admin Overall Totals Dashboard */}
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

                        return (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                               <div className="bg-white p-6 rounded-2xl border-2 border-pink-50 shadow-sm">
                                 <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Expected</h4>
                                 <p className="text-3xl font-black text-[#D6006E]">₱{totalExpectedPHP.toLocaleString()}</p>
                               </div>
                               <div className="bg-white p-6 rounded-2xl border-2 border-emerald-100 shadow-sm">
                                 <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">Total Paid ✅</h4>
                                 <p className="text-3xl font-black text-emerald-600">₱{totalPaidPHP.toLocaleString()}</p>
                               </div>
                               <div className="bg-white p-6 rounded-2xl border-2 border-amber-100 shadow-sm">
                                 <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Pending Balance ❌</h4>
                                 <p className="text-3xl font-black text-amber-600">₱{(totalExpectedPHP - totalPaidPHP).toLocaleString()}</p>
                               </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border-2 border-pink-50 shadow-sm mb-6">
                               <h4 className="text-sm font-black text-[#4A042A] uppercase tracking-widest mb-4 border-b border-pink-100 pb-2">Load Balancing & Admin Breakdown</h4>
                               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                 {Object.entries(adminBreakdown).map(([admin, data]) => (
                                   <div key={admin} className="bg-[#FFF0F5] p-4 rounded-xl border border-[#FFC0CB]">
                                     <p className="font-black text-[#D6006E] mb-3">{admin} <span className="text-[10px] text-pink-400 ml-1">({data.count} orders)</span></p>
                                     <div className="flex justify-between text-xs font-bold text-[#4A042A] mb-1"><span>Expected:</span> <span>₱{data.expected.toLocaleString()}</span></div>
                                     <div className="flex justify-between text-xs font-bold text-emerald-600 border-t border-pink-100 pt-1"><span>Collected:</span> <span>₱{data.paid.toLocaleString()}</span></div>
                                   </div>
                                 ))}
                               </div>
                            </div>
                          </>
                        );
                      })()}

                      <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                        <table className="w-full text-left custom-table">
                           <thead><tr><th>Customer</th><th>Assigned Admin</th><th className="text-right">Total PHP</th><th className="text-center">Status</th></tr></thead>
                           <tbody className="divide-y divide-pink-50">
                              {customerList.map(c => (
                                <tr key={c.email}>
                                  <td><p className="font-bold text-slate-900">{c.name}</p><p className="text-[10px] text-slate-400">{c.email}</p></td>
                                  <td><span className="bg-[#FFF0F5] px-2 py-1 rounded text-[10px] font-black text-pink-600 border border-pink-100">{c.adminAssigned}</span></td>
                                  <td className="text-right font-black text-pink-600">₱{c.totalPHP.toLocaleString()}</td>
                                  <td className="text-center">
                                     <button onClick={() => safeAwait(setDoc(doc(db, colPath('users'), c.email), { isPaid: !c.isPaid }, { merge: true }))} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${c.isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
                                        {c.isPaid ? 'PAID ✅' : 'PENDING ❌'}
                                     </button>
                                  </td>
                                </tr>
                              ))}
                           </tbody>
                        </table>
                      </div>
                   </div>
                 )}

                 {adminTab === 'packing' && (
                   <div className="space-y-6">
                     <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Packing Logistics Guide</h2>
                     <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                        <table className="w-full text-left custom-table">
                           <thead><tr style={{background: '#F3E5F5'}}><th style={{color: '#7B1FA2'}}>Product</th><th className="text-center" style={{color: '#7B1FA2'}}>Box #</th><th style={{color: '#7B1FA2'}}>Customer</th><th className="text-center" style={{color: '#7B1FA2'}}>Take</th></tr></thead>
                           <tbody className="divide-y divide-pink-50">
                              {Object.keys(orders.reduce((acc, o) => { if(!acc[o.product]) acc[o.product] = []; acc[o.product].push(o); return acc; }, {})).sort().map(prod => {
                                let box = 1; let slots = 10;
                                return orders.filter(o=>o.product===prod).map(o => {
                                  let rows = []; let q = o.qty;
                                  while(q>0) {
                                    if(slots===0) { box++; slots=10; }
                                    let alloc = Math.min(q, slots); slots -= alloc;
                                    rows.push(<tr key={`${o.id}-${box}`}><td>{prod}</td><td className="text-center font-bold text-pink-600">Box {box}</td><td><strong>{o.name}</strong><br/><span className="text-[10px]">{o.email}</span></td><td className="text-center font-black text-lg">{alloc}</td></tr>);
                                    q -= alloc;
                                  } return rows;
                                });
                              })}
                           </tbody>
                        </table>
                     </div>
                   </div>
                 )}

                 {adminTab === 'trimming' && (
                   <div className="space-y-6">
                     <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Loose Vial Hit List</h2></div>
                     {trimmingHitList.length === 0 ? (
                       <div className="bg-emerald-50 p-12 rounded-[24px] text-center font-bold text-emerald-600 border-2 border-emerald-100 uppercase tracking-widest text-xs">✅ All boxes are perfectly full (10/10)</div>
                     ) : (
                        <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                          <table className="w-full text-left custom-table">
                            <thead><tr style={{background: '#FEF2F2'}}><th style={{color: '#D32F2F'}}>⚠️ Product</th><th style={{color: '#D32F2F'}}>Status</th><th style={{color: '#D32F2F'}}>Target Customer</th><th className="text-center" style={{color: '#D32F2F'}}>Action</th></tr></thead>
                            <tbody className="divide-y divide-pink-50">
                               {trimmingHitList.map((v, i) => (
                                 <tr key={v.id}>
                                   <td className="font-bold">{v.prod}</td>
                                   <td className="text-[10px] font-black text-rose-500 uppercase">Box {v.boxNum} needs {v.missingSlots} more</td>
                                   <td><p className="font-bold">{v.name}</p><p className="text-[10px] text-slate-400">{v.email}</p></td>
                                   <td className="text-center"><button onClick={() => executeTrim(v)} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">Cut {v.amountToRemove} Vials</button></td>
                                 </tr>
                               ))}
                            </tbody>
                          </table>
                        </div>
                     )}
                   </div>
                 )}

                 {adminTab === 'customers' && (
                   <div className="space-y-6">
                     <div className="flex justify-between items-center"><h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Customer Database</h2><input type="text" value={adminUserSearch} onChange={e => setAdminUserSearch(e.target.value)} placeholder="Search..." className="bg-white border-2 border-pink-100 rounded-full px-4 py-2 text-xs font-bold w-48 outline-none focus:border-pink-500 transition-all" /></div>
                     <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                       <table className="w-full text-left custom-table">
                         <thead><tr><th>Customer Info</th><th>Address</th><th>Reserved</th><th className="text-center">Del</th></tr></thead>
                         <tbody className="divide-y divide-pink-50">
                            {filteredUsers.map(u => {
                              const userQty = orders.filter(o => o.email === u.id).reduce((s,o)=>s+o.qty,0);
                              return (
                                <tr key={u.id}>
                                  <td><strong>{u.name}</strong><br/><span className="text-[10px] text-slate-400">{u.id}</span></td>
                                  <td className="text-[10px] text-slate-500">{u.address?.street ? `${u.address.street}, ${u.address.city} (${u.address.shipOpt})` : <span className="italic opacity-40">No address on file</span>}</td>
                                  <td className="font-black text-pink-600">{userQty} Vials</td>
                                  <td className="text-center"><button onClick={() => safeAwait(deleteDoc(doc(db, colPath('users'), u.id)))} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button></td>
                                </tr>
                              )
                            })}
                         </tbody>
                       </table>
                     </div>
                   </div>
                 )}

                 {adminTab === 'settings' && (
                   <div className="space-y-8 pb-20">
                     <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Core System Settings</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="bg-white p-8 rounded-[32px] shadow-sm border-2 border-pink-50 space-y-6">
                           <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">Global Constants</h3>
                           <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Exchange Rate (1$ = ?)</label><input type="number" className={originalInput} value={settings.fxRate} onChange={e=>updateSetting('fxRate', Number(e.target.value))}/></div>
                           <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Admin Fee (PHP)</label><input type="number" className={originalInput} value={settings.adminFeePhp} onChange={e=>updateSetting('adminFeePhp', Number(e.target.value))}/></div>
                           <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Minimum Vials Per Order</label><input type="number" className={originalInput} value={settings.minOrder} onChange={e=>updateSetting('minOrder', Number(e.target.value))}/></div>
                           <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Dashboard Password</label><input type="text" className={originalInput} value={settings.adminPass} onChange={e=>updateSetting('adminPass', e.target.value)}/></div>
                        </section>
                        
                        <section className="bg-white p-8 rounded-[32px] shadow-sm border-2 border-pink-50 space-y-4">
                           <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">Mode Toggles & Actions</h3>
                           <button onClick={()=>updateSetting('paymentsOpen', !settings.paymentsOpen)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest border-2 ${settings.paymentsOpen ? 'bg-rose-50 border-rose-600 text-rose-600' : 'bg-emerald-50 border-emerald-600 text-emerald-600'}`}>
                              {settings.paymentsOpen ? '🔒 Close Payments' : '🟢 Open Payments'}
                           </button>
                           <button onClick={()=>updateSetting('addOnly', !settings.addOnly)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest border-2 ${settings.addOnly ? 'bg-amber-50 border-amber-600 text-amber-600' : 'bg-slate-50 border-slate-600 text-slate-600'}`}>
                              {settings.addOnly ? '⚠️ Disable Add-Only' : '⏳ Enable Add-Only'}
                           </button>
                           <div className="grid grid-cols-2 gap-4 mt-2">
                             <button onClick={runCutoff} className="py-4 rounded-2xl bg-pink-100 text-pink-600 font-black uppercase text-[10px] tracking-widest border border-pink-200 hover:bg-pink-200 transition-colors">🛑 Run Cutoff</button>
                             <button onClick={resetSystem} disabled={isBtnLoading} className="py-4 rounded-2xl bg-rose-100 text-rose-600 font-black uppercase text-[10px] tracking-widest border border-rose-200 hover:bg-rose-200 transition-colors disabled:opacity-50">🚨 Reset System</button>
                           </div>
                        </section>

                        <section className="bg-white p-8 rounded-[32px] shadow-sm border-2 border-pink-50 space-y-4 md:col-span-2 xl:col-span-1">
                           <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">Assigned Admins & Banks</h3>
                           <div className="bg-[#FFF0F5] border-2 border-[#FFC0CB] rounded-xl p-4 h-[250px] overflow-y-auto mb-4 space-y-4">
                             {settings.admins.map((a, idx) => (
                               <div key={idx} className="flex justify-between items-start border-b border-pink-100 pb-3">
                                 <div className="w-full pr-4">
                                   <strong className="text-[#4A042A] text-sm">{a.name}</strong>
                                   <div className="grid grid-cols-2 gap-2 mt-2">
                                     <div>
                                       <span className="text-[9px] font-black text-pink-400 uppercase">Option 1</span>
                                       <div className="text-[10px] text-gray-600 break-words">{a.qr1 ? <span className="text-emerald-600 font-bold">✓ QR Uploaded</span> : a.bank1 || "None"}</div>
                                     </div>
                                     <div>
                                       <span className="text-[9px] font-black text-pink-400 uppercase">Option 2</span>
                                       <div className="text-[10px] text-gray-600 break-words">{a.qr2 ? <span className="text-emerald-600 font-bold">✓ QR Uploaded</span> : a.bank2 || "None"}</div>
                                     </div>
                                   </div>
                                 </div>
                                 <button onClick={() => {
                                   const newArr = [...settings.admins]; newArr.splice(idx, 1); updateSetting('admins', newArr);
                                 }} className="text-rose-500 font-bold hover:text-rose-700 bg-white border border-rose-100 rounded-lg p-2">❌</button>
                               </div>
                             ))}
                           </div>
                           <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Add New Admin</h4>
                             <input type="text" className={adminInputSm} placeholder="Admin Name (e.g. Admin Jane)" value={newAdmin.name} onChange={e=>setNewAdmin({...newAdmin, name: e.target.value})}/>
                             
                             <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
                               <div>
                                 <p className="text-[9px] font-bold text-slate-400 mb-1">Payment Option 1</p>
                                 <input type="text" className={`${adminInputSm} mb-2`} placeholder="Bank Details (e.g. BDO: 123...)" value={newAdmin.bank1} onChange={e=>setNewAdmin({...newAdmin, bank1: e.target.value})}/>
                                 <input type="text" className={adminInputSm} placeholder="Image URL (For QR Code)" value={newAdmin.qr1} onChange={e=>setNewAdmin({...newAdmin, qr1: e.target.value})}/>
                               </div>
                               <div>
                                 <p className="text-[9px] font-bold text-slate-400 mb-1">Payment Option 2</p>
                                 <input type="text" className={`${adminInputSm} mb-2`} placeholder="Bank Details (e.g. GCash: 09...)" value={newAdmin.bank2} onChange={e=>setNewAdmin({...newAdmin, bank2: e.target.value})}/>
                                 <input type="text" className={adminInputSm} placeholder="Image URL (For QR Code)" value={newAdmin.qr2} onChange={e=>setNewAdmin({...newAdmin, qr2: e.target.value})}/>
                               </div>
                             </div>
                             
                             <button onClick={handleAddAdmin} className="bg-[#FF1493] text-white font-black uppercase tracking-widest py-3 rounded-xl text-xs hover:bg-[#D6006E] transition-colors shadow-md mt-2">➕ Save Admin</button>
                           </div>
                        </section>

                        <section className="bg-white p-8 rounded-[32px] shadow-sm border-2 border-pink-50 space-y-4 md:col-span-2 xl:col-span-1">
                           <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">System Utilities</h3>
                           <div className="space-y-4">
                             <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Proofs Folder Name (Placeholder)</label><input type="text" className={originalInput} value={settings.proofFolder || ''} onChange={e=>updateSetting('proofFolder', e.target.value)} /></div>
                             <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Labels Folder Name (Placeholder)</label><input type="text" className={originalInput} value={settings.labelsFolder || ''} onChange={e=>updateSetting('labelsFolder', e.target.value)} /></div>
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
                               <button onClick={seedDemoData} disabled={isBtnLoading} className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black uppercase text-xs tracking-widest shadow-lg hover:scale-[0.98] transition-transform disabled:opacity-50">
                                 {isBtnLoading ? "Seeding... ⏳" : "🚀 Seed Full Product List & Mock Orders"}
                               </button>
                               <p className="text-[10px] text-center text-slate-400 mt-2 font-bold">Injects 100+ products and ~100 mock orders to test math.</p>
                             </div>
                           </div>
                        </section>

                        <section className="bg-white p-8 rounded-[32px] shadow-sm border-2 border-pink-50 space-y-4 md:col-span-2">
                           <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">Manage Products</h3>
                           
                           <div className="overflow-x-auto border-2 border-pink-100 rounded-xl mb-4 max-h-[300px] overflow-y-auto">
                            <table className="w-full text-sm text-left custom-table">
                              <thead className="sticky top-0 shadow-sm bg-[#FFF0F5]">
                                <tr><th>Name</th><th>Price (Vial)</th><th>Max Boxes</th><th>Status</th><th>Actions</th></tr>
                              </thead>
                              <tbody className="bg-white">
                                {products.map(p => (
                                  <tr key={p.id} className="border-b border-gray-100">
                                    <td className="font-bold text-[#4A042A]">{p.name}</td>
                                    <td className="text-[#D6006E] font-bold">${p.pricePerVialUSD.toFixed(2)}</td>
                                    <td>
                                      <input type="number" className="w-16 border-2 border-[#FFC0CB] rounded-lg p-1 text-center text-xs font-bold text-[#D6006E] outline-none" value={p.maxBoxes} onChange={e => safeAwait(setDoc(doc(db, colPath('products'), p.id), { maxBoxes: Number(e.target.value)||0 }, { merge: true }))}/>
                                    </td>
                                    <td>
                                      <button onClick={()=>safeAwait(setDoc(doc(db, colPath('products'), p.id), { locked: !p.locked }, { merge: true }))} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all ${p.locked ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                        {p.locked ? 'LOCKED' : 'OPEN'}
                                      </button>
                                    </td>
                                    <td>
                                      <button onClick={()=>safeAwait(deleteDoc(doc(db, colPath('products'), p.id)))} className="text-rose-500 font-bold hover:text-rose-700 text-xs uppercase tracking-widest">Remove</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          <div className="mt-6 pt-6 border-t-2 border-pink-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <h4 className="text-sm font-black text-[#D6006E] mb-1">Bulk Upload via CSV</h4>
                              <p className="text-xs font-bold text-gray-500">Columns must match the template.<br/>⚠️ <span className="text-rose-500">Uploading replaces your current catalog!</span></p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={downloadCSVTemplate} className="bg-white border-2 border-[#FFC0CB] text-[#D6006E] px-4 py-2 rounded-xl font-bold hover:bg-[#FFF0F5] transition-colors text-xs whitespace-nowrap">
                                📥 Get Template
                              </button>
                              <label className={`bg-[#D6006E] text-white px-4 py-2 rounded-xl font-bold cursor-pointer hover:bg-pink-700 transition-colors text-xs whitespace-nowrap shadow-md ${isBtnLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                                {isBtnLoading ? '⏳ Uploading...' : '📂 Upload CSV'}
                                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={isBtnLoading} />
                              </label>
                            </div>
                          </div>

                        </section>

                     </div>
                   </div>
                 )}
               </div>
            </main>
          </div>
        )
      )}
    </>
  );
}