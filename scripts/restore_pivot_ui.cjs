const fs = require('fs');
const file = 'd:/tgf excel/src/page/call-center/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

const MARKER = '      </SectionCard>\r\n    </div>\r\n  );\r\n}\r\n\r\n// ─── Abhivyakti Report Tab';

const REPLACEMENT = `      </SectionCard>

      {/* \u2500\u2500 Source / Khoji Pivot Tables \u2500\u2500 */}
      <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-12 mb-4">Source &amp; Khoji Breakdown by Program</h3>
      {[
        { title: 'All Calls \u2014 Source \u00d7 Program', rowMap: monthlySourcePivot },
        { title: 'Incoming Calls Only \u2014 Source \u00d7 Program', rowMap: monthlyIncomingSourcePivot },
        { title: 'Khoji / New \u00d7 Program', rowMap: monthlyKhojiPivot },
      ].map(({ title, rowMap }) => {
        const rows = Object.keys(rowMap).filter(r => r !== '_total').sort();
        const colTotals = {};
        monthlyPrograms.forEach(p => { colTotals[p] = 0; });
        rows.forEach(r => monthlyPrograms.forEach(p => { colTotals[p] += (rowMap[r][p] || 0); }));
        const grandTotal = rows.reduce((s, r) => s + (rowMap[r]._total || 0), 0);
        return (
          <SectionCard key={title} title={title}>
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">&#x2193; / Program &#x2192;</th>
                    {monthlyPrograms.map(p => (
                      <th key={p} className="px-3 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">{p}</th>
                    ))}
                    <th className="px-3 py-3 text-center text-[10px] font-black text-gray-800 uppercase bg-slate-100">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((row, i) => (
                    <tr key={i} className={(i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40') + ' hover:bg-indigo-50/20 transition-colors'}>
                      <td className="px-4 py-2.5 font-black text-slate-700 whitespace-nowrap">{row}</td>
                      {monthlyPrograms.map(p => (
                        <td key={p} className="px-3 py-2.5 text-center">
                          {rowMap[row][p]
                            ? <span className="px-2 py-0.5 rounded-lg font-black text-xs text-indigo-700 bg-indigo-50">{rowMap[row][p]}</span>
                            : <span className="text-gray-200">\u2014</span>}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center font-black text-slate-800 bg-gray-50">{rowMap[row]._total || 0}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={monthlyPrograms.length + 2} className="py-10 text-center text-gray-400 font-bold">No data for this period.</td></tr>
                  )}
                  <tr className="bg-slate-100 border-t-2 border-slate-200">
                    <td className="px-4 py-2.5 font-black text-slate-800 uppercase text-[10px] tracking-wide">Grand Total</td>
                    {monthlyPrograms.map(p => (
                      <td key={p} className="px-3 py-2.5 text-center font-black text-slate-700">
                        {colTotals[p] || <span className="text-gray-300">\u2014</span>}
                      </td>
                    ))}
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

// \u2500\u2500\u2500 Abhivyakti Report Tab`;

if (content.includes(MARKER)) {
  content = content.replace(MARKER, REPLACEMENT);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Pivot tables restored successfully.');
} else {
  // try LF
  const M2 = MARKER.replace(/\r\n/g, '\n');
  if (content.includes(M2)) {
    content = content.replace(M2, REPLACEMENT);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Pivot tables restored (LF) successfully.');
  } else {
    console.error('Marker not found. Check line endings.');
    const idx = content.indexOf('// ─── Abhivyakti Report Tab');
    console.log('Abhivyakti tab index:', idx);
    console.log('Context:', JSON.stringify(content.substring(idx - 50, idx + 30)));
  }
}
