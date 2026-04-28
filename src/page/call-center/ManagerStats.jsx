import React, { useState, useEffect } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { getManagerStats } from "../../lib/db";
import { Users, PhoneCall, CheckCircle2, AlertCircle } from "lucide-react";

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function ManagerStats({ programs }) {
    const [selectedProgram, setSelectedProgram] = useState("");
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (selectedProgram) {
            fetchStats();
        }
    }, [selectedProgram]);

    const fetchStats = async () => {
        setIsLoading(true);
        try {
            const result = await getManagerStats(selectedProgram);
            setStats(result);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const pieData = stats ? Object.entries(stats.outcomes).map(([name, value]) => ({ name, value })) : [];
    const barData = stats ? Object.entries(stats.byAttender).map(([name, value]) => ({ name, value })) : [];

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Performance Analytics 📊</h2>
                    <p className="text-gray-500 mt-1">Real-time breakdown of call outcomes and attender activity.</p>
                </div>
                <select 
                    value={selectedProgram}
                    onChange={e => setSelectedProgram(e.target.value)}
                    className="px-6 py-3 bg-white border-2 border-gray-100 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="">-- Select Program --</option>
                    {programs.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {!selectedProgram ? (
                <div className="h-[400px] flex flex-col items-center justify-center bg-white rounded-3xl border-2 border-dashed border-gray-100 opacity-60">
                    <BarChart className="text-gray-200" size={60} />
                    <p className="text-gray-400 font-bold mt-4">Select a program to view analytics</p>
                </div>
            ) : isLoading ? (
                <div className="h-[400px] flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div></div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={<PhoneCall className="text-blue-500" />} label="Total Calls" value={stats?.total || 0} color="blue" />
                    <StatCard icon={<CheckCircle2 className="text-green-500" />} label="Interested" value={stats?.outcomes?.Interested || 0} color="green" />
                    <StatCard icon={<Users className="text-purple-500" />} label="Attenders" value={Object.keys(stats?.byAttender || {}).length} color="purple" />
                    <StatCard icon={<AlertCircle className="text-amber-500" />} label="Callbacks" value={stats?.outcomes?.Callback || 0} color="amber" />

                    <div className="md:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Outcome Breakdown</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
                        <h3 className="text-lg font-bold text-gray-900">Calls by Attender</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, label, value, color }) {
    return (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 group hover:-translate-y-1 transition duration-300">
            <div className={`w-12 h-12 bg-${color}-50 rounded-2xl flex items-center justify-center group-hover:bg-${color}-500 group-hover:text-white transition-colors duration-300`}>{icon}</div>
            <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                <p className="text-2xl font-black text-gray-900">{value}</p>
            </div>
        </div>
    );
}
