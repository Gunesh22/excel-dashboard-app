import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import { Search, ChevronLeft, ChevronRight, FileSpreadsheet, X, Save, Trash2, Plus, Download, Edit3, Phone, User, MapPin, Calendar, Tag, MessageSquare, Hash, CheckCircle2, XCircle, Clock, PhoneOff, AlertTriangle, PhoneCall, MessageCircle, Send, Ban, ClipboardCheck, MoreHorizontal, CalendarDays } from "lucide-react";
import { toast } from "react-hot-toast";
import { hasMultipleNumbers, extractPhones } from "../utils";

const KHOJI_OPTIONS = ["Dew D Khoji", "khoji", "na", "new"];

const SOURCE_OPTIONS = [
    "Books", "Call Centre", "dhyan", "D4E", "Facebook", "fail list", "Google", "Instagram", 
    "Khoji", "NA", "Other", "Pamplate", "Pranayam", "Program", "SHSH", "Spiritual H", 
    "website", "WhatsApp", "youtube"
];

const CALL_TYPE_OPTIONS = ["incoming", "outgoing", "incoming f", "outgoing f"];

const CALLED_FOR_OPTIONS = [
    "Ad.Diges", "App", "Ashram V", "Books", "BUP", "BUT", "Breathing M", "Course", 
    "Dhyan", "Digital H", "D2E", "Facebook", "Google", "Khoji", "MA", "Mini", 
    "NA", "Off MA", "ON MA", "Other", "Pranayam", "Program", "Reminder", "SHSH", 
    "Shravan", "special", "Spine", "Spiritual H", "Study S.", "Swasthya", 
    "TGF Info", "website", "WhatsApp", "You-tube"
];

const STATUS_OPTIONS_ORDERED = [
    "Already Reg.d", "Busy", "Call Cut", "Called by mistake", "Info given", 
    "Interested", "Invalid No", "NA", "Next time", "Not interested", "not possible", 
    "Query", "Reg.Done", "reminder", "Shivir done", "switched off"
];

const ACTION_OPTIONS = [
    { value: "Sent details", icon: <Send size={13} />, color: "bg-cyan-50 text-cyan-700 border-cyan-200", activeColor: "bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-600/20" },
    { value: "no action", icon: <Ban size={13} />, color: "bg-gray-50 text-gray-600 border-gray-200", activeColor: "bg-gray-600 text-white border-gray-600 shadow-md shadow-gray-600/20" },
    { value: "registration done", icon: <ClipboardCheck size={13} />, color: "bg-emerald-50 text-emerald-700 border-emerald-200", activeColor: "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20" }
];


/* ======== EDIT MODAL ======== */
const LeadEditModal = ({ row, columns, colsMap, rowIndex, onSave, onDelete, onClose, getOptions }) => {
    const [editedRow, setEditedRow] = useState({ ...row });
    const [hasChanges, setHasChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState(""); // "saving" | "saved" | ""
    const autoSaveTimer = useRef(null);
    const editedRowRef = useRef(editedRow);
    editedRowRef.current = editedRow;

    // Follow-up state
    const followUpCol = columns.find(c => c.toLowerCase().includes("follow"));
    const existingFollowUp = editedRow["__followUpDate"] || "";
    const [followUpEnabled, setFollowUpEnabled] = useState(!!existingFollowUp || (followUpCol && String(editedRow[followUpCol] || "").toLowerCase().includes("follow")));
    const [followUpDate, setFollowUpDate] = useState(existingFollowUp || "");

    // "Other" action text
    const { statusCol, actionCol, sourceCol, cityCol, callTypeCol, calledForCol } = colsMap;
    const currentStatus = statusCol ? String(editedRow[statusCol] || "") : "";
    const currentAction = actionCol ? String(editedRow[actionCol] || "") : "";
    const currentSource = sourceCol ? String(editedRow[sourceCol] || "") : "";
    const currentCity = cityCol ? String(editedRow[cityCol] || "") : "";
    const currentCallType = callTypeCol ? String(editedRow[callTypeCol] || "") : "";
    const currentCalledFor = calledForCol ? String(editedRow[calledForCol] || "") : "";

    const handleChange = (col, value) => {
        setEditedRow(prev => {
            const updated = { ...prev, [col]: value };
            // Trigger autosave
            triggerAutoSave(updated);
            return updated;
        });
        setHasChanges(true);
    };

    const triggerAutoSave = useCallback((rowData) => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        setSaveStatus("saving");
        autoSaveTimer.current = setTimeout(() => {
            const final = { ...rowData };
            const fut = final["__followUpDate"];
            delete final["__followUpDate"];
            
            const dateCol = columns.find(c => c.toLowerCase().includes("follow up date") || c.toLowerCase().includes("followup date"));
            if (dateCol) {
                final[dateCol] = fut || "";
            } else {
                const targetCol = actionCol || followUpCol || columns[columns.length - 1];
                if (targetCol) {
                    let existing = String(final[targetCol] || "").replace(/\s*\[Follow-up:.*?\]/g, "");
                    if (fut) {
                        existing = `${existing} [Follow-up: ${fut}]`.trim();
                    }
                    final[targetCol] = existing;
                }
            }

            onSave(rowIndex, final);
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus(""), 2000);
        }, 300);
    }, [onSave, rowIndex, columns, actionCol, followUpCol]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
    }, []);

    const handleStatusClick = (value) => {
        if (!statusCol) return;
        handleChange(statusCol, currentStatus === value ? "" : value);
    };

    const handleKhojiClick = (value) => {
        if (!cityCol) return;
        handleChange(cityCol, currentCity === value ? "" : value);
    };

    const handleSourceClick = (value) => {
        if (!sourceCol) return;
        handleChange(sourceCol, currentSource === value ? "" : value);
    };

    const handleCallTypeClick = (value) => {
        if (!callTypeCol) return;
        handleChange(callTypeCol, currentCallType === value ? "" : value);
    };

    const handleCalledForClick = (value) => {
        if (!calledForCol) return;
        handleChange(calledForCol, currentCalledFor === value ? "" : value);
    };

    const handleActionClick = (value) => {
        if (!actionCol) return;
        
        let newAction = value;
        // Toggle off if already selected
        if (currentAction.toLowerCase() === value.toLowerCase()) {
            newAction = "";
        }
        
        setEditedRow(prev => {
            const updated = { ...prev, [actionCol]: newAction };
            
            // Auto-clear follow up if resolved
            if (newAction.toLowerCase() === "no action" || newAction.toLowerCase() === "registration done") {
                setFollowUpEnabled(false);
                setFollowUpDate("");
                updated["__followUpDate"] = "";
            }
            
            triggerAutoSave(updated);
            return updated;
        });
        setHasChanges(true);
    };

    const handleFollowUpToggle = () => {
        const newVal = !followUpEnabled;
        setFollowUpEnabled(newVal);
        setHasChanges(true);
        if (!newVal) {
            setFollowUpDate("");
            setEditedRow(prev => {
                const updated = { ...prev, "__followUpDate": "" };
                triggerAutoSave(updated);
                return updated;
            });
        }
    };

    const handleFollowUpDateChange = (date) => {
        setFollowUpDate(date);
        setEditedRow(prev => {
            const updated = { ...prev, "__followUpDate": date };
            // Also write into the actual date column if found, else store in __followUpDate for export
            const dateCol = columns.find(c => c.toLowerCase().includes("follow up date") || c.toLowerCase().includes("followup date"));
            if (dateCol) updated[dateCol] = date;
            triggerAutoSave(updated);
            return updated;
        });
        setHasChanges(true);
    };

    // Always save latest state when closing (any exit path: ESC, X, backdrop, Close button)
    const handleClose = useCallback(() => {
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        const latest = editedRowRef.current;
        const final = { ...latest };
        const fut = final["__followUpDate"];
        delete final["__followUpDate"];
        
        const dateCol = columns.find(c => c.toLowerCase().includes("follow up date") || c.toLowerCase().includes("followup date"));
        if (dateCol) {
            final[dateCol] = fut || "";
        } else {
            const targetCol = actionCol || followUpCol || columns[columns.length - 1];
            if (targetCol) {
                let existing = String(final[targetCol] || "").replace(/\s*\[Follow-up:.*?\]/g, "");
                if (fut) existing = `${existing} [Follow-up: ${fut}]`.trim();
                final[targetCol] = existing;
            }
        }
        onSave(rowIndex, final);
        onClose();
    }, [columns, actionCol, followUpCol, onSave, rowIndex, onClose]);

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this lead? This cannot be undone.")) {
            onDelete(rowIndex);
            onClose();
        }
    };

    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") handleClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleClose]);

    const getFieldIcon = (colName) => {
        const c = colName.toLowerCase();
        if (c.includes("phone") || c.includes("cont") || c.includes("number") || c.includes("mobile")) return <Phone size={14} className="text-blue-500" />;
        if (c.includes("name") || c.includes("lead") || c.includes("attendy") || c.includes("caller")) return <User size={14} className="text-green-500" />;
        if (c.includes("city") || c.includes("khoji") || c.includes("address") || c.includes("location")) return <MapPin size={14} className="text-red-500" />;
        if (c.includes("date") || c.includes("time") || c.includes("month")) return <Calendar size={14} className="text-purple-500" />;
        if (c.includes("source") || c.includes("sourse") || c.includes("type") || c.includes("status") || c.includes("shivir")) return <Tag size={14} className="text-amber-500" />;
        if (c.includes("comment") || c.includes("remark") || c.includes("note") || c.includes("action") || c.includes("detail") || c.includes("history") || c.includes("follow") || c.includes("feedback")) return <MessageSquare size={14} className="text-cyan-500" />;
        return <Hash size={14} className="text-gray-400" />;
    };

    const isLongField = (colName) => {
        const c = colName.toLowerCase();
        return c.includes("comment") || c.includes("remark") || c.includes("note") || c.includes("detail") || c.includes("history") || c.includes("feedback");
    };

    // Check if column is status or action — these get special rendering
    const isStatusCol = (col) => statusCol && col === statusCol;
    const isActionCol = (col) => actionCol && col === actionCol;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200"
                onClick={(e) => e.stopPropagation()}
                style={{ animation: "modalSlideIn 0.2s ease-out" }}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#217346] to-[#2d9a5d] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                            <Edit3 size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-tight">Edit Lead</h2>
                            <p className="text-white/70 text-xs">Row #{rowIndex + 1} — Tap buttons or edit fields</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                    {/* ── ALL EDITABLE FIELDS FIRST ── */}
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {columns.filter(col => !isStatusCol(col) && !isActionCol(col) && !isLongField(col)).map((col) => (
                                <div key={col} className="flex flex-col gap-1.5">
                                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                        {getFieldIcon(col)}
                                        {col}
                                    </label>
                                    <input
                                        type="text"
                                        list={`datalist-${col}`}
                                        value={editedRow[col] || ""}
                                        onChange={(e) => handleChange(col, e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 caret-gray-800 focus:outline-none focus:ring-2 focus:ring-[#217346]/30 focus:border-[#217346] focus:bg-white transition-all shadow-sm"
                                        placeholder={`Enter ${col}...`}
                                    />
                                    <datalist id={`datalist-${col}`}>
                                        {getOptions && getOptions(col).map(opt => (
                                            <option key={opt} value={opt} />
                                        ))}
                                    </datalist>
                                </div>
                            ))}
                        </div>

                        {/* ── LONG MULTILINE FIELDS ── */}
                        {columns.filter(col => !isStatusCol(col) && !isActionCol(col) && isLongField(col)).length > 0 && (
                            <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-6">
                                {columns.filter(col => !isStatusCol(col) && !isActionCol(col) && isLongField(col)).map((col) => (
                                    <div key={col} className="flex flex-col gap-1.5">
                                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                                            {getFieldIcon(col)}
                                            {col}
                                        </label>
                                        <textarea
                                            value={editedRow[col] || ""}
                                            onChange={(e) => handleChange(col, e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 caret-gray-800 focus:outline-none focus:ring-2 focus:ring-[#217346]/30 focus:border-[#217346] focus:bg-white transition-all resize-y min-h-[80px]"
                                            placeholder={`Enter ${col}...`}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* ── 🎯 QUICK ACTIONS & CATEGORIES ── */}
                    <div className="border-t border-gray-100 pt-6 space-y-6">
                        
                        {/* Khoji / New Selection */}
                        {cityCol && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin size={14} className="text-purple-500" /> Khoji / New
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {KHOJI_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleKhojiClick(opt)}
                                            className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${currentCity === opt ? "bg-purple-600 text-white border-purple-600 shadow-sm scale-105" : "bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100"}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Source Selection */}
                        {sourceCol && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Tag size={14} className="text-amber-500" /> Source
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {SOURCE_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleSourceClick(opt)}
                                            className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${currentSource === opt ? "bg-amber-600 text-white border-amber-600 shadow-sm scale-105" : "bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100"}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Call Type Selection */}
                        {callTypeCol && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <PhoneCall size={14} className="text-blue-500" /> Call Type
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {CALL_TYPE_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleCallTypeClick(opt)}
                                            className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${currentCallType === opt ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105" : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Called For Selection */}
                        {calledForCol && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Phone size={14} className="text-blue-500" /> Called For
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {CALLED_FOR_OPTIONS.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleCalledForClick(opt)}
                                            className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${currentCalledFor === opt ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105" : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Status Selection */}
                        {statusCol && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-green-500" /> Status
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {STATUS_OPTIONS_ORDERED.map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => handleStatusClick(opt)}
                                            className={`px-4 py-2 rounded-lg text-[13px] font-semibold border transition-all ${currentStatus === opt ? "bg-green-600 text-white border-green-600 shadow-sm scale-105" : "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Next Action Selection */}
                        {actionCol && (
                            <div className="space-y-3">
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                    <Edit3 size={14} className="text-indigo-500" /> Next Action
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {ACTION_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleActionClick(opt.value)}
                                            className={`flex items-center gap-2 px-5 py-3 rounded-xl border-2 font-bold text-[13px] transition-all duration-200 transform active:scale-95 ${currentAction === opt.value ? opt.activeColor + " scale-105" : `${opt.color} hover:bg-white hover:border-gray-300`}`}
                                        >
                                            {opt.icon}
                                            {opt.value}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Follow Up Toggle */}
                        <div className="space-y-2.5 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleFollowUpToggle}
                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${followUpEnabled ? "bg-[#217346]" : "bg-gray-300"}`}
                                >
                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${followUpEnabled ? "translate-x-[22px]" : "translate-x-0.5"}`}></div>
                                </button>
                                <label className="flex items-center gap-1.5 text-[12px] font-bold text-gray-700 cursor-pointer" onClick={handleFollowUpToggle}>
                                    <CalendarDays size={15} className="text-[#217346]" />
                                    Follow Up
                                </label>
                            </div>
                            {followUpEnabled && (
                                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg" style={{ animation: "modalSlideIn 0.15s ease-out" }}>
                                    <CalendarDays size={18} className="text-green-600 shrink-0" />
                                    <div className="flex flex-col gap-1 flex-1">
                                        <span className="text-[11px] font-semibold text-green-700 uppercase">Follow-up Date</span>
                                        <input
                                            type="date"
                                            value={followUpDate}
                                            onChange={(e) => handleFollowUpDateChange(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-3 py-2 bg-white border border-green-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all cursor-pointer"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
                    <button
                        onClick={handleDelete}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                    >
                        <Trash2 size={14} />
                        Delete Lead
                    </button>
                    <div className="flex items-center gap-3">
                        {/* Autosave status */}
                        <div className="flex items-center gap-1.5 text-[11px] font-medium">
                            {saveStatus === "saving" && (
                                <span className="text-amber-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>Saving...</span>
                            )}
                            {saveStatus === "saved" && (
                                <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={13} />Autosaved ✓</span>
                            )}
                            {saveStatus === "" && hasChanges && (
                                <span className="text-gray-400">Autosave on</span>
                            )}
                            {saveStatus === "" && !hasChanges && (
                                <span className="text-gray-300">No changes</span>
                            )}
                        </div>
                        <button
                            onClick={handleClose}
                            className="px-5 py-2 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


/* ======== MAIN EXCEL GRID VIEW ======== */
export const ExcelGridView = ({ data, colsMap, columns, updateRow, deleteRow, addRow, exportData }) => {
    const { sourceCol, shivirCol, phoneCol, cityCol, statusCol, actionCol, callTypeCol, calledForCol } = colsMap;

    // Local export — always uses live data with all edits baked in
    const handleExport = useCallback(() => {
        if (!data || data.length === 0) { toast.error('No data to export.'); return; }
        // Clean __followUpDate internal key; inject Follow Up Date col if any row has it
        const hasFollowUpDates = data.some(r => r["__followUpDate"]);
        const exportRows = data.map(r => {
            const clean = { ...r };
            const fut = clean["__followUpDate"] || "";
            delete clean["__followUpDate"];
            if (hasFollowUpDates) clean["Follow Up Date"] = fut;

            // Replace newlines with 2 spaces for proper Excel display (no wrapping issues)
            Object.keys(clean).forEach(k => {
                if (typeof clean[k] === 'string') {
                    clean[k] = clean[k].replace(/\n/g, '  ');
                }
            });

            return clean;
        });
        const ws = XLSX.utils.json_to_sheet(exportRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, `exported_leads_${new Date().toISOString().slice(0,10)}.xlsx`);
        toast.success(`Exported ${exportRows.length} rows!`);
    }, [data]);

    // Drag-to-scroll refs
    const scrollRef = useRef(null);
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragScrollLeft = useRef(0);
    const didDrag = useRef(false);

    const onMouseDown = useCallback((e) => {
        isDragging.current = true;
        didDrag.current = false;
        dragStartX.current = e.pageX - scrollRef.current.offsetLeft;
        dragScrollLeft.current = scrollRef.current.scrollLeft;
        scrollRef.current.style.cursor = 'grabbing';
    }, []);
    const onMouseMove = useCallback((e) => {
        if (!isDragging.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - dragStartX.current) * 1.2;
        if (Math.abs(walk) > 3) didDrag.current = true;
        scrollRef.current.scrollLeft = dragScrollLeft.current - walk;
    }, []);
    const onMouseUp = useCallback(() => {
        isDragging.current = false;
        if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
    }, []);

    const [filterSource, setFilterSource] = useState("All");
    const [filterShivir, setFilterShivir] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterAction, setFilterAction] = useState("All");
    const [filterCallType, setFilterCallType] = useState("All");
    const [filterCallStatus, setFilterCallStatus] = useState("All");
    const [buttonFilter, setButtonFilter] = useState("All");

    const [activeSubTab, setActiveSubTab] = useState("all");
    const [followUpFilter, setFollowUpFilter] = useState("All");

    // Modal state
    const [editingRow, setEditingRow] = useState(null); // { row, index }

    const [searchQuery, setSearchQuery] = useState("");
    const [searchColumn, setSearchColumn] = useState("All");
    const [fontSize, setFontSize] = useState("sm");

    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(100);

    // Build phone duplication map
    const phoneCounts = useMemo(() => {
        const counts = {};
        data.forEach(r => {
            extractPhones(r[phoneCol]).forEach(p => {
                counts[p] = (counts[p] || 0) + 1;
            });
        });
        return counts;
    }, [data, phoneCol]);

    const dupPhoneSet = useMemo(() => {
        const set = new Set();
        Object.entries(phoneCounts).forEach(([phone, count]) => {
            if (count > 1) set.add(phone);
        });
        return set;
    }, [phoneCounts]);

    const isDupRow = (phoneCell) =>
        extractPhones(phoneCell).some(p => dupPhoneSet.has(p));

    // We need to track original index for editing, so build filteredData with original indices
    const filteredDataWithIndex = useMemo(() => {
        let result = [];
        const todayStr = new Date().toLocaleDateString('en-CA');
        
        data.forEach((row, originalIndex) => {
            // Search
            if (searchQuery.trim() !== "") {
                const query = searchQuery.toLowerCase();
                if (searchColumn === "All") {
                    const valStr = Object.values(row).join(" ").toLowerCase();
                    if (!valStr.includes(query)) return;
                } else {
                    const valStr = String(row[searchColumn] || "").toLowerCase();
                    if (!valStr.includes(query)) return;
                }
            }

            let fDate = row["__followUpDate"] || null;
            if (!fDate) {
                const dateCol = columns.find(c => c.toLowerCase().includes("follow up date") || c.toLowerCase().includes("followup date"));
                if (dateCol && row[dateCol]) fDate = row[dateCol];
            }
            if (!fDate && actionCol) {
                const match = String(row[actionCol] || "").match(/\[Follow-up: (.*?)\]/);
                if (match) fDate = match[1];
            }

            if (activeSubTab === "followup") {
                if (!fDate) return;
                
                // Parse date consistently avoiding string comparison bugs
                let fDateObj = new Date(fDate);
                if (isNaN(fDateObj.getTime())) return;
                
                fDateObj.setHours(0,0,0,0);
                const todayObj = new Date();
                todayObj.setHours(0,0,0,0);
                
                const fTime = fDateObj.getTime();
                const todayTime = todayObj.getTime();

                if (followUpFilter === "Today" && fTime !== todayTime) return;
                if (followUpFilter === "Upcoming" && fTime <= todayTime) return;
                if (followUpFilter === "Overdue" && fTime >= todayTime) return;
            } else {
                const phone = String(row[phoneCol] || "").trim();
                const isDup = isDupRow(phone);
                const hasMult = hasMultipleNumbers(phone);
                const hasEmpty = columns.some(c => !row[c] || String(row[c]).trim() === "");

                const isNewKhoji = String(row[cityCol] || "").toLowerCase().includes("khoji") ||
                    String(row[colsMap.nameCol] || "").toLowerCase().includes("new");

                if (buttonFilter === "New" && !isNewKhoji) return;
                if (buttonFilter === "Multi" && !hasMult) return;
                if (buttonFilter === "Duplicates" && !isDup) return;
                if (buttonFilter === "Missing" && !hasEmpty) return;
                if (buttonFilter === "NoDuplicates" && isDup) return;
            }

            const norm = (v) => String(v || "").replace(/[\s\u00A0\u200B\t]+/g, " ").trim().toLowerCase();
            if (filterSource !== "All" && norm(row[sourceCol]) !== norm(filterSource)) return;
            if (filterShivir !== "All" && norm(row[shivirCol]) !== norm(filterShivir)) return;
            if (statusCol && filterStatus !== "All" && norm(row[statusCol]) !== norm(filterStatus)) return;
            if (actionCol && filterAction !== "All" && norm(row[actionCol]) !== norm(filterAction)) return;
            if (calledForCol && filterCallType !== "All" && norm(row[calledForCol]) !== norm(filterCallType)) return;
            if (callTypeCol && filterCallStatus !== "All" && norm(row[callTypeCol]) !== norm(filterCallStatus)) return;

            result.push({ row, originalIndex, fDate });
        });

        if (activeSubTab === "followup") {
            result.sort((a, b) => {
                const da = a.fDate ? new Date(a.fDate) : new Date(8640000000000000);
                const db = b.fDate ? new Date(b.fDate) : new Date(8640000000000000);
                return da - db;
            });
        }
        
        return result;
    }, [data, buttonFilter, filterSource, filterShivir, filterStatus, filterAction, colsMap, phoneCounts, phoneCol, cityCol, columns, searchQuery, searchColumn, statusCol, actionCol, activeSubTab, followUpFilter]);

    const getOptions = (col) => {
        const norm = (v) => String(v || "").replace(/[\s\u00A0\u200B\t]+/g, " ").trim();
        const seen = new Set();
        const result = [];
        data.forEach(r => {
            const raw = norm(r[col]);
            const key = raw.toLowerCase();
            if (raw && !seen.has(key)) { seen.add(key); result.push(raw); }
        });
        return result.sort();
    };

    const getColStyle = (colName) => {
        const c = String(colName).toLowerCase();
        if (c.includes("phone") || c.includes("cont") || c.includes("number") || c.includes("mobile"))
            return { minWidth: "160px", whiteSpace: "normal", wordBreak: "break-word" };
        if (c.includes("name") || c.includes("lead"))
            return { minWidth: "160px", whiteSpace: "normal", wordBreak: "break-word" };
        if (c.includes("source") || c.includes("sourse") || c.includes("type") || c.includes("status"))
            return { minWidth: "120px", whiteSpace: "normal", wordBreak: "break-word" };
        if (c.includes("shivir") || c.includes("month") || c.includes("city") || c.includes("khoji"))
            return { minWidth: "100px", whiteSpace: "normal", wordBreak: "break-word" };
        if (c.includes("attendy") || c.includes("caller"))
            return { minWidth: "110px", whiteSpace: "normal", wordBreak: "break-word" };
        if (c.includes("comment") || c.includes("remark") || c.includes("detail") || c.includes("history") || c.includes("action") || c.includes("note"))
            return { minWidth: "250px", whiteSpace: "normal", wordBreak: "break-word" };
        if (c.includes("date") || c.includes("time"))
            return { minWidth: "100px", whiteSpace: "normal", wordBreak: "normal" };
        return { minWidth: "130px", whiteSpace: "normal", wordBreak: "break-word" };
    };

    const totalPages = Math.ceil(filteredDataWithIndex.length / rowsPerPage);
    const paginatedData = filteredDataWithIndex.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    const setBtnFilter = (type) => {
        setButtonFilter(type);
        setPage(1);
    };

    const [jumpPage, setJumpPage] = useState("");

    // Handle row click (open modal)
    const handleRowClick = useCallback((row, originalIndex) => {
        if (didDrag.current) return; // ignore clicks after drag
        setEditingRow({ row: { ...row }, index: originalIndex });
    }, []);

    return (
        <div className="flex flex-col gap-6 p-8 bg-gray-50 min-h-screen">
            {/* Inline keyframe for modal animation */}
            <style>{`
                @keyframes modalSlideIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

            {/* Edit Modal */}
            {editingRow && (
                <LeadEditModal
                    row={editingRow.row}
                    columns={columns}
                    colsMap={colsMap}
                    rowIndex={editingRow.index}
                    onSave={updateRow}
                    onDelete={deleteRow}
                    onClose={() => setEditingRow(null)}
                    getOptions={getOptions}
                />
            )}

            {/* Top Banner */}
            <div className="flex items-center gap-3 bg-[#217346] text-white px-5 py-3 rounded-xl shadow select-none">
                <FileSpreadsheet size={18} className="shrink-0" />
                <span className="text-sm font-bold tracking-wide">Excel View &nbsp;·&nbsp; Click any row to edit &nbsp;·&nbsp; Right-click to copy &nbsp;·&nbsp; Drag to scroll</span>
            </div>

            <div className="flex items-center justify-between shrink-0">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold text-gray-900">{activeSubTab === "followup" ? "Follow Up Manager" : "Excel Raw Data"}</h1>
                    <p className="text-sm text-gray-500">{activeSubTab === "followup" ? "Track all scheduled follow-ups, sorted by date." : "Click any row to open the edit popup. All changes stay in your browser."}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={addRow}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#217346] text-white hover:bg-[#1a5c38] shadow transition-colors"
                    >
                        <Plus size={14} /> Add Row
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-white text-[#217346] border-2 border-[#217346] hover:bg-[#217346] hover:text-white shadow transition-colors"
                    >
                        <Download size={14} /> Export .xlsx
                        <span className="ml-1 bg-[#217346] text-white group-hover:bg-white group-hover:text-[#217346] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {data?.length ?? 0}
                        </span>
                    </button>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex border-b border-gray-200 shrink-0 select-none">
                <button
                    onClick={() => { setActiveSubTab("all"); setPage(1); }}
                    className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeSubTab === "all" ? "border-[#217346] text-[#217346]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                >
                    <FileSpreadsheet size={16} /> All Leads
                </button>
                <button
                    onClick={() => { setActiveSubTab("followup"); setPage(1); }}
                    className={`px-6 py-3 font-bold text-sm transition-all border-b-2 flex items-center gap-2 ${activeSubTab === "followup" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
                >
                    <CalendarDays size={16} /> Follow Ups
                </button>
            </div>

            {/* Quick filter pills */}
            {activeSubTab === "all" ? (
                <div className="flex items-center gap-2 flex-wrap shrink-0 mb-2">
                    <button onClick={() => setBtnFilter("All")} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${buttonFilter === "All" ? "bg-[#217346] text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>All Leads</button>
                    <button onClick={() => setBtnFilter("New")} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${buttonFilter === "New" ? "bg-[#217346] text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>New (Khoji)</button>
                    <button onClick={() => setBtnFilter("Duplicates")} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${buttonFilter === "Duplicates" ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>Duplicates</button>
                    <button onClick={() => setBtnFilter("NoDuplicates")} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${buttonFilter === "NoDuplicates" ? "bg-green-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>No Duplicates</button>
                    <button onClick={() => setBtnFilter("Multi")} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${buttonFilter === "Multi" ? "bg-purple-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>Multi Numbers</button>
                    <button onClick={() => setBtnFilter("Missing")} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${buttonFilter === "Missing" ? "bg-red-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>Missing Data</button>
                </div>
            ) : (
                <div className="flex items-center gap-2 flex-wrap shrink-0 mb-2">
                    <button onClick={() => { setFollowUpFilter("All"); setPage(1); }} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${followUpFilter === "All" ? "bg-amber-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>All Followups</button>
                    <button onClick={() => { setFollowUpFilter("Today"); setPage(1); }} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${followUpFilter === "Today" ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>Today</button>
                    <button onClick={() => { setFollowUpFilter("Upcoming"); setPage(1); }} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${followUpFilter === "Upcoming" ? "bg-indigo-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>Upcoming</button>
                    <button onClick={() => { setFollowUpFilter("Overdue"); setPage(1); }} className={`px-4 py-1.5 rounded-full text-[13px] font-medium shadow-sm whitespace-nowrap transition-colors ${followUpFilter === "Overdue" ? "bg-red-500 text-white" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}>Overdue</button>
                </div>
            )}

            {/* Search + Font size + Rows per page + Dropdowns */}
            <div className="flex items-center gap-3 flex-wrap shrink-0 mb-4">
                <div className="flex items-center gap-0 bg-white rounded border border-gray-200 overflow-hidden">
                    <select className="px-2 py-1.5 bg-transparent text-[13px] text-gray-500 font-medium focus:outline-none border-r border-gray-200" value={searchColumn} onChange={(e) => setSearchColumn(e.target.value)}>
                        <option value="All">All Columns</option>
                        {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="relative flex items-center">
                        <Search size={13} className="text-gray-400 absolute left-2" />
                        <input type="text" placeholder="Search..." className="w-44 pl-7 pr-3 py-1.5 bg-transparent text-[13px] focus:outline-none" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} />
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase mr-1">Font</span>
                    <button onClick={() => setFontSize('sm')} className={`px-2 py-0.5 rounded text-[12px] font-medium ${fontSize === 'sm' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>Sm</button>
                    <button onClick={() => setFontSize('md')} className={`px-2 py-0.5 rounded text-[12px] font-medium ${fontSize === 'md' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>Md</button>
                    <button onClick={() => setFontSize('lg')} className={`px-2 py-0.5 rounded text-[12px] font-medium ${fontSize === 'lg' ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>Lg</button>
                </div>

                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 py-1">
                    <span className="text-[11px] font-semibold text-gray-400 uppercase mr-1">Rows</span>
                    {[50, 100, 200, 500].map(n => (
                        <button key={n} onClick={() => { setRowsPerPage(n); setPage(1); }} className={`px-2 py-0.5 rounded text-[12px] font-medium ${rowsPerPage === n ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:bg-gray-50'}`}>{n}</button>
                    ))}
                </div>

                <select className="px-3 py-1.5 bg-white border border-gray-200 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500" value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }}>
                    <option value="All">All Sources</option>
                    {getOptions(sourceCol).map(o => <option key={o} value={o}>{o}</option>)}
                </select>

                <select className="px-3 py-1.5 bg-white border border-gray-200 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500" value={filterShivir} onChange={e => { setFilterShivir(e.target.value); setPage(1); }}>
                    <option value="All">All Shivirs</option>
                    {getOptions(shivirCol).map(o => <option key={o} value={o}>{o}</option>)}
                </select>

                {statusCol && (
                    <select className="px-3 py-1.5 bg-white border border-gray-200 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}>
                        <option value="All">All Statuses</option>
                        {getOptions(statusCol).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                )}

                {calledForCol && (
                    <select className="px-3 py-1.5 bg-white border border-gray-200 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500" value={filterCallType} onChange={e => { setFilterCallType(e.target.value); setPage(1); }}>
                        <option value="All">All Called For</option>
                        {getOptions(calledForCol).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                )}

                {callTypeCol && (
                    <select className="px-3 py-1.5 bg-white border border-gray-200 rounded text-[13px] text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-500" value={filterCallStatus} onChange={e => { setFilterCallStatus(e.target.value); setPage(1); }}>
                        <option value="All">All Call Types</option>
                        {["incoming", "outgoing", "incoming f", "outgoing f"].map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                )}
            </div>


            <div className="bg-white border border-gray-200 rounded shadow-sm flex flex-col flex-1">
                <div ref={scrollRef} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} className="w-full overflow-x-auto cursor-grab" style={{ userSelect: 'none' }}>
                    <table className="table-auto w-full text-left border-collapse">
                        <thead className="bg-[#f8f9fa] border-b border-gray-300 sticky top-0 z-10">
                            <tr>
                                <th style={{ minWidth: "50px", maxWidth: "60px" }} className="py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap leading-none bg-[#e9ecef] border-r border-gray-300">#</th>
                                {columns.map(c => {
                                    const s = getColStyle(c);
                                    return <th key={c} title={c} style={{ minWidth: s.minWidth, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }} className="py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider leading-tight border-r border-gray-200 bg-[#f8f9fa]">{c}</th>;
                                })}
                                <th style={{ minWidth: "90px", maxWidth: "110px" }} className="py-2.5 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap leading-none bg-[#f8f9fa]">Data Quality</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedData.map(({ row, originalIndex }, idx) => {
                                const phone = String(row[phoneCol] || "").trim();
                                const isDup = isDupRow(phone);
                                const hasMult = hasMultipleNumbers(phone);
                                const hasEmpty = columns.filter(c => c !== phoneCol).some(c => String(row[c] ?? "").trim() === "");

                                const rowBg = (isDup || hasMult) ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-green-50";
                                const textSize = fontSize === 'sm' ? 'text-[13px]' : fontSize === 'md' ? 'text-[15px]' : 'text-[17px]';
                                const globalRowNum = originalIndex + 1;

                                const handleCopy = (e, value) => {
                                    e.preventDefault();
                                    navigator.clipboard.writeText(value).then(() => {
                                        toast.success(`Copied!`, { duration: 1000, position: 'bottom-center', style: { fontSize: '13px', padding: '6px 12px' } });
                                    });
                                };

                                return (
                                    <tr
                                        key={originalIndex}
                                        className={`transition-colors cursor-pointer ${rowBg}`}
                                        onClick={() => handleRowClick(row, originalIndex)}
                                    >
                                        <td className="py-2 px-3 text-[11px] font-medium text-gray-400 text-center bg-[#f8f9fa] border-r border-gray-200">{globalRowNum}</td>
                                        {columns.map(c => {
                                            const s = getColStyle(c);
                                            const val = String(row[c] || "");
                                            return (
                                                <td key={c} onContextMenu={(e) => handleCopy(e, val)} title="Click to edit · Right-click to copy" style={{ minWidth: s.minWidth, whiteSpace: s.whiteSpace, wordBreak: s.wordBreak }} className={`py-2.5 px-3 ${textSize} text-gray-800 border-b border-gray-100 border-r border-gray-100 cursor-pointer`}>
                                                    {val}
                                                </td>
                                            );
                                        })}
                                        <td className="py-4 px-4 border-b border-gray-100 min-w-[120px]">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {isDup && <span className="inline-flex items-center text-[13px] text-amber-600 font-medium">Duplicate</span>}
                                                {hasMult && <span className="inline-flex items-center text-[13px] text-purple-600 font-medium">Multi</span>}
                                                {hasEmpty && <span className="inline-flex items-center text-[13px] text-red-500 font-medium">Missing</span>}
                                                {(!isDup && !hasMult && !hasEmpty) && <span className="inline-flex items-center text-[13px] text-green-600 font-medium">Clean</span>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedData.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length + 2}>
                                        <div className="py-12 text-center text-gray-500">No leads found matching your filters.</div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Enhanced Pagination Footer */}
                <div className="py-2.5 px-4 flex items-center justify-between shrink-0 bg-[#f8f9fa] border-t border-gray-200">
                    <span className="text-[13px] text-gray-500">
                        Showing <span className="font-semibold text-gray-900">{filteredDataWithIndex.length > 0 ? ((page - 1) * rowsPerPage) + 1 : 0}</span> to <span className="font-semibold text-gray-900">{Math.min(page * rowsPerPage, filteredDataWithIndex.length)}</span> of <span className="font-semibold text-gray-900">{filteredDataWithIndex.length}</span> leads
                        {filteredDataWithIndex.length !== data.length && <span className="text-gray-400 ml-1">(filtered from {data.length} total)</span>}
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 mr-2">
                            <span className="text-[11px] text-gray-400 uppercase font-semibold">Go to</span>
                            <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={jumpPage}
                                onChange={(e) => setJumpPage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const p = Math.max(1, Math.min(totalPages, parseInt(jumpPage) || 1));
                                        setPage(p);
                                        setJumpPage("");
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder="#"
                                className="w-12 px-1.5 py-0.5 text-[12px] text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                            />
                        </div>
                        <button className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200" disabled={page === 1} onClick={() => setPage(1)}>
                            <ChevronLeft size={16} /><ChevronLeft size={16} className="-ml-2.5" />
                        </button>
                        <button className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={16} />
                        </button>
                        <div className="w-7 h-7 rounded bg-[#217346] text-white flex items-center justify-center text-[13px] font-semibold mx-1">{page}</div>
                        <span className="text-[12px] text-gray-400">of {totalPages || 1}</span>
                        <button className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={16} />
                        </button>
                        <button className="p-1 rounded text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                            <ChevronRight size={16} /><ChevronRight size={16} className="-ml-2.5" />
                        </button>
                    </div>
                </div>

                {/* Excel-style Status Bar */}
                <div className="h-6 bg-[#217346] text-white flex items-center px-4 text-[10px] font-medium shrink-0 rounded-b">
                    <span className="opacity-90 uppercase tracking-tighter">Ready</span>
                    <div className="mx-3 w-[1px] h-3 bg-white/20"></div>
                    <span className="opacity-90">Total: {data.length} records</span>
                    <div className="mx-3 w-[1px] h-3 bg-white/20"></div>
                    <span className="opacity-90">Filtered: {filteredDataWithIndex.length}</span>
                    <div className="mx-3 w-[1px] h-3 bg-white/20"></div>
                    <span className="opacity-90">Duplicates: {dupPhoneSet.size}</span>
                    {searchQuery && (
                        <>
                            <div className="mx-3 w-[1px] h-3 bg-white/20"></div>
                            <span className="opacity-90 italic">Search: "{searchQuery}"</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
