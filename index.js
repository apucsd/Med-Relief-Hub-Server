const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const SSLCommerzPayment = require("sslcommerz-lts");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

//ssl commerz configuration
const store_id = process.env.SSLCOMMERZ_STORE_ID;
const store_passwd = process.env.SSLCOMMERZ_STORE_API_PASSWORD;
const is_live = false; //true for live, false for sandbox

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
    const commentCollection = db.collection("comments");
    const testimonialCollection = db.collection("testimonials");
    const volunteerCollection = db.collection("volunteers");
    const donationCollection = db.collection("donations");

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
    app.patch("/api/v1/update-user/:email", async (req, res) => {
      const { email } = req.params;
      const updatedBody = req.body;

      try {
        // Update the user with the new data
        const updatedUser = await userCollection.findOneAndUpdate(
          { email },
          { $set: updatedBody },
          { returnOriginal: false } // Return the modified document
        );

        if (updatedBody.image) {
          await commentCollection.findOneAndUpdate(
            { email },
            { $set: updatedBody },
            { returnOriginal: false } // Return the modified document
          );
        }

        res.status(200).json({
          success: true,
          message: "User updated successfully",
          data: updatedUser?.value, // Send the updated user data in the response
        });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
          success: false,
          message: "Internal Server Error",
        });
      }
    });
    app.get("/api/v1/update-user/:email", async (req, res) => {
      const { email } = req.params;

      try {
        // Update the user with the new data
        const result = await userCollection.findOne(
          { email },
          { projection: { password: 0 } }
        );

        res.status(200).json({
          success: true,
          message: "User fetched successfully",
          data: result, // Send the updated user data in the response
        });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({
          success: false,
          message: "Internal Server Error",
        });
      }
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
    app.get("/api/v1/supplies/:id", async (req, res) => {
      // find into the database
      const id = req.params.id;

      const result = await supplyCollection.findOne({
        _id: new ObjectId(id),
      });

      res.status(201).json({
        success: true,
        message: "Supply fetched successfully",
        result,
      });
    });
    app.delete("/api/v1/supplies/:id", async (req, res) => {
      // find into the database
      const id = req.params.id;

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

    //   try {
    //     const pipeline = [
    //       {
    //         $group: {
    //           _id: "$category",
    //           totalDonation: { $sum: "$amount" },
    //           totalItem: { $sum: 1 },
    //         },
    //       },
    //       {
    //         $group: {
    //           _id: null,
    //           totalDonationSum: { $sum: "$totalDonation" },
    //           statistics: { $push: "$$ROOT" },
    //         },
    //       },
    //     ];

    //     const result = await supplyCollection.aggregate(pipeline).toArray();
    //     const statisticsInfo = {
    //       totalDonationSum: result[0].totalDonationSum,
    //       statistics: result[0].statistics,
    //     };
    //     res.json(statisticsInfo);
    //   } catch (error) {
    //     console.log(error);
    //   }
    // });
    app.get("/api/v1/statistics", async (req, res) => {
      try {
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
          totalDonationSum: result[0]?.totalDonationSum,
          statistics: result[0]?.statistics,
        };
        res.json(statisticsInfo);
      } catch (error) {
        console.log(error);
      }
    });
    //comments section
    app.post("/api/v1/comments", async (req, res) => {
      const { comments, email } = req.body;
      const userData = await userCollection.findOne({ email });
      const currentDateTime = new Date().toLocaleString();
      const newComments = {
        email,
        commenterName: userData.name,
        comments,
        commenterImage: userData?.image,
        timestamp: currentDateTime,
      };
      // Insert comments into the database
      const result = await commentCollection.insertOne(newComments);

      res.status(201).json({
        success: true,
        message: "comments added successfully",
        result,
      });
    });

    //get comments
    app.get("/api/v1/comments", async (req, res) => {
      // find into the database
      const result = await commentCollection.find().toArray();

      res.status(201).json({
        success: true,
        message: "Comments fetched successfully",
        result,
      });
    });

    //testimonial routes
    app.post("/api/v1/testimonial", async (req, res) => {
      const testimonial = req.body;

      // Insert user into the database
      const result = await testimonialCollection.insertOne(testimonial);

      res.status(201).json({
        success: true,
        message: "testimonial added successfully",
        result,
      });
    });
    app.get("/api/v1/testimonial", async (req, res) => {
      // find into the database
      const result = await testimonialCollection.find().toArray();

      res.status(201).json({
        success: true,
        message: "testimonial fetched successfully",
        result,
      });
    });
    // ==============================================================
    //volunteer routes
    app.post("/api/v1/volunteer", async (req, res) => {
      const volunteer = req.body;

      // Insert user into the database
      const result = await volunteerCollection.insertOne(volunteer);

      res.status(201).json({
        success: true,
        message: "volunteer added successfully",
        result,
      });
    });

    app.get("/api/v1/volunteer", async (req, res) => {
      // find into the database
      const result = await volunteerCollection.find().toArray();

      res.status(201).json({
        success: true,
        message: "volunteer fetched successfully",
        result,
      });
    });

    // donation routes
    app.post("/api/v1/donation", async (req, res) => {
      const { email, amount, supplyId } = req.body;

      // Insert user into the database
      const userInfo = await userCollection.findOne({ email });
      const supplyInfo = await supplyCollection.findOne({
        _id: new ObjectId(supplyId),
      });
      // console.log(res);
      const transactionId = Math.random()
        .toString(36)
        .substring(2, 11)
        .toUpperCase();
      const data = {
        total_amount: amount,
        currency: "BDT",
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `https://medi-relief-hub.vercel.app/payment/success/${transactionId}`,
        fail_url: `https://medi-relief-hub.vercel.app/payment/fail/${transactionId}`,
        cancel_url: `https://medi-relief-hub.vercel.app/payment/fail/${transactionId}`,
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: "customer@example.com",
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then(async (apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });

        const donationDetails = {
          user: userInfo,
          supply: supplyInfo,
          transactionId,
          paidStatus: false,
        };
        const result = await donationCollection.insertOne(donationDetails);

        app.post("/payment/success/:transactionId", async (req, res) => {
          const transactionId = req.params.transactionId;
          const result = await donationCollection.updateOne(
            { transactionId },
            {
              $set: {
                paidStatus: true,
              },
            }
          );
          if (result?.modifiedCount > 0) {
            res.redirect(
              `https://med-relief-hub.vercel.app/donate/success/${transactionId}`
            );
          }
        });
        app.post("/payment/fail/:transactionId", async (req, res) => {
          const transactionId = req.params.transactionId;
          const result = await donationCollection.deleteOne({ transactionId });
          if (result?.deletedCount > 0) {
            res.redirect(
              `https://med-relief-hub.vercel.app/donate/fail/${transactionId}`
            );
          }
        });
      });
    });

    app.get("/api/v1/donation/:transactionId", async (req, res) => {
      const transactionId = req.params.transactionId;
      console.log(transactionId);
      const result = await donationCollection.findOne({ transactionId });
      res.status(200).json({
        success: true,
        message: "Single donation fetched successfully",
        result,
      });
    });
    // Start the servers
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
