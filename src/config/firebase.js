import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth, getAuth,
  getReactNativePersistence, browserSessionPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Քո Firebase Config-ը
const firebaseConfig = {
  apiKey: "AIzaSyB1iCebv3kPUrLz0M5mUgc1DK5qLQ_wFiw",
  authDomain: "chat-app-react-native-e325a.firebaseapp.com",
  projectId: "chat-app-react-native-e325a",
  storageBucket: "chat-app-react-native-e325a.appspot.com",
  messagingSenderId: "171710213407",
  appId: "1:171710213407:web:3ddae86dc8f1cb4892942a"
};

// 1. Ապահով initialize ենք անում App-ը
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Ապահով initialize ենք անում Auth-ը (Առանց length === 1 սխալ ստուգման)
let auth;
try {
  auth = getAuth(app);
} catch (error) {
  auth = initializeAuth(app, {
    persistence: Platform.OS === 'web'
      ? browserSessionPersistence
      : getReactNativePersistence(AsyncStorage),
  });
}

// 3. Ստեղծում ենք Database ու Storage հղումները
const database = getFirestore(app);
const storage = getStorage(app);

export { auth, database, storage };