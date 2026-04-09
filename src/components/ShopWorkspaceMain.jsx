import { useState } from 'react';
import { ArrowRight, BookOpen, ClipboardList, Lock, Package, Search, ShieldCheck, Users } from 'lucide-react';

export default function ShopWorkspaceMain({
  buildProductInfo,
  cancelEntireOrder,
  cartInputDrafts,
  cartItems,
  cartList,
  confirmAction,
  currentProtectionSummary,
  currentReviewReady,
  customerEmail,
  customerEmailConfirm,
  customerFormInput,
  customerHandle,
  customerName,
  customerProfile,
  existingMap,
  filteredShopProducts,
  getAvailabilityMessage,
  getCustomerFormInputClass,
  getProductImageSrc,
  getRealProductImageSrc,
  handleCartBlur,
  handleCartChange,
  handleCartFocus,
  handleLookup,
  hasExistingOrder,
  isCartEditable,
  isCurrentUserAtRisk,
  isOrderOnlyMode,
  isReviewStageOpen,
  isScrolled,
  liveResultsLabel,
  onClearCancelOrder,
  onClearFilters,
  onConfirmBuyerReview,
  onCustomerEmailChange,
  onCustomerEmailConfirmChange,
  onCustomerHandleChange,
  onCustomerNameChange,
  onOpenHitList,
  onOpenPayModal,
  onOpenPreview,
  onOpenProfileHistory,
  onQuickInfo,
  onRequestCancelOrder,
  onSelectedCategoryChange,
  onToggleHowTo,
  orderCardDescription,
  orderCardEyebrow,
  orderCardFlowCopy,
  orderCardFlowLabel,
  orderCardProfileCopy,
  orderCardProtectionCopy,
  orderCardStatus,
  orderCardTitle,
  popularCategories,
  protectionAnnouncement,
  products,
  searchQuery,
  selectedCategory,
  selectedVialCount,
  settings,
  shakingField,
  shakingProd,
  showAmbulance,
  showHowTo,
  showToast,
  totalPHP,
}) {
  const [showProtectionAnnouncement, setShowProtectionAnnouncement] = useState(false);

  return (
    <div className="space-y-4 w-full min-w-0">
        {isCurrentUserAtRisk && (
          <div className="glass-note border border-rose-300 p-4 rounded-[22px] shadow-sm animate-pulse flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-rose-700 font-black text-sm mb-1">Your loose vials need buffer</h3>
              <p className="text-xs text-rose-600 font-bold">Wala pang enough buffer ang loose vials mo. We encourage you to add more or find others para makumpleto ang box.</p>
            </div>
            <button onClick={onOpenHitList} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md hover:bg-rose-700 whitespace-nowrap transition-transform hover:scale-105">
              View hit list
            </button>
          </div>
        )}

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
                <button onClick={onToggleHowTo} className="order-form-chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E] transition-colors hover:bg-white/90">
                  <BookOpen size={13} />
                  {showHowTo ? 'Hide Steps' : 'How It Works'}
                </button>
                {customerProfile && (
                  <button onClick={onOpenProfileHistory} className="order-form-chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E] transition-colors hover:bg-white/90">
                    <Users size={13} />
                    Profile & Address
                  </button>
                )}
                {hasExistingOrder && !settings.paymentsOpen && !settings.addOnly && !settings.reviewStageOpen && (
                  confirmAction.type === 'cancelOrder' && confirmAction.id === customerEmail.toLowerCase().trim() ? (
                    <>
                      <button onClick={cancelEntireOrder} className="inline-flex items-center rounded-full bg-rose-500 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white shadow-sm transition-colors hover:bg-rose-600">
                        Confirm Cancel
                      </button>
                      <button onClick={onClearCancelOrder} className="order-form-chip inline-flex items-center rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-600 transition-colors hover:bg-white/90">
                        Keep Order
                      </button>
                    </>
                  ) : (
                    <button onClick={onRequestCancelOrder} className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50/90 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-rose-600 transition-colors hover:bg-rose-100">
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
                    <input type="email" value={customerEmail} onChange={onCustomerEmailChange} onBlur={!settings.paymentsOpen && !isReviewStageOpen ? handleLookup : undefined} className={getCustomerFormInputClass('email')} placeholder="Enter email to load your profile..." />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D6006E]">Confirm email</label>
                    <input type="email" value={customerEmailConfirm} onChange={onCustomerEmailConfirmChange} onBlur={settings.paymentsOpen || isReviewStageOpen ? handleLookup : undefined} className={getCustomerFormInputClass('emailConfirm')} placeholder="Type your email again..." />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D6006E]">Name</label>
                    <input type="text" value={customerName} onChange={onCustomerNameChange} className={getCustomerFormInputClass('name')} placeholder="Full name" disabled={settings.paymentsOpen || settings.reviewStageOpen} />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="mb-1 block pl-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#D6006E]">Handle</label>
                    <input type="text" value={customerHandle} onChange={onCustomerHandleChange} className={customerFormInput} placeholder="@username" disabled={settings.paymentsOpen || settings.reviewStageOpen} />
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

              {currentProtectionSummary && (
                <div className="order-summary-card rounded-[24px] border border-pink-200/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(255,244,249,0.92))] p-4 shadow-[0_22px_55px_rgba(214,0,110,0.10)] ring-1 ring-white/70">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] shadow-[0_10px_24px_rgba(214,0,110,0.14)] ring-1 ring-white/80 ${
                      !settings.addOnly && !isReviewStageOpen && !settings.paymentsOpen ? 'animate-pulse' : ''
                    } ${
                      currentProtectionSummary.tone === 'emerald'
                        ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(16,185,129,0.18))] text-emerald-700'
                        : currentProtectionSummary.tone === 'amber'
                          ? 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(245,158,11,0.2))] text-amber-700'
                          : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(244,63,94,0.18))] text-rose-700'
                    }`}>
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D6006E]">Current protection</p>
                        {protectionAnnouncement ? (
                          <button
                            type="button"
                            onClick={() => setShowProtectionAnnouncement((value) => !value)}
                            className="inline-flex items-center rounded-full border border-pink-200 bg-white/92 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#D6006E] shadow-sm transition-colors hover:bg-pink-50"
                          >
                            {showProtectionAnnouncement ? 'Hide Guide' : 'How This Works'}
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-sm font-black leading-snug text-[#4A042A]">{currentProtectionSummary.label}</p>
                      <p className="mt-1.5 max-w-[56rem] text-[11px] font-bold leading-relaxed text-[#8F2C5D]">{currentProtectionSummary.detail}</p>
                      {showProtectionAnnouncement && protectionAnnouncement ? (
                        <div className="mt-3 rounded-[18px] border border-pink-200 bg-white/90 px-3.5 py-3 shadow-[0_12px_24px_rgba(74,4,42,0.06)]">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#D6006E]">{protectionAnnouncement.title}</p>
                          <div className="mt-2 space-y-1.5">
                            {protectionAnnouncement.lines.map((line) => (
                              <p key={line} className="text-[11px] font-bold leading-relaxed text-[#4A042A]">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {currentProtectionSummary.sections?.length ? (
                        <div className="mt-4 space-y-3">
                          {currentProtectionSummary.sections.map((section) => (
                            <div
                              key={section.key}
                              className={`relative overflow-hidden rounded-[18px] border px-3.5 py-3 shadow-[0_16px_30px_rgba(74,4,42,0.06)] ring-1 ring-white/70 ${
                                section.tone === 'emerald'
                                  ? 'border-emerald-200 bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(209,250,229,0.82))]'
                                  : section.tone === 'amber'
                                    ? 'border-amber-200 bg-[linear-gradient(145deg,rgba(255,251,235,0.98),rgba(254,240,138,0.22))]'
                                    : 'border-rose-200 bg-[linear-gradient(145deg,rgba(255,241,242,0.98),rgba(255,228,230,0.9))]'
                              }`}
                            >
                              <div className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] ${
                                !settings.addOnly && !isReviewStageOpen && !settings.paymentsOpen ? 'animate-pulse' : ''
                              } ${
                                section.tone === 'emerald'
                                  ? 'bg-emerald-400/80'
                                  : section.tone === 'amber'
                                    ? 'bg-amber-400/80'
                                    : 'bg-rose-400/80'
                              }`} />
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#4A042A]">{section.title}</p>
                                  <p className="mt-1.5 max-w-[42rem] text-[11px] font-bold leading-relaxed text-[#8F2C5D]">{section.description}</p>
                                </div>
                                <div className="shrink-0 rounded-[16px] border border-white/90 bg-white/92 px-3 py-2.5 shadow-[0_12px_24px_rgba(74,4,42,0.08)]">
                                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">{section.subtotalLabel}</p>
                                  <p className="mt-1 text-base font-black text-[#4A042A]">{"\u20B1"}{Number(section.subtotalPHP || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                </div>
                              </div>
                              {section.items.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {section.items.map((item) => (
                                    <span
                                      key={typeof item === 'string' ? item : item.key}
                                      className="inline-flex rounded-full border border-white/85 bg-white/88 px-2.5 py-1.5 text-[10px] font-semibold text-[#4A042A] shadow-[0_8px_18px_rgba(74,4,42,0.06)]"
                                    >
                                      {typeof item === 'string' ? item : (
                                        <>
                                          <span className={`mr-1.5 ${
                                            section.tone === 'emerald'
                                              ? 'text-emerald-700'
                                              : section.tone === 'amber'
                                                ? 'text-amber-700'
                                                : 'text-rose-700'
                                          }`}>
                                            {item.product}
                                          </span>
                                          {item.qtyText ? <span className="font-black text-[#2F0A1E]">{item.qtyText}</span> : null}
                                          {item.boxText ? (
                                            <>
                                              <span className="mx-1">mo ay nasa</span>
                                              <span className="font-black text-[#2F0A1E]">{item.boxText}</span>
                                            </>
                                          ) : null}
                                          {item.suffix ? <span className="ml-1">{item.suffix}</span> : null}
                                        </>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                  {section.emptyText}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {currentProtectionSummary.note ? (
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                          {currentProtectionSummary.note}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
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
                        <p className="mt-1 text-xs font-bold text-slate-500">{settings.paymentsOpen ? 'Includes admin fee' : 'Review this total before payments open'}</p>
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
                          <button onClick={onOpenPreview} className="rounded-full border-2 border-pink-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#D6006E] shadow-sm hover:bg-pink-50">
                            Review Saved Order
                          </button>
                          {settings.paymentsOpen ? (
                            <button onClick={onOpenPayModal} className="rounded-full bg-[#008040] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-md hover:scale-[0.98] transition-transform active:scale-95">
                              Pay Now
                            </button>
                          ) : (
                            <button
                              onClick={onConfirmBuyerReview}
                              disabled={currentReviewReady}
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-colors hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {currentReviewReady ? 'Already Marked' : 'Looks Good to Me'}
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
                <div className={`w-full shrink-0 sm:w-auto transition-all duration-300 ${isScrolled ? 'hidden sm:block' : 'block'}`}>
                  <h2 className="font-black text-[#D6006E] uppercase tracking-widest text-sm sm:text-base flex items-center gap-2 whitespace-nowrap">
                    <Package size={22} className="text-[#FF1493]" /> Shop Catalog
                  </h2>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">
                    {liveResultsLabel} shown, {selectedVialCount} vials selected
                  </p>
                </div>

                <div className="min-w-0 w-full flex-1 flex flex-col gap-1 sm:w-auto sm:gap-2">
                  <div className="flex gap-2 overflow-x-auto hide-scroll pb-1 pl-[106px] sm:pl-0">
                    {popularCategories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => onSelectedCategoryChange(cat)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors border shadow-sm ${selectedCategory === cat ? 'bg-[#D6006E] text-white border-[#D6006E]' : 'bg-white text-slate-500 border-pink-100 hover:border-pink-300 hover:text-pink-600'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                    <input type="text" value={searchQuery} onChange={(e) => onClearFilters(false, e.target.value)} placeholder="Search products..." className="w-full pl-11 pr-4 py-1.5 sm:py-3 rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold border-2 border-pink-200 outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100 transition-all bg-[#FFF0F5] placeholder:text-pink-300 text-[#4A042A] shadow-inner" />
                  </div>
                  {(searchQuery || selectedCategory !== 'All') && (
                    <div className="flex items-center justify-between gap-3 px-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Viewing {liveResultsLabel}
                      </p>
                      <button onClick={() => onClearFilters(true)} className="text-[10px] font-black text-[#D6006E] uppercase tracking-widest hover:underline">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 p-2 sm:p-3 bg-white/10 rounded-b-[30px] defer-render-xl">
                  {filteredShopProducts.map((p) => {
                    const cart = cartItems[p.name] || { v: 0 };
                    const active = cart.v > 0;
                    const exist = existingMap[p.name] || 0;
                    const productInfo = buildProductInfo(p.name);
                    const productImage = getProductImageSrc(productInfo);
                    const productImageSrc = getRealProductImageSrc(p.name, p.imageUrl || '');
                    const protectedKits = Math.floor((p.totalVials || 0) / 10);
                    const looseVials = (p.totalVials || 0) % 10;
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
                              <button onClick={() => onQuickInfo(productInfo)} className="shrink-0 rounded-full border border-pink-200 bg-pink-50 text-pink-600 w-4 h-4 flex items-center justify-center text-[9px] font-black leading-none hover:bg-pink-100 transition-colors" title="Learn more">
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
                                onFocus={(e) => handleCartFocus(p.name, e)}
                                onChange={(e) => handleCartChange(p.name, e.target.value)}
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
  );
}
