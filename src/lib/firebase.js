import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCpXOb30BcT0e7xfbCUZjjL5QRK5_z6aXU",
  authDomain: "tgf-call-center.firebaseapp.com",
  projectId: "tgf-call-center",
  storageBucket: "tgf-call-center.firebasestorage.app",
  messagingSenderId: "518667884711",
  appId: "1:518667884711:web:83670c2ca60fbcc7642382",
  measurementId: "G-XHZR4T0C0T"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
