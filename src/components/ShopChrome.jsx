import { Lock } from 'lucide-react';

export default function ShopChrome({
  cartItemCount,
  children,
  isBtnLoading,
  isReviewStageOpen,
  isStoreClosed,
  onOpenPreview,
  onOpenPayment,
  onSubmitOrder,
  settings,
  showShopAccessGate,
  switchView,
  totalPHP,
}) {
  return (
    <div className="min-h-screen w-full text-[#4A042A] pb-24 lg:pb-8 selection:bg-pink-300 relative">
      <button
        onClick={() => switchView('admin')}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/30 backdrop-blur-sm text-[#4A042A] border border-[#4A042A]/20 w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/60 transition-all hover:scale-105 z-[40]"
        title="Admin Access"
      >
        <Lock size={16} />
      </button>

      {children}

      {settings.storeOpen !== false && !showShopAccessGate && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t-2 border-[#FF1493] p-4 rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-50 flex justify-between items-center gap-2">
          <div className="shrink-0">
            <div className="text-[10px] font-black text-[#D6006E] uppercase">Total Estimate</div>
            <div className="text-xl sm:text-2xl font-black text-[#D6006E]">₱{totalPHP.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>

          <div className="flex gap-2 w-full justify-end">
            <button onClick={onOpenPreview} disabled={cartItemCount === 0} className="bg-white text-[#D6006E] border-2 border-pink-200 px-3 sm:px-4 py-2 sm:py-3 rounded-full font-bold uppercase text-[10px] sm:text-sm shadow-sm disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">Review</button>

            {settings.paymentsOpen ? (
              <button onClick={onOpenPayment} disabled={cartItemCount === 0} className="bg-[#008040] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-bold uppercase text-[10px] sm:text-sm shadow-md disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">Pay Now</button>
            ) : isReviewStageOpen ? (
              <button disabled className="bg-sky-100 text-sky-700 px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black uppercase text-[10px] sm:text-sm shadow-md opacity-70 whitespace-nowrap">
                Review Freeze
              </button>
            ) : (
              <button onClick={onSubmitOrder} disabled={isBtnLoading} className="bg-[#D6006E] text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-black uppercase text-[10px] sm:text-sm shadow-md disabled:opacity-50 whitespace-nowrap active:scale-95 transition-transform">
                {isBtnLoading ? 'Saving' : 'Save'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
