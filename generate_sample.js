const XLSX = require('xlsx');

const data = [
    { Name: "John Doe", Email: "john@example.com", Phone: "555-0100", Counselor: "Alice", Status: "Hot", Value: "$5000", "Follow-up Date": "2024-05-10" },
    { Name: "Jane Smith", Email: "jane@example.com", Phone: "555-0101", Counselor: "Bob", Status: "Warm", Value: "$3500", "Follow-up Date": "2024-06-15" },
    { Name: "Michael Johnson", Email: "michael@example.com", Phone: "555-0102", Counselor: "Alice", Status: "Cold", Value: "$1200", "Follow-up Date": "2024-07-20" },
    { Name: "Emily Brown", Email: "emily@example.com", Phone: "555-0103", Counselor: "Charlie", Status: "Hot", Value: "$8000", "Follow-up Date": new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] }, // Overdue
    { Name: "William Taylor", Email: "william@example.com", Phone: "555-0104", Counselor: "Bob", Status: "Cold", Value: "$900", "Follow-up Date": "2024-08-05" },
    { Name: "Olivia Anderson", Email: "olivia@example.com", Phone: "555-0105", Counselor: "Alice", Status: "Warm", Value: "$4200", "Follow-up Date": new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0] }, // Overdue
    { Name: "James Thomas", Email: "james@example.com", Phone: "555-0106", Counselor: "Charlie", Status: "Hot", Value: "$6500", "Follow-up Date": new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0] },
    { Name: "Sophia Jackson", Email: "sophia@example.com", Phone: "555-0107", Counselor: "Alice", Status: "Warm", Value: "$2800", "Follow-up Date": new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0] },
    { Name: "Benjamin White", Email: "benjamin@example.com", Phone: "555-0108", Counselor: "Bob", Status: "Cold", Value: "$1500", "Follow-up Date": "2024-09-12" },
    { Name: "Mia Harris", Email: "mia@example.com", Phone: "555-0109", Counselor: "Charlie", Status: "Hot", Value: "$7200", "Follow-up Date": new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0] }, // Overdue
];

for (let i = 0; i < 40; i++) {
    data.push({
        Name: `Lead ${i + 1}`,
        Email: `lead${i + 1}@example.com`,
        Phone: `555-02${i.toString().padStart(2, '0')}`,
        Counselor: ["Alice", "Bob", "Charlie"][Math.floor(Math.random() * 3)],
        Status: ["Hot", "Warm", "Cold"][Math.floor(Math.random() * 3)],
        Value: `$${Math.floor(Math.random() * 9000) + 1000}`,
        "Follow-up Date": new Date(Date.now() + (Math.floor(Math.random() * 60) - 15) * 86400000).toISOString().split('T')[0]
    });
}

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

XLSX.writeFile(workbook, "sample_leads.xlsx");
console.log("sample_leads.xlsx created successfully!");
