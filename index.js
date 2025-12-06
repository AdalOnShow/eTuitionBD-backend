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
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

async function run() {
  try {
    const database = client.db("eTuitionBD");
    const usersCollection = database.collection("users");

    // get all users
    app.get("/users", async (req, res) => {
      try {
        const cursor = usersCollection.find();
        const users = await cursor.toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: "Error fetching users", error });
      }
    });

    // add a new user
    app.post("/users", async (req, res) => {
      try {
        const userData = req.body;
        userData.created_at = new Date().toISOString();
        userData.last_loggedIn = new Date().toISOString();

        const query = {
          email: userData.email,
        };

        const alreadyExists = await usersCollection.findOne(query);

        if (alreadyExists) {
          const result = await usersCollection.updateOne(query, {
            $set: {
              last_loggedIn: new Date().toISOString(),
            },
          });
          return res.send(result);
        }

        const result = await usersCollection.insertOne(userData);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error posting users", error });
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
