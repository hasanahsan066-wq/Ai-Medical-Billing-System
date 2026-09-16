'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SettingsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Authentication Guard
  useEffect(() => {
    const checkUserSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setCheckingAuth(false);
      }
    };
    checkUserSession();
  }, [router]);

  // Form State
  const [clinicData, setClinicData] = useState({
    clinicName: 'Physiotherapy & Rehabilitation Center',
    npiNumber: '1234567890',
    taxId: 'XX-XXX9823',
    billingEmail: 'hasanahsan066@gmail.com',
    modelProvider: 'Groq Llama-3 70B (Fast Medical Inference)',
    anonymizePHI: true,
    autoAuditRisk: true,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (checkingAuth) {
    return (
      <div className="h-screen bg-[#0a192f] text-white flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider text-slate-300">
          Loading Settings Configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden relative">
      {/* Navy Sidebar Navigation */}
      <aside className="w-64 bg-[#0a192f] text-slate-300 flex flex-col justify-between shrink-0 shadow-xl border-r border-slate-800">
        <div>
          {/* Brand Header */}
          <div className="flex items-center space-x-3 p-5 border-b border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/30">
              AI
            </div>
            <span className="font-bold text-white text-base tracking-wide">
              MEDIBILL HIMS
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            <Link
              href="/"
              className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 hover:translate-x-1 transition-all duration-200 border border-transparent"
            >
              <span>📊</span>
              <span>Dashboard</span>
            </Link>

            <Link
              href="/patients"
              className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 hover:translate-x-1 transition-all duration-200 border border-transparent"
            >
              <span>👥</span>
              <span>Patient Management</span>
            </Link>

            <Link
              href="/"
              className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 hover:translate-x-1 transition-all duration-200 border border-transparent"
            >
              <span>⚡</span>
              <span>Billing & AI Coding</span>
            </Link>

            <Link
              href="/reports"
              className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 hover:translate-x-1 transition-all duration-200 border border-transparent"
            >
              <span>📋</span>
              <span>Reports & Claims</span>
            </Link>

            {/* Active Link: Settings */}
            <Link
              href="/settings"
              className="flex items-center space-x-3 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30 transition-all duration-200"
            >
              <span>⚙️</span>
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>v2.4</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="text-rose-400 hover:text-rose-300 font-bold transition flex items-center space-x-1"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#0b192c] text-white px-6 py-3 flex items-center justify-between shadow-md border-b border-slate-800">
          <div>
            <h1 className="text-lg font-bold tracking-tight">System & Provider Settings</h1>
            <p className="text-xs text-slate-400">Dashboard &gt; Settings &gt; Configuration & HIPAA Privacy</p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
              ✓ System Active
            </span>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Header Banner Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Healthcare Institution Profile</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage NPI registration numbers, AI coding parameters, and HIPAA PHI anonymization protocols.
              </p>
            </div>
            <div className="text-right text-xs text-slate-400">
              Last Sync: <strong className="text-slate-700">Just Now</strong>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
            {/* Institution Info Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span>1. Provider & Billing Identifiers</span>
                <span className="text-blue-400 font-normal">NPI / Tax Verification</span>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Clinic / Hospital Name</label>
                  <input
                    type="text"
                    value={clinicData.clinicName}
                    onChange={(e) => setClinicData({ ...clinicData, clinicName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">National Provider Identifier (NPI)</label>
                  <input
                    type="text"
                    value={clinicData.npiNumber}
                    onChange={(e) => setClinicData({ ...clinicData, npiNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Tax ID / EIN</label>
                  <input
                    type="text"
                    value={clinicData.taxId}
                    onChange={(e) => setClinicData({ ...clinicData, taxId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Billing Contact Email</label>
                  <input
                    type="email"
                    value={clinicData.billingEmail}
                    onChange={(e) => setClinicData({ ...clinicData, billingEmail: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            {/* AI Engine & HIPAA Privacy Settings Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span>2. AI LLM Engine & Compliance Controls</span>
                <span className="text-emerald-400 font-normal">Groq & HIPAA Sync</span>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Primary Code Extraction Engine</label>
                  <select
                    value={clinicData.modelProvider}
                    onChange={(e) => setClinicData({ ...clinicData, modelProvider: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none bg-slate-50/50"
                  >
                    <option value="Groq Llama-3 70B (Fast Medical Inference)">
                      Groq — Llama 3 70B (High-Speed Medical LLM)
                    </option>
                    <option value="Groq Mixtral 8x7B">Groq — Mixtral 8x7B</option>
                    <option value="OpenAI GPT-4o">OpenAI — GPT-4o (Fallback Backup)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-bold text-slate-900">PHI Anonymization Filter</p>
                      <p className="text-[11px] text-slate-500">Redact names & numbers before sending to LLM API.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={clinicData.anonymizePHI}
                      onChange={(e) => setClinicData({ ...clinicData, anonymizePHI: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div>
                      <p className="font-bold text-slate-900">Auto-Audit Risk Flagging</p>
                      <p className="text-[11px] text-slate-500">Automatically flag claims exceeding 50% risk score.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={clinicData.autoAuditRisk}
                      onChange={(e) => setClinicData({ ...clinicData, autoAuditRisk: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Action Footer */}
            <div className="flex justify-between items-center pt-2">
              {saved ? (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 flex items-center space-x-1">
                  <span>✓</span>
                  <span>Configuration saved successfully!</span>
                </span>
              ) : (
                <span />
              )}

              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-lg text-xs transition shadow-md shadow-blue-500/20"
              >
                Save Settings
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}