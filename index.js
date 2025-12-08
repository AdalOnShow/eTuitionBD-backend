// create a simple express server
const express = require("express");
const env = require("dotenv");
env.config();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const tuitionsCollection = database.collection("tuitions");

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

    // get role
    app.get("/users/role", async (req, res) => {
      try {
        const email = req.query.email;
        const result = await usersCollection.findOne({ email });
        if (result?.role) {
          return res.send({ role: result?.role });
        } else {
          return res.send({ massage: "user dos't exist" });
        }
      } catch (error) {
        res.status(500).send({ message: "Error fetching user role", error });
      }
    });

    // add a new tuition
    app.post("/tuition", async (req, res) => {
      try {
        const newTuition = req.body;
        newTuition.created_at = new Date().toISOString();

        const result = await tuitionsCollection.insertOne(newTuition);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error posting tuition", error });
      }
    });

    // get all tuitions
    app.get("/tuitions", async (req, res) => {
      const email = req.query.email;
      const query = email ? { student_email: email } : {};

      try {
        const cursor = tuitionsCollection.find(query);
        const tuitions = await cursor.toArray();
        res.send(tuitions);
      } catch (error) {
        res.status(500).send({ message: "Error fetching tuitions", error });
      }
    });

    // get one tuition by id
    app.get("/tuition/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const tuition = await tuitionsCollection.findOne(query);
        res.send(tuition);
      } catch (error) {
        res.status(500).send({ message: "Error fetching tuition", error });
      }
    });

    // update tuition by id
    app.patch("/tuition/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedData = req.body;
      updatedData.updated_at = new Date().toISOString();

      try {
        const result = await tuitionsCollection.updateOne(query, {
          $set: updatedData,
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error updating tuition", error });
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
