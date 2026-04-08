import { Droplet, Repeat, ThermometerSnowflake } from 'lucide-react';

export default function ProofModalHost({
  customerList,
  fullScreenProof,
  onCloseAllProofs,
  onCloseFullScreenProof,
  onCloseQuickInfo,
  onOpenFullScreenProof,
  onRemoveCustomerProof,
  quickInfoProduct,
  setFullScreenProof,
  showAllProofsModal,
}) {
  return (
    <>
      {fullScreenProof && (
        <div className="fixed inset-0 bg-black/90 z-[2000] flex flex-col items-center justify-center p-4 cursor-pointer" onClick={onCloseFullScreenProof}>
          <button className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/80 hover:text-white text-4xl font-black transition-colors">&times;</button>
          <img src={fullScreenProof} alt="Full Screen Proof" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl" />
        </div>
      )}

      {showAllProofsModal && (
        <div className="fixed inset-0 bg-[#4A042A]/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
          <div className="bg-slate-50 rounded-[32px] w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col h-[90vh] border-4 border-white">
            <div className="bg-white p-5 flex justify-between items-center border-b-2 border-slate-200">
              <h2 className="brand-title text-2xl text-[#D6006E]">All Payment Proofs</h2>
              <button onClick={onCloseAllProofs} className="text-slate-400 hover:text-[#D6006E] font-black text-3xl transition-colors">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 hide-scroll">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {customerList.filter((customer) => customer.proofUrl).length === 0 ? (
                  <div className="col-span-full text-center py-12 text-slate-400 font-bold italic">No proofs uploaded yet.</div>
                ) : (
                  customerList.filter((customer) => customer.proofUrl).map((customer) => (
                    <div key={customer.email} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col group">
                      <button onClick={() => onOpenFullScreenProof(customer.proofUrl)} className="flex-1 min-h-[150px] bg-slate-100 rounded-xl overflow-hidden mb-2 relative cursor-zoom-in border-none p-0 m-0">
                        <img src={customer.proofUrl} alt="Proof" className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <p className="text-[10px] font-black text-slate-800 truncate">{customer.name}</p>
                      <p className="text-[9px] text-slate-400 truncate">{customer.email}</p>
                      <span className="mt-1 bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded text-[8px] font-black uppercase text-center">Proof On File</span>
                      <button
                        onClick={() => onRemoveCustomerProof(customer)}
                        className="mt-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-rose-700 transition-colors hover:border-rose-300"
                      >
                        Remove Proof
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {quickInfoProduct && (
        <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onCloseQuickInfo}>
          <div className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl border-4 border-pink-100 relative animate-fadeIn" onClick={(event) => event.stopPropagation()}>
            <button onClick={onCloseQuickInfo} className="absolute top-4 right-4 text-slate-400 hover:text-[#D6006E] font-black text-2xl transition-colors">&times;</button>

            <div className="p-6">
              <h3 className="font-black text-2xl text-[#D6006E] mb-2">{quickInfoProduct.displayName || quickInfoProduct.name}</h3>
              {quickInfoProduct.strength && (
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 mb-3">{quickInfoProduct.strength}</p>
              )}

              <div className="flex flex-wrap gap-1.5 mb-4">
                {quickInfoProduct.tags.map((tag, index) => (
                  <span key={`${tag}-${index}`} className="bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">{tag}</span>
                ))}
              </div>

              {quickInfoProduct.benefits?.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {quickInfoProduct.benefits.map((benefit, index) => (
                    <div key={`${benefit}-${index}`} className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black uppercase tracking-widest text-pink-500">Benefit</p>
                      <p className="text-[10px] font-bold text-slate-600 mt-1">{benefit}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-sm text-slate-700 font-semibold leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {quickInfoProduct.desc}
              </p>

              <div className="space-y-3">
                {quickInfoProduct.dosage && (
                  <div className="flex items-start gap-3">
                    <div className="bg-pink-100 p-2 rounded-lg text-pink-600 shrink-0"><Droplet size={16} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dosage</p>
                      <p className="text-xs font-bold text-slate-700">{quickInfoProduct.dosage}</p>
                    </div>
                  </div>
                )}
                {quickInfoProduct.cycle && (
                  <div className="flex items-start gap-3">
                    <div className="bg-pink-100 p-2 rounded-lg text-pink-600 shrink-0"><Repeat size={16} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cycle</p>
                      <p className="text-xs font-bold text-slate-700">{quickInfoProduct.cycle}</p>
                    </div>
                  </div>
                )}
                {quickInfoProduct.storage && (
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-500 shrink-0"><ThermometerSnowflake size={16} /></div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Storage</p>
                      <p className="text-xs font-bold text-slate-700">{quickInfoProduct.storage}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 mb-1">Kit Rule</p>
                <p className="text-[11px] font-bold text-amber-800 leading-relaxed">{quickInfoProduct.protectionNote}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
