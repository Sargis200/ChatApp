import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB1iCebv3kPUrLz0M5mUgc1DK5qLQ_wFiw",
  authDomain: "chat-app-react-native-e325a.firebaseapp.com",
  projectId: "chat-app-react-native-e325a",
  storageBucket: "chat-app-react-native-e325a.firebasestorage.app",
  messagingSenderId: "171710213407",
  appId: "1:171710213407:web:3ddae86dc8f1cb4892942a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth-ը կապում ենք AsyncStorage-ի հետ, որ հեռախոսը հիշի մուտք գործած օգտատիրոջը
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore (Database)
const database = getFirestore(app);

export { auth, database };