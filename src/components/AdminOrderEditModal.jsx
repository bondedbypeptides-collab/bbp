import { Search } from 'lucide-react';

export default function AdminOrderEditModal({
  adminCart,
  adminInputSm,
  filteredProducts,
  isBtnLoading,
  onChangeQty,
  onClose,
  onSave,
  searchQuery,
  setSearchQuery,
  targetEmail,
  targetProfile,
}) {
  return (
    <div className="fixed inset-0 bg-[#4A042A]/90 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-slate-50 rounded-[32px] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
        <div className="bg-white p-5 flex justify-between items-center border-b-2 border-slate-200">
          <div>
            <h2 className="brand-title text-xl text-[#D6006E] m-0">Editing Active Order</h2>
            <p className="text-xs font-bold text-slate-500 mt-1">{targetProfile.name} ({targetEmail})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-[#D6006E] font-black text-3xl transition-colors">&times;</button>
        </div>

        <div className="bg-[#FFF0F5] p-4 border-b border-pink-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products to add/edit..."
              className={`${adminInputSm} pl-10 border-pink-200 m-0 py-2 shadow-inner`}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 hide-scroll">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const currentQty = adminCart[product.name] || 0;
              const isSelected = currentQty > 0;

              return (
                <div key={product.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-colors ${isSelected ? 'bg-pink-50 border-pink-400 shadow-sm' : 'bg-white border-slate-200 hover:border-pink-300'}`}>
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className={`font-black text-sm truncate ${isSelected ? 'text-[#D6006E]' : 'text-slate-700'}`}>{product.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400">${product.pricePerVialUSD.toFixed(2)} / vial</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onChangeQty(product.name, Math.max(0, currentQty - 1))} className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-600 font-black flex items-center justify-center hover:bg-slate-100 active:scale-95">-</button>
                    <input
                      type="number"
                      value={currentQty || ''}
                      onChange={e => onChangeQty(product.name, e.target.value)}
                      className="w-12 h-8 text-center font-black text-[#D6006E] bg-transparent border-b-2 border-pink-200 outline-none focus:border-[#D6006E]"
                      placeholder="0"
                    />
                    <button onClick={() => onChangeQty(product.name, currentQty + 1)} className="w-8 h-8 rounded-lg bg-pink-600 border border-pink-600 text-white font-black flex items-center justify-center hover:bg-pink-700 active:scale-95">+</button>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredProducts.length === 0 && <p className="text-center text-slate-400 italic font-bold py-8">No products found matching your search.</p>}
        </div>

        <div className="p-5 border-t-2 border-slate-200 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={onSave} disabled={isBtnLoading} className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-gradient-to-r from-[#FF1493] to-[#FF69B4] shadow-md hover:scale-[0.98] transition-transform disabled:opacity-50">
            {isBtnLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
