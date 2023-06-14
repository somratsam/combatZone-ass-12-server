const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n1dwdgt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const classesCollection = client.db("martialDb").collection("classes");
    const usersCollection = client.db("martialDb").collection("users")
    const instructorsCollection = client.db("martialDb").collection("instructors");
    const cartsCollection = client.db("martialDb").collection("carts");

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });

      res.send({ token })
    })


const verifyAdmin = async(req,res,next) =>{
  const email = req.decoded.email
  const query = {email: email}
  const user = await usersCollection.findOne(query);
  if(user?.role !== 'admin'){
    return res.status(403).send({ error: true, message: 'Forbidden access' })
  }
  next();
}


    app.get('/classes', async (req, res) => {
      const result = await classesCollection.find().sort({ enrollmentCount: -1 }).limit(6).toArray();
      res.send(result);
    });
    app.get('/approveClasses', async (req, res) => {
      const result = await classesCollection.find({ status: 'approved' }).toArray();
      res.send(result);
    });

    app.get('/instructors', async (req, res) => {
      const result = await instructorsCollection.find().sort({ enrollmentCount: -1 }).limit(6).toArray();
      res.send(result);
    });

    app.get('/AllInstructors', async (req, res) => {
      const result = await instructorsCollection.find().toArray();
      res.send(result);
    });

    // instructor

    app.post('/classes', async (req, res) => {
      const classData = req.body;
      const result = await classesCollection.insertOne(classData);
      res.status(201).send(result);
    });


    app.get('/myClasses', async (req, res) => {
      let query = {};
      if (req.query?.email) {
        query = { instructorEmail: req.query.email };
      }
      const result = await classesCollection.find(query).toArray();
      res.send(result);
    });

    // admin

    app.get('/manageClasses', async (req, res) => {
      const result = await classesCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      user.role = "student";
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

// admin-secure

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
    
      if (req.decoded.email !== email) {
        res.send({ admin: false });
        return;
      }
    
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    });

// instructor-secure

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
    
      if (req.decoded.email !== email) {
        res.send({ instructor: false });
        return;
      }
    
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === 'instructor' };
      res.send(result);
    });


    // student-secure

    app.get('/users/student/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
    
      if (req.decoded.email !== email) {
        res.send({ student: false });
        return;
      }
    
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { student: user?.role === 'student' };
      res.send(result);
    });
    


    app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })








    app.put('/classes/:classId', async (req, res) => {
      const { classId } = req.params;
      const { feedback } = req.body;
      const filter = { _id: classId };
      const update = { $set: { feedback } };
      const result = await classesCollection.updateOne(filter, update);
      res.send(result);
    });


    // student

    app.post('/carts', async (req, res) => {
      const classData = req.body;
      const result = await cartsCollection.insertOne(classData);
      res.status(201).send(result);
    });



    app.get("/selectedClasses", verifyJWT, async (req, res) => {
      const userEmail = req.query.email;
    if (!userEmail){
      res.send([])
    }
    
        const decodedEmail = req.decoded.email
    
        if (userEmail !== decodedEmail) {
          return res.status(403).send({ error: true, message: 'Forbidden access' });
        }
        const query = { email: userEmail };
        const result = await cartsCollection.find(query).toArray();
        res.send(result);
      
      
    });
    
    






    
    // app.get("/selectedClasses", async (req, res) => {
    //   let query = {};
    //   if (req.query?.email) {
    //     query = { studentEmail: req.query.email };
    //   }
    //   // const decodedEmail = req.decoded.email;
    //   // if (req.query.email !== decodedEmail) {
    //   //   return res.status(403).send({ error: true, message: 'forbidden access' });
    //   // }

    //   const result = await cartsCollection.find(query).toArray();
    //   res.send(result);
    // });
    // payment   

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']

      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })



    // app.get("/selectedClasses", async (req, res) => {
    //   let query = {};
    //   if (req.query?.email) {
    //     query = { studentEmail: req.query.email };
    //   }

    //   const result = await cartsCollection.find(query).toArray();
    //   res.send(result);

    // });

    // Delete selected class
    app.delete("/selectedClasses/:classId", async (req, res) => {
      const classId = req.params.classId;
      const query = { _id: new ObjectId(classId) };


      const result = await cartsCollection.deleteOne(query)
      res.send(result)

    });





    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send(`Server running on port ${port}`);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
