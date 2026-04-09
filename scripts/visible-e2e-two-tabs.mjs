import { chromium } from 'playwright';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
};

const BASE_URL = process.env.BBP_BASE_URL || 'http://127.0.0.1:4176/';
const TEST_PREFIX = process.env.BBP_TEST_PREFIX || `codex.visiblee2e.${Date.now()}`;
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
  if (lastError) throw new Error(`${label} timed out. Last error: ${lastError.message}`);
  throw new Error(`${label} timed out.`);
}

async function withStepTimeout(stepName, fn, timeoutMs = 60000) {
  return await Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${stepName} exceeded ${timeoutMs}ms`)), timeoutMs)),
  ]);
}

async function closeWithTimeout(label, fn, timeoutMs = 5000) {
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} exceeded ${timeoutMs}ms`)), timeoutMs)),
    ]);
  } catch (error) {
    log(`Teardown warning: ${error.message}`);
  }
}

function cssEscape(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function ensureSignedIn() {
  if (!auth.currentUser) await signInAnonymously(auth);
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
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })).filter((row) => String(row.email || '') === email);
}

async function getUser(email) {
  const snap = await getDoc(doc(db, 'users', email));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function getLogsForEmail(email) {
  const snap = await getDocs(collection(db, 'logs'));
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })).filter((row) => String(row.email || '') === email);
}

function buildOpenProducts(settings, products, orders) {
  const totalsByProduct = {};
  for (const order of orders) {
    const name = String(order.product || '');
    totalsByProduct[name] = (totalsByProduct[name] || 0) + Number(order.qty || 0);
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
    .sort((a, b) => a.name.localeCompare(b.name));
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

async function openPage(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await sleep(1200);
}

async function loginAdmin(adminPage, adminPassword) {
  await adminPage.getByTitle('Admin Access').click();
  await sleep(700);
  for (const attempt of Array.from(new Set([adminPassword, 'admin123'].filter(Boolean)))) {
    const passwordInput = adminPage.getByPlaceholder('Password');
    await passwordInput.fill('');
    await passwordInput.fill(attempt);
    await adminPage.getByRole('button', { name: /enter dashboard/i }).click();
    await sleep(1600);
    if (await adminPage.getByPlaceholder('Password').count() === 0) return;
  }
  throw new Error('Admin login failed.');
}

async function setAdminSearch(page, value) {
  const search = page.getByPlaceholder('Global Search (Ctrl+F equivalent)...');
  await search.fill(value);
  await search.press('Tab');
  await sleep(700);
}

async function clickSidebar(page, label) {
  await page.getByRole('button', { name: new RegExp(label, 'i') }).click();
  await sleep(900);
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
    `${label} ${shouldBeOpen ? 'enabled' : 'disabled'}`,
    async () => Boolean((await getSettings())[settingsKey]) === shouldBeOpen,
    { timeoutMs: 30000, intervalMs: 500 },
  );
  await sleep(1000);
}

async function loadCustomerOrder(shopPage, email, paymentOrReviewMode = false) {
  const emailInputs = shopPage.locator('#top-form-card input[type="email"]');
  if (paymentOrReviewMode) {
    await emailInputs.nth(0).click();
    await emailInputs.nth(0).fill('');
    await emailInputs.nth(0).pressSequentially(email, { delay: 45 });
    await sleep(300);
    await emailInputs.nth(1).click();
    await emailInputs.nth(1).fill('');
    await emailInputs.nth(1).pressSequentially(email, { delay: 45 });
    await sleep(700);
    await emailInputs.nth(1).press('Tab');
    await sleep(1800);
  } else {
    await emailInputs.nth(0).fill(email);
    await emailInputs.nth(1).fill(email);
    await sleep(250);
    await emailInputs.nth(0).press('Tab');
    await sleep(1200);
  }
}

async function saveOrder(shopPage, customer) {
  await shopPage.bringToFront();
  await loadCustomerOrder(shopPage, customer.email, false);
  await shopPage.getByPlaceholder('Full name').fill(customer.name);
  await shopPage.getByPlaceholder('@username').fill(customer.handle);
  await fillProductQty(shopPage, customer.productName, customer.qty);
  await sleep(600);
  await shopPage.getByRole('button', { name: /save order/i }).first().click();
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

async function verifyActiveOrders(adminPage, prefix, expectedRows) {
  await adminPage.bringToFront();
  await clickSidebar(adminPage, 'Active Orders');
  await setAdminSearch(adminPage, prefix);
  await poll(
    'active orders count',
    async () => {
      const count = await adminPage.locator('table tbody tr').count();
      return count >= expectedRows ? count : 0;
    },
    { timeoutMs: 30000, intervalMs: 1000 },
  );
}

async function verifyPayments(adminPage, prefix, expectedRows) {
  await adminPage.bringToFront();
  await clickSidebar(adminPage, 'Payments');
  await setAdminSearch(adminPage, prefix);
  await poll(
    'payment rows count',
    async () => {
      const count = await adminPage.locator('table tbody tr').count();
      return count >= expectedRows ? count : 0;
    },
    { timeoutMs: 30000, intervalMs: 1000 },
  );
}

async function testAddOnlyAndCut(shopPage, adminPage, customerB) {
  log('Testing add-only protection');
  await toggleAdminSetting(adminPage, 'Add-Only Protection', true, 'addOnly');

  await shopPage.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await loadCustomerOrder(shopPage, customerB.email, false);

  const qtySelector = `[data-name="${cssEscape(customerB.productName)}"] input[type="number"]`;
  const qtyInput = shopPage.locator(qtySelector).first();
  await qtyInput.fill('2');
  await qtyInput.press('Tab');
  await sleep(1200);
  const lockedValue = await qtyInput.inputValue();
  if (lockedValue !== '3') {
    throw new Error(`Add-only reduction guard failed; expected 3, got ${lockedValue}`);
  }

  await qtyInput.fill('4');
  await qtyInput.press('Tab');
  await sleep(800);
  await shopPage.getByRole('button', { name: /save order/i }).first().click();
  await poll(
    'customer B saved qty 4',
    async () => {
      const rows = await getOrdersForEmail(customerB.email);
      return rows.some((row) => row.product === customerB.productName && Number(row.qty || 0) === 4);
    },
    { timeoutMs: 30000, intervalMs: 750 },
  );

  log('Testing hit list cut');
  await adminPage.bringToFront();
  await clickSidebar(adminPage, 'Hit List');
  await setAdminSearch(adminPage, TEST_PREFIX);
  const cutButton = adminPage.getByRole('button', { name: /cut \d+ vials/i }).first();
  await poll('cut button present', async () => await cutButton.count(), { timeoutMs: 20000, intervalMs: 500 });
  await cutButton.click();
  await sleep(600);
  await adminPage.getByRole('button', { name: /^yes$/i }).click();
  await poll(
    'customer B order cut',
    async () => {
      const rows = await getOrdersForEmail(customerB.email);
      return rows.length === 0;
    },
    { timeoutMs: 30000, intervalMs: 1000 },
  );

  await toggleAdminSetting(adminPage, 'Add-Only Protection', false, 'addOnly');
}

async function testReviewAndPayment(shopPage, adminPage, customerA, shippingOptions) {
  log('Testing review stage');
  await toggleAdminSetting(adminPage, 'Review Stage', true, 'reviewStageOpen');

  log('Reloading shop for review-stage buyer flow');
  await shopPage.bringToFront();
  await shopPage.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await poll(
    'review-stage banner visible',
    async () => (await shopPage.getByText(/review stage is open|review window live/i).count()) > 0,
    { timeoutMs: 20000, intervalMs: 500 },
  );
  await loadCustomerOrder(shopPage, customerA.email, true);
  await poll(
    'review snapshot visible',
    async () => {
      const snapshotCard = shopPage.getByText(/saved order snapshot/i).first();
      const productText = shopPage.getByText(customerA.productName).first();
      return (await snapshotCard.count()) > 0 && (await productText.count()) > 0;
    },
    { timeoutMs: 20000, intervalMs: 500 },
  );
  log('Clicking Looks Good to Me');
  await shopPage.getByRole('button', { name: /looks good to me/i }).click();
  await poll(
    'buyer review marked',
    async () => Boolean((await getUser(customerA.email))?.buyerReviewConfirmedAt),
    { timeoutMs: 30000, intervalMs: 750 },
  );

  log('Testing payment window and hidden payment routes');
  await toggleAdminSetting(adminPage, 'Payment Window', true, 'paymentsOpen');
  await toggleAdminSetting(adminPage, 'Show Payment Routes', false, 'paymentRoutesVisible');

  log('Reloading shop for hidden-route payment flow');
  await shopPage.bringToFront();
  await shopPage.reload({ waitUntil: 'domcontentloaded' });
  await sleep(1200);
  await poll(
    'payment-stage banner visible',
    async () => (await shopPage.getByText(/payments are open|payment window live/i).count()) > 0,
    { timeoutMs: 20000, intervalMs: 500 },
  );
  await loadCustomerOrder(shopPage, customerA.email, true);
  log('Opening Pay Now with routes hidden');
  await shopPage.getByRole('button', { name: /^pay now$/i }).first().click();
  await sleep(1000);
  const hiddenMessage = shopPage.getByText(/payment routes are temporarily hidden by admin/i).first();
  const completePaymentBtn = shopPage.getByRole('button', { name: /complete payment/i }).first();
  if (!(await hiddenMessage.count()) || !(await completePaymentBtn.isDisabled())) {
    throw new Error('Hidden payment routes state did not appear correctly.');
  }

  log('Showing payment routes and submitting proof');
  await adminPage.bringToFront();
  await toggleAdminSetting(adminPage, 'Show Payment Routes', true, 'paymentRoutesVisible');

  await shopPage.bringToFront();
  await sleep(1200);
  log('Filling payment form and uploading proof');
  const courierSelect = shopPage.locator('select').nth(0);
  const partialShipSelect = shopPage.locator('select').nth(1);
  await courierSelect.selectOption({ label: shippingOptions[0] || 'LBC' });
  await partialShipSelect.selectOption('ship-ready');
  await shopPage.getByPlaceholder('Street / Lot / Bldg *').fill(customerA.address.street);
  await shopPage.getByPlaceholder('Barangay *').fill(customerA.address.brgy);
  await shopPage.getByPlaceholder('City *').fill(customerA.address.city);
  await shopPage.getByPlaceholder('Province *').fill(customerA.address.prov);
  await shopPage.getByPlaceholder('Zip Code *').fill(customerA.address.zip);
  await shopPage.getByPlaceholder('Contact # *').fill(customerA.address.contact);
  await shopPage.locator('input[type="file"]').setInputFiles(PROOF_PATH);
  await sleep(800);
  await completePaymentBtn.click();
  await poll(
    'customer A payment submitted',
    async () => {
      const user = await getUser(customerA.email);
      const logs = await getLogsForEmail(customerA.email);
      return Boolean(user?.isPaid && user?.proofUrl && logs.some((row) => row.action === 'Submitted Payment'));
    },
    { timeoutMs: 45000, intervalMs: 1000 },
  );

  log('Verifying admin payments tab');
  await verifyPayments(adminPage, TEST_PREFIX, 1);
}

async function main() {
  if (!fs.existsSync(PROOF_PATH)) throw new Error(`Proof file not found: ${PROOF_PATH}`);
  await ensureSignedIn();

  const startedSettings = await getSettings();
  const products = await getAllProducts();
  const orders = await getAllOrders();
  const openProducts = buildOpenProducts(startedSettings, products, orders);
  if (openProducts.length < 2) throw new Error('Need at least two open products for the visible E2E test.');

  const customerA = buildCustomer(1, openProducts[0].name, 3);
  const customerB = buildCustomer(2, openProducts[1].name, 3);
  const shippingOptions = Array.isArray(startedSettings.shippingOptions) && startedSettings.shippingOptions.length
    ? startedSettings.shippingOptions
    : ['Lalamove', 'LBC', 'J&T'];

  const executablePath = BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  const browser = await chromium.launch({
    headless: false,
    slowMo: 400,
    ...(executablePath ? { executablePath } : {}),
  });
  const context = await browser.newContext();
  const shopPage = await context.newPage();
  const adminPage = await context.newPage();
  let runError = null;
  adminPage.on('dialog', async (dialog) => {
    log(`Admin dialog: ${dialog.message()}`);
    await dialog.accept();
  });

  try {
    log(`Visible E2E prefix: ${TEST_PREFIX}`);
    log(`Customer A product: ${customerA.productName}`);
    log(`Customer B product: ${customerB.productName}`);

    await withStepTimeout('open shop tab', async () => openPage(shopPage, BASE_URL), 30000);
    await withStepTimeout('open admin tab', async () => openPage(adminPage, BASE_URL), 30000);
    await withStepTimeout('admin login', async () => loginAdmin(adminPage, startedSettings.adminPass || 'admin123'), 45000);

    await withStepTimeout('save customer A', async () => saveOrder(shopPage, customerA), 60000);
    await withStepTimeout('save customer B', async () => saveOrder(shopPage, customerB), 60000);
    await withStepTimeout('verify active orders', async () => verifyActiveOrders(adminPage, TEST_PREFIX, 2), 45000);
    await withStepTimeout('add-only and cut flow', async () => testAddOnlyAndCut(shopPage, adminPage, customerB), 120000);
    await withStepTimeout('review and payment flow', async () => testReviewAndPayment(shopPage, adminPage, customerA, shippingOptions), 180000);

    log(`Visible E2E completed. Prefix left in live data for inspection: ${TEST_PREFIX}`);
    log('Inspection pause: browser will remain open for 15 seconds, then close automatically.');
    await sleep(15000);
  } catch (error) {
    runError = error;
    try {
      const artifactDir = path.join(workspaceRoot, '.artifacts');
      fs.mkdirSync(artifactDir, { recursive: true });
      const safePrefix = TEST_PREFIX.replace(/[^\w.-]+/g, '_');
      await shopPage.screenshot({ path: path.join(artifactDir, `${safePrefix}-shop-failure.png`), fullPage: true }).catch(() => {});
      await adminPage.screenshot({ path: path.join(artifactDir, `${safePrefix}-admin-failure.png`), fullPage: true }).catch(() => {});
      log(`Failure screenshots saved to ${artifactDir}`);
    } catch {}
    console.error(error);
  } finally {
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        ...startedSettings,
        paymentsOpen: Boolean(startedSettings.paymentsOpen),
        reviewStageOpen: Boolean(startedSettings.reviewStageOpen),
        addOnly: Boolean(startedSettings.addOnly),
        paymentRoutesVisible: startedSettings.paymentRoutesVisible !== false,
      }, { merge: true });
    } catch (error) {
      log(`Settings restore warning: ${error.message}`);
    }
    await closeWithTimeout('context.close()', () => context.close());
    await closeWithTimeout('browser.close()', () => browser.close());
    process.exit(runError ? 1 : 0);
  }
}

main();
