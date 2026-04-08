export default function ProfileViewerModal({
  currentOrders,
  editAddressForm,
  getPartialShipPreferenceLabel,
  historyOrders,
  isBtnLoading,
  isEditingAddress,
  onClose,
  profile,
  saveEditedAddress,
  setEditAddressForm,
  setIsEditingAddress,
  shippingOptions,
  partialShipOptions,
  startEditingAddress,
}) {
  return (
    <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[300] flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
        <div className="bg-[#FFF0F5] p-4 sm:p-5 flex justify-between items-center border-b-2 border-[#FFC0CB]">
          <h2 className="brand-title text-2xl text-[#D6006E]">Profile & History</h2>
          <button onClick={onClose} className="text-pink-600 font-black text-2xl hover:text-pink-800 transition-colors hover:scale-110">&times;</button>
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
                  <button onClick={() => startEditingAddress(profile)} className="text-[#D6006E] text-[10px] font-black uppercase hover:underline">Edit</button>
                )}
              </div>

              {isEditingAddress ? (
                <div className="space-y-2 mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select value={editAddressForm.shipOpt} onChange={e => setEditAddressForm({ ...editAddressForm, shipOpt: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none">
                      <option value="" disabled>Select Courier...</option>
                      {shippingOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                    <select value={editAddressForm.partialShipPref} onChange={e => setEditAddressForm({ ...editAddressForm, partialShipPref: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none">
                      <option value="" disabled>If may maunang dumating...</option>
                      {partialShipOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                  <input type="text" value={editAddressForm.street} onChange={e => setEditAddressForm({ ...editAddressForm, street: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Street & Barangay" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={editAddressForm.city} onChange={e => setEditAddressForm({ ...editAddressForm, city: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="City" />
                    <input type="text" value={editAddressForm.prov} onChange={e => setEditAddressForm({ ...editAddressForm, prov: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Province" />
                    <input type="text" value={editAddressForm.zip} onChange={e => setEditAddressForm({ ...editAddressForm, zip: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Zip Code" />
                    <input type="text" value={editAddressForm.contact} onChange={e => setEditAddressForm({ ...editAddressForm, contact: e.target.value })} className="w-full bg-[#FFF0F5] border border-[#FFC0CB] rounded-xl px-3 py-2 text-xs font-bold text-[#4A042A] outline-none" placeholder="Contact #" />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={saveEditedAddress} disabled={isBtnLoading} className="flex-1 bg-[#D6006E] text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-pink-700">{isBtnLoading ? 'Saving...' : 'Save'}</button>
                    <button onClick={() => setIsEditingAddress(false)} className="flex-1 bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest py-2 rounded-xl hover:bg-slate-300">Cancel</button>
                  </div>
                </div>
              ) : (
                profile.address?.street ? (
                  <p className="text-xs font-bold text-slate-700 leading-tight">
                    {profile.address.street}<br />
                    {profile.address.brgy ? `${profile.address.brgy}, ` : ''}{profile.address.city}<br />
                    {profile.address.prov} {profile.address.zip}<br />
                    <span className="text-emerald-600 mt-1 inline-block">Courier: {profile.address.shipOpt}</span><br />
                    {getPartialShipPreferenceLabel(profile.address.partialShipPref) ? <><span className="text-[#D6006E]">Shipping note: {getPartialShipPreferenceLabel(profile.address.partialShipPref)}</span><br /></> : null}
                    <span className="text-slate-500">Contact: {profile.address.contact}</span>
                  </p>
                ) : <p className="text-xs text-slate-400 italic">No address on file</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-black text-sm text-[#D6006E] uppercase tracking-widest mb-2 border-b-2 border-pink-100 pb-1">Active Orders</h3>
            {currentOrders.length === 0 ? <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-200">No active orders in this batch.</p> : (
              <div className="bg-white border-2 border-pink-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#FFF0F5] text-[#D6006E] text-[10px] uppercase"><tr><th className="p-2 sm:p-3">Product</th><th className="p-2 sm:p-3 text-center">Qty</th></tr></thead>
                  <tbody>
                    {currentOrders.map(order => <tr key={order.id} className="border-t border-pink-50"><td className="p-2 sm:p-3 font-bold text-slate-800 text-xs sm:text-sm">{order.product}</td><td className="p-2 sm:p-3 text-center font-black text-[#D6006E] text-base">{order.qty}</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-black text-sm text-slate-500 uppercase tracking-widest mb-2 border-b-2 border-slate-200 pb-1">Past Order History</h3>
            {historyOrders.length === 0 ? <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-slate-200">No past orders found.</p> : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-500 text-[10px] uppercase"><tr><th className="p-2 sm:p-3">Batch</th><th className="p-2 sm:p-3">Product</th><th className="p-2 sm:p-3 text-center">Qty</th></tr></thead>
                  <tbody>
                    {historyOrders.map(order => <tr key={order.id} className="border-t border-slate-100"><td className="p-2 sm:p-3 text-[10px] sm:text-xs text-slate-500 font-bold">{order.batchName || 'Unknown'}</td><td className="p-2 sm:p-3 font-bold text-slate-700 text-xs sm:text-sm">{order.product}</td><td className="p-2 sm:p-3 text-center font-black text-slate-500 text-sm">{order.qty}</td></tr>)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
