import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth, getAuth,
  getReactNativePersistence, browserSessionPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyB1iCebv3kPUrLz0M5mUgc1DK5qLQ_wFiw",
  authDomain: "chat-app-react-native-e325a.firebaseapp.com",
  projectId: "chat-app-react-native-e325a",
  storageBucket: "chat-app-react-native-e325a.appspot.com",
  messagingSenderId: "171710213407",
  appId: "1:171710213407:web:3ddae86dc8f1cb4892942a"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth;
if (getApps().length === 1) {
  auth = initializeAuth(app, {
    persistence: Platform.OS === 'web'
      ? browserSessionPersistence
      : getReactNativePersistence(AsyncStorage),
  });
} else {
  auth = getAuth(app);
}

const database = getFirestore(app);
const storage = getStorage(app);

export { auth, database, storage };