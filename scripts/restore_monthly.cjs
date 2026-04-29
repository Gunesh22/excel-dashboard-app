const fs = require('fs');
const file = 'd:/tgf excel/src/page/call-center/admin/AdminPanel.jsx';
let content = fs.readFileSync(file, 'utf8');

// The broken section — using exact CRLF as confirmed above
const BROKEN = "  });\r\n  }, [allAttempts, monthLogs]);\r\n\r\n  // B) Day-wise Trend";

const FIXED = `  });
  const unsubRef = React.useRef(null);

  useEffect(() => {
    if (unsubRef.current) unsubRef.current();
    if (!selectedProgramId) return;
    unsubRef.current = subscribeToAllCallLogs(selectedProgramId === "ALL" ? null : selectedProgramId, (logs) => {
      setCallLogs(logs.filter(l => !l._deleted));
    });
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [selectedProgramId]);

  // FIX #2: Use history entry timestamps for month filtering (not updatedAt which changes on edits)
  const monthLogs = React.useMemo(() => {
    if (!selectedMonth) return callLogs;
    const [year, month] = selectedMonth.split("-").map(Number);
    return callLogs.filter(l => {
      if (l.history && l.history.length > 0) {
        return l.history.some(h => {
          if (!h.timestamp) return false;
          const d = new Date(h.timestamp);
          return !isNaN(d) && d.getFullYear() === year && d.getMonth() + 1 === month;
        });
      }
      const d = l.updatedAt?.toDate ? l.updatedAt.toDate() : l.createdAt?.toDate ? l.createdAt.toDate() : null;
      if (!d) return true;
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [callLogs, selectedMonth]);

  // FIX #1 + #8: Extract attempts filtered to the selected month only
  const allAttempts = React.useMemo(() => {
    const [year, month] = selectedMonth ? selectedMonth.split("-").map(Number) : [0, 0];
    const attempts = [];
    monthLogs.forEach(log => {
      const getIso = d => d?.toDate ? d.toDate().toISOString() : d ? new Date(d).toISOString() : null;
      if (log.history && Array.isArray(log.history) && log.history.length > 0) {
        log.history.forEach(h => {
          if (selectedMonth && h.timestamp) {
            const ts = new Date(h.timestamp);
            if (!isNaN(ts) && (ts.getFullYear() !== year || ts.getMonth() + 1 !== month)) return;
          }
          attempts.push({
            status: h.status || log.status,
            attenderName: h.attenderName || log.attenderName || "Unknown",
            callType: log.callType,
            programName: log.programName,
            timestamp: h.timestamp || getIso(log.updatedAt || log.createdAt),
            log,
          });
        });
      } else if (log.status) {
        attempts.push({
          status: log.status,
          attenderName: log.attenderName || "Unknown",
          callType: log.callType,
          programName: log.programName,
          timestamp: getIso(log.updatedAt || log.createdAt),
          log,
        });
      }
    });
    return attempts;
  }, [monthLogs, selectedMonth]);

  const totalAttempts = allAttempts.length;
  const totalContacts = monthLogs.length;

  // FIX #6: useCallback for stable reference — prevents pivot useMemos re-computing every render
  const findFieldKey = React.useCallback((log, aliases) => {
    return Object.keys(log).find(k => aliases.some(a => k.toLowerCase() === a.toLowerCase()))
      || Object.keys(log).find(k => aliases.some(a => k.toLowerCase().includes(a.toLowerCase())))
      || null;
  }, []);

  const section1 = React.useMemo(() => {
    const attConnected = allAttempts.filter(a => CONNECTED_STATUSES.includes(a.status));
    const attNotConnected = allAttempts.filter(a => NOT_CONNECTED_STATUSES.includes(a.status));
    const attConnIncoming = attConnected.filter(a => a.callType === "incoming" || a.callType === "incoming f").length;
    const attConnOutgoing = attConnected.length - attConnIncoming;
    const attNotIncoming = attNotConnected.filter(a => a.callType === "incoming" || a.callType === "incoming f").length;
    const attNotOutgoing = attNotConnected.length - attNotIncoming;
    const ucConnected = monthLogs.filter(l => CONNECTED_STATUSES.includes(l.status));
    const ucNotConnected = monthLogs.filter(l => NOT_CONNECTED_STATUSES.includes(l.status));
    const ucConnIncoming = ucConnected.filter(l => l.callType === "incoming" || l.callType === "incoming f").length;
    const ucConnOutgoing = ucConnected.length - ucConnIncoming;
    const ucNotIncoming = ucNotConnected.filter(l => l.callType === "incoming" || l.callType === "incoming f").length;
    const ucNotOutgoing = ucNotConnected.length - ucNotIncoming;
    return {
      attConnected: attConnected.length, attNotConnected: attNotConnected.length,
      attConnIncoming, attConnOutgoing, attNotIncoming, attNotOutgoing,
      ucConnected: ucConnected.length, ucNotConnected: ucNotConnected.length,
      ucConnIncoming, ucConnOutgoing, ucNotIncoming, ucNotOutgoing
    };
  }, [allAttempts, monthLogs]);

  const connectedBreakdown = React.useMemo(() => {
    const map = {};
    CONNECTED_STATUSES.forEach(s => { map[s] = { att: 0, attIn: 0, attOut: 0, uc: 0, ucIn: 0, ucOut: 0 }; });
    allAttempts.filter(a => CONNECTED_STATUSES.includes(a.status)).forEach(a => {
      if (!map[a.status]) map[a.status] = { att: 0, attIn: 0, attOut: 0, uc: 0, ucIn: 0, ucOut: 0 };
      map[a.status].att++;
      if (a.callType === "incoming" || a.callType === "incoming f") map[a.status].attIn++; else map[a.status].attOut++;
    });
    monthLogs.filter(l => CONNECTED_STATUSES.includes(l.status)).forEach(l => {
      if (!map[l.status]) map[l.status] = { att: 0, attIn: 0, attOut: 0, uc: 0, ucIn: 0, ucOut: 0 };
      map[l.status].uc++;
      if (l.callType === "incoming" || l.callType === "incoming f") map[l.status].ucIn++; else map[l.status].ucOut++;
    });
    return Object.entries(map).filter(([, v]) => v.att > 0 || v.uc > 0).map(([status, v]) => ({ status, ...v }));
  }, [allAttempts, monthLogs]);

  const notConnectedBreakdown = React.useMemo(() => {
    const map = {};
    NOT_CONNECTED_STATUSES.forEach(s => { map[s] = { att: 0, attIn: 0, attOut: 0, uc: 0, ucIn: 0, ucOut: 0 }; });
    allAttempts.filter(a => NOT_CONNECTED_STATUSES.includes(a.status)).forEach(a => {
      if (!map[a.status]) map[a.status] = { att: 0, attIn: 0, attOut: 0, uc: 0, ucIn: 0, ucOut: 0 };
      map[a.status].att++;
      if (a.callType === "incoming" || a.callType === "incoming f") map[a.status].attIn++; else map[a.status].attOut++;
    });
    monthLogs.filter(l => NOT_CONNECTED_STATUSES.includes(l.status)).forEach(l => {
      if (!map[l.status]) map[l.status] = { att: 0, attIn: 0, attOut: 0, uc: 0, ucIn: 0, ucOut: 0 };
      map[l.status].uc++;
      if (l.callType === "incoming" || l.callType === "incoming f") map[l.status].ucIn++; else map[l.status].ucOut++;
    });
    return Object.entries(map).filter(([, v]) => v.att > 0 || v.uc > 0).map(([status, v]) => ({ status, ...v }));
  }, [allAttempts, monthLogs]);

  const connectedContacts = React.useMemo(() => monthLogs.filter(l => CONNECTED_STATUSES.includes(l.status)), [monthLogs]);

  const khojiBreakdown = React.useMemo(() => {
    const map = {};
    connectedContacts.forEach(l => {
      const key = findFieldKey(l, ["khoji/new", "khoji", "new/khoji"]);
      const val = (key ? String(l[key] || "").trim() : "") || "Unknown";
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [connectedContacts, findFieldKey]);

  const calledForBreakdown = React.useMemo(() => {
    const map = {};
    connectedContacts.forEach(l => {
      const key = findFieldKey(l, ["called for", "called_for", "calledfor", "call for"]);
      const val = (key ? String(l[key] || "").trim() : "") || "Unknown";
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [connectedContacts, findFieldKey]);

  const sourceBreakdown = React.useMemo(() => {
    const map = {};
    connectedContacts.forEach(l => {
      const key = findFieldKey(l, ["source", "sourse"]);
      const val = (key ? String(l[key] || "").trim() : "") || "Unknown";
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
  }, [connectedContacts, findFieldKey]);

  const infoGivenCount = React.useMemo(() => monthLogs.filter(l => l.status === "Info given").length, [monthLogs]);
  const interestedCount = React.useMemo(() => monthLogs.filter(l => l.status === "Interested").length, [monthLogs]);
  const regDoneCount = React.useMemo(() => monthLogs.filter(l => l.status === "Reg.Done").length, [monthLogs]);
  const infoGivenAttempts = React.useMemo(() => allAttempts.filter(a => a.status === "Info given").length, [allAttempts]);
  const interestedAttempts = React.useMemo(() => allAttempts.filter(a => a.status === "Interested").length, [allAttempts]);
  const regDoneAttempts = React.useMemo(() => allAttempts.filter(a => a.status === "Reg.Done").length, [allAttempts]);

  // FIX #3 + #5 + #7: Attender performance — single source from allAttempts only
  // No more ghost rows or mixed denominators
  const attenderPerformance = React.useMemo(() => {
    // FIX #7: Complete no-answer list including Invalid No and wrong no.
    const NO_ANSWER_STATUSES = ["NA", "Busy", "Call Cut", "switched off", "no answer", "no network", "Invalid No", "wrong no."];
    const map = {};
    allAttempts.forEach(a => {
      const staff = a.attenderName || "Unknown";
      if (!map[staff]) map[staff] = { staff, attempts: 0, connected: 0, notConnected: 0, noAnswer: 0, infoGiven: 0, registrations: 0 };
      map[staff].attempts++;
      if (CONNECTED_STATUSES.includes(a.status)) map[staff].connected++;
      else if (NOT_CONNECTED_STATUSES.includes(a.status)) map[staff].notConnected++;
      if (NO_ANSWER_STATUSES.includes(a.status)) map[staff].noAnswer++;
      if (a.status === "Info given") map[staff].infoGiven++;
      if (a.status === "Reg.Done") map[staff].registrations++;
    });
    return Object.values(map)
      .sort((a, b) => b.attempts - a.attempts)
      .map(m => ({
        ...m,
        connRate: m.attempts > 0 ? Math.round((m.connected / m.attempts) * 100) + '%' : '0%',
        regRate: m.attempts > 0 ? Math.round((m.registrations / m.attempts) * 100) + '%' : '0%',
      }));
  }, [allAttempts]);

  // B) Day-wise Trend`;

if (content.includes(BROKEN)) {
  content = content.replace(BROKEN, FIXED);
  fs.writeFileSync(file, content, 'utf8');
  console.log('SUCCESS: Restored and applied all fixes.');
} else {
  // Try with LF only
  const BROKEN_LF = BROKEN.replace(/\r\n/g, '\n');
  if (content.includes(BROKEN_LF)) {
    content = content.replace(BROKEN_LF, FIXED);
    fs.writeFileSync(file, content, 'utf8');
    console.log('SUCCESS (LF): Restored and applied all fixes.');
  } else {
    console.error('FAILED: Could not find broken marker.');
  }
}
