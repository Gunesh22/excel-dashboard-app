import {
  collection, addDoc, getDocs, getDoc, doc, setDoc,
  updateDoc, deleteDoc, query, where,
  serverTimestamp, writeBatch, onSnapshot,
  limit, Timestamp, runTransaction
} from "firebase/firestore";
import { db } from "./firebase";

// ─────────────────────────────────────────────
// PROGRAMS (Folders)
// ─────────────────────────────────────────────
export const getPrograms = async () => {
  const snap = await getDocs(collection(db, "programs"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
};

export const createProgram = async (name) => {
  const ref = await addDoc(collection(db, "programs"), {
    name,
    createdAt: serverTimestamp(),
    contactCount: 0,
  });
  return ref.id;
};

export const deleteProgram = async (id) => {
  await deleteDoc(doc(db, "programs", id));
};

// ─────────────────────────────────────────────
// CONTACTS (MASTER POOL - CHUNKED FOR FREE TIER)
// ─────────────────────────────────────────────
export const importContacts = async (programId, programName, rows) => {
  // Free tier massively limits writes (20k/day).
  // We chunk 500 contacts into a SINGLE document. 
  // An Excel sheet of 20,000 rows only uses 40 database writes!
  const chunkSize = 500;
  const MAX_BATCH_OPS = 499; // L5 fix: Firebase limit is 500 ops per batch, reserve 1 for parent doc
  let imported = 0;
  const queueIndexOffset = Date.now();

  // Build all chunk operations first
  const chunkOps = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunkRows = rows.slice(i, i + chunkSize);
    const formattedContacts = chunkRows.map((r, idx) => ({
      ...r,
      _contactRefId: `C_${queueIndexOffset}_${i + idx}`, // Unique virtual ID
    }));
    chunkOps.push({ chunkIndex: queueIndexOffset + i, contacts: formattedContacts, count: chunkRows.length });
  }

  // Split into multiple batches to respect Firebase's 500 ops/batch limit
  for (let batchStart = 0; batchStart < chunkOps.length; batchStart += MAX_BATCH_OPS) {
    const batch = writeBatch(db);
    const batchSlice = chunkOps.slice(batchStart, batchStart + MAX_BATCH_OPS);

    batchSlice.forEach(op => {
      const ref = doc(collection(db, "programQueues", programId, "chunks"));
      batch.set(ref, { chunkIndex: op.chunkIndex, contacts: op.contacts });
      imported += op.count;
    });

    // Ensure the parent document exists so the subcollection is visible in the Firebase Console
    batch.set(doc(db, "programQueues", programId), {
      programName,
      lastImportedAt: serverTimestamp(),
    }, { merge: true });

    await batch.commit();
  }

  // Update total program stat
  const progRef = doc(db, "programs", programId);
  const progSnap = await getDoc(progRef);
  if (progSnap.exists()) {
    await updateDoc(progRef, { contactCount: (progSnap.data().contactCount || 0) + imported });
  }

  return imported;
};

export const getProgramContactStats = async (programId) => {
  // Free tier compatible chunk-based stats calculations.
  // We query callLogs to calculate status distribution.
  const progSnap = await getDoc(doc(db, "programs", programId));
  let total = 0;
  if (progSnap.exists()) {
    total = progSnap.data().contactCount || 0;
  }

  const logsSnap = await getDocs(query(collection(db, "callLogs"), where("programId", "==", programId)));
  const stats = { total, available: 0, assigned: 0, done: 0, callback_scheduled: 0 };
  let poolAssignedCount = 0; // B5 fix: Only pool-originated entries reduce "available"

  logsSnap.docs.forEach(d => {
    const data = d.data();
    if (data._deleted) return; // B5 fix: Skip soft-deleted entries
    // Only outgoing (pool-originated) calls reduce the available count — incoming calls are added manually
    const isFromPool = data.callType !== "incoming" && data.callType !== "incoming f";
    if (isFromPool) poolAssignedCount++;
    if (data._callbackDue || data.callbackDate) {
      stats.callback_scheduled++;
    } else if (!data.status) {
      stats.assigned++;
    } else {
      stats.done++;
    }
  });

  stats.available = Math.max(0, total - poolAssignedCount);
  return stats;
};

// Global Duplicate Detection (Now checks ONLY assigned numbers and registrations, instead of the 50k queued chunk pool)
export const checkGlobalDuplicate = async (phone, excludeContactId = null) => {
  if (!phone) return null;
  const cleanPhone = String(phone).trim();
  // L8 fix: Run ALL phone-field queries in parallel for ~5x speed improvement
  const phoneFields = ["Phone", "Cont No", "Number", "Mobile", "phone number"];
  const results = await Promise.allSettled(
    phoneFields.map(field =>
      getDocs(query(collection(db, "callLogs"), where(field, "==", cleanPhone)))
    )
  );
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const matches = result.value.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(d => d.contactId !== excludeContactId && d.id !== excludeContactId);
    if (matches.length > 0) return matches[0];
  }
  return null;
};

// ─────────────────────────────────────────────
// ATTENDERS
// ─────────────────────────────────────────────
export const getAttenders = async () => {
  const snap = await getDocs(collection(db, "attenders"));
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return docs.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
};

export const createAttender = async (name) => {
  const ref = await addDoc(collection(db, "attenders"), {
    name,
    isActive: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateAttender = async (id, data) => {
  await updateDoc(doc(db, "attenders", id), data);
};

export const deleteAttender = async (id) => {
  await deleteDoc(doc(db, "attenders", id));
};

// ─────────────────────────────────────────────
// QUEUE — Assign N contacts to attender
// ─────────────────────────────────────────────
export const assignContactsToAttender = async (programId, programName, attenderId, attenderName, count) => {
  // ⚠️ B1 KNOWN LIMITATION: The assignedPhones set is built before transactions.
  // If two admins assign contacts simultaneously, the same contact could be assigned twice.
  // A proper fix requires a server-side lock or an "isAssigned" field on each contact.
  // 1. Pre-fetch ALL assigned phone numbers across all attenders to detect duplicates
  const allLogsSnap = await getDocs(collection(db, "callLogs"));
  const assignedPhones = new Set();
  allLogsSnap.docs.forEach(d => {
    const data = d.data();
    if (data._deleted) return;
    // Check common phone field names
    const phone = data.Phone || data["Cont No"] || data.phone || data.Number || data.Mobile || data["phone number"] || "";
    const cleaned = String(phone).replace(/[\s\-\.\(\)\+]/g, "").trim();
    if (cleaned.length > 4) assignedPhones.add(cleaned);
  });

  // 2. Fetch chunks from the queue
  const q = query(
    collection(db, "programQueues", programId, "chunks"),
    limit(5)
  );
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const chunks = snap.docs.map(d => ({ id: d.id, ref: d.ref, data: d.data() }));
  chunks.sort((a, b) => (a.data.chunkIndex || 0) - (b.data.chunkIndex || 0));

  let totalAssigned = 0;
  const now = Timestamp.now();
  let remainingNeed = count;

  for (const chunk of chunks) {
    if (remainingNeed <= 0) break;

    await runTransaction(db, async (transaction) => {
      const freshSnap = await transaction.get(chunk.ref);
      if (!freshSnap.exists()) return;

      const freshData = freshSnap.data();
      const pool = freshData.contacts || [];
      if (pool.length === 0) {
        transaction.delete(chunk.ref);
        return;
      }

      // Filter out duplicates from the pool
      const unique = [];
      const skipped = [];
      for (const contact of pool) {
        const phone = contact.Phone || contact["Cont No"] || contact.phone || contact.Number || contact.Mobile || "";
        const cleaned = String(phone).replace(/[\s\-\.\(\)\+]/g, "").trim();
        if (cleaned.length > 4 && assignedPhones.has(cleaned)) {
          skipped.push(contact); // duplicate — skip
        } else {
          unique.push(contact);
        }
      }

      // Take what we need from unique contacts
      const takeCount = Math.min(remainingNeed, unique.length);
      const taken = unique.slice(0, takeCount);
      const leftovers = [...unique.slice(takeCount), ...skipped]; // keep skipped for other programs

      if (leftovers.length === 0) {
        transaction.delete(chunk.ref);
      } else {
        transaction.update(chunk.ref, { contacts: leftovers });
      }

      // Create individual log rows for attender
      taken.forEach(contact => {
        const logRef = doc(collection(db, "callLogs"));
        transaction.set(logRef, {
          contactId: contact._contactRefId || null,
          programId,
          programName,
          attenderId,
          attenderName,
          callType: "outgoing",
          ...Object.fromEntries(
            Object.entries(contact).filter(([k]) => !k.startsWith("_"))
          ),
          status: "",
          remark: "",
          callbackDate: null,
          isCallbackDue: false,
          createdAt: now,
          updatedAt: now,
        });
        // Add to set so subsequent chunks don't re-assign
        const ph = contact.Phone || contact["Cont No"] || contact.phone || "";
        const cl = String(ph).replace(/[\s\-\.\(\)\+]/g, "").trim();
        if (cl.length > 4) assignedPhones.add(cl);
      });

      totalAssigned += takeCount;
      remainingNeed -= takeCount;
    });
  }

  return totalAssigned;
};

// ─────────────────────────────────────────────
// CALL LOGS — Attender's Personal Sheet
// ─────────────────────────────────────────────

// Real-time subscription — queries by attenderId only (month-scoped on client)
export const subscribeToCallLogs = (attenderId, callback) => {
  const q = query(
    collection(db, "callLogs"),
    where("attenderId", "==", attenderId)
  );
  return onSnapshot(q, snap => {
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort: callback due today/overdue first (red), then rest
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = [];
    const rest = [];

    logs.forEach(log => {
      if (log.callbackDate) {
        const cbDate = log.callbackDate.toDate ? log.callbackDate.toDate() : new Date(log.callbackDate);
        cbDate.setHours(0, 0, 0, 0);
        if (cbDate <= today) {
          overdue.push({ ...log, _callbackDue: true });
          return;
        }
      }
      rest.push(log);
    });

    callback([...overdue, ...rest]);
  });
};

export const updateCallLog = async (logId, updates, contactId = null) => {
  const logRef = doc(db, "callLogs", logId);
  // Using setDoc with merge instead of updateDoc bypasses Firebase FieldPath validation, 
  // allowing us to save keys with slashes/dots like "Khoji/ New" from Excel files without crashing.
  await setDoc(logRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });

  // 1. If linked to a master contact, sync Name/Phone/City etc back to the master record
  if (contactId) {
    try {
      const contactRef = doc(db, "contacts", contactId);
      // We only sync specific user-editable fields back to master
      // This prevents program-specific data from polluting the general contact record
      const syncableKeys = ["Name", "Phone", "City", "Source", "Email", "Sourse", "Khoji", "Location", "Number", "Cont No", "Cont_No"];
      const masterUpdate = {};
      Object.keys(updates).forEach(k => {
        if (syncableKeys.some(sk => k.toLowerCase().includes(sk.toLowerCase()))) {
          masterUpdate[k] = updates[k];
        }
      });
      if (Object.keys(masterUpdate).length > 0) {
        await setDoc(contactRef, { ...masterUpdate, updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (e) { console.warn("Sync back to master failed for contactId:", contactId); }
  }

  // 2. If status is "Reg.Done", write to registrations (Abhivyakti Report)
  if (updates.status === "Reg.Done") {
    try {
      const logSnap = await getDoc(logRef);
      const logData = logSnap.exists() ? logSnap.data() : {};

      const payload = {
        ...logData,
        registeredAt: serverTimestamp(),
        conversionSource: logData.Source || logData.Sourse || "Direct",
        convertedBy: logData.attenderName || updates.attenderName || "Unknown",
        programName: logData.programName || updates.programName || "Unknown"
      };

      // Strip out ANY undefined fields because Firebase crashes on exactly 'undefined'
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      // Use setDoc with the logId to gracefully upsert and prevent duplicate entries 
      // if the attender opens and saves the same "Reg.Done" entry multiple times.
      await setDoc(doc(db, "registrations", logId), payload, { merge: true });
    } catch (e) {
      console.error("Registration write failed:", e);
      // NOTE: Errors here are tracked but shouldn't fail the initial save
    }
  }
};

// ────────────────────────────────────────────
// CALL LOGS — Attender's Personal Sheet
// ─────────────────────────────────────────────

// Add a manual incoming call entry — programId/programName are optional (null for general incoming)
export const addIncomingCallLog = async (attenderId, attenderName, data, programId = null, programName = null) => {
  const logData = {
    contactId: null,
    programId,
    programName,
    attenderId,
    attenderName,
    callType: "incoming",
    status: "",
    remark: "",
    callbackDate: null,
    isCallbackDue: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...data,
  };

  const docRef = await addDoc(collection(db, "callLogs"), logData);

  // If status is "Reg.Done", write to registrations (Abhivyakti Report)
  if (logData.status === "Reg.Done") {
    try {
      const payload = {
        ...logData,
        registeredAt: serverTimestamp(),
        conversionSource: logData.Source || logData.Sourse || "Direct",
        convertedBy: logData.attenderName || "Unknown",
        programName: logData.programName || "Unknown"
      };

      // Strip out ANY undefined fields
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      // Upsert using the generated call log id
      await setDoc(doc(db, "registrations", docRef.id), payload, { merge: true });
    } catch (e) {
      console.error("Incoming registration write failed:", e);
    }
  }

  return docRef.id;
};

// ─────────────────────────────────────────────
// REASSIGN — Move unworked contacts back to pool
// ─────────────────────────────────────────────
export const reassignContactsToPool = async (attenderId, programId) => {
  const q = query(
    collection(db, "callLogs"),
    where("attenderId", "==", attenderId),
    where("programId", "==", programId),
    where("status", "==", "")
  );
  const snap = await getDocs(q);

  if (snap.empty) return 0;

  const batch = writeBatch(db);
  const leftoverContacts = [];

  for (const logDoc of snap.docs) {
    const data = logDoc.data();
    batch.delete(doc(db, "callLogs", logDoc.id));

    // Extract raw contact data back to object
    const rawContact = Object.fromEntries(
      Object.entries(data).filter(([k]) =>
        !["contactId", "programId", "programName", "attenderId", "attenderName", "callType", "status", "remark",
          "callbackDate", "isCallbackDue", "isHotLead", "createdAt", "updatedAt", "_callbackDue", "_deleted",
          "lastCalledAt", "firstCalledAt", "history", "callbackStatus", "callCount", "registeredAt",
          "conversionSource", "convertedBy"].includes(k)
      )
    );
    // B6 fix: Regenerate _contactRefId so future duplicate detection works correctly
    rawContact._contactRefId = `C_${Date.now()}_${leftoverContacts.length}`;
    leftoverContacts.push(rawContact);
  }

  // Push the unworked records back into the queue collection as a fresh chunk
  if (leftoverContacts.length > 0) {
    const ref = doc(collection(db, "programQueues", programId, "chunks"));
    batch.set(ref, {
      chunkIndex: Date.now(), // High index puts it at the back of the queue
      contacts: leftoverContacts
    });
  }

  await batch.commit();
  return leftoverContacts.length;
};

// ─────────────────────────────────────────────
// REASSIGN — Move contacts between attenders
// ─────────────────────────────────────────────
export const reassignContactsBetweenAttenders = async (fromAttenderId, toAttenderId, toAttenderName, programId) => {
  const q = query(
    collection(db, "callLogs"),
    where("attenderId", "==", fromAttenderId),
    where("programId", "==", programId),
    where("status", "==", "")
  );
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  snap.docs.forEach(d => {
    batch.update(doc(db, "callLogs", d.id), {
      attenderId: toAttenderId,
      attenderName: toAttenderName,
      updatedAt: serverTimestamp()
    });
  });
  await batch.commit();
  return snap.docs.length;
};

// ─────────────────────────────────────────────
// ADMIN DASHBOARD
// ─────────────────────────────────────────────
export const subscribeToAllCallLogs = (programId, callback) => {
  let q;
  if (programId && programId !== "ALL") {
    q = query(collection(db, "callLogs"), where("programId", "==", programId));
  } else {
    q = query(collection(db, "callLogs"));
  }

  return onSnapshot(q, snap => {
    const logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort client-side to avoid composite index requirement
    logs.sort((a, b) => {
      const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return ta - tb;
    });
    callback(logs);
  }, err => console.error("subscribeToAllCallLogs error:", err));
};

// Get all call logs for any attender (admin view)
export const getAttenderCallLogs = async (attenderId, programId) => {
  const q = query(
    collection(db, "callLogs"),
    where("attenderId", "==", attenderId),
    where("programId", "==", programId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// Get all call logs for an entire program (for Excel export)
export const getProgramCallLogs = async (programId) => {
  const q = query(
    collection(db, "callLogs"),
    where("programId", "==", programId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ─────────────────────────────────────────────
// ABHIVYAKTI REPORT
// ─────────────────────────────────────────────
export const subscribeToRegistrations = (programId, callback) => {
  // Avoid server-side orderBy to prevent composite index errors — sort client-side
  let q;
  if (programId && programId !== "ALL") {
    q = query(collection(db, "registrations"), where("programId", "==", programId));
  } else {
    q = query(collection(db, "registrations"));
  }
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort descending by registeredAt client-side
    docs.sort((a, b) => {
      const ta = a.registeredAt?.toMillis ? a.registeredAt.toMillis() : 0;
      const tb = b.registeredAt?.toMillis ? b.registeredAt.toMillis() : 0;
      return tb - ta;
    });
    callback(docs);
  }, err => console.error("subscribeToRegistrations error:", err));
};

// ─────────────────────────────────────────────
// EXCEL CLOUD PERSISTENCE
// ─────────────────────────────────────────────


export const saveExcelToCloud = async ({ data, columns, colsMap, fileName, activeSheet }) => {
  const dataStr = JSON.stringify(data);
  const columnsStr = JSON.stringify(columns);
  const colsMapStr = JSON.stringify(colsMap);

  // L6 fix: Firestore has a 1MB document limit — pre-check payload size
  const estimatedSize = new Blob([dataStr, columnsStr, colsMapStr]).size;
  if (estimatedSize > 900000) { // 900KB safety margin
    throw new Error(`Excel data too large for cloud storage (${Math.round(estimatedSize / 1024)}KB). Maximum is ~900KB. Try splitting into smaller sheets.`);
  }

  const docRef = doc(db, "excelSheets", "current");
  await setDoc(docRef, {
    data: dataStr,
    columns: columnsStr,
    colsMap: colsMapStr,
    fileName: fileName || "",
    activeSheet: activeSheet || "",
    updatedAt: serverTimestamp()
  });
};

export const loadExcelFromCloud = async () => {
  const docRef = doc(db, "excelSheets", "current");
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    data: JSON.parse(d.data),
    columns: JSON.parse(d.columns),
    colsMap: JSON.parse(d.colsMap),
    fileName: d.fileName || "",
    activeSheet: d.activeSheet || ""
  };
};

export const deleteExcelFromCloud = async () => {
  const docRef = doc(db, "excelSheets", "current");
  await deleteDoc(docRef);
};
