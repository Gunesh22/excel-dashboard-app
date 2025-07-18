import React, { useState } from "react";
import "./dashboard.css";
import * as XLSX from "xlsx";
import ReactApexChart from "react-apexcharts";

const Dashboard = () => {
  const [chartData, setChartData] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "binary" });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const json = XLSX.utils.sheet_to_json(sheet);

      //  JSON format be like: [{ Month: "Jan", Sales: 100 }, { Month: "Feb", Sales: 120 }]
      const categories = json.map((row) => row.Month);
      const values = json.map((row) => row.Sale);

      setChartData({
        series: [
          {
            name: "Sales",
            data: values,
          },
        ],
        options: {
          chart: {
            type: "line",
            height: 350,
            toolbar: {
              show: true,
              tools: {
                download: true,
              },
              export: {
                png: {
                  filename: "chart",
                },
              },
            },
          },

          xaxis: {
            categories: categories,
          },
          title: {
            text: "Sales by Month",
            align: "center",
          },
          tooltip: {
            theme: "light",
            cssClass: "custom-tooltip",
          },
        },
      });
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div>
      <div className="upload">
        <h2>Upload Excel to Show Line Chart Data</h2>
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileUpload}
          className="input"
        />
        {chartData && (
          <ReactApexChart
            className="chart"
            options={chartData.options}
            series={chartData.series}
            type="line"
            height={350}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
