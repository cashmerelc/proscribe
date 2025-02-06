import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("firebase-admin.json", "utf8")
);

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

export const storage = getStorage(app);
export const bucket = storage.bucket();
