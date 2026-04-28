import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import ReactApexChart from "react-apexcharts";
import { toast, Toaster } from "react-hot-toast";
import {
  Upload, LayoutDashboard, Table, UserCheck,
  BarChart2, PieChart, AlertCircle, FileSpreadsheet,
  LogOut, Download, Search, ChevronLeft, ChevronRight,
  Filter
} from "lucide-react";

import { DashboardView } from "./components/DashboardView";
import { LeadsTableView } from "./components/LeadsTableView";
import { SourceAnalysisView } from "./components/SourceAnalysisView";
import { ShivirAnalysisView } from "./components/ShivirAnalysisView";
import { ExcelGridView } from "./components/ExcelGridView";
import { isNumeric, getColName } from "./utils";
import { saveExcelToCloud, loadExcelFromCloud, deleteExcelFromCloud } from "../../lib/db";

/** ==================== MAIN COMPONENT ==================== */

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [colsMap, setColsMap] = useState(null);

  // Worksheet switching state
  const [workbookData, setWorkbookData] = useState(null); // stores { sheetName: json }
  const [sheetNames, setSheetNames] = useState([]);
  const [activeSheet, setActiveSheet] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  // Global Navigation & Filtering
  const [activeTab, setActiveTab] = useState("dashboard");
  const [globalMonth, setGlobalMonth] = useState("All");
  const [globalSearch, setGlobalSearch] = useState("");
  const firebaseSaveTimer = useRef(null);

  // ─ Load saved state on mount: localStorage first (fast), then Firebase fallback ─
  useEffect(() => {
    const loadState = async () => {
      // Try localStorage first
      try {
        const saved = localStorage.getItem('tgf_excel_state');
        if (saved) {
          const s = JSON.parse(saved);
          if (s.data && s.data.length > 0) {
            setData(s.data);
            setColumns(s.columns || []);
            setColsMap(s.colsMap || null);
            setFileName(s.fileName || "");
            setActiveSheet(s.activeSheet || "");
            setActiveTab("excel");
            return;
          }
        }
      } catch (e) {}
      // Fallback: load from Firebase
      try {
        const cloud = await loadExcelFromCloud();
        if (cloud && cloud.data && cloud.data.length > 0) {
          setData(cloud.data);
          setColumns(cloud.columns || []);
          setColsMap(cloud.colsMap || null);
          setFileName(cloud.fileName || "");
          setActiveSheet(cloud.activeSheet || "");
          setActiveTab("excel");
        }
      } catch (e) {
        console.warn("Firebase load failed:", e.message);
      }
    };
    loadState();
  }, []);

  // ─ Auto-save: localStorage (instant) + Firebase (debounced 2s) ─
  useEffect(() => {
    if (!data || data.length === 0) return;
    // localStorage — instant
    try {
      localStorage.setItem('tgf_excel_state', JSON.stringify({
        data, columns, colsMap, fileName, activeSheet
      }));
    } catch (e) {}
    // Firebase — debounced to minimize writes
    if (firebaseSaveTimer.current) clearTimeout(firebaseSaveTimer.current);
    firebaseSaveTimer.current = setTimeout(async () => {
      try {
        await saveExcelToCloud({ data, columns, colsMap, fileName, activeSheet });
      } catch (e) {
        console.warn("Firebase save failed:", e.message);
      }
    }, 2000);
    return () => { if (firebaseSaveTimer.current) clearTimeout(firebaseSaveTimer.current); };
  }, [data, columns, colsMap, fileName, activeSheet]);

  const handleSheetSwitch = useCallback((sheetName, wbkData) => {
    const rawData = wbkData || workbookData;
    if (!rawData || !rawData[sheetName]) return;

    const json = rawData[sheetName];
    setActiveSheet(sheetName);

    if (json.length > 0) {
      const cols = Object.keys(json[0]);
      let finalCols = [...cols];
      
      const attMap = getColName(cols, ["attendy", "caller"]) || cols[1] || "";
      const callTypeMap = getColName(cols, ["call type", "type"]);
      const nameMap = getColName(cols, ["name", "lead"]) || cols[3] || "";
      const phoneMap = getColName(cols, ["cont no", "phone", "number"]) || cols[4] || "";
      const cityMap = getColName(cols, ["khoji", "new", "city"]);
      const sourceMap = getColName(cols, ["sourse", "source", "from"]);
      const shivirMap = getColName(cols, ["shivir"]) || cols[7] || "";
      const monthMap = getColName(cols, ["month"]) || cols[8] || "";
      const statusMap = getColName(cols, ["status", "lead status", "state"]);
      const actionMap = getColName(cols, ["action", "next action", "remark", "followup", "follow up"]);
      const feedbackMap = getColName(cols, ["feedback"]) || "";
      const calledForMap = getColName(cols, ["called for", "call for", "purpose"]);

      const ensureCol = (mapVal, defaultName) => {
          if (mapVal) return mapVal;
          finalCols.push(defaultName);
          return defaultName;
      };

      const mapped = {
        attendyCol: attMap,
        callTypeCol: ensureCol(callTypeMap, "Call Type"),
        nameCol: nameMap,
        phoneCol: phoneMap,
        cityCol: ensureCol(cityMap, "City"),
        sourceCol: ensureCol(sourceMap, "Source"),
        shivirCol: shivirMap,
        monthCol: monthMap,
        statusCol: ensureCol(statusMap, "Status"),
        actionCol: ensureCol(actionMap, "Action"),
        feedbackCol: feedbackMap,
        calledForCol: ensureCol(calledForMap, "Called For"),
      };

      setColumns(finalCols);

      setColsMap(mapped);
      setData(json);
      setGlobalMonth("All");
      toast.success(`Loaded "${sheetName}" (${json.length} rows)`);
    } else {
      setData([]);
      setColumns([]);
      setColsMap({});
      toast.error(`Sheet "${sheetName}" is empty.`);
    }
  }, [workbookData]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      setTimeout(() => {
        try {
          const bstr = evt.target.result;
          const workbook = XLSX.read(bstr, { type: "binary", cellDates: true });

          const names = workbook.SheetNames;
          setSheetNames(names);

          // Parse all sheets
          const allData = {};
          names.forEach(name => {
            const sheet = workbook.Sheets[name];
            allData[name] = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" });
          });

          setWorkbookData(allData);

          if (names.length > 0) {
            handleSheetSwitch(names[0], allData);
            setActiveTab("dashboard");
          } else {
            toast.error("No valid sheets found in the workbook.");
          }
        } catch (err) {
          console.error(err);
          toast.error("Failed to parse the Excel file.");
        } finally {
          setIsLoading(false);
          e.target.value = null;
        }
      }, 50);
    };
    reader.onerror = () => { toast.error("Could not read file."); setIsLoading(false); };
    reader.readAsBinaryString(file);
  }, [handleSheetSwitch]);

  // --- Data mutation callbacks for Excel tab ---
  const updateRow = useCallback((rowIndex, updatedRow) => {
    setData(prev => {
      const next = [...prev];
      next[rowIndex] = updatedRow;
      return next;
    });
  }, []);

  const deleteRow = useCallback((rowIndex) => {
    setData(prev => prev.filter((_, i) => i !== rowIndex));
    toast.success('Row deleted');
  }, []);

  const addRow = useCallback(() => {
    setData(prev => {
      const empty = {};
      columns.forEach(c => { empty[c] = ""; });
      return [...prev, empty];
    });
    toast.success('New row added at the bottom');
  }, [columns]);

  const exportCurrentData = useCallback(() => {
    if (!data || data.length === 0) {
      toast.error('No data to export.');
      return;
    }
    // Explicitly provide columns as headers so dynamically injected keys (Status, Action, etc)
    // are strictly preserved in the final .xlsx regardless of missing attributes on data[0].
    const ws = XLSX.utils.json_to_sheet(data, { header: columns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeSheet || 'Sheet1');
    XLSX.writeFile(wb, fileName ? `edited_${fileName}` : 'edited_data.xlsx');
    toast.success('Exported successfully!');
  }, [data, activeSheet, fileName, columns]);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "leads", label: "Leads Table", icon: <Table size={18} /> },
    { id: "source", label: "Source Analysis", icon: <PieChart size={18} /> },
    { id: "shivir", label: "Shivir Analysis", icon: <BarChart2 size={18} /> },
    { id: "excel", label: "Excel", icon: <FileSpreadsheet size={18} /> },
  ];

  const availableMonths = useMemo(() => {
    if (!data || !colsMap || !colsMap.monthCol) return [];
    return Array.from(new Set(data.map(r => String(r[colsMap.monthCol] || "").trim()).filter(Boolean))).sort();
  }, [data, colsMap]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <Toaster position="top-right" />

      {/* Upload State */}
      {!data ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex flex-col items-center justify-center p-6 w-full">
          <div className="bg-white shadow-2xl rounded-3xl p-10 max-w-lg w-full text-center border border-gray-100 transition-all duration-300 hover:shadow-blue-900/5">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-blue-100 rotate-3 transition-transform hover:rotate-6">
              <Upload size={36} strokeWidth={1.5} />
            </div>

            {isLoading ? (
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Processing Leads...</h2>
                <p className="text-gray-500 font-medium">Extracting data and generating analytics dashboard</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">LeadSys Importer</h2>
                <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
                  Upload your raw Excel log to instantly generate a powerful, read-only analytics dashboard. <br /><span className="font-medium text-gray-400">100% local — no data leaves your browser.</span>
                </p>

                <div className="relative group cursor-pointer w-full mt-2">
                  <div className="absolute inset-0 bg-blue-600 rounded-2xl blur-md opacity-20 group-hover:opacity-30 transition duration-300"></div>
                  <div className="relative bg-white border-2 border-dashed border-blue-200 group-hover:border-blue-500 rounded-2xl p-10 transition-all duration-300 flex flex-col items-center justify-center gap-4 group-hover:bg-blue-50/50">
                    <FileSpreadsheet size={40} className="text-blue-500 transition-transform group-hover:scale-110 group-hover:-translate-y-1" />
                    <div className="flex flex-col">
                      <span className="text-base font-semibold text-blue-700">Click to browse or drag file here</span>
                      <span className="text-xs text-gray-400 mt-1">Supports exactly .xlsx and .xls formats</span>
                    </div>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 text-center">
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase flex items-center gap-2">
              <span className="w-8 h-[1px] bg-gray-300"></span>
              Secure local processing
              <span className="w-8 h-[1px] bg-gray-300"></span>
            </p>
          </div>
        </div>
      ) : (
        /* Authenticated / App State */
        <div className="flex flex-1 overflow-hidden h-screen bg-gray-50">
          {/* Sidebar */}
          <aside className="w-[140px] bg-white border-r border-gray-200 flex flex-col flex-shrink-0 z-20">
            <div className="h-16 flex items-center px-4 border-b border-gray-100 shrink-0 gap-2">
              <div className="w-6 h-6 bg-blue-700 rounded-md flex items-center justify-center text-white shrink-0">
                <PieChart size={14} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-gray-900 leading-tight text-sm truncate">LeadSys</span>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-2 flex flex-col gap-1">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors ${activeTab === item.id ? "bg-gray-100 hover:bg-gray-200 text-gray-900" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className={activeTab === item.id ? "text-blue-700 shrink-0" : "text-gray-400 shrink-0"}>{React.cloneElement(item.icon, { size: 16 })}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}

              <div className="mt-auto pt-4 pb-2 border-t border-gray-100">
                <button
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => {
                    setData(null);
                    setWorkbookData(null);
                    setSheetNames([]);
                    setActiveSheet("");
                    try { localStorage.removeItem('tgf_excel_state'); } catch(e) {}
                    deleteExcelFromCloud().catch(() => {});
                  }}
                >
                  <div className="shrink-0"><Upload size={16} /></div>
                  <span className="truncate">Upload New File</span>
                </button>
              </div>
            </nav>
          </aside>

          {/* Main Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#fbfbfb]">
            {/* Topbar */}
            <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 flex-shrink-0 sticky top-0 z-10 w-full">
              <div className="flex-1 flex items-center">
                {/* Sheet Switcher */}
                {sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Active Dataset:</span>
                    <select
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={activeSheet}
                      onChange={e => handleSheetSwitch(e.target.value)}
                    >
                      {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </header>

            {/* Dynamic View rendering */}
            <div className="overflow-y-auto flex-1">
              {activeTab === "dashboard" && <DashboardView data={data} colsMap={colsMap} />}
              {activeTab === "leads" && <LeadsTableView data={data} colsMap={colsMap} columns={columns} />}
              {activeTab === "source" && <SourceAnalysisView data={data} colsMap={colsMap} />}
              {activeTab === "shivir" && <ShivirAnalysisView data={data} colsMap={colsMap} />}
              {activeTab === "excel" && <ExcelGridView data={data} colsMap={colsMap} columns={columns} updateRow={updateRow} deleteRow={deleteRow} addRow={addRow} exportData={exportCurrentData} />}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
