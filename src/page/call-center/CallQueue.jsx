import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { 
  PhoneCall, 
  User, 
  MapPin, 
  PhoneOff, 
  CheckCircle2, 
  Calendar, 
  AlertCircle,
  Clock,
  ChevronRight,
  UserCheck
} from "lucide-react";
import { getNextContact, logCall } from "../../lib/db";

export default function CallQueue({ programs }) {
  const [selectedProgram, setSelectedProgram] = useState("");
  const [attenderName, setAttenderName] = useState("");
  const [currentContact, setCurrentContact] = useState(null);
  const [isGettingContact, setIsGettingContact] = useState(false);
  const [remark, setRemark] = useState("");
  const [callbackDate, setCallbackDate] = useState("");

  const outcomes = [
    { id: "Answered", icon: <CheckCircle2 className="text-green-500" /> },
    { id: "Not Answered", icon: <PhoneOff className="text-red-500" /> },
    { id: "Interested", icon: <UserCheck className="text-blue-500" /> },
    { id: "Not Interested", icon: <AlertCircle className="text-gray-500" /> },
    { id: "Callback", icon: <Calendar className="text-amber-500" /> },
  ];

  const handleGetNext = async () => {
    if (!selectedProgram || !attenderName) {
      toast.error("Please select a program and set your name.");
      return;
    }

    setIsGettingContact(true);
    try {
      const contact = await getNextContact(selectedProgram, attenderName);
      if (contact) {
        setCurrentContact(contact);
        setRemark("");
        setCallbackDate("");
      } else {
        toast.error("No more contacts in queue!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching contact.");
    } finally {
      setIsGettingContact(false);
    }
  };

  const handleLogCall = async (outcome) => {
    if (outcome === "Callback" && !callbackDate) {
      toast.error("Please select a callback date.");
      return;
    }

    try {
      await logCall(
        currentContact.id, 
        outcome, 
        remark, 
        attenderName, 
        selectedProgram, 
        callbackDate
      );
      toast.success(`Logged as ${outcome}`);
      setCurrentContact(null);
      setRemark("");
      setCallbackDate("");
    } catch (err) {
      toast.error("Failed to log call.");
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-6 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Attender Name</span>
            <input 
              type="text" 
              placeholder="Your Name" 
              className="px-4 py-2 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full"
              value={attenderName}
              onChange={e => setAttenderName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
             <span className="text-[10px] font-bold text-gray-400 uppercase ml-2 tracking-widest">Active Program</span>
             <select 
              value={selectedProgram}
              onChange={e => setSelectedProgram(e.target.value)}
              className="px-4 py-2 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full md:min-w-[200px]"
            >
              <option value="">-- Select Program --</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        <button 
          onClick={handleGetNext}
          disabled={isGettingContact || !!currentContact}
          className={`px-8 py-3 rounded-2xl font-bold flex items-center gap-3 transition-all transform active:scale-95 shadow-xl ${!!currentContact ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5"}`}
        >
          {isGettingContact ? <Clock className="animate-spin" /> : <PhoneCall size={20} />}
          Get Next Contact
        </button>
      </div>

      {currentContact ? (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:rotate-12 transition-transform duration-500">
                <User size={32} />
              </div>
            </div>

            <div className="space-y-8 pt-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Contact Details</span>
                <h3 className="text-4xl font-black text-gray-900 leading-tight">
                  {currentContact.Name || currentContact.name || "Unknown Lead"}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400"><PhoneCall size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone Number</span>
                    <p className="text-xl font-bold text-gray-900 tracking-tighter">
                      {currentContact.Phone || currentContact.phone || currentContact["Mobile No"] || "N/A"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400"><MapPin size={18} /></div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</span>
                    <p className="font-bold text-gray-900">{currentContact.City || currentContact.city || "Not Specified"}</p>
                  </div>
                </div>
              </div>

              {/* Dynamic fields display */}
              <div className="flex flex-wrap gap-2 pt-4">
                 {Object.entries(currentContact).map(([key, value]) => {
                   if (["id", "programId", "status", "assignedTo", "assignedAt", "lastCalledAt", "nextCallbackAt", "outcome", "createdAt", "Name", "name", "Phone", "phone", "Mobile No", "City", "city"].includes(key)) return null;
                   if (!value) return null;
                   return (
                     <span key={key} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 uppercase tracking-widest">{key}: {value}</span>
                   );
                 })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl space-y-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ChevronRight className="text-blue-500" /> Log Outcome
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {outcomes.map(o => (
                  <button 
                    key={o.id}
                    onClick={() => handleLogCall(o.id)}
                    className="flex flex-col items-center justify-center p-4 bg-gray-50 border rounded-2xl hover:bg-white hover:border-blue-400 hover:shadow-md transition group text-sm font-bold gap-2"
                  >
                    <div className="transform group-hover:scale-110 transition-transform">{o.icon}</div>
                    <span className="text-gray-900">{o.id}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-4 pt-4">
                <div className="space-y-1">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Internal Remark</span>
                   <textarea 
                    className="w-full h-24 bg-gray-50 border rounded-2xl p-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    placeholder="Write details of the conversation..."
                    value={remark}
                    onChange={e => setRemark(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Next Callback (Optional)</span>
                   <input 
                    type="date" 
                    className="w-full bg-gray-50 border rounded-2xl px-4 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                    value={callbackDate}
                    onChange={e => setCallbackDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[40px] border-2 border-dashed border-gray-200 opacity-60">
          <div className="w-20 h-20 bg-gray-50 flex items-center justify-center rounded-3xl text-gray-300 mb-6">
            <PhoneCall size={40} />
          </div>
          <h3 className="text-2xl font-bold text-gray-400">Queue is empty</h3>
          <p className="text-gray-300 text-sm mt-2">Ready for your next call? Click the button above.</p>
        </div>
      )}
    </div>
  );
}
