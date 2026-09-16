'use client';

import React, { useEffect, useState } from 'react';
import { getClaims } from '@/lib/api';

export default function ReportsPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);

  const loadClaims = async () => {
    try {
      const data = await getClaims();
      setClaims(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  // Search & Filter Logic
  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.id?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.patient_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === 'ALL' ||
      (claim.status || 'SUBMITTED').toUpperCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Calculate Metrics
  const totalRevenue = claims.reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);
  const highRiskCount = claims.filter((c) => (c.status || '').toUpperCase() === 'FLAGGED').length;

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Claims & Compliance Audits</h1>
          <p className="text-slate-500 text-xs mt-1">
            Persistent claims history, ICD-10/CPT coding audits, and real-time revenue analytics via Supabase.
          </p>
        </div>
        <button
          onClick={loadClaims}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl text-xs transition border border-slate-300 flex items-center space-x-2"
        >
          <span>🔄</span>
          <span>Refresh Claims</span>
        </button>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Claims</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{claims.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg">
            📄
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Revenue Billed</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
            💰
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Audit Risk Flags</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{highRiskCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 text-lg">
            ⚠️
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Avg Claim Value</p>
            <p className="text-2xl font-black text-purple-600 mt-1">
              ${claims.length > 0 ? Math.round(totalRevenue / claims.length).toLocaleString() : 0}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-lg">
            📈
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar: Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search by Claim ID or Patient ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Claim Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border border-slate-300 rounded-xl text-xs text-slate-700 bg-white font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="FLAGGED">Flagged</option>
          </select>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading claim records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Claim ID</th>
                  <th className="p-4">Patient ID</th>
                  <th className="p-4">ICD-10 Codes</th>
                  <th className="p-4">CPT Codes</th>
                  <th className="p-4">Billed Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No claims found. Generate a claim from the Billing & AI Coding dashboard.
                    </td>
                  </tr>
                ) : (
                  filteredClaims.map((claim, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-mono font-bold text-blue-600 max-w-[140px] truncate">
                        {claim.id}
                      </td>
                      <td className="p-4 font-semibold text-slate-900">{claim.patient_id}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(claim.diagnosis_codes || []).map((code: string, cIdx: number) => (
                            <span key={cIdx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold border border-blue-200 text-[11px]">
                              {code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {(claim.procedure_codes || []).map((code: string, cIdx: number) => (
                            <span key={cIdx} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono font-bold border border-purple-200 text-[11px]">
                              {code}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 font-black text-slate-900">${Number(claim.total_amount).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          (claim.status || 'SUBMITTED').toUpperCase() === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : (claim.status || 'SUBMITTED').toUpperCase() === 'FLAGGED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}>
                          {claim.status || 'SUBMITTED'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedClaim(claim)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-1.5 rounded-lg border border-slate-300 text-xs transition"
                        >
                          View Audit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claim Audit Modal */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Claim Record Audit</h3>
                <p className="text-xs font-mono text-blue-600">ID: {selectedClaim.id}</p>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Patient ID:</span>
                <span className="font-bold text-slate-900">{selectedClaim.patient_id}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between">
                <span className="text-slate-500">Total Billed:</span>
                <span className="font-black text-emerald-600 text-sm">${Number(selectedClaim.total_amount).toLocaleString()}</span>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Approved ICD-10 Diagnosis Codes:</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-blue-700">
                  {JSON.stringify(selectedClaim.diagnosis_codes)}
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Approved CPT Procedure Codes:</label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-mono text-purple-700">
                  {JSON.stringify(selectedClaim.procedure_codes)}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button onClick={() => setSelectedClaim(null)} className="bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md">
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}