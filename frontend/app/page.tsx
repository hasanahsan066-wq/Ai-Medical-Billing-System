'use client';

import { useState } from 'react';
import { extractCodes, createClaim, CodeSuggestion } from '@/lib/api';

interface ReviewableSuggestion extends CodeSuggestion {
  status: 'pending' | 'approved' | 'rejected';
}

export default function Home() {
  // Clinical Notes & Extraction State
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [suggestions, setSuggestions] = useState<ReviewableSuggestion[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Claim Form State
  const [patientId, setPatientId] = useState('P-2026-07155');
  const [patientName, setPatientName] = useState('DELA CRUZ, JUAN MIGUEL');
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
  const [procedureCodes, setProcedureCodes] = useState<string[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(12450);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  // AI Extraction Logic
  const handleExtractCodes = async () => {
    if (!clinicalNotes.trim()) return;
    setIsExtracting(true);
    setExtractError(null);

    try {
      const response = await extractCodes(clinicalNotes);
      const mapped: ReviewableSuggestion[] = response.suggestions.map((item) => ({
        ...item,
        status: 'pending',
      }));
      setSuggestions(mapped);
      setIsFallback(response.is_fallback);
    } catch (err: any) {
      setExtractError(err.message || 'Failed to extract medical codes.');
    } finally {
      setIsExtracting(false);
    }
  };

  // Approve Suggestion
  const handleApprove = (index: number) => {
    const item = suggestions[index];
    if (item.status === 'approved') return;

    const updated = [...suggestions];
    updated[index].status = 'approved';
    setSuggestions(updated);

    if (item.code_type === 'ICD-10') {
      if (!diagnosisCodes.includes(item.code)) {
        setDiagnosisCodes([...diagnosisCodes, item.code]);
      }
    } else if (item.code_type === 'CPT') {
      if (!procedureCodes.includes(item.code)) {
        setProcedureCodes([...procedureCodes, item.code]);
      }
    }
  };

  // Reject Suggestion
  const handleReject = (index: number) => {
    const item = suggestions[index];

    if (item.status === 'approved') {
      if (item.code_type === 'ICD-10') {
        setDiagnosisCodes(diagnosisCodes.filter((c) => c !== item.code));
      } else if (item.code_type === 'CPT') {
        setProcedureCodes(procedureCodes.filter((c) => c !== item.code));
      }
    }

    const updated = [...suggestions];
    updated[index].status = 'rejected';
    setSuggestions(updated);
  };

  // Submit Final Claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId.trim()) {
      alert('Please enter a valid Patient ID');
      return;
    }

    try {
      await createClaim({
        patient_id: patientId,
        diagnosis_codes: diagnosisCodes,
        procedure_codes: procedureCodes,
        total_amount: Number(totalAmount),
        status: 'submitted',
      });
      setClaimStatus('Claim & Billing Record Submitted Successfully!');
    } catch (err: any) {
      setClaimStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0a192f] text-slate-300 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand Header */}
          <div className="flex items-center space-x-3 p-4 border-b border-slate-800">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              AI
            </div>
            <span className="font-bold text-white text-base tracking-wide">
              MEDIBILL HIMS
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            <a href="#" className="flex items-center px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-400">
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 00-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
              Dashboard
            </a>
            <a href="#" className="flex items-center px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-400">
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              Patient Management
            </a>
            <a href="#" className="bg-blue-600 text-white flex items-center px-3 py-2.5 rounded-lg font-semibold shadow-md">
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Billing & AI Coding
            </a>
            <a href="#" className="flex items-center px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-400">
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Reports & Claims
            </a>
            <a href="#" className="flex items-center px-3 py-2.5 rounded-lg hover:bg-slate-800 text-slate-400">
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/></svg>
              Settings
            </a>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          Hospital Information & Management System v2.4
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-[#0b192c] text-white px-6 py-3 flex items-center justify-between shadow-md border-b border-slate-800">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Billing & Medical Coding Studio</h1>
            <p className="text-xs text-slate-400">Dashboard &gt; Billing &gt; AI Human-in-the-Loop Review</p>
          </div>
          <div className="flex items-center space-x-6 text-xs">
            <span className="bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
              📅 September 06, 2026 | 10:30 AM
            </span>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center border-2 border-slate-700">
                BS
              </div>
              <div>
                <p className="font-semibold text-white leading-none">Billing Specialist</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Authorized Cashier</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Workspace */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {/* Patient Overview Card */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-lg">
                👤
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900">{patientName}</h2>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                    {patientId}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs text-slate-500 mt-1">
                  <span>Age/Sex: <strong>46 / Male</strong></span>
                  <span>Room/Bed: <strong>201 / A</strong></span>
                  <span>Admission Date: <strong>09/01/2026</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right border-l pl-6 border-slate-200">
              <p className="text-xs text-slate-500 font-medium">TOTAL BALANCE DUE</p>
              <p className="text-2xl font-black text-purple-700">${totalAmount.toLocaleString()}</p>
            </div>
          </div>

          {/* Core Grid Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Documentation & AI Review (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Box 1: Clinical Notes */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>1. Clinical Documentation Input</span>
                  <span className="text-blue-400 font-normal">NLP Extraction Pipeline</span>
                </div>
                <div className="p-4 space-y-3">
                  <textarea
                    className="w-full h-40 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-800 text-sm bg-slate-50/50"
                    placeholder="Paste doctor's clinical notes, examination summaries, or diagnosis details here..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                  <button
                    onClick={handleExtractCodes}
                    disabled={isExtracting || !clinicalNotes.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-lg transition text-sm flex items-center justify-center space-x-2 shadow"
                  >
                    {isExtracting ? (
                      <span>Analyzing Clinical Notes via Groq LLM...</span>
                    ) : (
                      <span>✨ Run AI Medical Code Extraction</span>
                    )}
                  </button>

                  {extractError && <p className="text-xs text-red-600 font-medium">{extractError}</p>}
                  {isFallback && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-lg">
                      <strong>Notice:</strong> Groq API unavailable. Fallback mock data loaded.
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Interactive AI Suggestions */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>2. Human-in-the-Loop Code Suggestions</span>
                  <span className="text-emerald-400 font-normal">{suggestions.length} Codes Suggested</span>
                </div>

                <div className="p-4">
                  {suggestions.length === 0 ? (
                    <div className="h-48 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs space-y-1">
                      <p className="font-semibold text-slate-500">No suggestions generated yet</p>
                      <p>Enter clinical notes above and click extraction to review codes.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {suggestions.map((item, idx) => (
                        <div
                          key={`${item.code}-${idx}`}
                          className={`p-3.5 rounded-lg border transition ${
                            item.status === 'approved'
                              ? 'border-emerald-300 bg-emerald-50/50'
                              : item.status === 'rejected'
                              ? 'border-slate-200 bg-slate-100 opacity-60'
                              : 'border-slate-200 bg-white shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-slate-900 text-base">{item.code}</span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  item.code_type === 'ICD-10'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}
                              >
                                {item.code_type}
                              </span>
                            </div>

                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                                item.confidence_score >= 85
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.confidence_score >= 70
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.confidence_score}% Match
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800 mt-1">{item.description}</p>
                          <p className="text-[11px] text-slate-500 mt-1">
                            <strong className="text-slate-600">Reasoning:</strong> {item.reason}
                          </p>

                          <div className="flex items-center justify-end space-x-2 mt-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleReject(idx)}
                              disabled={item.status === 'rejected'}
                              className={`text-xs px-3 py-1 rounded font-medium border transition ${
                                item.status === 'rejected'
                                  ? 'bg-slate-200 text-slate-500 border-transparent'
                                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              {item.status === 'rejected' ? 'Rejected' : 'Reject'}
                            </button>
                            <button
                              onClick={() => handleApprove(idx)}
                              disabled={item.status === 'approved'}
                              className={`text-xs px-3 py-1 rounded font-medium transition ${
                                item.status === 'approved'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {item.status === 'approved' ? 'Approved ✓' : 'Approve'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Real-time Claim Form & Submission (5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-0">
                <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>3. Claim Auto-Fill & Review</span>
                  <span className="bg-blue-700 text-white text-[10px] px-2 py-0.5 rounded">Form 3</span>
                </div>

                <form onSubmit={handleSubmitClaim} className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Patient ID Reference</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border border-slate-300 rounded text-xs text-slate-800 bg-slate-50"
                      value={patientId}
                      onChange={(e) => setPatientId(e.target.value)}
                    />
                  </div>

                  {/* Approved ICD-10 Box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Approved Diagnosis Codes (ICD-10)
                    </label>
                    <div className="min-h-[46px] p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-wrap gap-1.5 items-center">
                      {diagnosisCodes.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">No ICD-10 codes approved yet</span>
                      ) : (
                        diagnosisCodes.map((code) => (
                          <span
                            key={code}
                            className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold border border-blue-200 flex items-center space-x-1"
                          >
                            <span>{code}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Approved CPT Box */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Approved Procedure Codes (CPT)
                    </label>
                    <div className="min-h-[46px] p-2 border border-slate-200 rounded-lg bg-slate-50 flex flex-wrap gap-1.5 items-center">
                      {procedureCodes.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">No CPT codes approved yet</span>
                      ) : (
                        procedureCodes.map((code) => (
                          <span
                            key={code}
                            className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-bold border border-purple-200 flex items-center space-x-1"
                          >
                            <span>{code}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Billing Financial Summary */}
                  <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Base Consultation Fee</span>
                      <span>$250.00</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Extracted Procedure Charges</span>
                      <span>${(procedureCodes.length * 450).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t">
                      <span>Total Estimated Claim</span>
                      <span className="text-blue-700">${totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition text-xs uppercase tracking-wider shadow-md"
                  >
                    Generate & Record Final Claim
                  </button>

                  {claimStatus && (
                    <p className="text-xs text-center font-bold text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-200">
                      {claimStatus}
                    </p>
                  )}
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}