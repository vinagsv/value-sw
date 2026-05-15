import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const navy   = '#1a3a6b';
const red    = '#c0392b';
const indigo = '#4f46e5';
const muted  = '#6b7280';
const light  = '#f7f9fc';
const border = '#d1d5db';

const S = {
  headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  companyName: { fontSize: 17, fontWeight: 800, color: navy, letterSpacing: '0.03em', fontFamily: 'sans-serif', textTransform: 'uppercase', marginBottom: 2 },
  companySub: { fontSize: 10.5, color: '#444', lineHeight: 1.3, fontFamily: 'sans-serif' },
  companyGstin: { fontSize: 11, fontWeight: 700, color: navy, marginTop: 3, fontFamily: 'sans-serif' },
  titleBanner: { textAlign: 'center', padding: '4px 0', marginBottom: 10 },
  invTitle: { fontSize: 18, fontWeight: 800, color: navy, letterSpacing: '0.15em', fontFamily: 'sans-serif', textTransform: 'uppercase' },
  billedBox: { border: `1px solid ${border}`, borderRadius: 4, padding: '8px 12px', marginBottom: 12, background: '#f7f9fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', breakInside: 'avoid' },
  billedLabel: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#999', fontFamily: 'sans-serif', marginBottom: 2 },
  billedName: { fontSize: 14, fontWeight: 700, color: '#1a1a2e', textTransform: 'uppercase', fontFamily: 'sans-serif' },
  billedInfo: { fontSize: 11, color: '#444', fontFamily: 'sans-serif' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 12 },
  th: (extra = {}) => ({ padding: '6px 8px', background: navy, color: '#fff', fontSize: 9.5, fontWeight: 600, fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em', borderLeft: '1px solid rgba(255,255,255,0.1)', ...extra }),
  tdBase: (extra = {}) => ({ padding: '6px 8px', verticalAlign: 'top', fontSize: 11.5, borderBottom: `1px solid ${border}`, ...extra }),
  totalsWrap: { display: 'flex', justifyContent: 'flex-end', marginBottom: 10, breakInside: 'avoid' },
  totalsTable: { width: 300, borderCollapse: 'collapse', fontSize: 12, fontFamily: 'sans-serif' },
  narration: { fontSize: 11, color: '#555', marginBottom: 10, fontFamily: 'sans-serif', breakInside: 'avoid' },
  narLabel: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#aaa', marginBottom: 2 },
  bankFooter: { borderTop: `1px solid ${border}`, paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: 10.5, fontFamily: 'sans-serif', breakInside: 'avoid' },
  bankLabel: { fontSize: 9.5, textTransform: 'uppercase', letterSpacing: '0.09em', color: '#aaa', fontWeight: 700, marginBottom: 2 },
};

const pageBase = {
  width: '210mm',
  background: '#fff',
  color: '#111',
  fontFamily: "'Georgia', 'Times New Roman', serif",
  fontSize: 12,
  lineHeight: 1.55,
  boxSizing: 'border-box',
  padding: '10mm 14mm 8mm',
};

/* Sub-components */

const InvoiceHeader = ({ currentBill }) => (
  <>
    <div style={S.headerTop}>
      <img src="/suzuki-logo.png" alt="Suzuki"
        style={{ width: 207, height: 'auto', transform: 'scaleY(1.087)', transformOrigin: 'left top', objectFit: 'contain', marginTop: '-0.6cm' }}
        onError={e => { e.target.style.display = 'none'; }} />
      <div style={{ textAlign: 'right' }}>
        <div style={S.companyName}>Value Motor Agency Pvt. Ltd.</div>
        <div style={S.companySub}>#16/A, Millers Road, Vasanth Nagar, Bangalore – 560052</div>
        <div style={S.companySub}>Mob: 9845906084 &nbsp;|&nbsp; millers_road_suzuki@yahoo.com</div>
        <div style={S.companyGstin}>GSTIN: 29AACCV2521J1ZA</div>
      </div>
    </div>
    <div style={S.titleBanner}><div style={S.invTitle}>Tax Invoice</div></div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 11.5, fontFamily: 'sans-serif', padding: '0 4px' }}>
      <div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: muted, fontWeight: 600, marginRight: 6 }}>Invoice No:</span>
          <span style={{ fontWeight: 800, color: red, fontSize: 13 }}>{currentBill.bill_no}</span>
        </div>
        {currentBill.job_card_no && <div><span style={{ color: muted, fontWeight: 600, marginRight: 6 }}>Job Card:</span><span style={{ fontWeight: 700 }}>{currentBill.job_card_no}</span></div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: muted, fontWeight: 600, marginRight: 6 }}>Date:</span>
          <span style={{ fontWeight: 700 }}>{new Date(currentBill.date).toLocaleDateString('en-IN')}</span>
        </div>
        {currentBill.vehicle_reg_no && <div><span style={{ color: muted, fontWeight: 600, marginRight: 6 }}>Vehicle:</span><span style={{ fontWeight: 700 }}>{currentBill.vehicle_reg_no}</span></div>}
      </div>
    </div>
    <div style={S.billedBox}>
      <div>
        <div style={S.billedLabel}>Billed to</div>
        <div style={S.billedName}>{currentBill.customer_name || 'N/A'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={S.billedInfo}>
          {currentBill.customer_mobile && <span><strong>Mob:</strong> {currentBill.customer_mobile}&nbsp;&nbsp;</span>}
          {currentBill.customer_gstin  && <span><strong>GSTIN:</strong> {currentBill.customer_gstin}</span>}
        </div>
        {currentBill.is_interstate && <div style={{ color: red, fontWeight: 700, fontSize: 10.5, marginTop: 2 }}>▸ IGST Bill (Interstate Supply)</div>}
      </div>
    </div>
  </>
);

const InvoiceContent = ({ currentBill }) => {
  const lineItems     = currentBill.line_items    || [];
  const externalBills = currentBill.external_bills || [];

  const totalCgst = lineItems.reduce((s, i) => s + (Number(i.cgst_amt) || 0), 0);
  const totalSgst = lineItems.reduce((s, i) => s + (Number(i.sgst_amt) || 0), 0);
  const totalIgst = lineItems.reduce((s, i) => s + (Number(i.igst_amt) || 0), 0);

  const internalAfterDiscount =
    Number(currentBill.subtotal) +
    Number(currentBill.total_tax) -
    Number(currentBill.discount_amount || 0);

  return (
    <>
      {lineItems.length > 0 && (
        <table style={S.table}>
          <thead style={{ display: 'table-header-group' }}>
            <tr>
              <th style={S.th({ width: 28, borderLeft: 'none', textAlign: 'center' })}>#</th>
              <th style={S.th({ textAlign: 'left' })}>Description of Goods</th>
              <th style={S.th({ width: 55, textAlign: 'center' })}>HSN</th>
              <th style={S.th({ width: 38, textAlign: 'center' })}>Qty</th>
              <th style={S.th({ width: 70, textAlign: 'right' })}>Rate</th>
              <th style={S.th({ width: 45, textAlign: 'center' })}>Tax %</th>
              {currentBill.is_interstate ? (
                <th style={S.th({ width: 70, textAlign: 'right' })}>IGST</th>
              ) : (
                <>
                  <th style={S.th({ width: 55, textAlign: 'right' })}>CGST</th>
                  <th style={S.th({ width: 55, textAlign: 'right' })}>SGST</th>
                </>
              )}
              <th style={S.th({ width: 80, textAlign: 'right' })}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, idx) => (
              <tr key={idx} style={{ background: idx % 2 === 1 ? light : '#fff', breakInside: 'avoid' }}>
                <td style={S.tdBase({ textAlign: 'center', color: muted })}>{idx + 1}</td>
                <td style={S.tdBase()}><div style={{ fontWeight: 700, color: '#1a1a2e', fontFamily: 'sans-serif', fontSize: 11.5 }}>{item.name}</div></td>
                <td style={S.tdBase({ textAlign: 'center', fontFamily: 'sans-serif' })}>{item.hsn_code}</td>
                <td style={S.tdBase({ textAlign: 'center', fontFamily: 'sans-serif' })}>{item.qty}</td>
                <td style={S.tdBase({ textAlign: 'right', fontFamily: 'sans-serif' })}>₹{Number(item.custom_rate).toFixed(2)}</td>
                <td style={S.tdBase({ textAlign: 'center', fontFamily: 'sans-serif' })}>{item.tax_rate}%</td>
                {currentBill.is_interstate ? (
                  <td style={S.tdBase({ textAlign: 'right', fontFamily: 'sans-serif' })}>₹{Number(item.igst_amt).toFixed(2)}</td>
                ) : (
                  <>
                    <td style={S.tdBase({ textAlign: 'right', fontFamily: 'sans-serif' })}>₹{Number(item.cgst_amt).toFixed(2)}</td>
                    <td style={S.tdBase({ textAlign: 'right', fontFamily: 'sans-serif' })}>₹{Number(item.sgst_amt).toFixed(2)}</td>
                  </>
                )}
                <td style={S.tdBase({ textAlign: 'right', fontWeight: 700, fontFamily: 'sans-serif' })}>₹{Number(item.line_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {currentBill.narration && (
        <div style={S.narration}>
          <div style={S.narLabel}>Remarks / Narration</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{currentBill.narration}</div>
        </div>
      )}

      <div style={S.totalsWrap}>
        <table style={S.totalsTable}>
          <tbody>
            {lineItems.length > 0 && (
              <>
                <tr>
                  <td style={{ textAlign: 'right', padding: '3px 16px 3px 0', color: muted }}>Taxable Total</td>
                  <td style={{ textAlign: 'right', padding: '3px 0', fontVariantNumeric: 'tabular-nums' }}>₹{Number(currentBill.subtotal).toFixed(2)}</td>
                </tr>
                {currentBill.is_interstate ? (
                  <tr>
                    <td style={{ textAlign: 'right', padding: '3px 16px 3px 0', color: muted }}>IGST</td>
                    <td style={{ textAlign: 'right', padding: '3px 0' }}>₹{totalIgst.toFixed(2)}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td style={{ textAlign: 'right', padding: '3px 16px 3px 0', color: muted }}>CGST</td>
                      <td style={{ textAlign: 'right', padding: '3px 0' }}>₹{totalCgst.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: 'right', padding: '3px 16px 3px 0', color: muted }}>SGST</td>
                      <td style={{ textAlign: 'right', padding: '3px 0' }}>₹{totalSgst.toFixed(2)}</td>
                    </tr>
                  </>
                )}

                {Number(currentBill.discount_amount) > 0 && (
                  <tr>
                    <td style={{ textAlign: 'right', padding: '3px 16px 3px 0', color: red, fontWeight: 700 }}>Discount ({currentBill.discount_percent}%)</td>
                    <td style={{ textAlign: 'right', padding: '3px 0', color: red, fontWeight: 700 }}>− ₹{Number(currentBill.discount_amount).toFixed(2)}</td>
                  </tr>
                )}

                {externalBills.length > 0 && (
                  <tr>
                    <td style={{ textAlign: 'right', padding: '5px 16px 5px 0', fontWeight: 700, borderTop: `1px solid ${border}`, color: muted }}>Internal Total</td>
                    <td style={{ textAlign: 'right', padding: '5px 0', fontWeight: 700, borderTop: `1px solid ${border}` }}>₹{internalAfterDiscount.toFixed(2)}</td>
                  </tr>
                )}
              </>
            )}

            {externalBills.map((ext, idx) => (
              <tr key={`ext-${idx}`}>
                <td style={{ textAlign: 'right', padding: '3px 16px 3px 0', color: indigo }}>{ext.name || 'External Bill'}</td>
                <td style={{ textAlign: 'right', padding: '3px 0', color: indigo }}>+ ₹{Number(ext.amount).toFixed(2)}</td>
              </tr>
            ))}

            <tr>
              <td style={{ textAlign: 'right', padding: '7px 16px 4px 0', fontSize: 14, fontWeight: 800, color: navy, borderTop: `2px solid ${navy}`, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Grand Total</td>
              <td style={{ textAlign: 'right', padding: '7px 0 4px', fontSize: 15, fontWeight: 800, color: navy, borderTop: `2px solid ${navy}`, fontVariantNumeric: 'tabular-nums' }}>₹{Math.round(Number(currentBill.grand_total)).toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
};

const BankFooter = () => (
  <div style={S.bankFooter}>
    <div style={{ color: '#444', lineHeight: 1.65 }}>
      <div style={S.bankLabel}>Bank Details</div>
      <div>Bank: State Bank of India &nbsp;|&nbsp; Branch: Vasanthnagar</div>
      <div>A/C No: 32744599339 &nbsp;|&nbsp; IFSC: SBIN0021882</div>
    </div>
  </div>
);

const GatePassBody = ({ currentBill }) => (
  <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <img src="/suzuki-logo.png" alt="Suzuki" style={{ width: 180, height: 'auto', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 900, textTransform: 'uppercase', fontFamily: 'sans-serif', color: '#000', letterSpacing: '0.03em' }}>VALUE MOTOR AGENCY PVT LTD</div>
        <div style={{ fontSize: 9.5, fontWeight: 700, fontFamily: 'sans-serif', color: '#444', marginTop: 2 }}>#16/A, MILLERS ROAD VASANTH NAGAR, BLR - 52</div>
      </div>
    </div>
    <div style={{ textAlign: 'center', padding: '4px 0', marginBottom: 10 }}>
      <span style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', fontFamily: 'sans-serif', color: '#000' }}>GATE PASS</span>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 11.5, fontWeight: 700, fontFamily: 'sans-serif', color: '#444', padding: '0 4px' }}>
      <div>REF INV NO: <span style={{ color: '#dc2626', fontSize: 13, marginLeft: 4 }}>{currentBill.bill_no}</span></div>
      <div>DATE: <span style={{ fontSize: 13, marginLeft: 4, color: '#000' }}>{new Date(currentBill.date).toLocaleDateString('en-GB')}</span></div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11.5, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
        <span style={{ fontWeight: 700, marginRight: 8, textTransform: 'uppercase', flexShrink: 0, width: 120 }}>Customer Name:</span>
        <span style={{ borderBottom: '1px dotted black', flexGrow: 1, padding: '0 8px', fontWeight: 700, textTransform: 'uppercase', fontSize: 12 }}>{currentBill.customer_name || ''}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1 }}>
          <span style={{ fontWeight: 700, marginRight: 8, textTransform: 'uppercase', flexShrink: 0 }}>Mobile No:</span>
          <span style={{ borderBottom: '1px dotted black', flexGrow: 1, padding: '0 8px', fontWeight: 700, textTransform: 'uppercase' }}>{currentBill.customer_mobile || ''}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', flex: 1 }}>
          <span style={{ fontWeight: 700, marginRight: 8, textTransform: 'uppercase', flexShrink: 0 }}>Veh Reg No:</span>
          <span style={{ borderBottom: '1px dotted black', flexGrow: 1, padding: '0 8px', fontWeight: 700, textTransform: 'uppercase' }}>{currentBill.vehicle_reg_no || ''}</span>
        </div>
      </div>
    </div>
    <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, fontFamily: 'sans-serif', marginBottom: 18 }}>For VALUE MOTOR AGENCY PVT LTD</div>
        <div style={{ borderTop: '1px solid black', padding: '3px 20px 0', fontSize: 9.5, fontWeight: 700, fontFamily: 'sans-serif' }}>Authorised Signatory</div>
      </div>
    </div>
  </>
);

// FIX #4: CANCELLED watermark — rendered as a sibling ABOVE the content layer using z-index.
// Previously it used position:absolute with zIndex:0 which placed it BEHIND content, so
// whenever the invoice had many line items the content painted over the watermark making it
// invisible. Now it uses zIndex:10 (same as the content wrapper) but with pointer-events:none
// so it floats visually on top without blocking any interactions.
const CancelledWatermark = () => (
  <div style={{
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,           // above content (zIndex 10) so it is never hidden
    pointerEvents: 'none',
  }}>
    <div style={{
      border: '8px solid rgba(239,68,68,0.22)',
      color: 'rgba(239,68,68,0.22)',
      fontSize: 110,
      fontWeight: 900,
      transform: 'rotate(-45deg)',
      padding: '20px 30px',
      borderRadius: 24,
      letterSpacing: '0.1em',
      fontFamily: 'sans-serif',
      userSelect: 'none',
    }}>
      CANCELLED
    </div>
  </div>
);

/* Main component */
const BillPreview = ({ currentBill, includeGatePass }) => {
  const probeRef   = useRef(null);
  const [fitsOnePage, setFitsOnePage] = useState(null);

  const A4_PX          = 1122;
  const PADDING_PX     = 68;
  const BANK_FOOTER_PX = 48;
  const GP_PX          = 310;

  useEffect(() => {
    if (!includeGatePass) { setFitsOnePage(null); return; }
    const t = setTimeout(() => {
      if (!probeRef.current) return;
      const contentH = probeRef.current.scrollHeight;
      const totalNeeded = contentH + BANK_FOOTER_PX + GP_PX;
      const available   = A4_PX - PADDING_PX;
      setFitsOnePage(totalNeeded <= available);
    }, 150);
    return () => clearTimeout(t);
  }, [currentBill, includeGatePass]);

  if (!currentBill) {
    return (
      <div className="h-full flex flex-col items-center justify-center opacity-40">
        <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No Invoice Selected</h2>
        <p style={{ fontSize: 13, color: '#888' }}>Select a bill from the left panel or save a new one to view the preview.</p>
      </div>
    );
  }

  const isCancelled = currentBill.status === 'CANCELLED';
  const samePage = includeGatePass && fitsOnePage === true;
  const newPage  = includeGatePass && fitsOnePage === false;

  const Doc = (
    <>
      {/* Invisible probe */}
      {includeGatePass && (
        <div ref={probeRef} style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: '210mm', visibility: 'hidden', pointerEvents: 'none', fontFamily: "'Georgia', 'Times New Roman', serif", fontSize: 12, lineHeight: 1.55, padding: '0 14mm', boxSizing: 'border-box' }}>
          <InvoiceHeader currentBill={currentBill} />
          <InvoiceContent currentBill={currentBill} />
        </div>
      )}

      {/* MODE A: no gate pass */}
      {!includeGatePass && (
        <div style={{ ...pageBase, minHeight: '297mm', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* FIX #4: watermark above content */}
          {isCancelled && <CancelledWatermark />}
          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <InvoiceHeader currentBill={currentBill} />
            <InvoiceContent currentBill={currentBill} />
            <div style={{ flex: 1 }} />
            <BankFooter />
          </div>
        </div>
      )}

      {/* MODE B: measuring */}
      {includeGatePass && fitsOnePage === null && (
        <div style={{ ...pageBase, minHeight: '297mm', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {isCancelled && <CancelledWatermark />}
          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <InvoiceHeader currentBill={currentBill} />
            <InvoiceContent currentBill={currentBill} />
            <div style={{ flex: 1 }} />
            <BankFooter />
          </div>
        </div>
      )}

      {/* MODE C: fits one page */}
      {samePage && (
        <div style={{ ...pageBase, height: '297mm', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {isCancelled && <CancelledWatermark />}
          <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <InvoiceHeader currentBill={currentBill} />
            <InvoiceContent currentBill={currentBill} />
            <div style={{ flex: 1 }} />
            <BankFooter />
            <div style={{ borderTop: '2px dashed #000', marginTop: 16, paddingTop: 12, breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <GatePassBody currentBill={currentBill} />
            </div>
          </div>
        </div>
      )}

      {/* MODE D: gate pass on new page */}
      {newPage && (
        <>
          <div style={{ ...pageBase, minHeight: '297mm', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            {isCancelled && <CancelledWatermark />}
            <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <InvoiceHeader currentBill={currentBill} />
              <InvoiceContent currentBill={currentBill} />
              <div style={{ flex: 1 }} />
              <BankFooter />
            </div>
          </div>
          <div style={{ ...pageBase, minHeight: '297mm', display: 'flex', flexDirection: 'column', breakBefore: 'page', pageBreakBefore: 'always', marginTop: 16 }}>
            <GatePassBody currentBill={currentBill} />
          </div>
        </>
      )}
    </>
  );

  return (
    <>
      {/* On-screen preview */}
      <div className="print:hidden" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#e5e7eb', padding: '24px 0', minHeight: '100%', overflowY: 'auto' }}>
        {Doc}
      </div>
      {/* Print portal */}
      {createPortal(<div>{Doc}</div>, document.getElementById('print-portal'))}
    </>
  );
};

export default BillPreview;