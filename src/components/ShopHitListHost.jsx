import { useEffect, useState } from 'react';

export default function ShopHitListHost({
  adjustCartItem,
  cartItems,
  closeHitList,
  confirmHitListIncrease,
  customerEmail,
  existingOrderItems,
  isBtnLoading,
  isCartEditable,
  isHitListSaveReady,
  isReviewStageOpen,
  onClosePendingAdd,
  onPendingAddChange,
  onPendingAddConfirm,
  originalBtn,
  pendingHitListAdd,
  productsByName,
  settings,
  submitOrder,
  trimmingHitList,
}) {
  const [pendingAddDraft, setPendingAddDraft] = useState('');
  const userEmailTrimmed = customerEmail.toLowerCase().trim();
  useEffect(() => {
    setPendingAddDraft(pendingHitListAdd ? String(pendingHitListAdd.addQty || 1) : '');
  }, [pendingHitListAdd]);

  function commitPendingAddDraft(rawValue) {
    const normalized = String(rawValue ?? '').replace(/[^\d]/g, '');
    const nextQty = Math.max(1, parseInt(normalized, 10) || 1);
    setPendingAddDraft(String(nextQty));
    onPendingAddChange(nextQty);
  }

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
  }, {})).map((group) => ({
    ...group,
    customers: new Set(group.rows.map((row) => row.email)).size,
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
    <>
      <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border-2 border-pink-200">
          <div className="bg-[#FFF0F5] p-4 flex justify-between items-center border-b border-[#FFC0CB]">
            <h2 className="brand-title text-xl text-rose-600 flex items-center gap-2">Boxes To Save</h2>
            <button onClick={closeHitList} className="text-pink-600 font-black text-2xl hover:scale-110 transition-transform">&times;</button>
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
                  const myCurrentQty = cartItems[group.prod]?.v || existingOrderItems[group.prod] || 0;
                  const myExistingQty = existingOrderItems[group.prod] || 0;
                  const pendingAddedQty = Math.max(0, myCurrentQty - myExistingQty);
                  const remainingNeed = Math.max(0, Number(group.missingSlots || 0) - pendingAddedQty);
                  const canDecrease = isCartEditable && (!settings.addOnly ? myCurrentQty > 0 : myCurrentQty > myExistingQty);
                  const canIncrease = isCartEditable;
                  const pricePerVialUSD = Number(productsByName[group.prod]?.pricePerVialUSD || 0);

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
                                  yours in open box
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-1 flex items-center gap-1 overflow-x-auto hide-scroll whitespace-nowrap text-[10px] font-black uppercase tracking-widest">
                            <span className="rounded-full border border-pink-200 bg-white px-2 py-1 text-rose-500">B{group.boxNum}</span>
                            <span className={`rounded-full border px-2 py-1 ${remainingNeed === 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                              {remainingNeed === 0 ? 'Filled Pending' : `Need ${remainingNeed}`}
                            </span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-500">Buyers {group.rows.length}</span>
                            <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-sky-700">Saved {myExistingQty}</span>
                            {pendingAddedQty > 0 ? (
                              <span className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2 py-1 text-fuchsia-700">Pending +{pendingAddedQty}</span>
                            ) : null}
                            <div className="ml-auto flex items-center gap-1 pl-1">
                              <button
                                onClick={(event) => { event.preventDefault(); adjustCartItem(group.prod, -1); }}
                                disabled={!canDecrease}
                                className="h-7 min-w-7 rounded-full border border-pink-200 bg-white px-1.5 text-[12px] font-black text-[#D6006E] transition-colors hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                -
                              </button>
                              <button
                                onClick={(event) => { event.preventDefault(); confirmHitListIncrease(group.prod, 1, { missingSlots: group.missingSlots, boxNum: group.boxNum }); }}
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
                          Nasa current open box pa ang loose vials below. Puwede pa itong gumalaw if may mag-reduce or mag-cancel. We encourage buyers to add more or find others para makumpleto ang box before any removals.
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
                                open box {row.amountToRemove}
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
              <button onClick={closeHitList} className="w-full py-3 text-sm rounded-full border-2 border-pink-200 bg-white text-[#D6006E] font-bold uppercase tracking-widest shadow-sm hover:bg-pink-50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

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
                    onClick={() => commitPendingAddDraft(Math.max(1, (pendingHitListAdd.addQty || 1) - 1))}
                    className="h-8 w-8 rounded-full border border-pink-200 bg-white text-sm font-black text-[#D6006E] hover:bg-pink-50"
                  >
                    -
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pendingAddDraft}
                    onChange={(event) => {
                      const digitsOnly = event.target.value.replace(/[^\d]/g, '');
                      setPendingAddDraft(digitsOnly);
                      if (digitsOnly) onPendingAddChange(digitsOnly);
                    }}
                    onBlur={(event) => commitPendingAddDraft(event.target.value)}
                    className="w-14 bg-transparent text-center text-sm font-black text-[#D6006E] outline-none"
                  />
                  <button
                    onClick={() => commitPendingAddDraft(Math.max(1, (pendingHitListAdd.addQty || 1) + 1))}
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
                onClick={onPendingAddConfirm}
                className={`${originalBtn} w-full justify-center py-3 text-sm`}
              >
                Add To Cart
              </button>
              <button
                onClick={onClosePendingAdd}
                className="w-full rounded-full border-2 border-pink-200 bg-white py-3 text-sm font-black uppercase tracking-widest text-[#D6006E] hover:bg-pink-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
