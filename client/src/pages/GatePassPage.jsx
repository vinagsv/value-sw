import React, { useState, useEffect } from 'react';
import { Search, Plus, Printer, Save, Trash2, Edit } from 'lucide-react';
import { createPortal } from 'react-dom';
import { fetchGatePasses, createGatePass, updateGatePass, deleteGatePass } from '../api/gatePasses';
import { fetchNextGatePassNumber } from '../api/settings';

const GatePassPage = ({ theme }) => {
  const isDark = theme === 'dark';
  const [gatePasses, setGatePasses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentGP, setCurrentGP] = useState(null);
  const [viewMode, setViewMode] = useState('list');

  const blankForm = {
    id: null, gate_pass_no: '', date: new Date().toISOString().split('T')[0],
    customer_name: '', customer_mobile: '', vehicle_reg_no: '', ref_bill_no: ''
  };
  const [form, setForm] = useState(blankForm);

  useEffect(() => { loadGatePasses(); }, []);

  const loadGatePasses = async (search = '') => {
    setIsLoading(true);
    try {
      const data = await fetchGatePasses(search);
      setGatePasses(data);
    } catch (err) { console.error('Failed to load gate passes', err); }
    setIsLoading(false);
  };

  const handleSearch = e => {
    setSearchTerm(e.target.value);
    if (e.target.value.length > 2 || e.target.value === '') loadGatePasses(e.target.value);
  };

  const handleCreateNew = async () => {
    try {
      const res = await fetchNextGatePassNumber();
      setForm({ ...blankForm, gate_pass_no: res.next_gate_pass_no });
      setViewMode('form');
    } catch (err) { console.error(err); }
  };

  const handleEdit = (gp) => {
    setForm({
      id: gp.id,
      gate_pass_no: gp.gate_pass_no,
      date: new Date(gp.date).toISOString().split('T')[0],
      customer_name: gp.customer_name,
      customer_mobile: gp.customer_mobile || '',
      vehicle_reg_no: gp.vehicle_reg_no || '',
      ref_bill_no: gp.ref_bill_no || ''
    });
    setViewMode('form');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let savedData;
      if (form.id) {
        savedData = await updateGatePass(form.id, form);
      } else {
        savedData = await createGatePass(form);
      }
      setCurrentGP(savedData.gatePass);
      loadGatePasses(searchTerm);
      setViewMode('preview');
    } catch (err) {
      alert('Failed to save Gate Pass');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this gate pass permanently?")) return;
    try {
      await deleteGatePass(id);
      loadGatePasses(searchTerm);
      setViewMode('list');
    } catch (err) {
      alert('Failed to delete Gate Pass');
    }
  };

  const inputClass = isDark
    ? 'w-full bg-gray-700 border border-gray-600 text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
    : 'w-full bg-gray-50 border border-gray-300 text-gray-800 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none';

  // ── This renders the actual gate pass content (no outer sizing wrapper) ──
  const GatePassContent = ({ gp }) => (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <img
          src="/suzuki-logo.png"
          alt="Suzuki"
          style={{ width: 180, height: 'auto', objectFit: 'contain' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', fontFamily: 'sans-serif', color: '#000', letterSpacing: '0.03em' }}>
            VALUE MOTOR AGENCY PVT LTD
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 700, fontFamily: 'sans-serif', color: '#444', marginTop: 2 }}>
            #16/A, MILLERS ROAD VASANTH NAGAR, BLR - 52
          </div>
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', padding: '4px 0', marginBottom: 10 }}>
        <span style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'sans-serif', color: '#000' }}>
          GATE PASS
        </span>
      </div>

      {/* Gate Pass No + Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 11.5, fontWeight: 700, fontFamily: 'sans-serif', color: '#444', padding: '0 4px' }}>
        <div>GATE PASS NO: <span style={{ color: '#dc2626', fontSize: 13, marginLeft: 4 }}>{gp.gate_pass_no}</span></div>
        <div>DATE: <span style={{ fontSize: 13, marginLeft: 4, color: '#000' }}>{new Date(gp.date).toLocaleDateString('en-GB')}</span></div>
      </div>

      {/* Fields */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <span style={{ fontWeight: 700, marginRight: 8, textTransform: 'uppercase', flexShrink: 0, width: 120 }}>Customer Name:</span>
          <span style={{ borderBottom: '1px dotted black', flexGrow: 1, padding: '0 8px', fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>
            {gp.customer_name || ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1 }}>
            <span style={{ fontWeight: 700, marginRight: 8, textTransform: 'uppercase', flexShrink: 0 }}>Mobile No:</span>
            <span style={{ borderBottom: '1px dotted black', flexGrow: 1, padding: '0 8px', fontWeight: 700, textTransform: 'uppercase' }}>
              {gp.customer_mobile || ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1 }}>
            <span style={{ fontWeight: 700, marginRight: 8, textTransform: 'uppercase', flexShrink: 0 }}>Veh Reg No:</span>
            <span style={{ borderBottom: '1px dotted black', flexGrow: 1, padding: '0 8px', fontWeight: 700, textTransform: 'uppercase' }}>
              {gp.vehicle_reg_no || ''}
            </span>
          </div>
        </div>
        {gp.ref_bill_no && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontWeight: 700, marginRight: 8, textTransform: 'uppercase', flexShrink: 0, width: 120 }}>Ref Inv No:</span>
            <span style={{ borderBottom: '1px dotted black', flexGrow: 1, padding: '0 8px', fontWeight: 700, textTransform: 'uppercase', fontSize: 12, color: '#dc2626' }}>
              {gp.ref_bill_no}
            </span>
          </div>
        )}
      </div>

      {/* Signatory */}
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, fontFamily: 'sans-serif', marginBottom: 18 }}>
            For VALUE MOTOR AGENCY PVT LTD
          </div>
          <div style={{ borderTop: '1px solid black', padding: '3px 20px 0', fontSize: 9.5, fontWeight: 700, fontFamily: 'sans-serif' }}>
            Authorised Signatory
          </div>
        </div>
      </div>
    </>
  );

  // ── Print portal needs its OWN sizing wrapper ──
  const GatePassForPrint = ({ gp }) => (
    <div style={{
      width: '210mm',
      background: '#fff',
      color: '#111',
      fontFamily: "'Georgia', 'Times New Roman', serif",
      fontSize: 12,
      lineHeight: 1.55,
      boxSizing: 'border-box',
      padding: '10mm 14mm 8mm',
    }}>
      <GatePassContent gp={gp} />
    </div>
  );

  const printPortalEl = document.getElementById('print-portal');

  return (
    <div
      className={`flex print:block print:h-auto ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}
      style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}
    >
      {/* Print portal */}
      {viewMode === 'preview' && currentGP && printPortalEl &&
        createPortal(<GatePassForPrint gp={currentGP} />, printPortalEl)
      }

      {/* ── Sidebar ── */}
      <div
        className={`flex-shrink-0 flex flex-col border-r print:hidden ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
        style={{ width: 300 }}
      >
        <div className={`p-4 border-b flex flex-col gap-3 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">Gate Passes</h2>
            <button
              onClick={handleCreateNew}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 ${isDark ? 'bg-blue-900/30 border-blue-700 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}
            >
              <Plus size={14} /> New
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" placeholder="Search..." value={searchTerm} onChange={handleSearch}
              className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200'}`}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {isLoading ? (
            <p className="text-center text-xs opacity-50 mt-10">Loading...</p>
          ) : gatePasses.map(gp => (
            <div
              key={gp.id}
              onClick={() => { setCurrentGP(gp); setViewMode('preview'); }}
              className={`p-3 rounded-lg border cursor-pointer transition ${isDark ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-blue-50'}`}
            >
              <div className="flex justify-between font-bold text-xs mb-1">
                <span className={isDark ? 'text-amber-400' : 'text-amber-700'}>{gp.gate_pass_no}</span>
                <span className="text-gray-500">{new Date(gp.date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="text-sm font-semibold truncate">{gp.customer_name}</div>
              <div className="text-xs text-gray-500 mt-1 flex justify-between">
                <span>{gp.vehicle_reg_no}</span>
                {gp.ref_bill_no && <span>Ref: {gp.ref_bill_no}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content area ── */}
      <div
        className={`flex-1 print:hidden ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}
        style={{ overflow: 'auto', minWidth: 0 }}
      >
        <div style={{ padding: 24 }}>

          {/* FORM */}
          {viewMode === 'form' && (
            <div
              className={`p-6 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              style={{ maxWidth: 672, margin: '0 auto' }}
            >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-3 border-gray-200 dark:border-gray-700">
                {form.id ? 'Edit Gate Pass' : 'New Gate Pass'}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold mb-1">Gate Pass No</label>
                    <input type="text" value={form.gate_pass_no} disabled className={`${inputClass} opacity-70`} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Date</label>
                    <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold mb-1">Customer Name</label>
                    <input type="text" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} required className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Mobile No</label>
                    <input type="text" value={form.customer_mobile} onChange={e => setForm({...form, customer_mobile: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Vehicle Reg No</label>
                    <input type="text" value={form.vehicle_reg_no} onChange={e => setForm({...form, vehicle_reg_no: e.target.value})} className={inputClass} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold mb-1">Ref Invoice No (Optional)</label>
                    <input type="text" value={form.ref_bill_no} onChange={e => setForm({...form, ref_bill_no: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button type="button" onClick={() => setViewMode('list')} className="px-4 py-2 font-bold text-sm">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg shadow-md">
                    <Save size={16} className="inline mr-2" />Save Gate Pass
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PREVIEW */}
          {viewMode === 'preview' && currentGP && (
            // Sized exactly to the A4 doc — no double wrapper
            <div style={{ width: '210mm' }}>
              {/* Action bar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginBottom: 16 }}>
                <button
                  onClick={() => handleEdit(currentGP)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm font-bold rounded-lg flex items-center gap-2"
                >
                  <Edit size={16} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(currentGP.id)}
                  className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm font-bold rounded-lg flex items-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2"
                >
                  <Printer size={16} /> Print
                </button>
              </div>

              {/*
               * Single A4 card. GatePassContent renders the inner content only —
               * no nested 210mm div inside, so no double-window effect.
               */}
              <div style={{
                width: '210mm',
                background: '#fff',
                color: '#111',
                fontFamily: "'Georgia', 'Times New Roman', serif",
                fontSize: 12,
                lineHeight: 1.55,
                boxSizing: 'border-box',
                padding: '10mm 14mm 8mm',
                borderRadius: 12,
                boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
                border: '1px solid #e5e7eb',
              }}>
                <GatePassContent gp={currentGP} />
              </div>
            </div>
          )}

          {/* EMPTY STATE */}
          {viewMode === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, paddingTop: 80 }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📦</div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>No Gate Pass Selected</h2>
              <p style={{ fontSize: 13 }}>Select a gate pass from the left or create a new one.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default GatePassPage;