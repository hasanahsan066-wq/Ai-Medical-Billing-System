'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPatients, createPatient } from '@/lib/api';

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    patient_id: `P-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    age: 45,
    gender: 'Male',
    room_bed: '101 / A',
    status: 'Active',
  });

  const loadPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data || []);
    } catch (err) {
      console.error(err);
      // Fallback sample data if API is empty
      setPatients([
        {
          patient_id: 'P-2026-07155',
          name: 'Dela Cruz, Juan Miguel',
          age: 46,
          gender: 'Male',
          room_bed: '201 / A',
          admission_date: '09/01/2026',
          status: 'Active',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPatient(formData);
      setIsModalOpen(false);
      setFormData({
        patient_id: `P-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        name: '',
        age: 35,
        gender: 'Male',
        room_bed: '102 / B',
        status: 'Active',
      });
      loadPatients();
    } catch (err) {
      alert('Failed to register patient');
    }
  };

  // Live Search & Filter Logic
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patient_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === 'ALL' || (p.status || 'Active').toUpperCase() === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-800 font-sans space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Management Directory</h1>
          <p className="text-slate-500 text-xs mt-1">
            Real-time clinical patient records & encounter tracking stored in Supabase.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-500/20 flex items-center space-x-2"
        >
          <span className="text-base leading-none">+</span>
          <span>Register New Patient</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Patients</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{patients.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-lg">
            👥
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Encounters</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {patients.filter((p) => (p.status || 'Active') === 'Active').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-lg">
            🏥
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">In-Hospital Beds</p>
            <p className="text-2xl font-black text-purple-600 mt-1">
              {patients.filter((p) => p.room_bed).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 text-lg">
            🛏️
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Discharged</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {patients.filter((p) => p.status === 'Discharged').length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-lg">
            📋
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar: Search & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-96">
          <input
            type="text"
            placeholder="Search by Patient Name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-500 font-medium">Filter Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 border border-slate-300 rounded-xl text-xs text-slate-700 bg-white font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISCHARGED">Discharged</option>
          </select>
        </div>
      </div>

      {/* Patient Interactive Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading directory records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Patient ID</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Age / Gender</th>
                  <th className="p-4">Room / Bed</th>
                  <th className="p-4">Admission Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      No matching patient records found.
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-mono font-bold text-blue-600">{p.patient_id}</td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                            {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                          </div>
                          <span className="font-semibold text-slate-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{p.age} Y / {p.gender}</td>
                      <td className="p-4 font-medium">{p.room_bed || '101 / A'}</td>
                      <td className="p-4 text-slate-500">{p.admission_date || '09/01/2026'}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            (p.status || 'Active') === 'Active'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {p.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Link
                          href="/"
                          className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold px-3 py-1.5 rounded-lg border border-blue-200 text-xs transition inline-block"
                        >
                          + New Claim
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registration Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Register New Clinical Patient</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Generated Patient ID</label>
                <input
                  type="text"
                  readOnly
                  value={formData.patient_id}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-blue-600 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Full Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Age</label>
                  <input
                    type="number"
                    required
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Room / Bed Allocation</label>
                <input
                  type="text"
                  value={formData.room_bed}
                  onChange={(e) => setFormData({ ...formData, room_bed: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl shadow-md"
                >
                  Save Patient Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}