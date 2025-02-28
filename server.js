import path from "path";
import express from "express";
import { fileURLToPath } from "url";
import db from "./firebase.js";
import { FieldValue } from "firebase-admin/firestore";
import rateLimit from "express-rate-limit";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8383;

app.set("trust proxy", 1);
app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://friends-react.onrender.com",
      "https://reinisvaravs.com",
    ],
    methods: "GET,POST,PATCH,DELETE",
    allowedHeaders: "Content-Type,Authorization",
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
  headers: true,
});

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { success: false, error: "Too many attempts, slow down!" },
});

const likeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: { success: false, error: "Too many likes, slow down!" },
});

// Middleware to catch JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid JSON format" });
  }
  next();
});

app.get("/friends", async (req, res) => {
  try {
    const peopleRef = db.collection("people").doc("associates");
    const doc = await peopleRef.get();

    if (!doc.exists || Object.keys(doc.data()).length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "No friends found" });
    }

    res.status(200).json({
      success: true,
      message: "Friends retrieved successfully",
      data: doc.data(),
    });
  } catch (error) {
    console.error("Error retrieving friends:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.post("/addfriend", strictLimiter, async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request: No data received" });
    }

    const { name, value, likeCount = 0 } = req.body;

    if (!name || value === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "Both name and value are required" });
    }

    const peopleRef = db.collection("people").doc("associates");
    const doc = await peopleRef.get();

    if (!doc.exists) {
      await peopleRef.set({});
    }

    const data = doc.data();
    if (data && data.hasOwnProperty(name)) {
      return res
        .status(400)
        .json({ success: false, error: `The name "${name}" already exists` });
    }

    await peopleRef.update({
      [name]: { value, likeCount },
    });

    const updatedDoc = await peopleRef.get();
    res.status(201).json({
      success: true,
      message: `Added "${name}" with value "${value}" and likeCount "${likeCount}"`,
      data: updatedDoc.data(),
    });
  } catch (error) {
    console.error("Error adding friend:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

app.patch("/changevalue", likeLimiter, async (req, res) => {
  try {
    const { name, newValue, newLikeCount } = req.body;

    if (!name || (newValue === undefined && newLikeCount === undefined)) {
      return res.status(400).json({
        success: false,
        error:
          "Name and at least one field ('newValue' or 'newLikeCount') are required",
      });
    }

    const peopleRef = db.collection("people").doc("associates");
    const doc = await peopleRef.get();

    if (!doc.exists || !doc.data()[name]) {
      return res
        .status(404)
        .json({ success: false, error: `Person "${name}" not found` });
    }

    const currentData = doc.data()[name];

    const updatedData = {
      value: newValue !== undefined ? newValue : currentData.value,
      likeCount:
        newLikeCount !== undefined ? newLikeCount : currentData.likeCount,
    };

    await peopleRef.update({ [`${name}`]: updatedData });

    res.status(200).json({
      success: true,
      message: `Updated "${name}" successfully`,
      data: { name, ...updatedData },
    });
  } catch (error) {
    console.error("Error updating value:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.delete("/friends", strictLimiter, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res
        .status(400)
        .json({ success: false, error: "Name is required" });
    }

    const peopleRef = db.collection("people").doc("associates");
    const doc = await peopleRef.get();

    if (!doc.exists || !doc.data()[name]) {
      return res
        .status(404)
        .json({ success: false, error: `Person "${name}" not found` });
    }

    await peopleRef.update({ [`${name}`]: FieldValue.delete() });

    res.status(200).json({
      success: true,
      message: `Person "${name}" successfully deleted`,
    });
  } catch (error) {
    console.error("Error deleting person:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

app.use("/", express.static(path.join(__dirname, "public")));

app.listen(port, () => console.log(`Server is running on port: ${port}`));