import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ShieldCheck, Store, Settings, Info, LayoutDashboard, BadgeDollarSign, Scissors, ClipboardList, Users } from 'lucide-react';

// 🔥 YOUR REAL FIREBASE CONFIG FOR BOLT.NEW 🔥
const userFirebaseConfig = {
  apiKey: "AIzaSyBtqinodXxcYU4U5F-LoImCOj681KlZ9w4",
  authDomain: "bonded-by-peptides.firebaseapp.com",
  projectId: "bonded-by-peptides",
  storageBucket: "bonded-by-peptides.firebasestorage.app",
  messagingSenderId: "840550043632",
  appId: "1:840550043632:web:d935ae58a19ed96893d735",
  measurementId: "G-6NMJD9WTS6"
};

// Auto-detect environment: Use Sandbox when previewing here, use Your DB when deployed
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

  // Admin New Product/Admin State
  const [newProd, setNewProd] = useState({ name: '', kit: '', vial: '', max: '' });
  const [newAdmin, setNewAdmin] = useState({ name: '', bank: '' });

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

  // --- DATA FETCHING (FIRESTORE) ---
  useEffect(() => {
    if (!user) return;

    const unsubSettings = onSnapshot(collection(db, `${basePath}/settings`), (snap) => {
      snap.forEach(d => { if (d.id === 'main') setSettings(d.data()); });
    });
    const unsubProducts = onSnapshot(collection(db, `${basePath}/products`), (snap) => {
      const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setProducts(arr);
    });
    const unsubOrders = onSnapshot(collection(db, `${basePath}/orders`), (snap) => {
      const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setOrders(arr);
    });
    const unsubUsers = onSnapshot(collection(db, `${basePath}/users`), (snap) => {
      const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setUsers(arr);
    });
    const unsubHistory = onSnapshot(collection(db, `${basePath}/history`), (snap) => {
      const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setHistory(arr);
    });

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
      else if (slotsLeft === 0) { statusKey = 'available'; statusText = '🟢 Next Batch Open'; }
      else { statusKey = 'available'; statusText = `🟢 ${slotsLeft} slots left`; }

      return { ...p, totalVials, boxes, slotsLeft, isClosed, statusKey, statusText, openBatchLabel: (!isClosed) ? `Box ${boxes + 1}` : '' };
    });
  }, [products, orders, settings.paymentsOpen]);

  const customerProfile = useMemo(() => {
    return users.find(u => u.id === customerEmail.toLowerCase().trim()) || null;
  }, [users, customerEmail]);

  const existingOrderData = useMemo(() => {
    const userOrders = orders.filter(o => o.email === customerEmail.toLowerCase().trim());
    const itemsMap = {};
    userOrders.forEach(o => {
      if (!itemsMap[o.product]) itemsMap[o.product] = 0;
      itemsMap[o.product] += o.qty;
    });
    return { items: itemsMap };
  }, [orders, customerEmail]);

  const cartData = useMemo(() => {
    let subtotalUSD = 0; let totalCartVials = 0; const items = [];
    const finalItems = {}; 

    if (settings.paymentsOpen || action === '') {
      Object.assign(finalItems, existingOrderData.items);
    } else if (action === 'replace') {
      Object.entries(cartItems).forEach(([prod, amounts]) => {
        const q = ((amounts.k || 0) * 10) + (amounts.v || 0);
        if (q > 0) finalItems[prod] = q;
      });
    } else if (action === 'add') {
      Object.assign(finalItems, existingOrderData.items);
      Object.entries(cartItems).forEach(([prod, amounts]) => {
        const q = ((amounts.k || 0) * 10) + (amounts.v || 0);
        if (q > 0) finalItems[prod] = (finalItems[prod] || 0) + q;
      });
    }

    Object.entries(finalItems).forEach(([prod, qty]) => {
      const pData = enrichedProducts.find(p => p.name === prod);
      if (pData) {
        subtotalUSD += qty * pData.pricePerVialUSD;
        totalCartVials += qty;
        let isExisting = false;
        if (action === 'add' && existingOrderData.items[prod] > 0) isExisting = true;
        items.push({ product: prod, qty, price: pData.pricePerVialUSD, lineTotal: qty * pData.pricePerVialUSD, isExisting });
      }
    });

    const totalUSD = subtotalUSD > 0 ? subtotalUSD + (settings.adminFeePhp / settings.fxRate) : 0;
    return { items, subtotalUSD, totalUSD, totalPHP: totalUSD * settings.fxRate, totalCartVials };
  }, [cartItems, action, enrichedProducts, existingOrderData, settings]);

  const customerList = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      if (!map[o.email]) map[o.email] = { email: o.email, name: o.name, handle: o.handle, products: {}, totalUSD: 0 };
      if (!map[o.email].products[o.product]) map[o.email].products[o.product] = 0;
      map[o.email].products[o.product] += o.qty;
    });

    return Object.values(map).map(c => {
      let sub = 0;
      Object.entries(c.products).forEach(([pName, qty]) => {
        const pData = enrichedProducts.find(p => p.name === pName);
        if (pData) sub += qty * pData.pricePerVialUSD;
      });
      const tUSD = sub > 0 ? sub + (settings.adminFeePhp / settings.fxRate) : 0;
      const profile = users.find(u => u.id === c.email) || {};
      return { ...c, totalPHP: tUSD * settings.fxRate, isPaid: profile.isPaid || false, adminAssigned: profile.adminAssigned || "Unassigned" };
    });
  }, [orders, enrichedProducts, settings, users]);

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
    return victims.sort((a, b) => a.missingSlots === b.missingSlots ? a.prod.localeCompare(b.prod) : a.missingSlots - b.missingSlots);
  }, [orders]);

  // --- ACTIONS ---
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleLookup = () => {
    if (!customerEmail) return;
    if (customerProfile) {
      setCustomerName(customerProfile.name || '');
      setCustomerHandle(customerProfile.handle || '');
      if (customerProfile.address) setAddressForm(customerProfile.address);
      showToast(`Welcome back, ${customerProfile.name}! 💖 Profile loaded.`);
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
    setCartItems(prev => ({ 
      ...prev, 
      [prodName]: { 
        k: prev[prodName]?.k || 0, 
        v: prev[prodName]?.v || 0, 
        [field]: num 
      } 
    }));
  };

  const submitOrder = async () => {
    if (!customerEmail || !customerName || !action) { showToast("Please fill email, name, and action! 🌸"); return; }
    const emailLower = customerEmail.toLowerCase().trim();
    
    setIsBtnLoading(true);
    try {
      if (action === 'cancel') {
         const toDelete = orders.filter(o => o.email === emailLower);
         for (const o of toDelete) await deleteDoc(doc(db, `${basePath}/orders`, o.id));
         showToast("Order Cancelled.");
         setCartItems({});
         setIsBtnLoading(false);
         return;
      }

      const errors = []; const newOrderItems = []; const timestamp = Date.now();
      
      Object.entries(cartItems).forEach(([prodName, amounts]) => {
        const qty = ((amounts.k || 0) * 10) + (amounts.v || 0);
        if (qty <= 0) return;
        const pData = enrichedProducts.find(p => p.name === prodName);
        if (pData?.isClosed) return;
        
        if (!settings.addOnly && qty < settings.minOrder) {
            errors.push(`${prodName} requires a minimum of ${settings.minOrder} vials.`);
        }
        
        if (pData?.maxBoxes > 0 && (pData.totalVials - (action==='replace'?(existingOrderData.items[prodName]||0):0) + qty) > (pData.maxBoxes * 10)) {
           errors.push(`${prodName}: Exceeds batch limit.`);
        }
        newOrderItems.push({ email: emailLower, name: customerName, handle: customerHandle, product: prodName, qty, timestamp });
      });

      if (errors.length > 0) { showToast(errors.join(' | ')); setIsBtnLoading(false); return; }
      if (newOrderItems.length === 0 && action === 'add') { showToast("No items added!"); setIsBtnLoading(false); return; }

      if (action === 'replace') {
        const toDelete = orders.filter(o => o.email === emailLower);
        for (const o of toDelete) await deleteDoc(doc(db, `${basePath}/orders`, o.id));
      }
      for (const item of newOrderItems) await addDoc(collection(db, `${basePath}/orders`), item);

      let assignedAdmin = customerProfile?.adminAssigned;
      if (!assignedAdmin) {
         assignedAdmin = settings.admins[Math.floor(Math.random() * settings.admins.length)]?.name || "Admin";
      }
      
      await setDoc(doc(db, `${basePath}/users`, emailLower), { 
        name: customerName, handle: customerHandle, adminAssigned: assignedAdmin 
      }, { merge: true });

      showToast("Order Submitted! 🎉");
      setCartItems({}); if (action === 'replace') setAction('');
    } catch (err) { console.error(err); showToast("Error saving order."); }
    setIsBtnLoading(false);
  };

  const submitPayment = async () => {
    if (!addressForm.shipOpt || !addressForm.street || !addressForm.city || !addressForm.contact) {
      showToast("Please fill all required shipping fields! 🏠"); return;
    }
    const emailLower = customerEmail.toLowerCase().trim();
    await setDoc(doc(db, `${basePath}/users`, emailLower), { address: addressForm, isPaid: true, proofUrl: 'mock_uploaded_receipt.jpg' }, { merge: true });
    showToast("Proof uploaded! Address saved to profile. ✅");
    setShowPayModal(false);
  };

  // --- ADMIN ACTIONS ---
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

  const autoTrimAll = async () => {
    if(!window.confirm('⚠️ Auto-Trim will reduce/delete loose vials from the bottom up. Proceed?')) return;
    for (const v of trimmingHitList) await executeTrim(v);
    showToast('Auto-Trim Complete! ✂️');
  };

  const runCutoff = async () => {
    let lockedCount = 0;
    for (const p of enrichedProducts) {
      if (!p.locked && p.maxBoxes > 0 && p.totalVials > 0 && p.slotsLeft > 0 && p.boxes < p.maxBoxes) {
        await setDoc(doc(db, `${basePath}/products`, p.id), { locked: true }, { merge: true });
        lockedCount++;
      }
    }
    showToast(lockedCount > 0 ? `Cutoff Complete! Locked ${lockedCount} products.` : `Cutoff Complete! No open boxes needed locking.`);
  };

  const resetSystem = async () => {
    if(!window.confirm('🚨 RESET SYSTEM: This will archive all current orders into History and clear the board. Proceed?')) return;
    for (const o of orders) {
      await addDoc(collection(db, `${basePath}/history`), { ...o, batchName: settings.batchName, archivedAt: Date.now() });
      await deleteDoc(doc(db, `${basePath}/orders`, o.id));
    }
    for (const u of users) {
      await setDoc(doc(db, `${basePath}/users`, u.id), { isPaid: false, proofUrl: null }, { merge: true });
    }
    for (const p of products) {
      await setDoc(doc(db, `${basePath}/products`, p.id), { locked: false }, { merge: true });
    }
    await setDoc(doc(db, `${basePath}/settings`, 'main'), { ...settings, paymentsOpen: false, addOnly: false });
    showToast('✅ System Reset & Archived!');
  };

  const handleAddProduct = async () => {
    if (!newProd.name || !newProd.vial) { showToast('Enter name and vial price!'); return; }
    await addDoc(collection(db, `${basePath}/products`), {
      name: newProd.name,
      pricePerKitUSD: Number(newProd.kit) || (Number(newProd.vial) * 10),
      pricePerVialUSD: Number(newProd.vial),
      locked: false,
      maxBoxes: Number(newProd.max) || 0
    });
    setNewProd({ name: '', kit: '', vial: '', max: '' });
    showToast('Product added! ✅');
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.bank) { showToast('Enter Name and Bank details!'); return; }
    const updatedAdmins = [...settings.admins, { name: newAdmin.name, bank1: newAdmin.bank, bank2: '' }];
    await updateSetting('admins', updatedAdmins);
    setNewAdmin({ name: '', bank: '' });
    showToast('Admin added! ✅');
  };

  const seedDemoData = async () => {
    await setDoc(doc(db, `${basePath}/settings`, 'main'), settings);
    const demoProds = [
      { name: "Peptide A (BPC-157)", pricePerKitUSD: 145, pricePerVialUSD: 14.50, locked: false, maxBoxes: 5 },
      { name: "Peptide B (TB-500)", pricePerKitUSD: 180, pricePerVialUSD: 18.00, locked: false, maxBoxes: 0 },
      { name: "Premium Blend C", pricePerKitUSD: 350, pricePerVialUSD: 35.00, locked: true, maxBoxes: 2 }
    ];
    for (const p of demoProds) await addDoc(collection(db, `${basePath}/products`), p);

    await setDoc(doc(db, `${basePath}/users`, 'jane@test.com'), {
      name: 'Jane Doe', handle: '@jane', isPaid: true, adminAssigned: 'Admin Jane',
      address: { shipOpt: 'Lalamove', street: '123 Test St', brgy: 'Makati', city: 'Makati', prov: 'NCR', zip: '1200', contact: '09171234567' }
    });
    
    await addDoc(collection(db, `${basePath}/orders`), { email: 'jane@test.com', name: 'Jane Doe', handle: '@jane', product: 'Peptide A (BPC-157)', qty: 12, timestamp: Date.now() });
    await addDoc(collection(db, `${basePath}/orders`), { email: 'john@test.com', name: 'John Smith', handle: '@john', product: 'Peptide A (BPC-157)', qty: 5, timestamp: Date.now() });
    await addDoc(collection(db, `${basePath}/history`), { email: 'jane@test.com', name: 'Jane Doe', product: 'Peptide B (TB-500)', qty: 10, batchName: 'Batch 1', archivedAt: Date.now() });

    showToast("Demo Data Seeded!");
  };

  // --- STYLES ---
  const sharedInputStyle = "w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-2xl px-4 py-3 outline-none focus:border-[#D6006E] font-semibold text-[#4A042A]";
  const adminInputStyle = "w-full bg-white border border-[#FFE4E1] rounded-xl px-4 py-2 outline-none focus:border-[#D6006E] font-semibold text-[#4A042A] text-sm";
  const btnActionStyle = "bg-gradient-to-r from-[#FF1493] to-[#FF69B4] text-white font-bold px-6 py-3 rounded-full shadow-[0_4px_10px_rgba(255,20,147,0.3)] uppercase text-sm tracking-wider disabled:bg-[#E2E8F0] disabled:opacity-70 disabled:shadow-none hover:scale-[0.98] transition-transform";

  // --- RENDER ---
  return (
    <div className="min-h-screen text-[#4A042A] font-sans pb-24 lg:pb-8 selection:bg-pink-300" style={{ background: 'linear-gradient(135deg, #FFC3EB 0%, #FF8EBD 100%)', backgroundAttachment: 'fixed' }}>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;600;700;800&display=swap');
        body { font-family: 'Quicksand', sans-serif; }
        .title-brand { font-family: 'Pacifico', cursive; transform: rotate(-2deg); text-shadow: 2px 2px 0px rgba(0,0,0,0.1); }
        .hide-scroll::-webkit-scrollbar { display: none; }
      `}} />

      {/* Top Nav */}
      <div className="max-w-6xl mx-auto p-4 pt-6">
        <h1 className="title-brand text-3xl sm:text-5xl text-center text-white mb-2 flex items-center justify-center gap-3">
          ✨ Bonded <span className="text-sm font-sans font-bold uppercase tracking-widest text-white/80 transform translate-y-2">by</span> Peptides ✨
        </h1>
        <div className="text-center mb-6">
          <span className="bg-white text-[#D6006E] px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-wider border-2 border-[#FF69B4] shadow-sm inline-block">
            {settings.batchName}
          </span>
        </div>

        {/* Banners */}
        {settings.paymentsOpen && view === 'shop' && (
          <div className="bg-white border-l-4 border-[#FF1493] p-3 rounded-lg mb-4 text-sm font-bold shadow-sm">🔒 PAYMENTS OPEN: Check email below to pay.</div>
        )}
        {settings.addOnly && !settings.paymentsOpen && view === 'shop' && (
           <div className="bg-white border-l-4 border-amber-500 p-3 rounded-lg mb-4 text-sm font-bold shadow-sm">⚠️ ADD-ONLY MODE: No edits allowed.</div>
        )}

        {view === 'shop' ? (
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-6 items-start">
            {/* Main Column */}
            <div className="space-y-4">
              
              {/* Customer Info Card */}
              <div className="bg-white p-5 rounded-3xl border-2 border-[#FF1493] shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#D6006E] uppercase ml-2 mb-1">💌 Email Address</label>
                    <input type="email" className={sharedInputStyle} value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} onBlur={handleLookup} placeholder="Required for lookup/profile..."/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#D6006E] uppercase ml-2 mb-1">🌸 Name</label>
                    <input type="text" disabled={settings.paymentsOpen} className={sharedInputStyle + " disabled:opacity-50"} value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Full name"/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#D6006E] uppercase ml-2 mb-1">💬 Handle</label>
                    <input type="text" disabled={settings.paymentsOpen} className={sharedInputStyle + " disabled:opacity-50"} value={customerHandle} onChange={e => setCustomerHandle(e.target.value)} placeholder="@username"/>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#D6006E] uppercase ml-2 mb-1">⚡ Action</label>
                    <select disabled={settings.paymentsOpen} className={sharedInputStyle + " disabled:opacity-50"} value={action} onChange={e => handleActionChange(e.target.value)}>
                      <option value="" disabled>Choose an action...</option>
                      <option value="replace" disabled={settings.addOnly}>Create / Replace Order</option>
                      <option value="add">Add Items (Keep Existing)</option>
                      <option value="cancel" disabled={settings.addOnly}>Cancel Order</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-4 text-xs text-[#9E2A5E] bg-[#FFF0F5] p-3 rounded-xl border border-[#FFC0CB] font-semibold">
                  {customerProfile?.address?.street ? `✅ Profile Active: Shipping to ${customerProfile.address.city}` : "ℹ️ New customer? Your address will be saved securely upon payment."}
                </div>
              </div>

              {/* Product List */}
              <div className="bg-white rounded-3xl border-2 border-[#FF1493] shadow-sm overflow-hidden flex flex-col">
                {products.length === 0 ? (
                   <div className="p-10 text-center font-bold text-[#D6006E]">Loading goodies...</div>
                ) : enrichedProducts.map(p => {
                  const cartK = cartItems[p.name]?.k || 0;
                  const cartV = cartItems[p.name]?.v || 0;
                  const isActive = (cartK > 0 || cartV > 0);
                  const isClosed = p.isClosed;
                  const existQty = existingOrderData.items[p.name] || 0;

                  return (
                    <div key={p.id} className={`p-4 border-b border-[#FFE4E1] transition-colors ${isActive ? 'bg-[#FFF0F5] border-2 border-[#D6006E] shadow-[0_6px_15px_rgba(255,20,147,0.15)] z-10 relative rounded-xl' : 'bg-white'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-base leading-tight text-[#4A042A]">{p.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs font-semibold text-[#9E2A5E]">
                            <span className="bg-[#FF69B4] text-white px-2 py-0.5 rounded-full">${p.pricePerVialUSD.toFixed(2)}</span>
                            {p.openBatchLabel && <span className="opacity-70">• {p.openBatchLabel}</span>}
                            {existQty > 0 && <span className="bg-[#9C27B0] text-white px-2 py-0.5 rounded-full flex items-center gap-1">📦 Has {existQty}</span>}
                          </div>
                        </div>
                        <div className={`text-[0.65rem] font-bold uppercase px-2 py-1 rounded-full whitespace-nowrap border ${p.statusKey === 'available' ? 'bg-[#E0F5E9] text-[#008040] border-[#008040]' : p.statusKey === 'full' ? 'bg-[#FFEBEE] text-[#D32F2F] border-[#D32F2F]' : p.statusKey === 'locked' ? 'bg-gray-100 text-gray-500 border-gray-300' : 'bg-[#F3E5F5] text-[#7B1FA2] border-[#9C27B0]'}`}>
                          {p.statusText}
                        </div>
                      </div>

                      <div className={`flex gap-3 transition-all duration-300 overflow-hidden ${isClosed ? 'opacity-50 pointer-events-none' : ''}`}>
                        <div className="flex-1 bg-white border border-[#FFC0CB] rounded-xl p-1 flex flex-col items-center">
                          <label className="text-[0.6rem] font-bold text-[#9E2A5E] uppercase">Kits (10x)</label>
                          <input type="number" min="0" value={cartK || ''} onChange={e => handleCartChange(p.name, 'k', e.target.value)} className="w-full text-center font-bold text-lg text-[#D6006E] outline-none bg-transparent" placeholder="0" disabled={isClosed} />
                        </div>
                        <div className="flex-1 bg-white border border-[#FFC0CB] rounded-xl p-1 flex flex-col items-center">
                          <label className="text-[0.6rem] font-bold text-[#9E2A5E] uppercase">Vials (1x)</label>
                          <input type="number" min="0" max="9" value={cartV || ''} onChange={e => handleCartChange(p.name, 'v', e.target.value)} className="w-full text-center font-bold text-lg text-[#D6006E] outline-none bg-transparent" placeholder="0" disabled={isClosed} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sidebar Cart */}
            <div className="hidden lg:block sticky top-6">
              <div className="bg-white border-2 border-[#FF1493] rounded-3xl p-6 shadow-xl">
                <h3 className="font-title text-2xl text-[#D6006E] border-b-2 border-pink-100 pb-2 mb-4 text-center title-brand">Your Cart 🛍️</h3>
                <div className="max-h-[40vh] overflow-y-auto mb-4 space-y-2">
                  {cartData.items.length === 0 ? ( <div className="text-center text-[#9E2A5E] italic text-sm py-4">No items selected yet!</div> ) : (
                    cartData.items.map((i, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b border-pink-50 border-dashed pb-2">
                        <div className="font-semibold">{i.product} {i.isExisting && <span className="text-[0.5rem] bg-[#9C27B0] text-white px-1 rounded ml-1">EXIST</span>}</div>
                        <div className="text-right">
                          <span className="text-[#D6006E] font-bold">x{i.qty}</span>
                          <span className="text-gray-500 ml-2">${i.lineTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-1 mb-6 text-sm">
                  <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">${cartData.subtotalUSD.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Admin Fee</span><span>₱{settings.adminFeePhp}</span></div>
                  <div className="flex flex-col items-end border-t-2 border-pink-100 mt-2 pt-2">
                    <span className="text-3xl font-bold text-[#D6006E]">₱{cartData.totalPHP.toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    <span className="text-xs text-gray-500">${cartData.totalUSD.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {settings.paymentsOpen ? (
                    <button onClick={() => setShowPayModal(true)} disabled={cartData.items.length === 0} className="w-full bg-[#008040] text-white font-bold py-3 rounded-full shadow-lg uppercase text-sm disabled:opacity-50">Pay Now 💸</button>
                  ) : (
                    <button onClick={submitOrder} disabled={cartData.items.length === 0 && action !== 'cancel'} className={btnActionStyle}>{isBtnLoading ? '⏳...' : (action === 'cancel' ? 'Confirm Cancel' : 'Submit Order 💖')}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* --- ADMIN VIEW --- */
          <div className="bg-white rounded-3xl border-2 border-[#FF1493] shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[75vh]">
            {/* Sidebar Navigation */}
            <div className="w-full md:w-64 bg-[#FFF0F5] border-r border-[#FFC0CB] p-6 flex flex-col">
              <h2 className="text-xl font-bold text-[#D6006E] flex items-center gap-2 mb-8"><ShieldCheck/> Command Center</h2>
              <nav className="flex md:flex-col gap-2 overflow-x-auto hide-scroll pb-4 md:pb-0">
                {[
                  { id: 'overview', icon: <LayoutDashboard size={18}/>, label: 'Overview' },
                  { id: 'payments', icon: <BadgeDollarSign size={18}/>, label: 'Payments' },
                  { id: 'packing', icon: <ClipboardList size={18}/>, label: 'Packing' },
                  { id: 'trimming', icon: <Scissors size={18}/>, label: 'Hit List' },
                  { id: 'customers', icon: <Users size={18}/>, label: 'Customers' },
                  { id: 'settings', icon: <Settings size={18}/>, label: 'Settings' }
                ].map(t => (
                  <button key={t.id} onClick={() => setAdminTab(t.id)} className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold transition-colors whitespace-nowrap ${adminTab === t.id ? 'bg-[#FF1493] text-white shadow-md' : 'text-[#9E2A5E] hover:bg-[#FFE4E1]'}`}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </nav>
              <div className="mt-auto hidden md:block pt-8">
                {products.length === 0 && <button onClick={seedDemoData} className="w-full bg-[#FFC0CB] text-[#D6006E] px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#FFB6C1]">Seed Demo Data</button>}
              </div>
            </div>

            {/* Admin Content */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-white max-w-full">
              
              {/* TAB: OVERVIEW */}
              {adminTab === 'overview' && (
                <div>
                  <h3 className="font-bold text-2xl text-[#4A042A] mb-6">Batches Summary</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="w-full text-sm text-left min-w-[500px]">
                    <thead className="bg-[#FFF0F5] text-[#D6006E] border-b border-[#FFC0CB]">
                      <tr><th className="p-3">Product</th><th className="p-3 text-center">Total Vials</th><th className="p-3 text-center">Full Boxes</th><th className="p-3 text-center">Slots Left</th></tr>
                    </thead>
                    <tbody>
                      {enrichedProducts.map(p => (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3 font-semibold">{p.name}</td>
                          <td className="p-3 text-center">{p.totalVials}</td>
                          <td className="p-3 text-center font-bold text-[#D6006E]">{p.boxes}</td>
                          <td className="p-3 text-center font-bold text-[#008040]">{p.slotsLeft === 0 ? 'Full!' : p.slotsLeft}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              )}

              {/* TAB: PAYMENTS */}
              {adminTab === 'payments' && (
                <div>
                  <h3 className="font-bold text-2xl text-[#4A042A] mb-6">Orders & Payments</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="w-full text-sm text-left min-w-[700px]">
                    <thead className="bg-[#FFF0F5] text-[#D6006E] border-b border-[#FFC0CB]">
                      <tr><th className="p-3">Customer</th><th className="p-3 text-right">Total PHP</th><th className="p-3">Admin</th><th className="p-3 text-center">Status</th></tr>
                    </thead>
                    <tbody>
                      {customerList.map(c => (
                        <tr key={c.email} className={`border-b border-gray-100 ${c.isPaid ? 'bg-[#F0FDF4]' : ''}`}>
                          <td className="p-3">
                            <div className="font-bold text-[#4A042A] text-base">{c.name}</div>
                            <div className="text-xs text-gray-500">{c.email}</div>
                          </td>
                          <td className="p-3 text-right font-black text-[#D6006E] text-lg">₱{c.totalPHP.toLocaleString()}</td>
                          <td className="p-3"><span className="bg-[#FFF0F5] border border-[#FFC0CB] px-2 py-1 rounded-md text-xs font-bold text-pink-600">{c.adminAssigned}</span></td>
                          <td className="p-3 text-center">
                            <button onClick={() => setDoc(doc(db, `${basePath}/users`, c.email), { isPaid: !c.isPaid }, { merge: true })} className={`px-4 py-2 rounded-xl font-bold text-xs ${c.isPaid ? 'bg-[#008040] text-white' : 'bg-gray-200 text-gray-600'}`}>
                              {c.isPaid ? 'PAID ✅' : 'PENDING ❌'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table></div>
                </div>
              )}

              {/* TAB: CUSTOMER DATABASE */}
              {adminTab === 'customers' && (
                <div>
                  <h3 className="font-bold text-2xl text-[#4A042A] mb-2 flex items-center gap-2"><Users/> Customer Profiles</h3>
                  <p className="text-sm text-gray-500 mb-6">Database of all registered users and their saved shipping addresses.</p>
                  <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="w-full text-sm text-left min-w-[800px]">
                    <thead className="bg-[#FFF0F5] text-[#D6006E] border-b border-[#FFC0CB]">
                      <tr><th className="p-3">Name / Handle</th><th className="p-3">Email</th><th className="p-3">Saved Address</th><th className="p-3">Lifetime Orders</th></tr>
                    </thead>
                    <tbody>
                      {users.map(u => {
                         const userHist = history.filter(h => h.email === u.id);
                         const userAct = orders.filter(o => o.email === u.id);
                         const totalVials = [...userHist, ...userAct].reduce((s, o) => s + o.qty, 0);
                         return (
                        <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3">
                            <div className="font-bold text-base">{u.name}</div>
                            <div className="text-xs text-purple-600 font-bold">{u.handle}</div>
                          </td>
                          <td className="p-3 text-gray-600">{u.id}</td>
                          <td className="p-3 text-xs text-gray-500">
                             {u.address?.street ? `${u.address.street}, ${u.address.brgy}, ${u.address.city}, ${u.address.prov} [${u.address.shipOpt}]` : <span className="text-red-400 italic">No address saved yet.</span>}
                          </td>
                          <td className="p-3 font-bold text-[#D6006E]">{totalVials} Vials</td>
                        </tr>
                      )})}
                    </tbody>
                  </table></div>
                </div>
              )}

              {/* TAB: PACKING GUIDE */}
              {adminTab === 'packing' && (
                <div>
                  <h3 className="font-bold text-2xl text-[#4A042A] mb-6">📋 Packing Guide</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200"><table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-[#F3E5F5] text-[#7B1FA2]">
                      <tr><th className="p-3">Product</th><th className="p-3 text-center">Box #</th><th className="p-3">Customer</th><th className="p-3 text-center">Take Vials</th></tr>
                    </thead>
                    <tbody>
                      {Object.keys(orders.reduce((acc, o) => { if(!acc[o.product]) acc[o.product] = []; acc[o.product].push(o); return acc; }, {})).sort().map(prod => {
                        let box = 1; let slots = 10;
                        return orders.filter(o=>o.product===prod).map(o => {
                          let rows = []; let q = o.qty;
                          while(q>0) {
                            if(slots===0) { box++; slots=10; }
                            let alloc = Math.min(q, slots); slots -= alloc;
                            rows.push(
                              <tr key={`${o.id}-${box}`} className="border-b border-gray-100">
                                <td className="p-3 font-bold">{prod}</td><td className="p-3 text-center font-bold text-pink-600">Box {box}</td>
                                <td className="p-3"><strong>{o.name}</strong><br/><span className="text-xs text-gray-500">{o.email}</span></td>
                                <td className="p-3 text-center font-black text-lg">{alloc}</td>
                              </tr>
                            ); q -= alloc;
                          } return rows;
                        });
                      })}
                    </tbody>
                  </table></div>
                </div>
              )}

              {/* TAB: TRIMMING */}
              {adminTab === 'trimming' && (
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <h3 className="font-bold text-2xl text-[#4A042A]">✂️ Hit List</h3>
                      <p className="text-sm text-gray-500">Full kits are shielded! Shows loose vials to trim.</p>
                    </div>
                    {trimmingHitList.length > 0 && <button onClick={autoTrimAll} className="bg-[#D32F2F] text-white px-4 py-2 rounded-xl font-bold shadow-md whitespace-nowrap">✂️ Auto-Trim All Loose</button>}
                  </div>
                  {trimmingHitList.length === 0 ? (
                    <div className="bg-[#E0F5E9] text-[#008040] p-6 rounded-2xl text-center font-bold border border-[#008040]/30">✅ All current boxes are perfectly full (10/10). No trimming needed!</div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-red-200"><table className="w-full text-sm text-left min-w-[700px]">
                      <thead className="bg-[#f4cccc] text-[#990000]">
                        <tr><th className="p-3">Product</th><th className="p-3">Box Info</th><th className="p-3">Customer</th><th className="p-3 text-center">Row Qty</th><th className="p-3 text-center">Action</th></tr>
                      </thead>
                      <tbody>
                        {trimmingHitList.map((v, i) => (
                          <tr key={i} className="border-b border-white bg-[#fcf6f5]">
                            <td className="p-3 font-bold">{v.prod}</td>
                            <td className="p-3">Box {v.boxNum}<br/><span className="text-red-500 font-bold text-xs">Missing {v.missingSlots}</span></td>
                            <td className="p-3 font-bold">{v.name}<br/><span className="text-xs font-normal text-gray-500">{v.email}</span></td>
                            <td className="p-3 text-center font-bold text-lg text-pink-600">{v.qty}</td>
                            <td className="p-3 text-center"><button onClick={() => executeTrim(v)} className="bg-[#D32F2F] text-white px-3 py-1.5 rounded-lg font-bold text-xs">Cut {v.amountToRemove} Vials</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  )}
                </div>
              )}

              {/* TAB: SETTINGS */}
              {adminTab === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-[#FFE4E1] shadow-sm">
                    <h3 className="font-bold text-lg text-[#D6006E] mb-4 border-b border-[#FFC0CB] pb-2">Global Rates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div><label className="text-xs font-bold text-gray-500">FX Rate</label><input type="number" className={adminInputStyle} value={settings.fxRate} onChange={e => updateSetting('fxRate', Number(e.target.value))} /></div>
                      <div><label className="text-xs font-bold text-gray-500">Admin Fee (PHP)</label><input type="number" className={adminInputStyle} value={settings.adminFeePhp} onChange={e => updateSetting('adminFeePhp', Number(e.target.value))} /></div>
                      <div><label className="text-xs font-bold text-gray-500">Min Order</label><input type="number" className={adminInputStyle} value={settings.minOrder} onChange={e => updateSetting('minOrder', Number(e.target.value))} /></div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-[#FFE4E1] shadow-sm">
                    <h3 className="font-bold text-lg text-[#D6006E] mb-4 border-b border-[#FFC0CB] pb-2">Danger Zone</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <button onClick={() => updateSetting('paymentsOpen', !settings.paymentsOpen)} className={`py-3 rounded-xl font-bold text-white shadow-sm ${settings.paymentsOpen ? 'bg-[#D32F2F]' : 'bg-[#008040]'}`}>{settings.paymentsOpen ? '🔒 CLOSE PAYMENTS' : '🟢 OPEN PAYMENTS'}</button>
                      <button onClick={() => updateSetting('addOnly', !settings.addOnly)} className={`py-3 rounded-xl font-bold text-white shadow-sm ${settings.addOnly ? 'bg-amber-600' : 'bg-gray-500'}`}>{settings.addOnly ? '⚠️ DISABLE ADD-ONLY' : '⏳ ENABLE ADD-ONLY'}</button>
                      <button onClick={runCutoff} className="py-3 rounded-xl font-bold text-white shadow-sm bg-[#D6006E]">🛑 RUN CUTOFF</button>
                      <button onClick={resetSystem} className="py-3 rounded-xl font-bold text-white shadow-sm bg-red-700">🚨 ARCHIVE & RESET SYSTEM</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-[#FFE4E1] shadow-sm">
                      <h3 className="font-bold text-lg text-[#D6006E] mb-4 border-b border-[#FFC0CB] pb-2">Assigned Admins & Banks</h3>
                      <div className="bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl p-3 h-[180px] overflow-y-auto mb-4 space-y-3">
                        {settings.admins.map((a, idx) => (
                          <div key={idx} className="flex justify-between items-start border-b border-pink-100 pb-2">
                            <div>
                              <strong className="text-[#4A042A] text-sm">{a.name}</strong><br/>
                              <span className="text-xs text-gray-600">{a.bank1}</span>
                            </div>
                            <button onClick={() => {
                              const newArr = [...settings.admins]; newArr.splice(idx, 1); updateSetting('admins', newArr);
                            }} className="text-red-500 font-bold hover:text-red-700">❌</button>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input type="text" className={adminInputStyle} placeholder="Admin Name (e.g. Admin Jane)" value={newAdmin.name} onChange={e=>setNewAdmin({...newAdmin, name: e.target.value})}/>
                        <input type="text" className={adminInputStyle} placeholder="Bank Details (e.g. BDO: 123...)" value={newAdmin.bank} onChange={e=>setNewAdmin({...newAdmin, bank: e.target.value})}/>
                        <button onClick={handleAddAdmin} className="bg-[#FF1493] text-white font-bold py-2 rounded-xl text-sm">Add Admin</button>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-[#FFE4E1] shadow-sm">
                      <h3 className="font-bold text-lg text-[#D6006E] mb-4 border-b border-[#FFC0CB] pb-2">Drive Folders</h3>
                      <div className="space-y-4">
                        <div><label className="text-xs font-bold text-gray-500">Proofs Folder Name</label><input type="text" className={adminInputStyle} value={settings.proofFolder} onChange={e=>updateSetting('proofFolder', e.target.value)} /></div>
                        <div><label className="text-xs font-bold text-gray-500">Labels Folder Name</label><input type="text" className={adminInputStyle} value={settings.labelsFolder} onChange={e=>updateSetting('labelsFolder', e.target.value)} /></div>
                      </div>
                    </div>
                  </div>

                  {/* Manage Products */}
                  <div className="bg-white p-6 rounded-2xl border border-[#FFE4E1] shadow-sm">
                    <h3 className="font-bold text-lg text-[#D6006E] mb-4 border-b border-[#FFC0CB] pb-2">Manage Products</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl mb-4 max-h-[300px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#FFF0F5] text-[#D6006E] sticky top-0 shadow-sm">
                          <tr><th className="p-3">Name</th><th className="p-3">Price (Vial)</th><th className="p-3">Max Boxes</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr>
                        </thead>
                        <tbody>
                          {products.map(p => (
                            <tr key={p.id} className="border-b border-gray-100">
                              <td className="p-3 font-bold">{p.name}</td>
                              <td className="p-3 text-pink-600 font-bold">${p.pricePerVialUSD}</td>
                              <td className="p-3">
                                <input type="number" className="w-16 border border-gray-300 rounded p-1 text-center text-xs" value={p.maxBoxes} onChange={e => setDoc(doc(db, `${basePath}/products`, p.id), { maxBoxes: Number(e.target.value)||0 }, { merge: true })}/>
                              </td>
                              <td className="p-3">
                                <button onClick={()=>setDoc(doc(db, `${basePath}/products`, p.id), { locked: !p.locked }, { merge: true })} className={`px-2 py-1 rounded text-xs font-bold text-white ${p.locked ? 'bg-red-500' : 'bg-green-500'}`}>
                                  {p.locked ? 'LOCKED' : 'OPEN'}
                                </button>
                              </td>
                              <td className="p-3">
                                <button onClick={()=>deleteDoc(doc(db, `${basePath}/products`, p.id))} className="text-red-500 font-bold hover:underline text-xs">Remove</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-[150px]"><label className="text-xs font-bold text-gray-500">New Product Name</label><input type="text" className={adminInputStyle} value={newProd.name} onChange={e=>setNewProd({...newProd, name: e.target.value})}/></div>
                      <div className="w-24"><label className="text-xs font-bold text-gray-500">Price/Vial $</label><input type="number" className={adminInputStyle} value={newProd.vial} onChange={e=>setNewProd({...newProd, vial: e.target.value})}/></div>
                      <div className="w-24"><label className="text-xs font-bold text-gray-500">Max Boxes</label><input type="number" className={adminInputStyle} placeholder="0 = None" value={newProd.max} onChange={e=>setNewProd({...newProd, max: e.target.value})}/></div>
                      <button onClick={handleAddProduct} className="bg-[#D6006E] text-white font-bold py-2 px-4 rounded-xl text-sm h-[38px]">➕ Add Product</button>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Mobile Footer */}
      {view === 'shop' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#FF1493] p-4 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center">
          <div>
            <div className="text-[0.6rem] font-bold text-[#D6006E] uppercase">Total Estimate</div>
            <div className="text-2xl font-black text-[#D6006E] leading-none">₱{cartData.totalPHP.toLocaleString()}</div>
          </div>
          {settings.paymentsOpen ? (
            <button onClick={() => setShowPayModal(true)} disabled={cartData.items.length===0} className="bg-[#008040] text-white px-6 py-3 rounded-full font-bold uppercase text-sm shadow-md disabled:opacity-50">Pay Now 💸</button>
          ) : (
            <button onClick={submitOrder} disabled={cartData.items.length===0 && action!=='cancel'} className={btnActionStyle}>{isBtnLoading ? '⏳...' : 'Submit 💖'}</button>
          )}
        </div>
      )}

      {/* Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#FFF0F5] p-4 flex justify-between items-center border-b border-[#FFC0CB]">
              <h2 className="font-title text-2xl text-[#D6006E]">Checkout 💸</h2>
              <button onClick={() => setShowPayModal(false)} className="text-[#D6006E] font-bold text-xl">&times;</button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 hide-scroll">
              <div className="bg-[#E6F6EC] p-4 rounded-xl border border-[#079E51] mb-5">
                <h4 className="text-[#079E51] font-bold mb-2">Send Payment To:</h4>
                <div className="bg-white p-3 rounded-lg border border-[#bbf7d0] font-mono text-xs whitespace-pre-wrap">
                  {customerList.find(c => c.email === customerEmail.toLowerCase().trim())?.adminAssigned || "Admin Jane"}<br/>
                  BDO: 00123456789{"\n"}GCash: 09171234567
                </div>
              </div>

              <h4 className="font-bold text-[#9E2A5E] mb-3">🏠 Shipping Details (Auto-Saves)</h4>
              <div className="space-y-3 mb-5">
                <select className={adminInputStyle} value={addressForm.shipOpt} onChange={e=>setAddressForm({...addressForm, shipOpt:e.target.value})}>
                  <option value="" disabled>Select Courier...</option>
                  {settings.shippingOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <input type="text" className={adminInputStyle} placeholder="Street & Barangay" value={addressForm.street} onChange={e=>setAddressForm({...addressForm, street:e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" className={adminInputStyle} placeholder="City" value={addressForm.city} onChange={e=>setAddressForm({...addressForm, city:e.target.value})} />
                  <input type="text" className={adminInputStyle} placeholder="Zip" value={addressForm.zip} onChange={e=>setAddressForm({...addressForm, zip:e.target.value})} />
                </div>
                <input type="text" className={adminInputStyle} placeholder="Contact # (09...)" value={addressForm.contact} onChange={e=>setAddressForm({...addressForm, contact:e.target.value})} />
              </div>
            </div>

            <div className="p-5 border-t border-[#FFC0CB] bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-gray-600">Total to Pay</span>
                <span className="text-2xl font-black text-[#D6006E]">₱{cartData.totalPHP.toLocaleString()}</span>
              </div>
              <button onClick={submitPayment} className="w-full bg-[#D6006E] text-white font-bold py-3 rounded-xl uppercase text-sm shadow-md">Upload Proof & Complete ✅</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Toggle */}
      <button onClick={() => setView(v => v === 'shop' ? 'admin' : 'shop')} className="fixed bottom-24 lg:bottom-6 right-4 bg-[#4A042A] text-white px-5 py-3 rounded-full font-bold text-sm shadow-xl z-50 flex items-center gap-2 hover:bg-[#9E2A5E]">
        {view === 'shop' ? <><Settings size={16}/> Admin Access</> : <><Store size={16}/> Back to Shop</>}
      </button>

      {/* Toast */}
      <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[150] transition-all duration-300 ${toast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="bg-[#D6006E] text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm flex items-center gap-2">
          <Info size={16}/> {toast}
        </div>
      </div>
    </div>
  );
}