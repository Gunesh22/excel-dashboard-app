const fs = require('fs');
const file = 'd:/tgf excel/src/page/call-center/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update MonthlySection definition
const sectionDefStart = content.indexOf('const MonthlySection =');
const sectionDefEnd = content.indexOf('const MonthlyTable =');

const newSectionDef = `const MonthlySection = ({ id, label, badge, isOpen, onToggle, children, color = "slate" }) => {
  const themes = {
    slate: { border: "border-l-slate-400", bg: "bg-slate-50 hover:bg-slate-100", text: "text-slate-800", badge: "bg-white text-slate-600 border-slate-200" },
    blue: { border: "border-l-blue-500", bg: "bg-blue-50 hover:bg-blue-100", text: "text-blue-900", badge: "bg-white text-blue-700 border-blue-200" },
    emerald: { border: "border-l-emerald-500", bg: "bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-900", badge: "bg-white text-emerald-700 border-emerald-200" },
    indigo: { border: "border-l-indigo-500", bg: "bg-indigo-50 hover:bg-indigo-100", text: "text-indigo-900", badge: "bg-white text-indigo-700 border-indigo-200" },
    purple: { border: "border-l-purple-500", bg: "bg-purple-50 hover:bg-purple-100", text: "text-purple-900", badge: "bg-white text-purple-700 border-purple-200" },
    orange: { border: "border-l-orange-500", bg: "bg-orange-50 hover:bg-orange-100", text: "text-orange-900", badge: "bg-white text-orange-700 border-orange-200" },
    rose: { border: "border-l-rose-500", bg: "bg-rose-50 hover:bg-rose-100", text: "text-rose-900", badge: "bg-white text-rose-700 border-rose-200" }
  };
  const theme = themes[color] || themes.slate;

  return (
    <div className={\`bg-white rounded-2xl border border-gray-100 border-l-4 shadow-sm overflow-hidden \${theme.border}\`}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        className={\`w-full flex items-center justify-between px-5 py-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-300 \${theme.bg}\`}
      >
        <div className="flex items-center gap-3">
          <span className={\`text-sm font-black \${theme.text}\`}>{label}</span>
          {badge !== undefined && (
            <span className={\`px-2 py-0.5 border rounded-lg text-xs font-black \${theme.badge}\`}>{badge}</span>
          )}
        </div>
        <div className={\`flex items-center gap-1.5 opacity-60 text-xs font-bold \${theme.text}\`}>
          {isOpen ? 'Hide' : 'Show'}
          <svg className={\`w-3 h-3 transform transition-transform duration-300 ease-out \${isOpen ? 'rotate-180' : ''}\`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </button>
      <div className={\`grid transition-all duration-300 ease-in-out \${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}\`}>
        <div className="overflow-hidden bg-white">
          <div className="border-t border-gray-100 overflow-x-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

`;

content = content.substring(0, sectionDefStart) + newSectionDef + content.substring(sectionDefEnd);

// 2. Add color props to the <MonthlySection> tags and add Abhivyakti section
content = content.replace('<MonthlySection id="s1"', '<MonthlySection color="blue" id="s1"');
content = content.replace('<MonthlySection id="s2"', '<MonthlySection color="emerald" id="s2"');
content = content.replace('<MonthlySection id="s3"', '<MonthlySection color="indigo" id="s3"');
content = content.replace('<MonthlySection id="s4"', '<MonthlySection color="purple" id="s4"');
content = content.replace('<MonthlySection id="s5"', '<MonthlySection color="orange" id="s5"');
content = content.replace('<MonthlySection id="s6"', '<MonthlySection color="slate" id="s6"');

// 3. Insert the Abhivyakti section after section 2
const s3Marker = '<MonthlySection color="indigo" id="s3"';
const s3Index = content.indexOf(s3Marker);

const abhivyaktiSection = `      {/* ── Section: Abhivyakti Analysis ── */}
      <MonthlySection color="rose" id="sAbhivyakti" label="Section — Abhivyakti Report Analysis" badge="Info Given & Registrations" onToggle={toggle} isOpen={openSections["sAbhivyakti"]}>
        <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">
          {[
            { label: "Info Given", attempts: monthLogs.filter(l => l.status === "Info given").length, contacts: Array.from(new Set(monthLogs.filter(l => l.status === "Info given").map(l => l.phone))).length, color: "bg-blue-50 text-blue-700 border-blue-100" },
            { label: "Interested", attempts: monthLogs.filter(l => l.status === "Interested").length, contacts: Array.from(new Set(monthLogs.filter(l => l.status === "Interested").map(l => l.phone))).length, color: "bg-purple-50 text-purple-700 border-purple-100" },
            { label: "Reg.Done (Abhivyakti)", attempts: monthLogs.filter(l => l.status === "Reg.Done").length, contacts: Array.from(new Set(monthLogs.filter(l => l.status === "Reg.Done").map(l => l.phone))).length, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
          ].map(s => (
            <div key={s.label} className={\`\${s.color} p-6 text-center border-b border-gray-100\`}>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{s.label}</p>
              <p className="text-3xl font-black mt-2">{s.contacts}</p>
              <p className="text-xs font-bold opacity-60 mt-1">{s.attempts} attempt{s.attempts !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>
      </MonthlySection>

      `;

if (s3Index > -1) {
  content = content.substring(0, s3Index) + abhivyaktiSection + content.substring(s3Index);
}

// 4. Update the useState to include sAbhivyakti
const stateMarker = 'const [openSections, setOpenSections] = React.useState({ s1: true, s2: true, s3: true, s4: true, s5: false, s6: false });';
const newStateMarker = 'const [openSections, setOpenSections] = React.useState({ s1: true, s2: true, sAbhivyakti: true, s3: true, s4: true, s5: false, s6: false });';
content = content.replace(stateMarker, newStateMarker);

fs.writeFileSync(file, content, 'utf8');
console.log('Done!');
