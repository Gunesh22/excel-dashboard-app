// ==================== HELPER FUNCTIONS ====================
export const isNumeric = (val) => {
    if (val === null || val === undefined || val === "") return false;
    const cleaned = String(val).replace(/[$,₹€£%]/g, "").trim();
    return !isNaN(Number(cleaned)) && cleaned !== "";
};

export const getColName = (cols, keywords) => {
    return cols.find((c) =>
        keywords.some((k) => c.toLowerCase().includes(k))
    );
};

export const hasMultipleNumbers = (val) => {
    if (!val) return false;
    const s = String(val);
    return s.includes(',') || s.includes('/') || s.includes('&') || s.split(/\s+/).length > 2;
};

// Normalize any string: lowercase, collapse all whitespace/invisible chars
export const normalizeStr = (val) =>
    String(val || "").replace(/[\s\u00A0\u200B\t]+/g, " ").trim().toLowerCase();

// Normalize phone: strip spaces, dashes, dots, brackets, plus
export const normalizePhone = (val) =>
    String(val || "").replace(/[\s\-\.\(\)\+]/g, "").trim();

// Split a phone cell that may contain multiple numbers (e.g. "5794859/759589")
// Returns array of individual normalized phone numbers
export const extractPhones = (val) =>
    String(val || "")
        .split(/[\/,&]+/)
        .map(p => normalizePhone(p))
        .filter(p => p.length > 3);
