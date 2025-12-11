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
    const aplicationsCollection = database.collection("applications");

    //! User APIs
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

    // get all users
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const role = req.query.role;
      const query = {};
      if (email) {
        query.email = email;
      }
      if (role) {
        query.role = role;
      }

      try {
        const cursor = usersCollection.find(query);
        const users = await cursor.toArray();
        res.send(users);
      } catch (error) {
        res.status(500).send({ message: "Error fetching users", error });
      }
    });

    // get user by id
    app.get("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await usersCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching user", error });
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

    // comprehensive user update
    app.patch("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        console.log(req.body);
        const updateFields = { ...req.body };

        updateFields.updated_at = new Date().toISOString();

        if (updateFields.role && updateFields.role !== "tutor") {
          const currentUser = await usersCollection.findOne({ email });
          if (currentUser && currentUser.role === "tutor") {
            updateFields.education = null;
            updateFields.subjects = null;
            updateFields.hourly_rate = null;
          }
        }

        const result = await usersCollection.updateOne(
          { email },
          { $set: updateFields }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }

        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error updating user", error: error.message });
        console.log(error);
      }
    });

    // delete user by id
    app.delete("/user/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await usersCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error deleting user", error });
      }
    });

    // update user status (active/deactive)
    app.patch("/user-status/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { status } = req.body;
      try {
        const result = await usersCollection.updateOne(query, {
          $set: { status },
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error updating user status", error });
      }
    });

    //! Tuition APIs
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
        console.log(result);
      } catch (error) {
        res.status(500).send({ message: "Error updating tuition", error });
      }
    });

    // update tuition status by id
    app.patch("/tuition-status/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { status } = req.body;

      console.log(status);

      try {
        const result = await tuitionsCollection.updateOne(query, {
          $set: { status },
        });
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error updating tuition status", error });
      }
    });

    // delete tuition by id
    app.delete("/tuition/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      try {
        const result = await tuitionsCollection.deleteOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error deleting tuition", error });
      }
    });

    //! Application APIs
    // apply for a tuition
    app.post("/apply-tuition", async (req, res) => {
      try {
        const applicationData = req.body;
        applicationData.applied_at = new Date().toISOString();
        const result = await aplicationsCollection.insertOne(applicationData);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error applying for tuition", error });
      }
    });

    // get applications
    app.get("/applications", async (req, res) => {
      const tutor_email = req.query.tutor_email;
      const student_email = req.query.student_email;
      const query = {};
      if (tutor_email) {
        query.tutor_email = tutor_email;
      }
      if (student_email) {
        query.student_email = student_email;
      }
      try {
        const cursor = aplicationsCollection.find(query);
        const applications = await cursor.toArray();
        res.send(applications);
      } catch (error) {
        res.status(500).send({ message: "Error fetching applications", error });
      }
    });

    // update application status
    app.patch("/application-status/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { status } = req.body;

      try {
        const result = await aplicationsCollection.updateOne(query, {
          $set: {
            status,
            updated_at: new Date().toISOString(),
          },
        });
        res.send(result);
      } catch (error) {
        res
          .status(500)
          .send({ message: "Error updating application status", error });
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
