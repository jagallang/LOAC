// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyCS9OXFthkn-3UkJNPsWGitsOvXIPalo8s",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "loac-9ec81.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "loac-9ec81",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "loac-9ec81.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "776850127990",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:776850127990:web:000c6ca1ac71b8faa2b357",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-67YDSS8Y03"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };