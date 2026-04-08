import { Droplet, Repeat, Search, ThermometerSnowflake } from 'lucide-react';

export default function ShopUtilityModalsHost({
  calculatorDoseMg,
  calculatorStrengthMg,
  calculatorWaterMl,
  closeCalculator,
  closeWiki,
  dosePresets,
  filteredWikiData,
  normalizedWikiTag,
  peptideCalculator,
  setCalculatorDoseMg,
  setCalculatorStrengthMg,
  setCalculatorWaterMl,
  setWikiSearchQuery,
  setWikiTagFilter,
  showCalculatorModal,
  showWikiModal,
  strengthPresets,
  waterPresets,
  wikiFilterOptions,
  wikiSearchQuery,
  wikiTagFilter,
}) {
  return (
    <>
      {showCalculatorModal && (
        <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[390] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
            <div className="bg-gradient-to-r from-[#FF7A59] via-[#FF4FA1] to-[#FF1493] px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 relative">
              <button onClick={closeCalculator} className="absolute top-3 right-4 text-white/80 hover:text-white font-black text-[28px] leading-none hover:scale-110 transition-transform">&times;</button>
              <div className="text-white pr-10 sm:pr-0">
                <h2 className="brand-title text-[1.8rem] sm:text-[2.25rem] leading-[0.92] m-0 text-white shadow-none">Peptide Calculator</h2>
                <p className="text-white/90 font-bold text-[12px] sm:text-[13px] mt-0.5 max-w-lg leading-snug">Calculate concentration, draw amount, and syringe units for peptide reconstitution.</p>
                <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/72">Built for BBP using standard U-100 insulin syringe math.</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <div className="rounded-[20px] border border-white/30 bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm min-w-[100px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Draw To</p>
                  <p className="mt-1 text-lg font-black leading-none">{peptideCalculator ? `${peptideCalculator.syringeUnits.toFixed(0)} units` : '--'}</p>
                </div>
                <div className="rounded-[20px] border border-white/30 bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm min-w-[100px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Dose</p>
                  <p className="mt-1 text-lg font-black leading-none">{peptideCalculator ? `${peptideCalculator.doseMg}mg` : '--'}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 hide-scroll space-y-5">
              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
                <div className="bg-white rounded-[28px] border border-pink-100 shadow-sm p-5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-500">Calculator Inputs</p>
                      <p className="mt-1 text-sm font-bold text-slate-500">Set your target dose, vial strength, and bacteriostatic water volume.</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-5">
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D6006E]">Dose of Peptide</label>
                        <input type="number" min="0.01" step="0.01" value={calculatorDoseMg} onChange={e => setCalculatorDoseMg(Number(e.target.value) || 0)} className="w-24 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-right text-sm font-black text-[#4A042A] outline-none focus:border-[#D6006E]" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {dosePresets.map((dose) => (
                          <button
                            key={`dose-${dose}`}
                            type="button"
                            onClick={() => setCalculatorDoseMg(dose)}
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${calculatorDoseMg === dose ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-200 bg-white text-[#9E2A5E] hover:border-pink-300 hover:bg-pink-50'}`}
                          >
                            {dose}mg
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D6006E]">Strength of Peptide</label>
                        <input type="number" min="0.1" step="0.1" value={calculatorStrengthMg} onChange={e => setCalculatorStrengthMg(Number(e.target.value) || 0)} className="w-24 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-right text-sm font-black text-[#4A042A] outline-none focus:border-[#D6006E]" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {strengthPresets.map((strength) => (
                          <button
                            key={`strength-${strength}`}
                            type="button"
                            onClick={() => setCalculatorStrengthMg(strength)}
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${calculatorStrengthMg === strength ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-200 bg-white text-[#9E2A5E] hover:border-pink-300 hover:bg-pink-50'}`}
                          >
                            {strength}mg
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D6006E]">Water of Peptide</label>
                        <input type="number" min="0.1" step="0.1" value={calculatorWaterMl} onChange={e => setCalculatorWaterMl(Number(e.target.value) || 0)} className="w-24 rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-right text-sm font-black text-[#4A042A] outline-none focus:border-[#D6006E]" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {waterPresets.map((water) => (
                          <button
                            key={`water-${water}`}
                            type="button"
                            onClick={() => setCalculatorWaterMl(water)}
                            className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${calculatorWaterMl === water ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-200 bg-white text-[#9E2A5E] hover:border-pink-300 hover:bg-pink-50'}`}
                          >
                            {water}mL
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[28px] border border-pink-100 shadow-sm p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-pink-500">Results</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">Use this as a quick reference for how much to draw into a 100-unit insulin syringe.</p>
                  </div>

                  {peptideCalculator ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-[22px] border border-pink-100 bg-pink-50/70 p-4 min-h-[124px] flex flex-col justify-between">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Peptide Dose</p>
                          <div className="mt-3">
                            <p className="text-2xl font-black leading-none text-[#D6006E]">{peptideCalculator.doseMg}mg</p>
                            <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">{peptideCalculator.doseMcg.toLocaleString()}mcg per shot</p>
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4 min-h-[124px] flex flex-col justify-between">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Draw Syringe To</p>
                          <div className="mt-3">
                            <p className="text-2xl font-black leading-none text-emerald-700">{peptideCalculator.syringeUnits.toFixed(0)} units</p>
                            <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">{peptideCalculator.drawMl.toFixed(2)}mL</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-pink-100 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-500">Syringe Guide</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">100 units scale</p>
                        </div>
                        <div className="mt-4 relative">
                          <div className="flex items-center">
                            <div className="mr-3 flex w-14 shrink-0 items-center justify-end">
                              <div className="h-[4px] w-6 rounded-full bg-pink-300" />
                              <div className="relative h-7 w-7 rounded-full border-[3px] border-pink-300 bg-white shadow-sm">
                                <span className="absolute inset-[6px] rounded-full border-2 border-pink-200" />
                              </div>
                            </div>
                            <div className="relative h-[66px] flex-1 min-w-0">
                              <div className="absolute inset-y-[8px] left-0 right-0 rounded-[10px] border-[3px] border-pink-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,244,248,0.94))] shadow-inner" />
                              <div className="absolute inset-y-[16px] left-[8px] rounded-[6px] bg-gradient-to-r from-[#FF7A59] via-[#FF4FA1] to-[#FF1493] shadow-[0_8px_18px_rgba(255,20,147,0.18)]" style={{ width: `calc(${Math.max(2, Math.min(peptideCalculator.syringeUnits, 100))}% - 16px)` }} />
                              <div className="absolute top-[11px] w-[8px] rounded-[4px] bg-[#4A042A] shadow-[0_4px_12px_rgba(74,4,42,0.18)]" style={{ left: `calc(${Math.max(2, Math.min(peptideCalculator.syringeUnits, 100))}% - 4px)`, height: '32px' }} />
                              <div className="absolute inset-x-[10px] top-[9px] bottom-[9px] flex items-stretch justify-between pointer-events-none">
                                {Array.from({ length: 21 }).map((_, tickIndex) => (
                                  <div key={tickIndex} className="relative h-full">
                                    <span className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-pink-300/90 ${tickIndex % 5 === 0 ? 'top-[4px] h-[28px] w-[2px]' : 'top-[11px] h-[14px] w-[1.5px]'}`} />
                                  </div>
                                ))}
                              </div>
                              <div className="absolute -top-3 transition-all" style={{ left: `calc(${Math.max(4, Math.min(peptideCalculator.syringeUnits, 96))}% - 24px)` }}>
                                <div className="rounded-full bg-[#4A042A] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg">
                                  {peptideCalculator.syringeUnits.toFixed(0)}u
                                </div>
                              </div>
                            </div>
                            <div className="ml-3 flex w-16 shrink-0 items-center">
                              <div className="h-4 w-4 rounded-r-[6px] rounded-l-[3px] bg-pink-300 shadow-sm" />
                              <div className="h-[3px] w-10 rounded-full bg-slate-400" />
                              <div className="h-0 w-0 border-y-[3px] border-y-transparent border-l-[12px] border-l-slate-400" />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between pl-[58px] pr-[64px] text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <span>0</span>
                          <span>50</span>
                          <span>100</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 min-h-[138px] flex flex-col justify-between min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Vial Contains</p>
                          <div className="mt-3">
                            <p className="text-[1.4rem] sm:text-[1.55rem] font-black leading-none text-slate-700 break-words">{peptideCalculator.strengthMg}mg</p>
                            <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">mixed with {peptideCalculator.waterMl}mL</p>
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-blue-100 bg-blue-50/80 p-4 min-h-[138px] flex flex-col justify-between min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Concentration</p>
                          <div className="mt-3">
                            <p className="text-[1.25rem] sm:text-[1.45rem] font-black leading-tight text-blue-700 break-words">{peptideCalculator.concentrationMgPerMl.toFixed(2)}<span className="ml-1 text-[0.7em] uppercase tracking-[0.14em]">mg/mL</span></p>
                            <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">{peptideCalculator.concentrationMcgPerUnit.toFixed(1)}mcg per unit</p>
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-amber-100 bg-amber-50/80 p-4 min-h-[138px] flex flex-col justify-between min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Approx Doses</p>
                          <div className="mt-3">
                            <p className="text-[1.4rem] sm:text-[1.55rem] font-black leading-none text-amber-700 break-words">{peptideCalculator.remainingDoses}</p>
                            <p className="mt-2 text-[11px] font-bold text-slate-500 leading-snug">full doses from one vial</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[22px] border border-pink-100 bg-pink-50/60 px-4 py-3 text-xs font-bold text-[#8F2C5D] leading-relaxed">
                        Formula: strength ÷ water = concentration, then dose ÷ concentration = draw amount. On a standard U-100 syringe, 1mL = 100 units.
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[22px] border border-amber-100 bg-amber-50/80 px-4 py-6 text-center text-sm font-black text-amber-700">
                      Enter a dose, vial strength, and water volume to calculate your draw amount.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWikiModal && (
        <div className="fixed inset-0 bg-[#4A042A]/80 backdrop-blur-md z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border-4 border-white">
            <div className="bg-gradient-to-r from-[#FF1493] to-[#FF69B4] px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 relative">
              <button onClick={closeWiki} className="absolute top-3 right-4 text-white/80 hover:text-white font-black text-[28px] leading-none hover:scale-110 transition-transform">&times;</button>
              <div className="text-white pr-10 sm:pr-0">
                <h2 className="brand-title text-[1.75rem] sm:text-[2.15rem] leading-[0.92] m-0 text-white shadow-none">Peptide Wiki</h2>
                <p className="text-white/90 font-bold text-[12px] sm:text-[13px] mt-0.5 max-w-lg leading-snug">Quick product context, simple benefits, and handling notes in one place.</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <div className="rounded-[20px] border border-white/30 bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm min-w-[98px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Entries</p>
                  <p className="mt-1 text-lg font-black leading-none">{filteredWikiData.length}</p>
                </div>
                <div className="rounded-[20px] border border-white/30 bg-white/15 px-3 py-1.5 text-white backdrop-blur-sm min-w-[118px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/75">Focus</p>
                  <p className="mt-1 text-[12px] font-black leading-snug">{normalizedWikiTag}</p>
                </div>
              </div>
            </div>

            <div className="bg-[#FFF0F5] px-4 py-2.5 border-b-2 border-[#FFC0CB] space-y-2.5">
              <div className="relative w-full max-w-[720px] mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" size={18} />
                <input type="text" value={wikiSearchQuery} onChange={e => setWikiSearchQuery(e.target.value)} placeholder="Search by product, tag, or benefit..." className="w-full pl-11 pr-24 py-2 rounded-2xl text-[14px] font-bold border-2 border-pink-200 outline-none focus:border-[#FF1493] focus:ring-4 focus:ring-pink-100 transition-all bg-white text-[#4A042A] shadow-sm" />
                {(wikiSearchQuery || wikiTagFilter !== 'All') && (
                  <button
                    type="button"
                    onClick={() => { setWikiSearchQuery(''); setWikiTagFilter('All'); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-pink-200 bg-pink-50 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#D6006E] transition-colors hover:bg-pink-100"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto hide-scroll pb-0.5">
                {wikiFilterOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setWikiTagFilter(tag)}
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] transition-colors ${wikiTagFilter === tag ? 'border-[#D6006E] bg-[#D6006E] text-white shadow-sm' : 'border-pink-200 bg-white text-[#9E2A5E] hover:border-pink-300 hover:bg-pink-50'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <p className="text-center text-[10px] font-bold text-[#9E2A5E]">
                {wikiTagFilter === 'All'
                  ? `Showing all ${filteredWikiData.length} wiki entries.`
                  : `Showing ${filteredWikiData.length} entries in ${wikiTagFilter}.`}
              </p>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto bg-slate-50 hide-scroll">
              {filteredWikiData.length === 0 ? (
                <div className="text-center p-12 text-slate-400 font-bold italic">No wiki entries found for that search yet.</div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {filteredWikiData.map((item, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-[24px] border border-pink-100 shadow-sm hover:border-pink-300 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-black text-lg text-[#D6006E] leading-tight">{item.name}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.tags.map((tag, tIdx) => (
                              <span key={tIdx} className="bg-pink-50 text-pink-600 border border-pink-200 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest">{tag}</span>
                            ))}
                          </div>
                        </div>
                        {item.benefits?.[0] && (
                          <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-700">
                            {item.benefits[0]}
                          </span>
                        )}
                      </div>

                      {item.benefits?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {item.benefits.map((benefit, benefitIdx) => (
                            <span key={benefitIdx} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                              {benefit}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-sm text-slate-600 font-semibold leading-relaxed border-t border-slate-100 pt-3 mb-4">{item.desc}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {item.dosage && (
                          <div className="rounded-2xl bg-pink-50/70 border border-pink-100 p-3">
                            <div className="flex items-start gap-2">
                              <Droplet size={14} className="text-pink-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[9px] font-black text-pink-500 uppercase tracking-widest">Dosage</p>
                                <p className="text-xs font-bold text-slate-700 leading-tight mt-1">{item.dosage}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {item.cycle && (
                          <div className="rounded-2xl bg-white border border-slate-200 p-3">
                            <div className="flex items-start gap-2">
                              <Repeat size={14} className="text-[#D6006E] mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cycle</p>
                                <p className="text-xs font-bold text-slate-700 leading-tight mt-1">{item.cycle}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {item.storage && (
                          <div className="rounded-2xl bg-blue-50/75 border border-blue-100 p-3">
                            <div className="flex items-start gap-2">
                              <ThermometerSnowflake size={14} className="text-blue-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Storage</p>
                                <p className="text-xs font-bold text-slate-700 leading-tight mt-1">{item.storage}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-center text-slate-400 font-bold mt-6 px-4">Disclaimer: The information provided is for educational and research purposes only. Always consult with a qualified healthcare professional.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
