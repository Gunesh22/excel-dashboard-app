import React, { useState, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import { 
  PhoneCall, 
  Settings, 
  BarChart3, 
  LogOut, 
  Heart, 
  Calendar,
  Layers,
  ChevronRight
} from "lucide-react";
import { getPrograms } from "../../lib/db";
import CallQueue from "./CallQueue";
import ImportContacts from "./ImportContacts";
import ManagerStats from "./ManagerStats";

export default function CallCenterDashboard() {
  const [activeTab, setActiveTab] = useState("call-queue");
  const [programs, setPrograms] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const progs = await getPrograms();
      setPrograms(progs);
    } catch (err) {
      toast.error("Failed to load programs.");
    }
  };

  const menuItems = [
    { id: "call-queue", label: "Call Queue", icon: <PhoneCall size={20} />, description: "Get your next call" },
    { id: "import", label: "Admin Panel", icon: <Settings size={20} />, description: "Manage data & programs" },
    { id: "stats", label: "Analytics", icon: <BarChart3 size={20} />, description: "View performance" },
  ];

  return (
    <div className="flex h-screen bg-[#F0F2F5] text-slate-900 font-sans selection:bg-blue-100 overflow-hidden">
      <Toaster position="top-right" />

      {/* Modern Sidebar */}
      <aside className={`bg-white h-full transition-all duration-300 border-r border-slate-200 flex flex-col z-50 ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
            <Heart size={22} fill="white" />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-black text-lg tracking-tight leading-none">Happy Thoughts</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Call Center</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full group flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 relative ${
                activeTab === item.id 
                  ? "bg-slate-900 text-white shadow-2xl shadow-slate-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <div className={`p-2 rounded-2xl transition-colors ${activeTab === item.id ? "bg-slate-800 text-blue-400" : "bg-transparent group-hover:bg-white"}`}>
                {item.icon}
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col items-start translate-x-0 opacity-100">
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                  <span className={`text-[10px] font-medium transition-colors ${activeTab === item.id ? "text-slate-400" : "text-slate-300"}`}>{item.description}</span>
                </div>
              )}
              {activeTab === item.id && isSidebarOpen && (
                <div className="absolute right-4"><ChevronRight size={14} /></div>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-4 p-4 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all duration-300"
          >
            <div className="p-1"><Layers size={20} /></div>
            {isSidebarOpen && <span className="font-bold text-sm">Collapse Menu</span>}
          </button>
        </div>
      </aside>

      {/* Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Transparent top bar */}
        <header className="h-20 flex items-center justify-between px-10 flex-shrink-0 z-10">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800 capitalize">
              {activeTab.replace("-", " ")}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
               {[1,2,3].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200"></div>
               ))}
               <div className="w-8 h-8 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">+12</div>
            </div>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <button className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-white border border-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-colors shadow-sm">
                <LogOut size={18} />
              </div>
            </button>
          </div>
        </header>

        {/* View Rendering */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-10">
          {activeTab === "call-queue" && <CallQueue programs={programs} />}
          {activeTab === "import" && <ImportContacts programs={programs} onImportComplete={fetchPrograms} />}
          {activeTab === "stats" && <ManagerStats programs={programs} />}
        </div>

        {/* Floating gradient blob deco */}
        <div className="absolute -top-64 -right-64 w-[600px] h-[600px] bg-blue-100 rounded-full blur-[160px] opacity-40 -z-10 animate-pulse"></div>
        <div className="absolute top-[80%] left-[60%] w-[400px] h-[400px] bg-indigo-100 rounded-full blur-[140px] opacity-30 -z-10"></div>
      </main>
    </div>
  );
}
