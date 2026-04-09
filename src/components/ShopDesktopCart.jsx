export default function ShopDesktopCart({
  cartList,
  desktopCartAsideClass,
  desktopCartShellClass,
  desktopCartTitleClass,
  existingMap,
  isBtnLoading,
  isCartEditable,
  isReviewStageOpen,
  onAdjustCartItem,
  onOpenPayModal,
  onOpenPreview,
  onSubmitOrder,
  originalBtn,
  settings,
  shakingProd,
  subtotalUSD,
  totalPHP,
}) {
  return (
    <aside className={desktopCartAsideClass}>
      <div className={desktopCartShellClass}>
        <div className="border-b border-[#ECD8E0] pb-3 mb-4 text-center">
          <h3 className={desktopCartTitleClass}>Your Cart</h3>
        </div>
        {settings.addOnly && cartList.length > 0 && (
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
                    <button onClick={() => onAdjustCartItem(i.product, -1)} className={`w-6 h-6 rounded-full border font-black leading-none transition-colors ${shakingProd === i.product ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-pink-200 bg-white text-[#D6006E] hover:bg-pink-50'}`}>
                      -
                    </button>
                    <span className={`min-w-[34px] text-center font-black ${shakingProd === i.product ? 'text-red-600' : 'text-[#D6006E]'}`}>
                      {i.qty}
                    </span>
                    <button onClick={() => onAdjustCartItem(i.product, 1)} className={`w-6 h-6 rounded-full border font-black leading-none transition-colors ${shakingProd === i.product ? 'border-red-300 bg-red-50 text-red-600 hover:bg-red-100' : 'border-pink-200 bg-white text-[#D6006E] hover:bg-pink-50'}`}>
                      +
                    </button>
                  </div>
                ) : (
                  i.qty !== (existingMap[i.product] || 0) ? <span className="text-[#D6006E] font-black">x{i.qty}</span> : null
                )}
                <div className="mt-1 inline-flex items-center rounded-full bg-[#FFF0F5] border border-pink-100 px-2 py-0.5 text-[10px] text-[#D6006E] font-black">
                  {`Total $${(i.price * i.qty).toFixed(2)}`}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-4 border-t-2 border-pink-100 space-y-1 text-sm xl:text-base">
          <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Subtotal</span><span>${subtotalUSD.toFixed(2)}</span></div>
          <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Admin Fee</span><span>{`\u20B1${settings.adminFeePhp}`}</span></div>
          <div className="flex flex-col items-end pt-2">
            <span className="text-3xl xl:text-4xl font-black text-[#D6006E]">{`\u20B1${totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-6">
          <button onClick={onOpenPreview} disabled={cartList.length === 0} className="w-full bg-white text-[#D6006E] border-2 border-pink-200 font-bold py-4 rounded-full uppercase tracking-widest text-sm shadow-sm hover:bg-pink-50 disabled:opacity-50 transition-transform hover:scale-[0.98] active:scale-95">Review</button>
          {!settings.paymentsOpen ? (
            isReviewStageOpen ? (
              <div className="rounded-[22px] border border-sky-200 bg-sky-50 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-sky-700">
                Buyer edits paused during review
              </div>
            ) : (
              <button onClick={onSubmitOrder} disabled={isBtnLoading} className={`${originalBtn} w-full py-4`}>
                {isBtnLoading ? "Saving..." : "Save Order"}
              </button>
            )
          ) : (
            <button onClick={onOpenPayModal} disabled={cartList.length === 0} className="w-full bg-[#008040] text-white font-bold py-4 rounded-full uppercase tracking-widest text-sm shadow-md hover:scale-[0.98] transition-transform active:scale-95 disabled:opacity-50">Pay Now</button>
          )}
        </div>
      </div>
    </aside>
  );
}
