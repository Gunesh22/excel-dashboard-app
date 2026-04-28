import React, { useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import { Upload, FileSpreadsheet, Plus, Table as TableIcon } from "lucide-react";
import { createProgram, importContacts } from "../../lib/db";

export default function ImportContacts({ programs, onImportComplete }) {
  const [selectedProgram, setSelectedProgram] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [showCreateProgram, setShowCreateProgram] = useState(false);

  const handleFileUpload = async (e) => {
    if (!selectedProgram) {
      toast.error("Please select a program first.");
      e.target.value = null;
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: false, defval: "" });

        if (json.length === 0) {
          toast.error("Sheet is empty.");
          return;
        }

        const programObj = programs.find(p => p.id === selectedProgram);
        const pName = programObj ? programObj.name : "Unknown Program";

        // Import to Firestore
        await importContacts(selectedProgram, pName, json);
        toast.success(`Imported ${json.length} contacts!`);
        onImportComplete();
      } catch (err) {
        console.error(err);
        toast.error("Import failed: " + err.message);
      } finally {
        setIsImporting(false);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateProgram = async () => {
    if (!newProgramName) return;
    try {
      const id = await createProgram(newProgramName, []);
      toast.success(`Program "${newProgramName}" created!`);
      setShowCreateProgram(false);
      setNewProgramName("");
      onImportComplete(); // Refreshes list
      setSelectedProgram(id);
    } catch (err) {
      toast.error("Failed to create program.");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Lead Distribution 📂</h2>
          <p className="text-gray-500 mt-1">Upload Excel files to assign contacts to a specific program.</p>
        </div>
        <button 
          onClick={() => setShowCreateProgram(!showCreateProgram)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
        >
          <Plus size={18} /> New Program
        </button>
      </div>

      {showCreateProgram && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <input 
            type="text" 
            placeholder="Enter Program Name (e.g. Yoga Camp March)" 
            className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={newProgramName}
            onChange={e => setNewProgramName(e.target.value)}
          />
          <button 
            onClick={handleCreateProgram}
            className="px-6 py-2 bg-gray-900 text-white rounded-xl font-medium"
          >
            Create
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider">Step 1: Select Active Program</label>
            <select 
              value={selectedProgram}
              onChange={e => setSelectedProgram(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border rounded-2xl font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">-- Choose Program --</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="pt-4">
            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider block mb-4">Step 2: Upload Excel File</label>
            <div className={`relative border-2 border-dashed rounded-3xl p-10 transition-all text-center ${selectedProgram ? "border-blue-200 bg-blue-50/30 hover:bg-blue-50 cursor-pointer" : "border-gray-200 bg-gray-50 grayscale cursor-not-allowed"}`}>
              <Upload className={`mx-auto mb-4 ${selectedProgram ? "text-blue-500" : "text-gray-300"}`} size={40} />
              <p className={`font-semibold ${selectedProgram ? "text-blue-700" : "text-gray-400"}`}>
                {isImporting ? "Processing data..." : "Click or drag your XLSX lead file here"}
              </p>
              <input 
                type="file" 
                accept=".xlsx,.xls" 
                className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                disabled={!selectedProgram || isImporting}
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <TableIcon size={20} />
            </div>
            <h3 className="text-xl font-bold">Programs Status</h3>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {programs.length === 0 ? (
              <p className="text-gray-400">No programs created yet.</p>
            ) : programs.map(p => (
              <div key={p.id} className="p-4 bg-gray-800 rounded-2xl flex items-center justify-between border border-gray-700">
                <span className="font-semibold truncate pr-4">{p.name}</span>
                <span className="text-xs bg-gray-700 px-3 py-1 rounded-full text-gray-300">Active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
