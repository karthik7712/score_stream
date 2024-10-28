import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const app = express();
const port = 3000;

const db = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'sports',
    password: 'Comeback1210',
    port: 5432,
});

db.connect();

const year = new Date().getFullYear();
const month = new Date().getMonth() + 1;
const date = new Date().getDate();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());  // Add JSON parsing middleware

app.get('/', (req, res) => {
    res.render("index.ejs");
});

app.get('/signup', (req, res) => {
    res.render("signup.ejs");
});

app.get('/signin', (req, res) => {
    res.render("get.ejs");
});

app.post('/signin', async (req, res) => {
    try {
        const result = req.body;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const val_arr = [result.FirstName, result.LastName, result.username, result.email, hashedPassword, result.Mobile_number];

        await db.query("insert into users (user_first_name, user_last_name, username, email, password_hash, mobile_number) values ($1, $2, $3, $4, $5, $6)", val_arr);
        res.render("get.ejs", { username: result.username });
    } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/jwt', (req, res) => {
    const username = req.body.username;
    const user = { name: username };
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);  // Fix: Access token variable
    res.cookie("uid", accessToken);
    // res.json({ accessToken: accessToken });  // Fix variable name
    res.render("main.ejs");
});

app.post('/home', (req, res) => {
    const username = req.body.username;
    res.render('main.ejs', { name: username });
});

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}



app.post('/find', async (req, res) => {
    const sport = req.body.sports;

    if (sport.toLowerCase() === 'cricket') {
        try {
            const result = await axios.get("https://api.cricapi.com/v1/currentMatches", {
                params: {
                    apikey: process.env.CRICAPI_TOKEN,
                    offset: 0
                }
            });

            const matches = result.data.data;

            // Log the matches data to see the structure
            // console.log("Cricket matches response:", matches);

            let today_matches = [];
            let send = { response: "No matches Today!", type : sport };

            matches.forEach(element => {
                if (element.date == `${year}-${month}-${date}` || element.matchEnded == false) {
                    today_matches.push(element);
                }
            });
            if (today_matches.length !== 0) {
                send = { matches: today_matches, type:sport };
            }
            console.log("Cricket matches response:", send);
            res.render("main.ejs", send);  
        } catch (error) {
            console.error("Error fetching cricket matches:", error.response ? error.response.data : error.message);
            res.status(500).send("Internal Server Error");
        }    
    } else {
        try {
            const result = await axios.get("https://v3.football.api-sports.io/fixtures", {
                headers: {
                    'x-apisports-key': process.env.FOOTBALLAPI_TOKEN,
                },
                params: {
                    live: 'all',
                },
            });

            // Log the football response to see its structure
            console.log("Football matches response:", result.data);

            // Check if the response structure is as expected
            if (result.data && result.data.response && result.data.response.length > 0) {
                const matches = result.data.response; // Get the matches
                console.log(matches[0].fixture); // Now this should not throw an error
                // Handle the matches as needed...
            } else {
                console.error("No fixtures available.");
                res.status(404).send("No fixtures available.");
            }
        } catch (error) {
            console.error("Error fetching football matches:", error.response ? error.response.data : error.message);
            res.status(500).send("Internal Server Error");
        }
    }
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
