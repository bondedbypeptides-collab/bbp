import { chromium } from 'playwright';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import { getStorage, ref, deleteObject } from 'firebase/storage';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '..');

const firebaseConfig = {
  apiKey: 'AIzaSyBtqinodXxcYU4U5F-LoImCOj681KlZ9w4',
  authDomain: 'bonded-by-peptides.firebaseapp.com',
  projectId: 'bonded-by-peptides',
  storageBucket: 'bonded-by-peptides.firebasestorage.app',
  messagingSenderId: '840550043632',
  appId: '1:840550043632:web:d935ae58a19ed96893d735',
  measurementId: 'G-6NMJD9WTS6',
};

const BASE_URL = process.env.BBP_BASE_URL || 'http://127.0.0.1:4176/';
const TEST_PREFIX = process.env.BBP_TEST_PREFIX || `codex.visible.${Date.now()}`;
const PROOF_PATH = process.env.BBP_PROOF_PATH || path.join(workspaceRoot, 'tmp-proof.png');
const BROWSER_CANDIDATES = [
  process.env.BBP_BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

function log(message) {
  const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${stamp}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll(label, fn, { timeoutMs = 30000, intervalMs = 500 } = {}) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  if (lastError) {
    throw new Error(`${label} timed out. Last error: ${lastError.message}`);
  }
  throw new Error(`${label} timed out.`);
}

function cssEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function ensureSignedIn() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

async function getSettings() {
  const snap = await getDoc(doc(db, 'settings', 'main'));
  return snap.exists() ? snap.data() : {};
}

async function getAllProducts() {
  const snap = await getDocs(collection(db, 'products'));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function getAllOrders() {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function getOrdersForEmail(email) {
  const snap = await getDocs(collection(db, 'orders'));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((order) => String(order.email || '') === email);
}

async function getLogsForEmail(email) {
  const snap = await getDocs(collection(db, 'logs'));
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((row) => String(row.email || '') === email);
}

async function getUser(email) {
  const snap = await getDoc(doc(db, 'users', email));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

function buildOpenProductPlan(settings, products, orders) {
  const totalsByProduct = {};
  for (const order of orders) {
    const productName = String(order.product || '');
    totalsByProduct[productName] = (totalsByProduct[productName] || 0) + Number(order.qty || 0);
  }

  return products
    .map((product) => {
      const totalVials = totalsByProduct[product.name] || 0;
      const boxes = Math.floor(totalVials / 10);
      const limitReached = Number(product.maxBoxes || 0) > 0 && boxes >= Number(product.maxBoxes || 0);
      const isClosed = Boolean(product.locked) || Boolean(settings.paymentsOpen) || limitReached;
      return { ...product, totalVials, isClosed };
    })
    .filter((product) => !product.isClosed && Number(product.pricePerVialUSD || 0) > 0)
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function openShopPage(context, shopAccessCode) {
  const page = await context.newPage();
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await sleep(1200);

  const accessInput = page.getByPlaceholder('Paste the batch code here');
  if (await accessInput.count()) {
    if (!shopAccessCode) {
      throw new Error('Shop access gate is enabled, but no access code was found.');
    }
    await accessInput.fill(shopAccessCode);
    await sleep(400);
    await page.getByRole('button', { name: /enter shop/i }).click();
    await poll('shop access accepted', async () => !(await accessInput.isVisible()), { timeoutMs: 10000 });
  }

  return page;
}

function getShopEmailInputs(page) {
  return {
    emailInput: page.locator('#top-form-card input[type="email"]').nth(0),
    emailConfirmInput: page.locator('#top-form-card input[type="email"]').nth(1),
  };
}

async function fillProductQty(page, productName, qty) {
  const selector = `[data-name="${cssEscape(productName)}"] input[type="number"]`;
  await poll(
    `product qty input for ${productName}`,
    async () => {
      const locator = page.locator(selector).first();
      if (await locator.count() === 0) return false;
      await locator.waitFor({ state: 'visible', timeout: 1000 });
      await locator.fill(String(qty));
      return (await locator.inputValue()) === String(qty);
    },
    { timeoutMs: 15000, intervalMs: 300 },
  );
}

async function loginAdmin(adminContext, adminPassword) {
  const page = await adminContext.newPage();
  page.on('dialog', async (dialog) => {
    log(`Dialog: ${dialog.message()}`);
    await dialog.accept();
  });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await page.getByTitle('Admin Access').click();
  await sleep(600);

  for (const attempt of Array.from(new Set([adminPassword, 'admin123'].filter(Boolean)))) {
    const passwordInput = page.getByPlaceholder('Password');
    await passwordInput.fill('');
    await passwordInput.fill(attempt);
    await sleep(300);
    await page.getByRole('button', { name: /enter dashboard/i }).click();
    await sleep(1800);
    if (await page.getByPlaceholder('Password').count() === 0) {
      return page;
    }
  }

  throw new Error('Admin login failed.');
}

async function clickSidebar(page, label) {
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
  await sleep(700);
}

async function setAdminSearch(page, value) {
  const search = page.getByPlaceholder('Global Search (Ctrl+F equivalent)...');
  await search.fill(value);
  await search.press('Tab');
  await sleep(600);
}

async function toggleAdminSetting(page, label, shouldBeOpen, settingsKey) {
  await clickSidebar(page, 'Core Settings');
  const toggle = page.locator(`xpath=//p[normalize-space()='${label}']/ancestor::div[contains(@class,'rounded-2xl')][1]//button[@type='button']`).first();
  const current = await toggle.getAttribute('aria-pressed');
  const isOpen = current === 'true';
  if (isOpen !== shouldBeOpen) {
    await toggle.click();
  }
  await poll(
    `${label} state`,
    async () => {
      const settings = await getSettings();
      return Boolean(settings[settingsKey]) === shouldBeOpen;
    },
    { timeoutMs: 30000, intervalMs: 500 },
  );
  await sleep(1000);
}

async function saveOrder(page, customer) {
  const { emailInput, emailConfirmInput } = getShopEmailInputs(page);
  await emailInput.fill(customer.email);
  await emailConfirmInput.fill(customer.email);
  await page.getByPlaceholder('Full name').fill(customer.name);
  await page.getByPlaceholder('@username').fill(customer.handle);
  await fillProductQty(page, customer.productName, customer.qty);
  await sleep(600);
  await page.getByRole('button', { name: /save order/i }).first().click();

  await poll(
    `saved order for ${customer.email}`,
    async () => {
      const orders = await getOrdersForEmail(customer.email);
      const logs = await getLogsForEmail(customer.email);
      return orders.length > 0 && logs.some((row) => row.action === 'Placed Order');
    },
    { timeoutMs: 30000, intervalMs: 750 },
  );
}

async function loadExistingOrder(page, email) {
  const { emailInput, emailConfirmInput } = getShopEmailInputs(page);
  await emailInput.fill(email);
  await emailConfirmInput.fill(email);
  await emailConfirmInput.press('Tab');
  await sleep(1500);
}

async function submitPayment(page, customer, shippingOptions) {
  await loadExistingOrder(page, customer.email);
  const payButton = page.getByRole('button', { name: /^pay now$/i }).first();
  await poll('Pay Now enabled', async () => await payButton.isEnabled(), { timeoutMs: 20000, intervalMs: 500 });
  await payButton.click();
  await sleep(1000);

  const shippingSelects = page.locator('select');
  await shippingSelects.nth(0).selectOption({ label: shippingOptions[0] || 'LBC' });
  await shippingSelects.nth(1).selectOption('ship-ready');
  await page.getByPlaceholder('Street / Lot / Bldg *').fill(customer.address.street);
  await page.getByPlaceholder('Barangay *').fill(customer.address.brgy);
  await page.getByPlaceholder('City *').fill(customer.address.city);
  await page.getByPlaceholder('Province *').fill(customer.address.prov);
  await page.getByPlaceholder('Zip Code *').fill(customer.address.zip);
  await page.getByPlaceholder('Contact # *').fill(customer.address.contact);
  await page.locator('input[type="file"]').setInputFiles(PROOF_PATH);
  await sleep(700);
  await page.getByRole('button', { name: /complete payment/i }).click();

  await poll(
    `payment submitted for ${customer.email}`,
    async () => {
      const user = await getUser(customer.email);
      const logs = await getLogsForEmail(customer.email);
      return Boolean(user?.isPaid && user?.proofUrl && logs.some((row) => row.action === 'Submitted Payment'));
    },
    { timeoutMs: 45000, intervalMs: 1000 },
  );
}

function buildCustomer(suffix, productName, qty) {
  const email = `${TEST_PREFIX}.${suffix}@example.com`;
  return {
    email,
    name: `Codex Visible ${suffix}`,
    handle: `codex_visible_${suffix}`,
    productName,
    qty,
    address: {
      street: `${100 + suffix} Aurora Blvd`,
      brgy: `Barangay ${suffix}`,
      city: 'Quezon City',
      prov: 'Metro Manila',
      zip: `${1100 + suffix}`,
      contact: `0917${String(1000000 + suffix).slice(-7)}`,
    },
  };
}

async function cleanupPrefix(prefix) {
  const [ordersSnap, usersSnap, logsSnap] = await Promise.all([
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'logs')),
  ]);

  const orders = ordersSnap.docs
    .map((snap) => ({ id: snap.id, ...snap.data() }))
    .filter((row) => String(row.email || '').startsWith(prefix));
  const users = usersSnap.docs
    .map((snap) => ({ id: snap.id, ...snap.data() }))
    .filter((row) => String(row.id || '').startsWith(prefix));
  const logs = logsSnap.docs
    .map((snap) => ({ id: snap.id, ...snap.data() }))
    .filter((row) => String(row.email || '').startsWith(prefix));

  for (const order of orders) {
    await deleteDoc(doc(db, 'orders', order.id));
  }
  for (const logRow of logs) {
    await deleteDoc(doc(db, 'logs', logRow.id));
  }
  for (const user of users) {
    if (user.proofUrl) {
      try {
        const match = String(user.proofUrl).match(/\/o\/([^?]+)/);
        if (match?.[1]) {
          const objectPath = decodeURIComponent(match[1]);
          await deleteObject(ref(storage, objectPath));
        }
      } catch {}
    }
    await deleteDoc(doc(db, 'users', user.id));
  }
}

async function main() {
  if (!fs.existsSync(PROOF_PATH)) {
    throw new Error(`Proof file not found: ${PROOF_PATH}`);
  }

  await ensureSignedIn();
  const settings = await getSettings();
  const products = await getAllProducts();
  const orders = await getAllOrders();
  const openProducts = buildOpenProductPlan(settings, products, orders);
  if (openProducts.length < 1) {
    throw new Error('No open products available.');
  }

  const startedSettings = {
    paymentsOpen: Boolean(settings.paymentsOpen),
    reviewStageOpen: Boolean(settings.reviewStageOpen),
    addOnly: Boolean(settings.addOnly),
  };

  const paymentCustomer = buildCustomer(1, openProducts[0].name, 3);
  const addOnlyCustomer = buildCustomer(2, openProducts[Math.min(1, openProducts.length - 1)].name, 3);
  const executablePath = BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));

  log(`Visible test prefix: ${TEST_PREFIX}`);
  log(`Payment flow product: ${paymentCustomer.productName}`);
  log(`Add-only flow product: ${addOnlyCustomer.productName}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 350,
    ...(executablePath ? { executablePath } : {}),
  });

  const shopContext = await browser.newContext();
  const adminContext = await browser.newContext();
  const shopAccessCode = String(settings.shopAccessCode || '');
  const shippingOptions = Array.isArray(settings.shippingOptions) && settings.shippingOptions.length > 0
    ? settings.shippingOptions
    : ['LBC', 'J&T', 'Lalamove'];
  const adminPassword = settings.adminPass || 'admin123';

  let adminPage;
  let paymentPage;
  let addOnlyPage;

  try {
    adminPage = await loginAdmin(adminContext, adminPassword);
    paymentPage = await openShopPage(shopContext, shopAccessCode);
    addOnlyPage = await openShopPage(shopContext, shopAccessCode);

    log('Saving payment-flow order in visible browser');
    await saveOrder(paymentPage, paymentCustomer);
    await sleep(1500);

    log('Opening payment window and submitting proof in visible browser');
    await toggleAdminSetting(adminPage, 'Payment Window', true, 'paymentsOpen');
    await sleep(1200);
    await submitPayment(paymentPage, paymentCustomer, shippingOptions);
    await sleep(1500);

    log('Closing payment window and preparing add-only scenario');
    await toggleAdminSetting(adminPage, 'Payment Window', false, 'paymentsOpen');
    await sleep(1000);

    log('Saving add-only baseline order in visible browser');
    await saveOrder(addOnlyPage, addOnlyCustomer);
    await sleep(1500);

    log('Enabling Add-Only Protection');
    await toggleAdminSetting(adminPage, 'Add-Only Protection', true, 'addOnly');
    await sleep(1200);

    log('Reloading saved order to demonstrate add-only protection');
    await addOnlyPage.reload({ waitUntil: 'domcontentloaded' });
    await sleep(1200);
    if (shopAccessCode) {
      const accessInput = addOnlyPage.getByPlaceholder('Paste the batch code here');
      if (await accessInput.count()) {
        await accessInput.fill(shopAccessCode);
        await addOnlyPage.getByRole('button', { name: /enter shop/i }).click();
        await sleep(1000);
      }
    }
    await loadExistingOrder(addOnlyPage, addOnlyCustomer.email);
    await sleep(1200);

    const minusButton = addOnlyPage.locator(`[data-name="${cssEscape(addOnlyCustomer.productName)}"] button`).filter({ hasText: '-' }).first();
    if (await minusButton.count()) {
      await minusButton.click();
      await sleep(1200);
    }

    log('Increasing quantity by 1 in add-only mode and saving');
    const qtyInput = addOnlyPage.locator(`[data-name="${cssEscape(addOnlyCustomer.productName)}"] input[type="number"]`).first();
    await qtyInput.fill('4');
    await sleep(700);
    await addOnlyPage.getByRole('button', { name: /save order/i }).first().click();
    await poll(
      'updated add-only order',
      async () => {
        const rows = await getOrdersForEmail(addOnlyCustomer.email);
        return rows.some((row) => row.product === addOnlyCustomer.productName && Number(row.qty || 0) === 4);
      },
      { timeoutMs: 30000, intervalMs: 750 },
    );
    await sleep(1500);

    log('Opening hit list and cutting the visible row');
    await clickSidebar(adminPage, 'Hit List');
    await setAdminSearch(adminPage, TEST_PREFIX);
    const cutButton = adminPage.getByRole('button', { name: /cut .* vials/i }).first();
    await poll('cut button visible', async () => await cutButton.count(), { timeoutMs: 15000, intervalMs: 500 });
    await cutButton.click();
    await sleep(1800);

    await poll(
      'trimmed order removed',
      async () => {
        const rows = await getOrdersForEmail(addOnlyCustomer.email);
        return rows.length === 0;
      },
      { timeoutMs: 30000, intervalMs: 1000 },
    );

    log('Visible regression run complete. Leaving browser open briefly for inspection.');
    await sleep(15000);
  } finally {
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        ...(await getSettings()),
        paymentsOpen: startedSettings.paymentsOpen,
        reviewStageOpen: startedSettings.reviewStageOpen,
        addOnly: startedSettings.addOnly,
      }, { merge: true });
    } catch {}

    try {
      await cleanupPrefix(TEST_PREFIX);
    } catch (error) {
      log(`Cleanup warning: ${error.message}`);
    }

    await sleep(1000);
    await adminContext.close().catch(() => {});
    await shopContext.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
