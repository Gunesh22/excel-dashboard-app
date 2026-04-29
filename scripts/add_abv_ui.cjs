const fs = require('fs');
const file = 'd:/tgf excel/src/page/call-center/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

// Find the raw table div and insert analytics before it
const MARKER = '      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">\r\n        <div className="overflow-x-auto">\r\n          <table className="w-full text-left">';

const ANALYTICS_UI = `      {/* ── Analytics Section ── */}
      {monthFiltered.length > 0 && (
        <div className="space-y-8">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">Registration Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Registrations", val: monthFiltered.length, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { label: "Programs", val: abvPrograms.length, color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
              { label: "Attenders", val: abvAttenders.length, color: "bg-amber-50 text-amber-700 border-amber-200" },
              { label: "Incoming Regs", val: monthFiltered.filter(r => r.callType === "incoming" || r.callType === "incoming f").length, color: "bg-blue-50 text-blue-700 border-blue-200" },
            ].map(s => (
              <div key={s.label} className={\`\${s.color} border rounded-2xl p-5 text-center\`}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</p>
                <p className="text-4xl font-black mt-2">{s.val}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <AbvPivotTable title="Source Wise x Program (Registrations)" rowMap={sourcePivot} colHeaders={abvPrograms} color="indigo" />
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <AbvPivotTable title="Khoji / New Wise x Program (Registrations)" rowMap={khojiPivot} colHeaders={abvPrograms} color="emerald" />
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <AbvPivotTable title="Call Type x Program (Incoming vs Outgoing)" rowMap={callTypePivot} colHeaders={abvPrograms} color="amber" />
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">Attender Wise — Registrations Done</p>
            <div className="flex flex-wrap gap-3">
              {abvAttenders.map(([name, count]) => (
                <div key={name} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <span className="font-black text-emerald-800 text-sm">{name}</span>
                  <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-xs font-black">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <h3 className="text-2xl font-black text-slate-800 tracking-tight pt-4">Full Registration List</h3>
        </div>
      )}

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">`;

if (content.includes(MARKER)) {
  content = content.replace(MARKER, ANALYTICS_UI);
  fs.writeFileSync(file, content, 'utf8');
  console.log('UI analytics sections injected successfully.');
} else {
  console.error('MARKER NOT FOUND. Check line endings.');
  // Try with \n only
  const MARKER2 = MARKER.replace(/\r\n/g, '\n');
  if (content.includes(MARKER2)) {
    content = content.replace(MARKER2, ANALYTICS_UI);
    fs.writeFileSync(file, content, 'utf8');
    console.log('UI analytics (LF) injected successfully.');
  } else {
    console.error('BOTH markers failed.');
  }
}
