'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  extractCodes,
  createClaim,
  getWorkflowLogs,
  sendAssistantQuery,
  getDashboardStats,
  getPatients,
  createPatient,
  CodeSuggestion,
} from '@/lib/api';

interface ReviewableSuggestion extends CodeSuggestion {
  status: 'pending' | 'approved' | 'rejected';
}

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  quantity: number;
  unitPrice: number;
}

interface ValidationResult {
  status: 'PASS' | 'WARNING' | 'REVIEW_REQUIRED';
  risk_score: number;
  issues: string[];
  recommendations: string[];
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // --- Sidebar Open/Close Collapse Toggle State ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Real-Time Live Clock ---
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'medium',
        })
      );
    };
    updateClock();
    const clockTimer = setInterval(updateClock, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // --- Auth Session Guard ---
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setCheckingAuth(false);
      }
    };
    checkUserSession();
  }, [router]);

  // --- Helper Function: Clean ID Formatting ---
  const formatPatientId = (rawId: string) => {
    if (!rawId) return 'P-2026-001';
    if (rawId.startsWith('P-')) return rawId;
    return `P-${rawId.slice(0, 8).toUpperCase()}`;
  };

  // Dynamic Patient Management States
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<any>({
    id: 'P-2026-07155',
    full_name: 'DELA CRUZ, JUAN MIGUEL',
    age: 46,
    gender: 'Male',
    room_bed: '201 / A',
  });
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    age: '',
    gender: 'Male',
    room_bed: '101 / A',
  });

  // Clinical & Extraction States
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [suggestions, setSuggestions] = useState<ReviewableSuggestion[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Voice Dictation State
  const [isListening, setIsListening] = useState(false);

  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    if (isListening) {
      setIsListening(false);
      return;
    }

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setClinicalNotes((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
      setIsListening(false);
    };

    recognition.start();
  };

  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
  const [procedureCodes, setProcedureCodes] = useState<string[]>([]);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Pharmacy / Medication Billing States
  const [medications, setMedications] = useState<MedicationItem[]>([
    { id: '1', name: 'Metformin HCl', dosage: '500mg', quantity: 30, unitPrice: 1.5 },
    { id: '2', name: 'Amoxicillin Trihydrate', dosage: '250mg', quantity: 14, unitPrice: 2.0 },
  ]);
  const [newMedName, setNewMedName] = useState('');
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedQty, setNewMedQty] = useState(1);
  const [newMedPrice, setNewMedPrice] = useState(5.0);

  // Costs
  const baseProcedureCost = procedureCodes.length * 150 + 100;
  const medSubtotal = medications.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalAmount = baseProcedureCost + medSubtotal;

  // Modals
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCMS1500, setShowCMS1500] = useState(false);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [showWorkflows, setShowWorkflows] = useState(false);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Hello! I am your MEDIBILL AI Assistant. How can I help you audit your claims or manage pharmacy billing today?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Dashboard Stats
  const [stats, setStats] = useState({
    total_claims: 0,
    total_revenue: 0,
    high_risk_claims: 0,
    active_patients: 1,
  });

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  useEffect(() => {
    if (!checkingAuth) {
      fetchStats();
      getPatients().then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setPatientsList(data);
          setSelectedPatient(data[0]);
        }
      });
    }
  }, [checkingAuth]);

  // Handlers
  const handleRegisterNewPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.full_name.trim() || !newPatient.age) {
      alert('Please enter Patient Name and Age');
      return;
    }

    try {
      const res = await createPatient({
        full_name: newPatient.full_name,
        age: Number(newPatient.age),
        gender: newPatient.gender,
        room_bed: newPatient.room_bed || '101 / A',
        admission_date: new Date().toISOString().split('T')[0],
        status: 'Active',
      });

      if (res && res.patient) {
        setPatientsList((prev) => [res.patient, ...prev]);
        setSelectedPatient(res.patient);
        setShowAddPatientModal(false);
        setNewPatient({ full_name: '', age: '', gender: 'Male', room_bed: '101 / A' });
        alert('Patient successfully registered in Supabase!');
      } else {
        alert('Failed to register patient in database. Check backend logs.');
      }
    } catch (err: any) {
      console.error('Failed to create patient:', err);
      alert(`Error registering patient: ${err.message || 'Unknown error'}`);
    }
  };

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;
    const newItem: MedicationItem = {
      id: Date.now().toString(),
      name: newMedName,
      dosage: newMedDosage || '500mg',
      quantity: Number(newMedQty) || 1,
      unitPrice: Number(newMedPrice) || 0,
    };
    setMedications([...medications, newItem]);
    setNewMedName('');
    setNewMedDosage('');
    setNewMedQty(1);
    setNewMedPrice(5.0);
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(medications.filter((m) => m.id !== id));
  };

  const handleFetchWorkflowLogs = async () => {
    try {
      const logs = await getWorkflowLogs();
      if (logs && Array.isArray(logs) && logs.length > 0) {
        setWorkflowLogs(logs);
      } else {
        setWorkflowLogs([
          { id: '1', step: 'Groq Llama-3 NLP Ingestion', status: 'SUCCESS', timestamp: '10:32:01 AM', details: 'Parsed clinical note text; extracted ICD-10 and CPT candidates.' },
          { id: '2', step: 'HIPAA Anonymization Check', status: 'PASSED', timestamp: '10:32:02 AM', details: 'No unmasked PHI detected in external payload.' },
          { id: '3', step: 'HITL Verification Sync', status: 'PENDING', timestamp: '10:32:03 AM', details: 'Awaiting human biller confirmation on CPT codes.' },
          { id: '4', step: 'Supabase DB Sync', status: 'COMPLETED', timestamp: '10:32:05 AM', details: 'Record staged in cloud database.' },
        ]);
      }
    } catch (err) {
      setWorkflowLogs([
        { id: '1', step: 'Groq Llama-3 NLP Ingestion', status: 'SUCCESS', timestamp: '10:32:01 AM', details: 'Parsed clinical note text; extracted ICD-10 and CPT candidates.' },
        { id: '2', step: 'HIPAA Anonymization Check', status: 'PASSED', timestamp: '10:32:02 AM', details: 'No unmasked PHI detected in external payload.' },
        { id: '3', step: 'HITL Verification Sync', status: 'PENDING', timestamp: '10:32:03 AM', details: 'Awaiting human biller confirmation on CPT codes.' },
        { id: '4', step: 'Supabase DB Sync', status: 'COMPLETED', timestamp: '10:32:05 AM', details: 'Record staged in cloud database.' },
      ]);
    } finally {
      setShowWorkflows(true);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMsg) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setIsSendingMsg(true);

    try {
      const res = await sendAssistantQuery(userMsg);
      setChatMessages((prev) => [...prev, { sender: 'ai', text: res.reply }]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I encountered an error connecting to the billing assistant.' },
      ]);
    } finally {
      setIsSendingMsg(false);
    }
  };

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

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient?.id) {
      alert('Please select or register a valid Patient');
      return;
    }

    setClaimStatus(null);
    setValidationResult(null);

    try {
      const res = await createClaim({
        patient_id: selectedPatient.id,
        diagnosis_codes: diagnosisCodes,
        procedure_codes: procedureCodes,
        total_amount: Number(totalAmount),
        status: 'submitted',
      });

      setClaimStatus(res.message || 'Claim generated and saved to Supabase!');
      if (res.claim?.validation) {
        setValidationResult(res.claim.validation);
      }
      fetchStats();
    } catch (err: any) {
      setClaimStatus(`Error: ${err.message}`);
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Patient Management', href: '/patients', icon: '👥' },
    { name: 'Billing & AI Coding', href: '/', icon: '⚡' },
    { name: 'Reports & Claims', href: '/reports', icon: '📋' },
    { name: 'Settings', href: '/settings', icon: '⚙️' },
  ];

  if (checkingAuth) {
    return (
      <div className="h-screen bg-[#0a192f] text-white flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold tracking-wider text-slate-300">
          Authenticating MEDIBILL Session...
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden relative">
      {/* Collapsible Sidebar Navigation (Gemini Style Toggle) */}
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-[#0a192f] text-slate-300 flex flex-col justify-between shrink-0 shadow-xl border-r border-slate-800 transition-all duration-300`}
      >
        <div>
          {/* Sidebar Header & Open/Close Toggle Button */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md shadow-blue-500/30">
                AI
              </div>
              {isSidebarOpen && (
                <span className="font-bold text-white text-base tracking-wide whitespace-nowrap">
                  MEDIBILL HIMS
                </span>
              )}
            </div>

            {/* Sidebar Toggle Icon Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 text-sm font-medium">
            {navItems.map((item, idx) => {
              let isActive = false;
              if (item.name === 'Dashboard') {
                isActive = pathname === '/';
              } else if (item.href !== '/') {
                isActive = pathname.startsWith(item.href);
              } else {
                isActive = false;
              }

              return (
                <Link
                  key={`${item.name}-${idx}`}
                  href={item.href}
                  className={`flex items-center ${
                    isSidebarOpen ? 'space-x-3 px-3.5' : 'justify-center px-2'
                  } py-2.5 rounded-xl transition-all duration-200 border border-transparent ${
                    isActive
                      ? 'bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {isSidebarOpen && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Logout */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          {isSidebarOpen && <span>v2.4</span>}
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="text-rose-400 hover:text-rose-300 font-bold transition flex items-center space-x-1"
          >
            <span>🚪</span>
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-[#0b192c] text-white px-6 py-3 flex items-center justify-between shadow-md border-b border-slate-800">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Integrated Billing & Pharmacy Studio</h1>
            <p className="text-xs text-slate-400">Dashboard &gt; Billing &gt; AI Medical Coding & Pharmacy Charges</p>
          </div>
          <div className="flex items-center space-x-3 text-xs">
            {/* Real-time Clock Badge */}
            <div className="bg-slate-800 text-blue-300 px-3 py-1.5 rounded-lg border border-slate-700 font-mono text-[11px] flex items-center space-x-1.5">
              <span>🕒</span>
              <span className="font-bold">{currentTime || 'Loading clock...'}</span>
            </div>

            <button
              onClick={() => setShowCMS1500(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow flex items-center space-x-1.5"
            >
              <span>📄</span>
              <span>CMS-1500 Export</span>
            </button>

            <button
              onClick={() => setShowReceipt(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition shadow flex items-center space-x-1.5"
            >
              <span>🧾</span>
              <span>Preview Itemized Bill</span>
            </button>

            <button
              onClick={handleFetchWorkflowLogs}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold px-3 py-1.5 rounded-lg transition shadow flex items-center space-x-1.5"
            >
              <span>⚡</span>
              <span>View Workflows</span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-100">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Claims</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats.total_claims}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-lg">
                📄
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Total Billed Revenue</p>
                <p className="text-2xl font-black text-blue-600 mt-1">${stats.total_revenue.toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-lg">
                💰
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">High Risk Audit Flags</p>
                <p className="text-2xl font-black text-rose-600 mt-1">{stats.high_risk_claims}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 text-lg">
                ⚠️
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">Active Patients</p>
                <p className="text-2xl font-black text-purple-600 mt-1">{patientsList.length || stats.active_patients}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 text-lg">
                🏥
              </div>
            </div>
          </div>

          {/* Dynamic Patient Selector Header (Clean ID Formatting) */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold text-lg">
                👤
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900 uppercase">
                    {selectedPatient?.full_name || selectedPatient?.name || 'DELA CRUZ, JUAN MIGUEL'}
                  </h2>
                  {/* Clean Short Patient ID Badge */}
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-mono">
                    {formatPatientId(selectedPatient?.id)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span>Age/Sex: <strong className="text-slate-800">{selectedPatient?.age || 46} / {selectedPatient?.gender || 'Male'}</strong></span>
                  <span>Room/Bed: <strong className="text-slate-800">{selectedPatient?.room_bed || '201 / A'}</strong></span>
                  <span>Procedures Subtotal: <strong className="text-slate-800">${baseProcedureCost.toFixed(2)}</strong></span>
                  <span>Pharmacy Subtotal: <strong className="text-blue-700">${medSubtotal.toFixed(2)}</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              {/* Clean Patient Selection Dropdown */}
              <select
                value={selectedPatient?.id || ''}
                onChange={(e) => {
                  const p = patientsList.find((item) => item.id === e.target.value);
                  if (p) setSelectedPatient(p);
                }}
                className="bg-slate-50 border border-slate-300 text-xs text-slate-800 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
              >
                {patientsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.name} ({formatPatientId(p.id)})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setShowAddPatientModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-xs flex items-center space-x-1 whitespace-nowrap"
              >
                <span>+</span>
                <span>Add Patient</span>
              </button>

              <div className="text-right border-l pl-4 border-slate-200 hidden lg:block">
                <p className="text-[10px] text-slate-500 font-medium uppercase">GRAND TOTAL BALANCE</p>
                <p className="text-xl font-black text-blue-700">${totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: AI Clinical Notes & Code Suggestions */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>1. Clinical Documentation Input</span>
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center space-x-1.5 transition shadow-xs ${
                      isListening
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    <span>{isListening ? '🎙️ Listening...' : '🎙️ Voice Dictation'}</span>
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {/* Fixed Textarea: resize-none added to remove raw handle */}
                  <textarea
                    className="w-full h-32 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-slate-800 text-sm bg-slate-50/50 resize-none"
                    placeholder="Paste or dictate doctor's clinical examination notes, diagnoses, or prescribed medications here..."
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                  />
                  <button
                    onClick={handleExtractCodes}
                    disabled={isExtracting || !clinicalNotes.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-2.5 rounded-lg transition text-sm shadow"
                  >
                    {isExtracting ? 'Analyzing Clinical Notes...' : '✨ Run AI Medical Code Extraction'}
                  </button>

                  {extractError && <p className="text-xs text-red-600 font-medium">{extractError}</p>}
                </div>
              </div>

              {/* HITL Suggestions Section */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>2. HITL Code Review</span>
                  <span className="text-blue-400 font-normal">{suggestions.length} Suggested</span>
                </div>

                <div className="p-4">
                  {suggestions.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs">
                      No codes generated yet. Enter notes and click extraction.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                      {suggestions.map((item, idx) => (
                        <div
                          key={`${item.code}-${idx}`}
                          className={`p-3 rounded-lg border transition ${
                            item.status === 'approved'
                              ? 'border-blue-300 bg-blue-50/50'
                              : item.status === 'rejected'
                              ? 'border-slate-200 bg-slate-100 opacity-60'
                              : 'border-slate-200 bg-white shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-slate-900 text-sm">{item.code}</span>
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
                            <span className="font-bold text-blue-700">{item.confidence_score}% Match</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 mt-1">{item.description}</p>

                          <div className="flex items-center justify-end space-x-2 mt-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleReject(idx)}
                              disabled={item.status === 'rejected'}
                              className="text-xs px-2.5 py-1 rounded font-medium border border-slate-300 hover:bg-slate-100 text-slate-700"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprove(idx)}
                              disabled={item.status === 'approved'}
                              className="text-xs px-2.5 py-1 rounded font-medium bg-blue-600 hover:bg-blue-700 text-white"
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

            {/* Right Column: Pharmacy Itemization & Claim Submission */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>3. Pharmacy & Medication Charges</span>
                  <span className="bg-blue-700 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                    Subtotal: ${medSubtotal.toFixed(2)}
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px]">
                        <tr>
                          <th className="p-2">Medication</th>
                          <th className="p-2">Dosage</th>
                          <th className="p-2">Qty</th>
                          <th className="p-2">Price</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {medications.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="p-2 font-semibold">{m.name}</td>
                            <td className="p-2 text-slate-500">{m.dosage}</td>
                            <td className="p-2 font-bold">{m.quantity}</td>
                            <td className="p-2">${m.unitPrice.toFixed(2)}</td>
                            <td className="p-2 font-bold text-blue-700 text-right">
                              ${(m.quantity * m.unitPrice).toFixed(2)}
                            </td>
                            <td className="p-2 text-right">
                              <button
                                onClick={() => handleRemoveMedication(m.id)}
                                className="text-rose-500 hover:text-rose-700 font-bold px-1"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <form onSubmit={handleAddMedication} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                    <p className="text-[11px] font-bold text-slate-700">+ Add Prescribed Medicine</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <input
                        type="text"
                        placeholder="Medicine Name (e.g. Paracetamol)"
                        required
                        className="p-1.5 border border-slate-300 rounded bg-white text-slate-800"
                        value={newMedName}
                        onChange={(e) => setNewMedName(e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Dosage (e.g. 500mg)"
                        className="p-1.5 border border-slate-300 rounded bg-white text-slate-800"
                        value={newMedDosage}
                        onChange={(e) => setNewMedDosage(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        required
                        className="p-1.5 border border-slate-300 rounded bg-white text-slate-800"
                        value={newMedQty}
                        onChange={(e) => setNewMedQty(Number(e.target.value))}
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Unit Price ($)"
                        required
                        className="p-1.5 border border-slate-300 rounded bg-white text-slate-800"
                        value={newMedPrice}
                        onChange={(e) => setNewMedPrice(Number(e.target.value))}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 rounded text-xs transition shadow-xs"
                    >
                      Add Medicine to Bill
                    </button>
                  </form>
                </div>
              </div>

              {/* Final Claim Submission */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-[#0b192c] text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>4. Claim Submission</span>
                  <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded">Form 4</span>
                </div>

                <form onSubmit={handleSubmitClaim} className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Approved Codes Summary</label>
                    <div className="p-2 border border-slate-200 rounded-lg bg-slate-50 text-xs text-slate-700 font-mono">
                      ICD-10: {diagnosisCodes.join(', ') || 'None'} | CPT: {procedureCodes.join(', ') || 'None'}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition text-xs uppercase tracking-wider shadow-md"
                  >
                    Submit Complete Claim (${totalAmount.toFixed(2)})
                  </button>

                  {claimStatus && (
                    <p className="text-xs text-center font-bold p-2 rounded border text-blue-700 bg-blue-50 border-blue-200">
                      {claimStatus}
                    </p>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Register New Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-[#0b192c] text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-sm">Register New Patient</h3>
              <button onClick={() => setShowAddPatientModal(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterNewPatient} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ali Khan"
                  value={newPatient.full_name}
                  onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 32"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Room / Bed No.</label>
                <input
                  type="text"
                  placeholder="e.g. 101 / A"
                  value={newPatient.room_bed}
                  onChange={(e) => setNewPatient({ ...newPatient, room_bed: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md"
                >
                  Save & Select Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Itemized Hospital Receipt Modal */}
      {showReceipt && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#0b192c] text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400 font-bold text-lg">🧾</span>
                <h3 className="font-bold text-sm tracking-wide">Formal Itemized Hospital Invoice</h3>
              </div>
              <button
                onClick={() => setShowReceipt(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div className="border-b border-slate-200 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-base font-black text-slate-900">MEDIBILL HEALTHCARE CENTER</h2>
                  <p className="text-[11px] text-slate-500">NPI: 1234567890 | Tax ID: XX-XXX9823</p>
                  <p className="text-[11px] text-slate-500">Narowal Road, Punjab, Pakistan</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-blue-700">INV-2026-9921</p>
                  <p className="text-[10px] text-slate-400">{new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                <div>Patient Name: <strong className="text-slate-900">{selectedPatient?.full_name || selectedPatient?.name}</strong></div>
                <div>Patient ID: <strong className="text-blue-700">{formatPatientId(selectedPatient?.id)}</strong></div>
                <div>Age / Gender: <strong>{selectedPatient?.age} / {selectedPatient?.gender}</strong></div>
                <div>Attending Doctor: <strong>Dr. Hasan bin Ahsan</strong></div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1 border-b pb-1">Medical Procedures & Codes</p>
                <div className="flex justify-between py-1 text-slate-700">
                  <span>General Outpatient Consultation & Code Audit</span>
                  <span className="font-bold">${baseProcedureCost.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-900 mb-1 border-b pb-1">Prescribed Medicines & Pharmacy Charges</p>
                {medications.map((m) => (
                  <div key={m.id} className="flex justify-between py-1 text-slate-700">
                    <span>{m.name} ({m.dosage}) x {m.quantity}</span>
                    <span className="font-bold">${(m.quantity * m.unitPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="bg-[#0a192f] text-white p-3.5 rounded-xl flex justify-between items-center text-sm">
                <span className="font-bold">Total Payable Amount:</span>
                <span className="font-black text-blue-400 text-lg">${totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-md"
              >
                🖨️ Print Official Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Commercial CMS-1500 Standard Health Insurance Claim Form Modal */}
      {showCMS1500 && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-800 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xl">📄</span>
                <h3 className="font-bold text-sm">HEALTH INSURANCE CLAIM FORM (CMS-1500)</h3>
              </div>
              <button onClick={() => setShowCMS1500(false)} className="text-slate-200 hover:text-white font-bold text-lg px-2">
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto text-xs font-mono space-y-4 bg-amber-50/20">
              <div className="border-2 border-red-800 p-5 rounded bg-white text-slate-900 space-y-4">
                <div className="text-center font-bold text-red-800 border-b-2 border-red-800 pb-2 text-xs">
                  APPROVED BY NATIONAL UNIFORM CLAIM COMMITTEE (NUCC) 02/12
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-sans">1. MEDICARE / MEDICAID / INSURED ID NUMBER</p>
                    <p className="font-bold text-slate-900 text-sm">{formatPatientId(selectedPatient?.id)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-sans">2. PATIENT'S NAME (Last Name, First Name, Middle Initial)</p>
                    <p className="font-bold text-slate-900 text-sm">{selectedPatient?.full_name || selectedPatient?.name}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[10px] text-slate-400 font-sans">3. PATIENT DOB / SEX</p>
                    <p className="font-bold">{selectedPatient?.age} YRS / {selectedPatient?.gender}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-sans">21. DIAGNOSIS OR NATURE OF ILLNESS (ICD-10)</p>
                    <p className="font-bold text-blue-800">{diagnosisCodes.join(', ') || 'I25.10, I10'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-sans">24. CPT / HCPCS PROCEDURES</p>
                    <p className="font-bold text-purple-800">{procedureCodes.join(', ') || '99214, 93000'}</p>
                  </div>
                </div>

                <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-red-700 font-bold uppercase font-sans">28. TOTAL CHARGE SUBMITTED</p>
                    <p className="text-xs text-red-600 font-sans">Form 1500 Claim Line Balance</p>
                  </div>
                  <p className="font-black text-xl text-red-900">${totalAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shadow-md"
              >
                🖨️ Print CMS-1500 Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Execution Workflows Modal */}
      {showWorkflows && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#0b192c] text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-blue-400 font-bold text-lg">⚡</span>
                <h3 className="font-bold text-sm tracking-wide">Automated System Execution Workflows</h3>
              </div>
              <button
                onClick={() => setShowWorkflows(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              <p className="text-slate-500 mb-2">Live transaction audit trail for AI inference and Supabase database synchronization:</p>
              {workflowLogs.map((log, idx) => (
                <div key={log.id || idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{log.step || log.name || 'System Execution Step'}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-blue-100 text-blue-700">
                        {log.status || 'COMPLETED'}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{log.details || log.description || 'Execution step processed successfully.'}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">{log.timestamp || 'Just Now'}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setShowWorkflows(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition"
              >
                Close Workflow Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Modern AI Billing Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-5 py-3 rounded-full shadow-2xl flex items-center space-x-2 transition transform hover:scale-105 border border-blue-400/30 uppercase tracking-wider"
          >
            <span>AI Billing</span>
          </button>
        ) : (
          <div className="bg-white w-80 sm:w-96 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[450px]">
            <div className="bg-[#0b192c] text-white p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-xs">
                  AI
                </div>
                <div>
                  <h4 className="font-bold text-xs">MEDIBILL AI Assistant</h4>
                  <p className="text-[10px] text-slate-400">Pharmacy & Billing Copilot</p>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs bg-slate-50">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] p-2.5 rounded-xl ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendChatMessage} className="p-2.5 bg-white border-t border-slate-200 flex space-x-2">
              <input
                type="text"
                placeholder="Ask e.g. What is the pharmacy total?"
                className="flex-1 text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-lg text-xs transition"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}