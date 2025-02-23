import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.FIREBASE_CONFIG_JSON) {
  throw new Error("FIREBASE_CONFIG_JSON is not set in the .env file.");
}

// Parse and fix newlines in the private key
const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

export default db;
