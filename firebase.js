import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const credsFilePath = "./creds.json";

// Write the environment variable value to a JSON file
fs.writeFileSync(credsFilePath, process.env.FIREBASE_CONFIG_JSON);

const serviceAccount = JSON.parse(fs.readFileSync(credsFilePath, "utf8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

export default db;
