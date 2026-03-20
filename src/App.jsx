import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { 
  ShieldCheck, Store, Settings, Info, LayoutDashboard, 
  BadgeDollarSign, Scissors, ClipboardList, Users, 
  Lock, ArrowRight, LogOut, Package, Search, 
  ChevronRight, CreditCard, Home, Trash2
} from 'lucide-react';

// 🔥 YOUR REAL FIREBASE CONFIG 🔥
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
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const basePath = isCanvas ? `artifacts/${appId}/public/data` : `data`;

const SLOTS_PER_BATCH = 10;

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('shop'); 
  const [adminTab, setAdminTab] = useState('overview'); 
  const [toast, setToast] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [isBtnLoading, setIsBtnLoading] = useState(false);
  
  // Auth State for Admin
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
    shippingOptions: ["Lalamove", "LBC", "J&T", "Pickup"],
    adminPass: 'admin123',
    admins: [
      { name: "Admin Jane", bank1: "BDO: 00123456789", bank2: "GCash: 09171234567" },
      { name: "Admin John", bank1: "BPI: 98765432100", bank2: "Maya: 09189876543" }
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
    const unsubSettings = onSnapshot(collection(db, `${basePath}/settings`), (snap) => { snap.forEach(d => { if (d.id === 'main') setSettings(d.data()); }); });
    const unsubProducts = onSnapshot(collection(db, `${basePath}/products`), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setProducts(arr); });
    const unsubOrders = onSnapshot(collection(db, `${basePath}/orders`), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setOrders(arr); });
    const unsubUsers = onSnapshot(collection(db, `${basePath}/users`), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setUsers(arr); });
    const unsubHistory = onSnapshot(collection(db, `${basePath}/history`), (snap) => { const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setHistory(arr); });
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
    const productStats = {}; 
    const customerTotals = {};
    orders.forEach(o => {
      if(!productStats[o.product]) productStats[o.product] = 0;
      productStats[o.product] += o.qty;
      const key = `${o.email}||${o.product}`;
      if(!customerTotals[key]) customerTotals[key] = 0;
      customerTotals[key] += o.qty;
    });
    
    const toTrim = {}; 
    const openBoxNumbers = {};
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
    const profile = users.find(u => u.id === customerEmail.toLowerCase().trim());
    if (profile) {
      setCustomerName(profile.name || '');
      setCustomerHandle(profile.handle || '');
      if (profile.address) setAddressForm(profile.address);
      showToast(`Welcome back, ${profile.name}! 💖`);
      if (settings.addOnly && !settings.paymentsOpen) setAction('add');
    }
  };

  const handleActionChange = (newAction) => {
    setAction(newAction);
    if (newAction === 'replace') {
      const userOrders = orders.filter(o => o.email === customerEmail.toLowerCase().trim());
      const prefill = {};
      userOrders.forEach(o => {
        prefill[o.product] = { k: Math.floor(o.qty / 10), v: o.qty % 10 };
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
    setCartItems(prev => ({ ...prev, [prodName]: { ...prev[prodName], [field]: num } }));
  };

  const submitOrder = async () => {
    if (!customerEmail || !customerName || !action) { showToast("Please fill all fields! 🌸"); return; }
    const emailLower = customerEmail.toLowerCase().trim();
    setIsBtnLoading(true);
    try {
      if (action === 'cancel') {
         const toDelete = orders.filter(o => o.email === emailLower);
         for (const o of toDelete) await deleteDoc(doc(db, `${basePath}/orders`, o.id));
         showToast("Order Cancelled.");
         setCartItems({}); setIsBtnLoading(false); return;
      }
      const errors = []; const newOrderItems = []; const timestamp = Date.now();
      Object.entries(cartItems).forEach(([prodName, amounts]) => {
        const qty = ((amounts.k || 0) * 10) + (amounts.v || 0);
        if (qty <= 0) return;
        const pData = enrichedProducts.find(p => p.name === prodName);
        if (pData?.isClosed) return;
        if (!settings.addOnly && qty < settings.minOrder) errors.push(`${prodName}: min ${settings.minOrder}`);
        newOrderItems.push({ email: emailLower, name: customerName, handle: customerHandle, product: prodName, qty, timestamp });
      });
      if (errors.length > 0) { showToast(errors.join(' | ')); setIsBtnLoading(false); return; }
      if (action === 'replace') {
        const toDelete = orders.filter(o => o.email === emailLower);
        for (const o of toDelete) await deleteDoc(doc(db, `${basePath}/orders`, o.id));
      }
      for (const item of newOrderItems) await addDoc(collection(db, `${basePath}/orders`), item);
      let assignedAdmin = users.find(u => u.id === emailLower)?.adminAssigned || settings.admins[Math.floor(Math.random() * settings.admins.length)]?.name || "Admin";
      await setDoc(doc(db, `${basePath}/users`, emailLower), { name: customerName, handle: customerHandle, adminAssigned: assignedAdmin }, { merge: true });
      showToast("Order Submitted! 🎉");
      setCartItems({}); if (action === 'replace') setAction('');
    } catch (err) { console.error(err); showToast("Error saving order."); }
    setIsBtnLoading(false);
  };

  const submitPayment = async () => {
    if (!addressForm.shipOpt || !addressForm.street || !addressForm.city || !addressForm.contact) { showToast("Missing fields! 🏠"); return; }
    const emailLower = customerEmail.toLowerCase().trim();
    await setDoc(doc(db, `${basePath}/users`, emailLower), { address: addressForm, isPaid: true, proofUrl: 'mock_receipt.jpg' }, { merge: true });
    showToast("Payment submitted! ✅");
    setShowPayModal(false);
  };

  const updateSetting = async (field, val) => {
    const newSettings = { ...settings, [field]: val };
    setSettings(newSettings);
    await setDoc(doc(db, `${basePath}/settings`, 'main'), newSettings);
  };

  const executeTrim = async (victim) => {
    if (victim.qty === victim.amountToRemove) {
      await deleteDoc(doc(db, `${basePath}/orders`, victim.id));
    } else {
      await setDoc(doc(db, `${basePath}/orders`, victim.id), { qty: victim.qty - victim.amountToRemove }, { merge: true });
    }
    showToast(`Trimmed ${victim.amountToRemove} vials.`);
  };

  const seedDemoData = async () => {
    setIsBtnLoading(true);
    await setDoc(doc(db, `${basePath}/settings`, 'main'), settings);
    
    // 🔥 YOUR FULL PRODUCT LIST 🔥
    const fullProductList = [
      { name: "5-amino-1mq 5mg", kit: 60, vial: 6.00 },
      { name: "5-amino-1mq 50mg", kit: 80, vial: 8.00 },
      { name: "AA Water 10 ml", kit: 10, vial: 1.00 },
      { name: "AA Water 3 ml", kit: 8, vial: 0.80 },
      { name: "AHKCU 100mg", kit: 65, vial: 6.50 },
      { name: "AICAR", kit: 60, vial: 6.00 },
      { name: "AOD 9604", kit: 95, vial: 9.50 },
      { name: "ARA290 10mg", kit: 70, vial: 7.00 },
      { name: "Bacteriostatic Water 10ml", kit: 14, vial: 1.40 },
      { name: "Bacteriostatic Water 3ml", kit: 5, vial: 0.50 },
      { name: "Bacteriostatic Water 5ml", kit: 9, vial: 0.90 },
      { name: "BPC157 5mg", kit: 40, vial: 4.00 },
      { name: "BPC157 10mg", kit: 70, vial: 7.00 },
      { name: "Cagri-Sema 10g", kit: 190, vial: 19.00 },
      { name: "Cagri-Sema 5g", kit: 100, vial: 10.00 },
      { name: "Cagrilintide 10mg", kit: 150, vial: 15.00 },
      { name: "Cagrilintide 5mg", kit: 90, vial: 9.00 },
      { name: "Cerebrolysin 60mg", kit: 50, vial: 8.40 },
      { name: "CJC No DAC 5mg + IPA 5mg blend", kit: 85, vial: 8.50 },
      { name: "CJC-1295 with DAC 5 mg", kit: 130, vial: 13.00 },
      { name: "CJC-1295 No DAC 5mg", kit: 68, vial: 6.80 },
      { name: "CJC-1295 No DAC 10mg", kit: 130, vial: 13.00 },
      { name: "DSIP 5mg", kit: 32, vial: 3.20 },
      { name: "Epithalon 10mg", kit: 45, vial: 4.50 },
      { name: "Epithalon 50mg", kit: 120, vial: 12.00 },
      { name: "GHKCU Powder 1 gram", kit: 60, vial: 6.00 },
      { name: "GHK-Cu 100mg", kit: 48, vial: 4.80 },
      { name: "GHK-Cu 50mg", kit: 24, vial: 2.40 },
      { name: "GHRP-2 Acetate 5mg", kit: 20, vial: 2.00 },
      { name: "GHRP-2 Acetate 10mg", kit: 40, vial: 4.00 },
      { name: "GKP70", kit: 140, vial: 14.00 },
      { name: "GLOW 50mg", kit: 160, vial: 16.00 },
      { name: "GLOW 70mg", kit: 180, vial: 18.00 },
      { name: "Glutathione 1500mg", kit: 85, vial: 8.50 },
      { name: "HHB", kit: 210, vial: 21.00 },
      { name: "HCG 10000IU", kit: 120, vial: 12.00 },
      { name: "HCG 5000IU", kit: 60, vial: 6.00 },
      { name: "HGH 191AA (Somatropin) 10 iu", kit: 50, vial: 5.00 },
      { name: "HGH 191AA (Somatropin) 15 iu", kit: 70, vial: 7.00 },
      { name: "IGF-1LR3", kit: 190, vial: 19.00 },
      { name: "Ipamorelin 5mg", kit: 30, vial: 3.00 },
      { name: "Ipamorelin 10mg", kit: 50, vial: 5.00 },
      { name: "KissPeptin-10 5mg", kit: 48, vial: 4.80 },
      { name: "KissPeptin-10 10mg", kit: 90, vial: 9.00 },
      { name: "KLOW BPC 10mg + Tb500 10mg + GHK-Cu 50mg + KPV 10mg", kit: 220, vial: 22.00 },
      { name: "KPV 5mg", kit: 35, vial: 3.50 },
      { name: "KPV 10mg", kit: 55, vial: 5.50 },
      { name: "L-carnatine 500mg/vial", kit: 80, vial: 8.00 },
      { name: "Lemon Bottle 10ml", kit: 70, vial: 7.00 },
      { name: "Lipo-C 120mg", kit: 70, vial: 7.00 },
      { name: "Lipo-C 216mg", kit: 90, vial: 9.00 },
      { name: "Lipo-C Fat Blaster", kit: 110, vial: 11.00 },
      { name: "MOTS-c 10mg", kit: 50, vial: 5.00 },
      { name: "MOTS-c 40mg", kit: 190, vial: 19.00 },
      { name: "NAD+ 100mg", kit: 50, vial: 5.00 },
      { name: "NAD+ 500mg", kit: 70, vial: 7.00 },
      { name: "Oxytocin Acetate 2mg", kit: 24, vial: 2.40 },
      { name: "Pharma Bac", kit: 8.50, vial: 0.85 },
      { name: "Pinealon 10 mg", kit: 64, vial: 6.40 },
      { name: "Pinealon 20 mg", kit: 95, vial: 9.50 },
      { name: "Pinealon 5 mg", kit: 40, vial: 4.00 },
      { name: "PT-141 10 mg", kit: 62, vial: 6.20 },
      { name: "Retatrutide 5mg", kit: 68, vial: 6.80 },
      { name: "Retatrutide 10mg", kit: 100, vial: 10.00 },
      { name: "Retatrutide 15mg", kit: 140, vial: 14.00 },
      { name: "Retatrutide 20mg", kit: 170, vial: 17.00 },
      { name: "Retatrutide 24mg", kit: 190, vial: 19.00 },
      { name: "Retatrutide 30mg", kit: 245, vial: 24.50 },
      { name: "Retatrutide 36mg", kit: 260, vial: 26.00 },
      { name: "Retatrutide 40mg", kit: 330, vial: 33.00 },
      { name: "Retatrutide 50mg", kit: 375, vial: 37.50 },
      { name: "Retatrutide 60mg", kit: 390, vial: 39.00 },
      { name: "Selank 5mg", kit: 40, vial: 4.00 },
      { name: "Selank 11mg", kit: 75, vial: 7.50 },
      { name: "Semaglutide 5mg", kit: 38, vial: 3.80 },
      { name: "Semaglutide 10mg", kit: 52, vial: 5.20 },
      { name: "Semaglutide 15mg", kit: 68, vial: 6.80 },
      { name: "Semaglutide 20mg", kit: 90, vial: 9.00 },
      { name: "Semaglutide 30mg", kit: 116, vial: 11.60 },
      { name: "Semax 5mg", kit: 35, vial: 3.50 },
      { name: "Semax 11mg", kit: 53, vial: 5.30 },
      { name: "Sermorelin Acetate 5mg", kit: 50, vial: 5.00 },
      { name: "SLU-PP-332", kit: 140, vial: 14.00 },
      { name: "Snap-8 10mg", kit: 45, vial: 4.50 },
      { name: "SS-31 10mg", kit: 70, vial: 7.00 },
      { name: "SS-31 50mg", kit: 340, vial: 34.00 },
      { name: "TB10mg+BPC10mg blend", kit: 160, vial: 16.00 },
      { name: "TB500 10mg", kit: 130, vial: 13.00 },
      { name: "TB500 5mg", kit: 65, vial: 6.50 },
      { name: "TB5mg+BPC 5mg blend", kit: 80, vial: 8.00 },
      { name: "Tesamorelin 5mg", kit: 90, vial: 9.00 },
      { name: "Tesamorelin 10mg", kit: 170, vial: 17.00 },
      { name: "Tesamorelin 15mg", kit: 230, vial: 23.00 },
      { name: "Thymalin 10mg", kit: 48, vial: 4.80 },
      { name: "Thymosin Alpha-1 5mg", kit: 78, vial: 7.80 },
      { name: "Thymosin Alpha-1 10mg", kit: 155, vial: 15.50 },
      { name: "Tirzepatide 5mg", kit: 40, vial: 4.00 },
      { name: "Tirzepatide 10mg", kit: 62, vial: 6.20 },
      { name: "Tirzepatide 15mg", kit: 75, vial: 7.50 },
      { name: "Tirzepatide 20mg", kit: 90, vial: 9.00 },
      { name: "Tirzepatide 30mg", kit: 115, vial: 11.50 },
      { name: "Tirzepatide 40mg", kit: 145, vial: 14.50 },
      { name: "Tirzepatide 45mg", kit: 160, vial: 16.00 },
      { name: "Tirzepatide 50mg", kit: 170, vial: 17.00 },
      { name: "Tirzepatide 60mg", kit: 200, vial: 20.00 },
      { name: "VP 5mg", kit: 80, vial: 8.00 },
      { name: "VP 10mg", kit: 150, vial: 15.00 }
    ];

    // Clear existing and upload new
    for (const p of products) {
      await deleteDoc(doc(db, `${basePath}/products`, p.id));
    }

    for (const item of fullProductList) {
      await addDoc(collection(db, `${basePath}/products`), {
        name: item.name,
        pricePerKitUSD: item.kit,
        pricePerVialUSD: item.vial,
        locked: false,
        maxBoxes: 0
      });
    }

    setIsBtnLoading(false);
    showToast("Success! All products imported. 🎉");
  };

  // --- STYLES ---
  const originalInput = "w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-2xl px-4 py-3 outline-none focus:border-[#D6006E] font-bold text-[#4A042A]";
  const originalBtn = "bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white font-bold px-6 py-4 rounded-full shadow-[0_4px_10px_rgba(255,20,147,0.3)] uppercase tracking-wider disabled:opacity-50 hover:scale-[0.98] transition-all";

  // --- RENDER SHOP ---
  if (view === 'shop') {
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

    return (
      <div className="min-h-screen text-[#4A042A] font-sans pb-24 lg:pb-8 selection:bg-pink-300" style={{ background: 'linear-gradient(135deg, #FFC3EB 0%, #FF8EBD 100%)', backgroundAttachment: 'fixed' }}>
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
          body { font-family: 'Quicksand', sans-serif; }
          .brand-title { font-family: 'Pacifico', cursive; transform: rotate(-2deg); text-shadow: 2px 2px 0px rgba(0,0,0,0.1); }
          .glass-card { background: white; border: 2px solid #FF1493; border-radius: 1.5rem; }
        `}} />

        <div className="max-w-6xl mx-auto p-4 pt-6">
          <h1 className="brand-title text-3xl sm:text-5xl text-center text-white mb-2 flex items-center justify-center gap-3">
            ✨ Bonded <span className="text-sm font-sans font-black uppercase tracking-widest text-white/80 transform translate-y-2">by</span> Peptides ✨
          </h1>
          <div className="text-center mb-8">
            <span className="bg-white text-[#D6006E] px-4 py-1.5 rounded-full font-black text-xs uppercase tracking-wider border-2 border-[#FF69B4] shadow-sm inline-block">
              {settings.batchName}
            </span>
          </div>

          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-4">
              <div className="glass-card p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">💌 Email Address</label>
                    <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} onBlur={handleLookup} className={originalInput} placeholder="Enter email to lookup profile..."/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">🌸 Name</label>
                    <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className={originalInput} placeholder="Full name"/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">💬 Handle</label>
                    <input type="text" value={customerHandle} onChange={e => setCustomerHandle(e.target.value)} className={originalInput} placeholder="@username"/>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-black text-[#D6006E] uppercase ml-2 mb-1">⚡ Action</label>
                    <select value={action} onChange={e => handleActionChange(e.target.value)} className={originalInput}>
                      <option value="" disabled selected>Choose an action...</option>
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
                {filteredProducts.map(p => {
                   const cart = cartItems[p.name] || { k:0, v:0 };
                   const active = cart.k > 0 || cart.v > 0;
                   const exist = existingMap[p.name] || 0;
                   return (
                    <div key={p.id} className={`p-4 border-b border-[#FFE4E1] flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-colors ${active ? 'bg-[#FFF0F5]' : 'bg-white'}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-base">{p.name}</h3>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${p.statusKey === 'available' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>{p.statusText}</span>
                        </div>
                        <div className="flex gap-2 text-xs font-bold text-[#9E2A5E]">
                          <span className="bg-[#FF69B4] text-white px-2 py-0.5 rounded-full">${p.pricePerVialUSD.toFixed(2)} / vial</span>
                          {exist > 0 && <span className="bg-[#9C27B0] text-white px-2 py-0.5 rounded-full">📦 Has {exist}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="bg-white border-2 border-[#FFC0CB] rounded-xl p-1 text-center w-24">
                          <span className="block text-[8px] font-black uppercase text-pink-400">Kits (10x)</span>
                          <input type="number" min="0" value={cart.k || ''} onChange={e=>handleCartChange(p.name, 'k', e.target.value)} className="w-full text-center font-bold text-lg text-pink-600 outline-none bg-transparent" placeholder="0" disabled={p.isClosed}/>
                        </div>
                        <div className="bg-white border-2 border-[#FFC0CB] rounded-xl p-1 text-center w-24">
                          <span className="block text-[8px] font-black uppercase text-pink-400">Vials (1x)</span>
                          <input type="number" min="0" max="9" value={cart.v || ''} onChange={e=>handleCartChange(p.name, 'v', e.target.value)} className="w-full text-center font-bold text-lg text-pink-600 outline-none bg-transparent" placeholder="0" disabled={p.isClosed}/>
                        </div>
                      </div>
                    </div>
                   );
                })}
              </div>
            </div>

            <aside className="hidden lg:block sticky top-6">
              <div className="glass-card p-6 shadow-xl">
                <h3 className="brand-title text-2xl text-[#D6006E] border-b-2 border-pink-100 pb-2 mb-4 text-center">Your Cart 🛍️</h3>
                <div className="max-h-[350px] overflow-y-auto mb-4 space-y-2">
                  {cartList.length === 0 ? <div className="text-center text-pink-300 font-bold italic py-8">No items selected yet!</div> : cartList.map((i, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-pink-50 border-dashed pb-2">
                      <div className="font-bold">{i.product}</div>
                      <div className="text-right">
                        <span className="text-[#D6006E] font-black">x{i.qty}</span>
                        <span className="text-gray-400 ml-2 font-bold">${i.total.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t-2 border-pink-100 space-y-1">
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Subtotal</span><span>${subtotalUSD.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Admin Fee</span><span>₱{settings.adminFeePhp}</span></div>
                  <div className="flex flex-col items-end pt-2">
                    <span className="text-3xl font-black text-[#D6006E]">₱{totalPHP.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={submitOrder} disabled={isBtnLoading || (cartList.length === 0 && action !== 'cancel')} className={originalBtn + " w-full mt-6"}>
                  {isBtnLoading ? "Saving... ⏳" : action === 'cancel' ? "Confirm Cancel" : "Submit Order 💖"}
                </button>
                {settings.paymentsOpen && cartList.length > 0 && (
                   <button onClick={()=>setShowPayModal(true)} className="w-full mt-2 bg-[#008040] text-white font-bold py-4 rounded-full uppercase tracking-widest text-sm shadow-md">Pay Now 💸</button>
                )}
              </div>
            </aside>
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#FF1493] p-4 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center">
          <div>
            <div className="text-[10px] font-black text-[#D6006E] uppercase">Total Estimate</div>
            <div className="text-2xl font-black text-[#D6006E]">₱{totalPHP.toLocaleString()}</div>
          </div>
          <button onClick={submitOrder} disabled={cartList.length === 0 && action !== 'cancel'} className="bg-[#D6006E] text-white px-6 py-3 rounded-full font-black uppercase text-sm shadow-md">
            {action === 'cancel' ? 'Cancel' : 'Submit 💖'}
          </button>
        </div>

        {/* Access Admin */}
        <button onClick={()=>setView('admin')} className="fixed bottom-24 lg:bottom-6 right-4 bg-[#4A042A] text-white px-5 py-3 rounded-full font-bold text-xs uppercase tracking-widest shadow-xl z-[40] flex items-center gap-2">
           <Lock size={14}/> Admin Access
        </button>

        {/* Pay Modal */}
        {showPayModal && (
          <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
             <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
                <div className="bg-[#FFF0F5] p-5 flex justify-between items-center border-b-2 border-[#FFC0CB]">
                   <h2 className="brand-title text-2xl text-pink-600">Checkout 💸</h2>
                   <button onClick={()=>setShowPayModal(false)} className="text-pink-600 font-black text-2xl">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                   <div className="bg-[#E6F6EC] p-4 rounded-2xl border-2 border-[#bbf7d0]">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Send Payment To</p>
                      <p className="font-bold text-emerald-900">{customerList.find(c => c.email === customerEmail.toLowerCase().trim())?.adminAssigned || "Admin"}</p>
                      <pre className="font-mono text-xs text-emerald-700 whitespace-pre-wrap">{settings.admins[0]?.bank1 || "Bank details incoming..."}</pre>
                   </div>
                   <div className="space-y-3">
                      <select value={addressForm.shipOpt} onChange={e=>setAddressForm({...addressForm, shipOpt:e.target.value})} className={originalInput}>
                        <option value="" disabled selected>Select Courier...</option>
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
                      <span className="text-2xl font-black text-pink-600">₱{totalPHP.toLocaleString()}</span>
                   </div>
                   <button onClick={submitPayment} className={originalBtn + " w-full"}>Upload Proof & Complete ✅</button>
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
    );
  }

  // --- RENDER ADMIN ---
  if (view === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#FFF0F5] flex items-center justify-center p-4">
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
      );
    }

    return (
      <div className="min-h-screen flex bg-slate-50 font-sans">
        <style dangerouslySetInnerHTML={{__html: `
          .admin-sidebar { width: 280px; background: #4A042A; }
          .nav-item.active { background: white; color: #D6006E; border-radius: 1rem 0 0 1rem; margin-right: -1.5rem; padding-right: 1.5rem; }
          .custom-table th { background: #FFF0F5; color: #D6006E; font-weight: 800; font-size: 10px; text-transform: uppercase; padding: 1rem; border-bottom: 2px solid #FFC0CB; }
          .custom-table td { padding: 1rem; border-bottom: 1px solid #FFE4E1; font-weight: 600; font-size: 13px; }
        `}} />

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

           <div className="max-w-6xl mx-auto">
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
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Customer Payments Management</h2>
                  <div className="bg-white rounded-[24px] shadow-sm border-2 border-pink-50 overflow-hidden">
                    <table className="w-full text-left custom-table">
                       <thead><tr><th>Customer</th><th>Assigned Admin</th><th className="text-right">Total PHP</th><th className="text-center">Status</th></tr></thead>
                       <tbody className="divide-y divide-pink-50">
                          {customerList.map(c => (
                            <tr key={c.email}>
                              <td><p className="font-bold text-slate-900">{c.name}</p><p className="text-[10px] text-slate-400">{c.email}</p></td>
                              <td><span className="bg-[#FFF0F5] px-2 py-1 rounded text-[10px] font-black text-pink-600">{c.adminAssigned}</span></td>
                              <td className="text-right font-black text-pink-600">₱{c.totalPHP.toLocaleString()}</td>
                              <td className="text-center">
                                 <button onClick={() => setDoc(doc(db, `${basePath}/users`, c.email), { isPaid: !c.isPaid }, { merge: true })} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${c.isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'}`}>
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
                           {trimmingHitList.map(v => (
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
                              <td className="text-center"><button onClick={() => deleteDoc(doc(db, `${basePath}/users`, u.id))} className="text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button></td>
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
                       <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Dashboard Password</label><input type="text" className={originalInput} value={settings.adminPass} onChange={e=>updateSetting('adminPass', e.target.value)}/></div>
                    </section>
                    <section className="bg-white p-8 rounded-[32px] shadow-sm border-2 border-pink-50 space-y-4">
                       <h3 className="font-black text-xs text-pink-600 uppercase tracking-[0.2em] border-b-2 border-pink-50 pb-3">Mode Toggles</h3>
                       <button onClick={()=>updateSetting('paymentsOpen', !settings.paymentsOpen)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest border-2 ${settings.paymentsOpen ? 'bg-rose-50 border-rose-600 text-rose-600' : 'bg-emerald-50 border-emerald-600 text-emerald-600'}`}>
                          {settings.paymentsOpen ? '🔒 Close Payments' : '🟢 Open Payments'}
                       </button>
                       <button onClick={()=>updateSetting('addOnly', !settings.addOnly)} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest border-2 ${settings.addOnly ? 'bg-amber-50 border-amber-600 text-amber-600' : 'bg-slate-50 border-slate-600 text-slate-600'}`}>
                          {settings.addOnly ? '⚠️ Disable Add-Only' : '⏳ Enable Add-Only'}
                       </button>
                       <button onClick={seedDemoData} className="w-full py-4 rounded-2xl bg-pink-100 text-pink-600 font-black uppercase text-[10px] tracking-widest">
                         {isBtnLoading ? "Seeding... ⏳" : "Reset & Seed Full Product List"}
                       </button>
                    </section>
                 </div>
               </div>
             )}
           </div>
        </main>
      </div>
    );
  }

  return null; 
}