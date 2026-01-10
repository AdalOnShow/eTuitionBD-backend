const express = require("express");
const env = require("dotenv");
env.config();
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
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

// middlewares
const app = express();
app.use(
  cors({
    origin: [process.env.FRONTEND_URL, "http://localhost:5173"],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json());
const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = decoded;
    next();
  });
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// jwt generate
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
  res.send({ token });
});

async function run() {
  try {
    const database = client.db("eTuitionBD");
    const usersCollection = database.collection("users");
    const tuitionsCollection = database.collection("tuitions");
    const applicationsCollection = database.collection("applications");
    const paymentsCollection = database.collection("payments");

    const verifyRole = (...roles) => {
      return async (req, res, next) => {
        try {
          const email = req.user?.email;

          if (!email) {
            return res.status(401).json({ message: "Unauthorized" });
          }

          const user = await usersCollection.findOne({ email });

          if (!user || !roles.includes(user.role)) {
            return res.status(403).json({ message: "Forbidden" });
          }

          req.user.role = user.role;

          next();
        } catch (error) {
          res.status(500).json({ message: "Role verification failed" });
        }
      };
    };

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
    app.get("/users", verifyToken, async (req, res) => {
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

    // get all recent tutors
    app.get("/tutors", async (req, res) => {
      const query = { role: "tutor" };

      try {
        const cursor = usersCollection.find(query);
        const tutors = await cursor.toArray();
        res.send(tutors);
      } catch (error) {
        res.status(500).send({ message: "Error fetching tutors", error });
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

    // get user by email
    app.get("/user", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      try {
        const result = await usersCollection.findOne(query);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Error fetching user", error });
      }
    });

    // get role
    app.get("/users/role", async (req, res) => {
      const email = req.query.email;
      try {
        const result = await usersCollection.findOne({ email });
        if (result?.role) {
          return res.send({ role: result?.role });
        } else {
          return res.send({ massage: "user dos't exist" });
        }
      } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Error fetching user role", error });
      }
    });

    // comprehensive user update
    app.patch("/users/:email", verifyToken, async (req, res) => {
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
    app.delete(
      "/user/:id",
      verifyToken,
      verifyRole("admin"),
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        try {
          const result = await usersCollection.deleteOne(query);
          res.send(result);
        } catch (error) {
          res.status(500).send({ message: "Error deleting user", error });
        }
      }
    );

    // update user status (active/deactivate)
    app.patch(
      "/user-status/:id",
      verifyToken,
      verifyRole("admin"),
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const { status } = req.body;
        try {
          const result = await usersCollection.updateOne(query, {
            $set: { status },
          });
          res.send(result);
        } catch (error) {
          res
            .status(500)
            .send({ message: "Error updating user status", error });
        }
      }
    );

    //! Tuition APIs
    // add a new tuition
    app.post(
      "/tuition",
      verifyToken,
      verifyRole("student"),
      async (req, res) => {
        try {
          const newTuition = req.body;
          newTuition.created_at = new Date().toISOString();
          const result = await tuitionsCollection.insertOne(newTuition);
          res.send(result);
        } catch (error) {
          res.status(500).send({ message: "Error posting tuition", error });
        }
      }
    );

    // get all tuitions with search, filter, and pagination
    app.get("/tuitions", async (req, res) => {
      const email = req.query.email;
      const search = req.query.search;
      const subject = req.query.subject;
      const classLevel = req.query.class;
      const status = req.query.status;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 6;
      const skip = (page - 1) * limit;

      const query = {};

      // Filter by student email if provided
      if (email) {
        query.student_email = email;
      }

      // Search functionality - search in title, subject, or class
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { subject: { $regex: search, $options: "i" } },
          { class: { $regex: search, $options: "i" } },
        ];
      }

      // Filter by subject
      if (subject) {
        query.subject = { $regex: subject, $options: "i" };
      }

      // Filter by class
      if (classLevel) {
        query.class = { $regex: classLevel, $options: "i" };
      }

      // Filter by status
      if (status) {
        query.status = status;
      }

      try {
        const totalTuitions = await tuitionsCollection.countDocuments(query);
        const cursor = tuitionsCollection.find(query).skip(skip).limit(limit);
        const tuitions = await cursor.toArray();

        res.send({
          tuitions,
          totalTuitions,
          currentPage: page,
          totalPages: Math.ceil(totalTuitions / limit),
          hasNextPage: page < Math.ceil(totalTuitions / limit),
          hasPrevPage: page > 1,
        });
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
    app.patch(
      "/tuition/:id",
      verifyToken,
      verifyRole("student"),
      async (req, res) => {
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
      }
    );

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
    app.delete(
      "/tuition/:id",
      verifyToken,
      verifyRole("student"),
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        try {
          const result = await tuitionsCollection.deleteOne(query);
          res.send(result);
        } catch (error) {
          res.status(500).send({ message: "Error deleting tuition", error });
        }
      }
    );

    //! Application APIs
    // apply for a tuition
    app.post(
      "/apply-tuition",
      verifyToken,
      verifyRole("tutor"),
      async (req, res) => {
        try {
          const applicationData = req.body;
          const { tuition_id, tutor_email } = applicationData;

          // Get the tuition details to check ownership
          const tuition = await tuitionsCollection.findOne({
            _id: new ObjectId(tuition_id),
          });

          if (!tuition) {
            return res.status(404).send({ message: "Tuition not found" });
          }

          // Prevent self-application: Check if tutor is applying to their own tuition
          if (tutor_email === tuition.student_email) {
            return res.status(400).send({
              message: "You cannot apply to your own tuition posting",
            });
          }

          // Prevent duplicate application: Check if tutor already applied
          const existingApplication = await applicationsCollection.findOne({
            tuition_id: tuition_id,
            tutor_email: tutor_email,
          });

          if (existingApplication) {
            return res.status(400).send({
              message: "You have already applied to this tuition",
            });
          }

          // If all validations pass, create the application
          applicationData.applied_at = new Date().toISOString();
          const result = await applicationsCollection.insertOne(
            applicationData
          );
          res.send(result);
        } catch (error) {
          res
            .status(500)
            .send({ message: "Error applying for tuition", error });
        }
      }
    );

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
        const cursor = applicationsCollection.find(query);
        const applications = await cursor.toArray();
        res.send(applications);
      } catch (error) {
        res.status(500).send({ message: "Error fetching applications", error });
      }
    });

    // update application status
    app.patch(
      "/application-status/:id",
      verifyToken,
      verifyRole("student"),
      async (req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const { status } = req.body;

        try {
          const result = await applicationsCollection.updateOne(query, {
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
      }
    );

    //! payment APIs
    // create checkout session
    app.post(
      "/create-checkout-session",
      verifyToken,
      verifyRole("student"),
      async (req, res) => {
        const paymentInfo = req.body;

        try {
          const session = await stripe.checkout.sessions.create({
            line_items: [
              {
                price_data: {
                  currency: "BDT",
                  product_data: {
                    name: paymentInfo.tuition_title,
                    description: paymentInfo?.subject,
                  },
                  unit_amount: parseInt(paymentInfo.sallry) * 100,
                },
                quantity: 1,
              },
            ],
            customer_email: paymentInfo.student_email,
            mode: "payment",
            metadata: {
              tuition_id: paymentInfo.tuition_id,
              tutor_email: paymentInfo.tutor_email,
              tuition_id: paymentInfo.tuition_id,
            },
            success_url: `${process.env.FRONTEND_URL}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/dashboard/student/applied-tutors`,
          });
          res.send({ url: session.url });
        } catch (error) {
          res
            .status(500)
            .send({ message: "Error creating checkout session", error });
        }
      }
    );

    // payment success
    app.post(
      "/payment-success",
      verifyToken,
      verifyRole("student"),
      async (req, res) => {
        const { sessionId } = req.body;
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);

          const tuitionData = await tuitionsCollection.findOne({
            _id: new ObjectId(session.metadata.tuition_id),
          });

          const payment = await paymentsCollection.findOne({
            transcaction_id: session.payment_intent,
          });

          if (session.payment_status === "paid" && tuitionData && !payment) {
            const paymentData = {
              tuition_id: session.metadata.tuition_id,
              tuition_title: tuitionData.title,
              tuition_subject: tuitionData.subject,
              tutor_email: session.metadata.tutor_email,
              student_email: session.customer_email,
              amount_total: session.amount_total / 100,
              transcaction_id: session.payment_intent,
              payment_status: session.payment_status,
              payment_method: session.payment_method_types[0],
              paid_at: new Date().toISOString(),
            };

            const result = await paymentsCollection.insertOne(paymentData);
            res.send(paymentData);
          }

          if (payment && payment.payment_status === "paid") {
            res.send({ message: "Payment already recorded", payment });
          }

          await tuitionsCollection.updateOne(
            { _id: new ObjectId(session.metadata.tuition_id) },
            {
              $set: {
                status: "assigned",
                updated_at: new Date().toISOString(),
              },
            }
          );
          await applicationsCollection.updateMany(
            { tuition_id: session.metadata.tuition_id },
            [
              {
                $set: {
                  status: {
                    $cond: [
                      { $eq: ["$tutor_email", session.metadata.tutor_email] },
                      "accepted",
                      "rejected",
                    ],
                  },
                  updated_at: new Date().toISOString(),
                },
              },
            ]
          );
        } catch (error) {
          res
            .status(500)
            .send({ message: "Error fetching payment success", error });
        }
      }
    );

    // get payments
    app.get("/payments", async (req, res) => {
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
        const cursor = paymentsCollection.find(query);
        const payments = await cursor.toArray();
        res.send(payments);
      } catch (error) {
        res.status(500).send({ message: "Error fetching payments", error });
      }
    });

    //! Admin Analytics APIs
    app.get(
      "/admin-stats",
      verifyToken,
      verifyRole("admin"),
      async (req, res) => {
        try {
          // 1. User Role Distribution (Pie Chart)
          const userRoles = await usersCollection
            .aggregate([
              { $group: { _id: "$role", count: { $sum: 1 } } },
              { $project: { name: "$_id", count: 1, _id: 0 } },
            ])
            .toArray();

          const totalUsersCount = userRoles.reduce(
            (acc, curr) => acc + curr.count,
            0
          );
          const userRoleData = userRoles.map((role) => ({
            name: role.name.charAt(0).toUpperCase() + role.name.slice(1) + "s",
            value: parseFloat(((role.count / totalUsersCount) * 100).toFixed(1)),
            count: role.count,
          }));

          // 2. Monthly Data (Growth, Revenue, Activity)
          // We'll use a single aggregation pipeline or separate ones. Separate for clarity.

          // Monthly User Growth
          const userGrowth = await usersCollection
            .aggregate([
              {
                $project: {
                  month: {
                    $dateToString: {
                      format: "%b",
                      date: { $toDate: "$created_at" },
                    },
                  },
                  yearMonth: {
                    $dateToString: {
                      format: "%Y-%m",
                      date: { $toDate: "$created_at" },
                    },
                  },
                },
              },
              { $group: { _id: "$yearMonth", users: { $sum: 1 }, month: { $first: "$month" } } },
              { $sort: { _id: 1 } },
            ])
            .toArray();

          // Monthly Tuition Activity
          const tuitionActivity = await tuitionsCollection
            .aggregate([
              {
                $project: {
                  month: {
                    $dateToString: {
                      format: "%b",
                      date: { $toDate: "$created_at" },
                    },
                  },
                  yearMonth: {
                    $dateToString: {
                      format: "%Y-%m",
                      date: { $toDate: "$created_at" },
                    },
                  },
                },
              },
              { $group: { _id: "$yearMonth", tuitions: { $sum: 1 }, month: { $first: "$month" } } },
              { $sort: { _id: 1 } },
            ])
            .toArray();

          // Monthly Revenue
          const monthlyRevenue = await paymentsCollection
            .aggregate([
              {
                $project: {
                  month: {
                    $dateToString: {
                      format: "%b",
                      date: { $toDate: "$paid_at" },
                    },
                  },
                  yearMonth: {
                    $dateToString: {
                      format: "%Y-%m",
                      date: { $toDate: "$paid_at" },
                    },
                  },
                  amount: "$amount_total",
                },
              },
              {
                $group: {
                  _id: "$yearMonth",
                  revenue: { $sum: "$amount" },
                  month: { $first: "$month" },
                },
              },
              { $sort: { _id: 1 } },
            ])
            .toArray();

          // 3. Key Metrics
          const totalTuitions = await tuitionsCollection.countDocuments();
          const totalRevenueArr = await paymentsCollection
            .aggregate([
              { $group: { _id: null, total: { $sum: "$amount_total" } } },
            ])
            .toArray();
          const totalRevenue = totalRevenueArr[0]?.total || 0;

          const assignedTuitions = await tuitionsCollection.countDocuments({
            status: "assigned",
          });
          const successRate = totalTuitions
            ? Math.round((assignedTuitions / totalTuitions) * 100)
            : 0;

          // 4. Recent Activity
          const recentUsers = await usersCollection
            .find()
            .sort({ created_at: -1 })
            .limit(3)
            .toArray();
          const recentTuitions = await tuitionsCollection
            .find()
            .sort({ created_at: -1 })
            .limit(3)
            .toArray();
          const recentApplications = await applicationsCollection
            .find()
            .sort({ applied_at: -1 })
            .limit(3)
            .toArray();

          const activities = [
            ...recentUsers.map((u) => ({
              activity: "New user registered",
              user: u.name,
              type: "User",
              date: u.created_at,
              status: u.status || "Verified",
              badge: "badge-secondary",
            })),
            ...recentTuitions.map((t) => ({
              activity: "New tuition posted",
              user: t.student_name,
              type: "Tuition",
              date: t.created_at,
              status: t.status,
              badge: "badge-primary",
            })),
            ...recentApplications.map((a) => ({
              activity: "Application submitted",
              user: a.tutor_name,
              type: "Application",
              date: a.applied_at,
              status: a.status,
              badge: "badge-accent",
            })),
          ]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);

          res.send({
            userRoleData,
            userGrowth,
            tuitionActivity,
            monthlyRevenue,
            stats: {
              totalUsers: totalUsersCount,
              totalTuitions,
              totalRevenue,
              successRate,
            },
            activities,
          });
        } catch (error) {
          console.error("Admin stats error:", error);
          res.status(500).send({ message: "Error fetching admin stats", error });
        }
      }
    );

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
