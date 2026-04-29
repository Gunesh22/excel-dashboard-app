const fs = require('fs');
const file = 'd:/tgf excel/src/page/call-center/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

const sectionDefStart = content.indexOf('  const Section = ({ id, label, badge, children }) => (');
const sectionDefEnd = content.indexOf('  // Attender totals footer', sectionDefStart);

if (sectionDefStart > -1 && sectionDefEnd > -1) {
  content = content.substring(0, sectionDefStart) + content.substring(sectionDefEnd);
}

// Rename <Section to <MonthlySection and <T to <MonthlyTable
content = content.replace(/<Section id="(.*?)"/g, '<MonthlySection id="$1" onToggle={toggle} isOpen={openSections["$1"]}');
content = content.replace(/<\/Section>/g, '</MonthlySection>');
content = content.replace(/<T /g, '<MonthlyTable ');
content = content.replace(/<T\n/g, '<MonthlyTable\n');

// Add MonthlySection and MonthlyTable BEFORE MonthlyReportTab
const globalDefs = `
const MonthlySection = ({ id, label, badge, isOpen, onToggle, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <button
      type="button"
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/80 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-black text-slate-800">{label}</span>
        {badge !== undefined && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black">{badge}</span>
        )}
      </div>
      <span className="text-gray-400 text-xs font-bold">{isOpen ? '▲ Hide' : '▼ Show'}</span>
    </button>
    {isOpen && (
      <div className="border-t border-gray-100 overflow-x-auto">
        {children}
      </div>
    )}
  </div>
);

const MonthlyTable = ({ heads, rows, footer }) => (
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

`;

const compStart = content.indexOf('function MonthlyReportTab(');
content = content.substring(0, compStart) + globalDefs + content.substring(compStart);

fs.writeFileSync(file, content, 'utf8');
console.log('Refactored Monthly components outside main render!');
