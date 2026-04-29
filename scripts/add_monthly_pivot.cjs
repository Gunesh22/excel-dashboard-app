const fs = require('fs');
const file = 'd:/tgf excel/src/page/call-center/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

// ── 1. Inject pivot useMemos before handleExport ──
const LOGIC_MARKER = '  // ── Export ──';

const PIVOT_LOGIC = `  // ── Source / Khoji Program Pivots ──
  const mFindVal = (obj, aliases) => {
    const key = Object.keys(obj).find(k => aliases.some(a => k.toLowerCase().includes(a)));
    return key ? String(obj[key] || '').trim() || 'Unknown' : 'Unknown';
  };
  const monthlyPrograms = React.useMemo(() => [...new Set(monthLogs.map(l => l.programName || 'Unknown'))].sort(), [monthLogs]);
  const monthlySourcePivot = React.useMemo(() => {
    const m = {};
    monthLogs.forEach(l => {
      const src = mFindVal(l, ['source','sourse']); const p = l.programName || 'Unknown';
      if (!m[src]) m[src] = { _total: 0 }; m[src][p] = (m[src][p] || 0) + 1; m[src]._total++;
    }); return m;
  }, [monthLogs]);
  const monthlyIncomingSourcePivot = React.useMemo(() => {
    const m = {};
    monthLogs.filter(l => l.callType === 'incoming' || l.callType === 'incoming f').forEach(l => {
      const src = mFindVal(l, ['source','sourse']); const p = l.programName || 'Unknown';
      if (!m[src]) m[src] = { _total: 0 }; m[src][p] = (m[src][p] || 0) + 1; m[src]._total++;
    }); return m;
  }, [monthLogs]);
  const monthlyKhojiPivot = React.useMemo(() => {
    const m = {};
    monthLogs.forEach(l => {
      const k = mFindVal(l, ['khoji/new','khoji','new']); const p = l.programName || 'Unknown';
      if (!m[k]) m[k] = { _total: 0 }; m[k][p] = (m[k][p] || 0) + 1; m[k]._total++;
    }); return m;
  }, [monthLogs]);

  // ── Export ──`;

if (!content.includes('monthlySourcePivot')) {
  content = content.replace(LOGIC_MARKER, PIVOT_LOGIC);
  console.log('Logic injected.');
} else { console.log('Logic already present.'); }

// ── 2. Inject UI before the closing </div></div>  ); } of MonthlyReportTab ──
const UI_MARKER = `      </SectionCard>
    </div>
  );
}

// ─── Abhivyakti Report Tab ─`;

const PIVOT_UI = `      </SectionCard>

      {/* ── Source / Khoji Pivot Tables ── */}
      <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-12 mb-4">Source & Khoji Breakdown by Program</h3>

      {[
        { title: 'All Calls — Source × Program', rowMap: monthlySourcePivot },
        { title: 'Incoming Calls Only — Source × Program', rowMap: monthlyIncomingSourcePivot },
        { title: 'Khoji / New × Program', rowMap: monthlyKhojiPivot },
      ].map(({ title, rowMap }) => {
        const rows = Object.keys(rowMap).filter(r => r !== '_total').sort();
        const colTotals = {}; monthlyPrograms.forEach(p => { colTotals[p] = 0; });
        rows.forEach(r => monthlyPrograms.forEach(p => { colTotals[p] += (rowMap[r][p] || 0); }));
        const grandTotal = rows.reduce((s, r) => s + (rowMap[r]._total || 0), 0);
        return (
          <SectionCard key={title} title={title}>
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap sticky left-0 bg-gray-50">↓ / Program →</th>
                    {monthlyPrograms.map(p => <th key={p} className="px-3 py-3 text-center text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{p}</th>)}
                    <th className="px-3 py-3 text-center text-[10px] font-black text-gray-800 uppercase bg-slate-100">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row, i) => (
                    <tr key={i} className={(i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40') + ' hover:bg-indigo-50/20 transition-colors'}>
                      <td className="px-4 py-2.5 font-black text-slate-700 whitespace-nowrap sticky left-0 bg-inherit">{row}</td>
                      {monthlyPrograms.map(p => (
                        <td key={p} className="px-3 py-2.5 text-center">
                          {rowMap[row][p] ? <span className="px-2 py-0.5 rounded-lg font-black text-xs text-indigo-700 bg-indigo-50">{rowMap[row][p]}</span> : <span className="text-gray-200">—</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-black text-slate-800 bg-gray-50">{rowMap[row]._total || 0}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 border-t-2 border-slate-200">
                    <td className="px-4 py-2.5 font-black text-slate-800 uppercase text-[10px] tracking-wide sticky left-0 bg-slate-100">Grand Total</td>
                    {monthlyPrograms.map(p => <td key={p} className="px-3 py-2.5 text-center font-black text-slate-700">{colTotals[p] || <span className="text-gray-300">—</span>}</td>)}
                    <td className="px-3 py-2.5 text-center font-black text-slate-900 bg-slate-200">{grandTotal}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>
        );
      })}
    </div>
  );
}

// ─── Abhivyakti Report Tab ─`;

if (!content.includes('monthlySourcePivot') && !content.includes('Source & Khoji Breakdown')) {
  content = content.replace(UI_MARKER, PIVOT_UI);
} else if (content.includes('monthlySourcePivot') && !content.includes('Source & Khoji Breakdown')) {
  content = content.replace(UI_MARKER, PIVOT_UI);
  console.log('UI injected.');
} else { console.log('UI already present.'); }

fs.writeFileSync(file, content, 'utf8');
console.log('Done.');
