export default function ShopCheckoutHost({
  addressErrors,
  addressForm,
  canShowPaymentRoute,
  cartList,
  existingMap,
  hasValidPaymentRoute,
  isBtnLoading,
  isCartEditable,
  isReviewStageOpen,
  lockedPaymentSnapshot,
  onAddressChange,
  onAdjustCartItem,
  onClosePay,
  onClosePreview,
  onOpenPayFromPreview,
  onProofChange,
  onSubmitOrder,
  onSubmitPayment,
  originalBtn,
  partialShipOptions,
  settings,
  shakingProd,
  showPayModal,
  showPreviewModal,
  totalPHP,
  totalUSDSubtotal,
  currentPaymentRoute,
}) {
  return (
    <>
      {showPayModal && (
        <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-2 border-pink-200">
            <div className="bg-[#FFF0F5] p-4 flex justify-between items-center border-b border-[#FFC0CB]">
              <h2 className="brand-title text-xl text-pink-600">Checkout</h2>
              <button onClick={onClosePay} className="text-pink-600 font-black text-2xl hover:scale-110 transition-transform">&times;</button>
            </div>
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 hide-scroll bg-white">
              <div className="bg-pink-100 p-6 rounded-[24px] border-4 border-pink-200 text-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/40 to-transparent"></div>
                <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1 relative z-10">Total Amount to Pay</p>
                <h3 className="text-3xl sm:text-4xl font-black text-[#D6006E] drop-shadow-sm relative z-10">
                  {'\u20B1'}
                  {totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Send Payment To</p>
                  <p className="font-black text-[#D6006E] text-xs">{currentPaymentRoute.adminAssigned || 'Admin'}</p>
                </div>

                {canShowPaymentRoute ? (
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
                ) : hasValidPaymentRoute ? (
                  <p className="text-xs font-bold text-amber-600 text-center py-2">Payment routes are temporarily hidden by admin.</p>
                ) : (
                  <p className="text-xs font-bold text-rose-500 text-center py-2">No valid admin payment route is configured for this order yet.</p>
                )}
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <select value={addressForm.shipOpt} onChange={(e) => onAddressChange({ ...addressForm, shipOpt: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#4A042A] outline-none transition-all ${addressErrors.shipOpt ? 'animate-shake border-red-500 bg-red-50' : 'border-slate-200 focus:border-[#D6006E]'}`}>
                    <option value="" disabled>Select Courier...</option>
                    {settings.shippingOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <select value={addressForm.partialShipPref} onChange={(e) => onAddressChange({ ...addressForm, partialShipPref: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-[#4A042A] outline-none transition-all ${addressErrors.partialShipPref ? 'animate-shake border-red-500 bg-red-50' : 'border-slate-200 focus:border-[#D6006E]'}`}>
                    <option value="" disabled>If may maunang dumating...</option>
                    {partialShipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-relaxed text-amber-700">
                  Minsan hiwa-hiwalay dumadating ang kits. Pili ka dito kung gusto mo i-ship agad yung ready na, or okay lang sayo maghintay hanggang kumpleto lahat.
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <input type="text" value={addressForm.street} onChange={(e) => onAddressChange({ ...addressForm, street: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 transition-all ${addressErrors.street ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Street / Lot / Bldg *" />
                  <input type="text" value={addressForm.brgy} onChange={(e) => onAddressChange({ ...addressForm, brgy: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 sm:col-span-1 transition-all ${addressErrors.brgy ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Barangay *" />
                  <input type="text" value={addressForm.city} onChange={(e) => onAddressChange({ ...addressForm, city: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 sm:col-span-1 transition-all ${addressErrors.city ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="City *" />
                  <input type="text" value={addressForm.prov} onChange={(e) => onAddressChange({ ...addressForm, prov: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 sm:col-span-1 transition-all ${addressErrors.prov ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Province *" />
                  <input type="text" value={addressForm.zip} onChange={(e) => onAddressChange({ ...addressForm, zip: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 sm:col-span-1 transition-all ${addressErrors.zip ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Zip Code *" />
                  <input type="text" value={addressForm.contact} onChange={(e) => onAddressChange({ ...addressForm, contact: e.target.value })} className={`w-full bg-slate-50 border rounded-xl px-3 py-2 text-sm font-bold text-[#4A042A] outline-none col-span-2 transition-all ${addressErrors.contact ? 'animate-shake border-red-500 bg-red-50 placeholder:text-red-300' : 'border-slate-200 focus:border-[#D6006E]'}`} placeholder="Contact # *" />
                </div>
              </div>

              <div className={`bg-slate-50 p-2.5 rounded-xl border flex items-center justify-between transition-all duration-300 ${addressErrors.proofFile ? 'animate-shake border-red-500 bg-red-50' : 'border-slate-200'}`}>
                <input type="file" accept="image/*" onChange={(e) => onProofChange(e.target?.files?.[0] || null)} className={`w-full text-xs font-bold file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:text-white cursor-pointer ${addressErrors.proofFile ? 'text-red-600 file:bg-red-500' : 'text-[#D6006E] file:bg-[#FF1493] hover:file:bg-[#D6006E]'}`} />
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
                  <span>{'\u20B1'}{settings.adminFeePhp}</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-pink-100 bg-white">
              {!hasValidPaymentRoute ? (
                <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[11px] font-bold text-rose-600">
                  Payment proof is locked until your order has a real assigned admin with a bank or QR route.
                </p>
              ) : !canShowPaymentRoute ? (
                <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-bold text-amber-700">
                  Payment instructions are hidden right now. Wait for admin to show the route before uploading proof.
                </p>
              ) : null}
              <button onClick={onSubmitPayment} disabled={isBtnLoading || !hasValidPaymentRoute || !canShowPaymentRoute} className={`${originalBtn} w-full py-3 disabled:cursor-not-allowed disabled:opacity-50`}>
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
              <button onClick={onClosePreview} className="text-pink-600 font-black text-2xl hover:scale-110 transition-transform">&times;</button>
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
                            Saved x{existingMap[i.product]}
                          </span>
                          {i.qty !== existingMap[i.product] && (
                            <span className="rounded-full bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5">
                              Current x{i.qty}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {isCartEditable ? (
                        <div className={`flex items-center gap-1 justify-end mb-1 rounded-full px-1 py-0.5 transition-all ${shakingProd === i.product ? 'animate-shake bg-red-50 ring-2 ring-red-200' : ''}`}>
                          <button onClick={() => onAdjustCartItem(i.product, -1)} className={`w-7 h-7 rounded-full border font-black leading-none transition-colors ${shakingProd === i.product ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-pink-200 bg-white text-[#D6006E] hover:bg-pink-50'}`}>
                            -
                          </button>
                          <span className={`min-w-[36px] text-center font-black ${shakingProd === i.product ? 'text-red-600' : 'text-[#D6006E]'}`}>
                            {i.qty}
                          </span>
                          <button onClick={() => onAdjustCartItem(i.product, 1)} className={`w-7 h-7 rounded-full border font-black leading-none transition-colors ${shakingProd === i.product ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-pink-200 bg-white text-[#D6006E] hover:bg-pink-50'}`}>
                            +
                          </button>
                        </div>
                      ) : (
                        i.qty !== (existingMap[i.product] || 0) ? <span className="text-[#D6006E] font-black">x{i.qty}</span> : null
                      )}
                      <div className="text-[11px] text-gray-500 font-bold">${(i.price * i.qty).toFixed(2)}</div>
                    </div>
                  </div>
                ))
              )}
              <div className="pt-4 space-y-2 text-sm border-t-2 border-pink-100">
                <div className="flex justify-between font-bold text-gray-500 uppercase"><span>Subtotal</span><span>${totalUSDSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-gray-500 uppercase"><span>Admin Fee</span><span>{'\u20B1'}{settings.adminFeePhp}</span></div>
              </div>
            </div>
            <div className="p-6 border-t-2 border-pink-50 bg-[#FFF0F5]">
              <div className="flex justify-between items-center mb-4">
                <span className="font-bold text-pink-400">TOTAL PHP</span>
                <span className="text-2xl font-black text-pink-600">{'\u20B1'}{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col gap-2">
                {!settings.paymentsOpen ? (
                  isReviewStageOpen ? (
                    <div className="w-full rounded-full border-2 border-sky-200 bg-sky-50 py-3 text-center text-sm font-black uppercase tracking-widest text-sky-700">
                      Review Only - Edits Paused
                    </div>
                  ) : (
                    <button onClick={onSubmitOrder} disabled={isBtnLoading} className={originalBtn + ' w-full'}>
                      {isBtnLoading ? 'Saving...' : 'Save Order'}
                    </button>
                  )
                ) : (
                  <button onClick={onOpenPayFromPreview} disabled={cartList.length === 0} className="w-full bg-[#008040] text-white font-bold py-3 rounded-full uppercase tracking-widest text-sm shadow-md disabled:opacity-50">
                    Pay Now
                  </button>
                )}
                <button onClick={onClosePreview} className="w-full rounded-full border-2 border-pink-200 bg-white py-3 text-sm font-black uppercase tracking-widest text-[#D6006E] hover:bg-pink-50">
                  {settings.paymentsOpen ? 'Close Review' : isReviewStageOpen ? 'Back to Review' : 'Continue Shopping'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
