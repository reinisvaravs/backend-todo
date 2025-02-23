import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";

const serviceAccount = JSON.parse(fs.readFileSync(new URL("./creds.json", import.meta.url), "utf-8"));

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

export default db;
