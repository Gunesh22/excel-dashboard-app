import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import { BarChart2 } from "lucide-react";
import { normalizeStr, normalizePhone } from "../utils";

export const DashboardView = ({ data, colsMap }) => {
    const { attendyCol, sourceCol, shivirCol, callTypeCol, cityCol, phoneCol } = colsMap;
    const [sourceChartType, setSourceChartType] = useState('bar');
    const [cityChartType, setCityChartType] = useState('bar');

    const totalLeads = data.length;
    const uniquePhones = new Set(data.filter(r => r[phoneCol]).map(r => normalizePhone(r[phoneCol]))).size;
    const totalSources = new Set(data.filter(r => r[sourceCol]).map(r => normalizeStr(r[sourceCol]))).size;
    const totalShivirs = new Set(data.filter(r => r[shivirCol]).map(r => normalizeStr(r[shivirCol]))).size;

    const buildCounts = (colName, maxItems = 8) => {
        const counts = {};
        const displayLabel = {}; // store original casing for display
        data.forEach(r => {
            const raw = String(r[colName] || "Unknown").replace(/[\s\u00A0\u200B\t]+/g, " ").trim();
            const key = raw.toLowerCase();
            if (!displayLabel[key]) displayLabel[key] = raw; // keep first seen casing
            counts[key] = (counts[key] || 0) + 1;
        });
        const sorted = Object.entries(counts)
            .map(([k, v]) => [displayLabel[k], v])
            .sort((a, b) => b[1] - a[1]);
        if (sorted.length > maxItems) {
            const top = sorted.slice(0, maxItems - 1);
            const others = sorted.slice(maxItems - 1).reduce((acc, curr) => acc + curr[1], 0);
            top.push(["Other", others]);
            return top;
        }
        return sorted;
    };


    const callTypeData = buildCounts(callTypeCol);
    const sourceData = buildCounts(sourceCol);
    const shivirData = buildCounts(shivirCol);
    const cityData = buildCounts(cityCol);

    const barOptions = (title) => ({
        chart: { type: "bar", toolbar: { show: false }, background: "transparent" },
        plotOptions: { bar: { borderRadius: 4, horizontal: false } },
        xaxis: { labels: { style: { fontSize: "11px" }, rotate: -45 } },
        colors: ["#2563eb"],
        title: { text: title, style: { fontSize: "14px", fontWeight: "600", color: "#0f172a" }, margin: 20 },
        dataLabels: { enabled: false }
    });

    const pieColors = [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
        "#14b8a6", "#6366f1"
    ];

    const pieOptions = (title) => ({
        chart: { type: "donut", background: "transparent" },
        colors: pieColors,
        title: { text: title, style: { fontSize: "14px", fontWeight: "600", color: "#0f172a" }, margin: 20 },
        legend: { position: "right", fontSize: "11px", offsetY: 20 },
        dataLabels: {
            enabled: true,
            formatter: (val) => val > 3 ? val.toFixed(1) + "%" : "",
            style: { fontSize: '11px', fontWeight: 'bold' },
            dropShadow: { enabled: true, top: 1, left: 1, blur: 1, opacity: 0.5 }
        },
        tooltip: { y: { formatter: (val) => val + " Leads" } },
        stroke: { width: 2, colors: ['#ffffff'] }
    });

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-1 mb-1">
                <h1 className="text-xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-xs text-gray-500">Real-time performance metrics for all campaign types.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between items-start">
                    <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-1">Total Leads</p>
                    <div className="flex items-end justify-between w-full">
                        <p className="text-2xl font-bold text-gray-900">{totalLeads.toLocaleString()}</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between items-start">
                    <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-1">Unique Numbers</p>
                    <div className="flex items-end justify-between w-full">
                        <p className="text-2xl font-bold text-gray-900">{uniquePhones.toLocaleString()}</p>
                        <span className="text-gray-500 text-[11px]">{((uniquePhones / totalLeads) * 100 || 0).toFixed(1)}% unique</span>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between items-start">
                    <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase mb-1">Total Sources</p>
                    <div className="flex items-end justify-between w-full">
                        <p className="text-2xl font-bold text-gray-900">{totalSources}</p>
                        <span className="text-gray-500 text-[11px] truncate max-w-[120px]">Top: {sourceData.length > 0 ? sourceData[0][0] : "N/A"}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">Call Type Distribution</h3>
                    <div className="w-full">
                        <ReactApexChart type="donut" height={300} series={callTypeData.map(d => d[1])} options={{ ...pieOptions(""), labels: callTypeData.map(d => d[0]) }} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">Leads by Source</h3>
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            <button onClick={() => setSourceChartType('bar')} className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${sourceChartType === 'bar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Bar</button>
                            <button onClick={() => setSourceChartType('donut')} className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${sourceChartType === 'donut' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Pie</button>
                        </div>
                    </div>
                    <div className="w-full">
                        {sourceChartType === 'bar' ? (
                            <ReactApexChart key="source-bar" type="bar" height={300} series={[{ name: "Leads", data: sourceData.map(d => d[1]) }]} options={{ ...barOptions(""), plotOptions: { bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } } }, xaxis: { categories: sourceData.map(d => d[0]) } }} />
                        ) : (
                            <ReactApexChart key="source-donut" type="donut" height={300} series={sourceData.map(d => d[1])} options={{ ...pieOptions(""), labels: sourceData.map(d => d[0]) }} />
                        )}
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm">Leads by City / Cohort</h3>
                        <div className="flex bg-gray-100 rounded-lg p-0.5">
                            <button onClick={() => setCityChartType('bar')} className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${cityChartType === 'bar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Bar</button>
                            <button onClick={() => setCityChartType('donut')} className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors ${cityChartType === 'donut' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Pie</button>
                        </div>
                    </div>
                    <div className="w-full">
                        {cityChartType === 'bar' ? (
                            <ReactApexChart key="city-bar" type="bar" height={300} series={[{ name: "Leads", data: cityData.map(d => d[1]) }]} options={{ ...barOptions(""), xaxis: { categories: cityData.map(d => d[0]) } }} />
                        ) : (
                            <ReactApexChart key="city-donut" type="donut" height={300} series={cityData.map(d => d[1])} options={{ ...pieOptions(""), labels: cityData.map(d => d[0]) }} />
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};
