// create a simple express server
const express = require("express");
const env = require("dotenv");
env.config();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 3000;

// database connection
const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// midelwers
const app = express();
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    const database = client.db("eTuitionBD");
    const userCollection = database.collection("users");

    // get all users
    app.get("/users", async (req, res) => {
      try {
        const cursor = userCollection.find();
        const users = await cursor.toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: "Error fetching users", error });
      }
    });

    // add a new user
    app.post("/users", async (req, res) => {
      try {
        const newUser = req.body;
        const result = await userCollection.insertOne(newUser);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error adding user", error });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
