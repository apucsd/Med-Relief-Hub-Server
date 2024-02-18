const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("med-relief-hub");
    const userCollection = db.collection("users");
    const supplyCollection = db.collection("supplies");

    // User Registration

    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await userCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await userCollection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    // ==============================================================
    // WRITE YOUR CODE HERE

    app.post("/api/v1/supplies", async (req, res) => {
      const supply = req.body;

      // Insert user into the database
      const result = await supplyCollection.insertOne(supply);

      res.status(201).json({
        success: true,
        message: "Supply added successfully",
        result,
      });
    });
    app.get("/api/v1/supplies", async (req, res) => {
      // find into the database
      const result = await supplyCollection.find().toArray();

      res.status(201).json({
        success: true,
        message: "Supply Post fetched successfully",
        result,
      });
    });
    app.delete("/api/v1/supplies/:id", async (req, res) => {
      // find into the database
      const id = req.params.id;
      console.log(id);
      const result = await supplyCollection.findOneAndDelete({
        _id: new ObjectId(id),
      });

      res.status(201).json({
        success: true,
        message: "Supply deleted successfully",
        result,
      });
    });
    app.patch("/api/v1/supplies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const dataToUpdate = req.body;
        const updateObject = {};

        for (const key in dataToUpdate) {
          if (dataToUpdate[key] !== undefined) {
            updateObject[key] = dataToUpdate[key];
          }
        }

        const result = await supplyCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: updateObject },
          { returnOriginal: false, new: true }
        );

        res.status(201).json({
          success: true,
          message: "Supply updated successfully",
          result,
        });
      } catch (error) {
        console.error("Error updating supply:", error);
        res
          .status(500)
          .json({ success: false, message: "Failed to update supply" });
      }
    });
    app.get("/api/v1/supplies/statistics", async (req, res) => {
      const pipeline = [
        {
          $group: {
            _id: "$category",
            totalDonation: { $sum: "$amount" },
            totalItem: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            totalDonationSum: { $sum: "$totalDonation" },
            statistics: { $push: "$$ROOT" },
          },
        },
      ];

      const result = await supplyCollection.aggregate(pipeline).toArray();
      const statisticsInfo = {
        totalDonationSum: result[0].totalDonationSum,
        statistics: result[0].statistics,
      };

      res.json(statisticsInfo);
    });

    // ==============================================================

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
