const fs = require('fs');
const file = 'd:/tgf excel/src/page/call-center/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find the JSX return section of MonthlyReportTab
// It starts with SectionCard definition and the return(
// We'll replace from the SectionCard definition through the closing } of MonthlyReportTab

const START_MARKER = '  const SectionCard = ({ title, children }) =>';
const END_MARKER = '// ─── Abhivyakti Report Tab';

const startIdx = content.indexOf(START_MARKER);
const endIdx = content.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find markers. startIdx:', startIdx, 'endIdx:', endIdx);
  process.exit(1);
}

const NEW_JSX = `  // ── Collapsible Section helper ──
  const [openSections, setOpenSections] = React.useState({ s1: true, s2: true, s3: true, s4: true, s5: false, s6: false });
  const toggle = (k) => setOpenSections(p => ({ ...p, [k]: !p[k] }));

  const Section = ({ id, label, badge, children }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => toggle(id)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-black text-slate-800">{label}</span>
          {badge !== undefined && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black">{badge}</span>
          )}
        </div>
        <span className="text-gray-400 text-xs font-bold">{openSections[id] ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {openSections[id] && (
        <div className="border-t border-gray-100 overflow-x-auto">
          {children}
        </div>
      )}
    </div>
  );

  // Reusable simple table
  const T = ({ heads, rows, footer }) => (
    <table className="w-full text-xs min-w-max">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {heads.map((h, i) => (
            <th key={i} className={\`px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap \${i === 0 ? 'text-left' : 'text-center'}\`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map((row, i) => (
          <tr key={i} className={(i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30') + ' hover:bg-indigo-50/20 transition-colors'}>
            {row.map((cell, j) => (
              <td key={j} className={\`px-4 py-2 \${j === 0 ? 'font-black text-slate-700 whitespace-nowrap' : 'text-center font-bold text-slate-600'}\`}>{cell ?? '—'}</td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr><td colSpan={heads.length} className="py-10 text-center text-gray-300 font-bold">No data for this period.</td></tr>
        )}
      </tbody>
      {footer && (
        <tfoot>
          <tr className="bg-slate-100 border-t-2 border-slate-200">
            {footer.map((cell, i) => (
              <td key={i} className={\`px-4 py-2.5 font-black text-slate-800 \${i === 0 ? 'text-left' : 'text-center'}\`}>{cell}</td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );

  // Attender totals footer
  const attTotals = attenderPerformance.length > 1
    ? attenderPerformance.reduce((acc, r) => ({
        attempts: acc.attempts + r.attempts,
        connected: acc.connected + r.connected,
        notConnected: acc.notConnected + r.notConnected,
        noAnswer: acc.noAnswer + r.noAnswer,
        infoGiven: acc.infoGiven + r.infoGiven,
        registrations: acc.registrations + r.registrations,
      }), { attempts: 0, connected: 0, notConnected: 0, noAnswer: 0, infoGiven: 0, registrations: 0 })
    : null;

  return (
    <div className="p-6 space-y-3">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Monthly Report</h2>
          <p className="text-slate-400 text-xs mt-0.5">Attempts = every call made &nbsp;·&nbsp; Contacts = each person's final status</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
            <option value="ALL">All Programs</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          <button onClick={() => setSelectedMonth('')} className="px-3 py-2 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">All Months</button>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 active:scale-95">
            <Download size={14} /> Export Excel
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        {[
          { label: 'Total Attempts', value: totalAttempts, color: 'bg-slate-800 text-white' },
          { label: 'Unique Contacts', value: totalContacts, color: 'bg-indigo-600 text-white' },
          { label: 'Connected', value: section1.ucConnected, color: 'bg-emerald-600 text-white' },
          { label: 'Not Connected', value: section1.ucNotConnected, color: 'bg-red-500 text-white' },
          { label: 'Info Given', value: infoGivenCount, color: 'bg-blue-500 text-white' },
          { label: 'Registrations', value: regDoneCount, color: 'bg-purple-600 text-white' },
        ].map(k => (
          <div key={k.label} className={\`\${k.color} rounded-xl p-3 text-center shadow-sm\`}>
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70">{k.label}</p>
            <p className="text-2xl font-black mt-0.5">{k.value}</p>
          </div>
        ))}
      </div>

      {/* ── Section 1: Calls Summary ── */}
      <Section id="s1" label="Section 1 — Calls Summary" badge={totalAttempts + ' attempts'}>
        <T
          heads={['Category', 'Att In', 'Att Out', 'Att Total', 'UC In', 'UC Out', 'UC Total']}
          rows={[
            ['Connected', section1.attConnIncoming, section1.attConnOutgoing, section1.attConnected, section1.ucConnIncoming, section1.ucConnOutgoing, section1.ucConnected],
            ['Not Connected', section1.attNotIncoming, section1.attNotOutgoing, section1.attNotConnected, section1.ucNotIncoming, section1.ucNotOutgoing, section1.ucNotConnected],
          ]}
          footer={[
            'Grand Total',
            totalAttempts,
            '',
            totalAttempts,
            monthLogs.filter(l => l.callType === 'incoming' || l.callType === 'incoming f').length,
            monthLogs.filter(l => l.callType !== 'incoming' && l.callType !== 'incoming f').length,
            totalContacts,
          ]}
        />
        <div className="grid md:grid-cols-2 gap-0 border-t border-gray-100">
          <div className="border-r border-gray-100">
            <div className="px-4 py-2.5 bg-emerald-50/50 border-b border-gray-100">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Connected — Status Breakdown</span>
            </div>
            <T heads={['Status', 'Attempts', 'Contacts']}
              rows={connectedBreakdown.map(r => [r.status, r.att, r.uc])} />
          </div>
          <div>
            <div className="px-4 py-2.5 bg-red-50/50 border-b border-gray-100">
              <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Not Connected — Status Breakdown</span>
            </div>
            <T heads={['Status', 'Attempts', 'Contacts']}
              rows={notConnectedBreakdown.map(r => [r.status, r.att, r.uc])} />
          </div>
        </div>
      </Section>

      {/* ── Section 2: Connected Breakdowns ── */}
      <Section id="s2" label="Section 2 — Connected Calls Breakdown" badge={section1.ucConnected + ' connected contacts'}>
        <div className="grid md:grid-cols-3 gap-0 divide-x divide-gray-100">
          {[
            { label: 'Khoji / New', rows: khojiBreakdown.map(r => [r.name, r.count]) },
            { label: 'Called For', rows: calledForBreakdown.map(r => [r.name, r.count]) },
            { label: 'Source', rows: sourceBreakdown.map(r => [r.name, r.count]) },
          ].map(({ label, rows }) => (
            <div key={label}>
              <div className="px-4 py-2.5 bg-indigo-50/50 border-b border-gray-100">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{label}</span>
              </div>
              <T heads={[label, 'Contacts']} rows={rows} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Section 3: Attender Performance ── */}
      <Section id="s3" label="Section 3 — Attender Performance" badge={attenderPerformance.length + ' attenders'}>
        <T
          heads={['Attender', 'Total Calls', 'Connected', 'Conn %', 'No Answer', 'Info Given', 'Reg.Done', 'Reg %']}
          rows={attenderPerformance.map(r => [
            r.staff, r.attempts, r.connected, r.connRate, r.noAnswer, r.infoGiven, r.registrations, r.regRate
          ])}
          footer={attTotals ? [
            'Grand Total',
            attTotals.attempts,
            attTotals.connected,
            attTotals.attempts > 0 ? Math.round((attTotals.connected / attTotals.attempts) * 100) + '%' : '0%',
            attTotals.noAnswer,
            attTotals.infoGiven,
            attTotals.registrations,
            attTotals.attempts > 0 ? Math.round((attTotals.registrations / attTotals.attempts) * 100) + '%' : '0%',
          ] : undefined}
        />
      </Section>

      {/* ── Section 4: Program-Wise ── */}
      <Section id="s4" label="Section 4 — Program Wise Details" badge={programWiseDetails.length + ' programs'}>
        <T
          heads={['Program', 'Attempts', 'Contacts', 'Connected', 'Conn %', 'Reg.Done', 'Reg %']}
          rows={programWiseDetails.map(r => [r.program, r.attempts, r.contacts, r.connected, r.connRate, r.registrations, r.regRate])}
        />
      </Section>

      {/* ── Section 5: Source & Khoji Pivot Tables ── */}
      <Section id="s5" label="Section 5 — Source & Khoji × Program Pivot" badge="3 pivot tables">
        {[
          { label: 'All Calls — Source × Program', rowMap: monthlySourcePivot },
          { label: 'Incoming Calls Only — Source × Program', rowMap: monthlyIncomingSourcePivot },
          { label: 'Khoji / New × Program', rowMap: monthlyKhojiPivot },
        ].map(({ label, rowMap }) => {
          const rows = Object.keys(rowMap).filter(r => r !== '_total').sort();
          const colTotals = {};
          monthlyPrograms.forEach(p => { colTotals[p] = 0; });
          rows.forEach(r => monthlyPrograms.forEach(p => { colTotals[p] += (rowMap[r][p] || 0); }));
          const grandTotal = rows.reduce((s, r) => s + (rowMap[r]._total || 0), 0);
          return (
            <div key={label} className="border-b border-gray-100 last:border-0">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{label}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-max">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">↓ Source / Program →</th>
                      {monthlyPrograms.map(p => (
                        <th key={p} className="px-3 py-2.5 text-center text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{p}</th>
                      ))}
                      <th className="px-3 py-2.5 text-center text-[10px] font-black text-slate-800 uppercase bg-slate-100">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => (
                      <tr key={i} className={(i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30') + ' hover:bg-indigo-50/20 transition-colors'}>
                        <td className="px-4 py-2 font-black text-slate-700 whitespace-nowrap">{row}</td>
                        {monthlyPrograms.map(p => (
                          <td key={p} className="px-3 py-2 text-center">
                            {rowMap[row][p]
                              ? <span className="px-2 py-0.5 rounded-lg font-black text-xs text-indigo-700 bg-indigo-50">{rowMap[row][p]}</span>
                              : <span className="text-gray-200">—</span>}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-black text-slate-700 bg-gray-50">{rowMap[row]._total || 0}</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr><td colSpan={monthlyPrograms.length + 2} className="py-8 text-center text-gray-300 font-bold">No data for this period.</td></tr>
                    )}
                    <tr className="bg-slate-100 border-t-2 border-slate-200">
                      <td className="px-4 py-2 font-black text-slate-800 text-[10px] uppercase tracking-wide">Grand Total</td>
                      {monthlyPrograms.map(p => (
                        <td key={p} className="px-3 py-2 text-center font-black text-slate-700">{colTotals[p] || '—'}</td>
                      ))}
                      <td className="px-3 py-2 text-center font-black text-slate-900 bg-slate-200">{grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </Section>

      {/* ── Section 6: Combined Granular + Time Analysis ── */}
      <Section id="s6" label="Section 6 — Deep Dive (Day · Time · Granular)" badge="collapsed by default">
        <div className="grid md:grid-cols-2 gap-0 divide-x divide-gray-100 border-b border-gray-100">
          <div>
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Day-Wise Timeline</span>
            </div>
            <T heads={['Date', 'Attempts', 'Connected', 'Registrations']}
              rows={dayWiseTrend.map(r => [r.day, r.attempts, r.connected, r.registrations])} />
          </div>
          <div>
            <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Time of Day (Starts At)</span>
            </div>
            <T heads={['Hour', 'Attempts', 'Connected', 'Conn %']}
              rows={timeOfDayTrend.map(r => [r.time, r.attempts, r.connected, r.rate])} />
          </div>
        </div>
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
          <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Combined Granular — Shivir › Attender › Call Type › Khoji</span>
        </div>
        <T
          heads={['Program', 'Attender', 'Call Type', 'Khoji / New', 'Attempts', 'Connected', 'Reg.Done']}
          rows={combinedGranular.map(r => [r.program, r.attender, r.callType, r.khoji, r.attempts, r.connected, r.registrations])}
        />
      </Section>
    </div>
  );
}

`;

const before = content.substring(0, startIdx);
const after = content.substring(endIdx);
const newContent = before + NEW_JSX + after;
fs.writeFileSync(file, newContent, 'utf8');
console.log('Monthly Report UI rebuilt successfully. Lines:', newContent.split('\n').length);
