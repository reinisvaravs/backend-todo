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

app.use(express.json());


app.use(cors({
  origin: ['http://localhost:3000', 'https://reinisvaravs.com'], // Replace with your frontend's actual domain
  methods: 'GET,POST,PATCH,DELETE',
  allowedHeaders: 'Content-Type,Authorization'
}));


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    error: "too many requests, please try again later.",
  },
  headers: true,
});

app.use(limiter);

const strictLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { success: false, error: "Too many attempts, slow down!" },
});

app.post("/addfriend", strictLimiter);
app.patch("/changevalue", strictLimiter);
app.delete("/friends", strictLimiter);

//  Middleware to catch JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid JSON format" });
  }
  next();
});

//  Serve the index page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

//  GET /friends: Retrieve all friends (No strict limit, just global limit)
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

//  POST /addfriend: Add a new friend
app.post("/addfriend", async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid request: No data received" });
    }

    const newFriend = req.body;
    const name = Object.keys(newFriend)[0];
    const value = newFriend[name];

    if (!name || !value) {
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

    await peopleRef.update({ [name]: value });

    const updatedDoc = await peopleRef.get();
    res.status(201).json({
      success: true,
      message: `Added "${name}" with value "${value}"`,
      data: updatedDoc.data(),
    });
  } catch (error) {
    console.error("Error adding friend:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

//  PATCH /changevalue: Update a friend's value
app.patch("/changevalue", async (req, res) => {
  const { name, newValue } = req.body;

  if (!name || !newValue) {
    return res.status(400).json({
      success: false,
      error: "Both 'name' and 'newValue' are required",
    });
  }

  try {
    const peopleRef = db.collection("people").doc("associates");
    const doc = await peopleRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, error: "No data found in the database" });
    }

    const data = doc.data();
    if (!data || !(name in data)) {
      return res
        .status(404)
        .json({ success: false, error: `Person "${name}" not found` });
    }

    await peopleRef.update({ [name]: newValue });

    res.status(200).json({
      success: true,
      message: `Updated "${name}" to "${newValue}"`,
      data: { [name]: newValue },
    });
  } catch (error) {
    console.error("Error updating value:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

//  DELETE /friends: Delete a friend
app.delete("/friends", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: "Name is required" });
  }

  try {
    const peopleRef = db.collection("people").doc("associates");
    const doc = await peopleRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "No data found" });
    }

    const data = doc.data();
    if (!data || !(name in data)) {
      return res
        .status(404)
        .json({ success: false, error: `Person "${name}" not found` });
    }

    await peopleRef.update({ [name]: FieldValue.delete() });

    res.status(200).json({
      success: true,
      message: `Person "${name}" successfully deleted`,
    });
  } catch (error) {
    console.error("Error deleting person:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

//  Start server
app.listen(port, () => console.log(`Server is running on port: ${port}`));
