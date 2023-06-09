const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n1dwdgt.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();

        const classesCollection = client.db("martialDb").collection("classes");
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().sort({ enrollmentCount: -1 }).limit(6).toArray();
            res.send(result);
        });

        const instructorsCollection = client.db("martialDb").collection("instructors");
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().sort({ enrollmentCount: -1 }).limit(6).toArray();
            res.send(result);
        });

        app.get('/AllInstructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result);
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
