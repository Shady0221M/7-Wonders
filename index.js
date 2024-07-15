import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";

const app = express();
const port = 3000;
const saltRounds = 10;
env.config();

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    })
  );

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());

//db init
const db = new pg.Client({
    user: process.env.NEW_USER,
    host: process.env.NEW_HOST,
    database: process.env.NEW_DATABASE,
    password: process.env.NEW_PASSWORD,
    port: process.env.NEW_PORT,
  });
db.connect();

//get routes
app.get("/", (req, res) => {
    res.render("launch.ejs");
  });
  
app.get("/login", (req, res) => {
    res.render("login.ejs");
  });
  
app.get("/register", (req, res) => {
    res.render("register.ejs");
  });
  
app.get("/logout", (req, res) => {
    req.logout(function (err) {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });
app.get("/home",(req,res)=>{
  if (req.isAuthenticated()){
    res.render("home.ejs");
  }else{
    res.redirect('/');
  }
});
//app.home page
app.get("/auth/google",passport.authenticate("google",{
    scope:["profile","email"],
  }));
app.get("/auth/google/home",passport.authenticate("google",{
    successRedirect:"/home",
    failureRedirect:"/login",
  }));

//post routes
app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/home",
      failureRedirect: "/login",
    })
  );

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
  
    try {
      const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
  
      if (checkResult.rows.length > 0) {
        req.redirect("/login");
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            const result = await db.query(
              "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *",
              [email, hash]
            );
            const user = result.rows[0];
            req.login(user, (err) => {
              console.log("success");
              res.redirect("/home");
            });
          }
        });
      }
    } catch (err) {
      console.log(err);
    }
  });

passport.use("google",new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/home",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",//@@@@@@@@@@@@@@@@@@@@@
  },
    async(accessToken, refreshToken, profile, cb)=>{
    // console.log(profile);
    try{
      const result= await db.query("Select * from users where email=$1",[profile.email]);
      if(result.rows.length==0){
        const NewUser=await db.query("Insert into users(email,password) values($1,$2)",[profile.email,"google"]);
        cb(null,NewUser.rows[0])
      }else{
        //existing user
        cb(null,result.rows[0]);
      }
    }catch(err){
      cb(err);
    }
  }));
  
passport.use("local",
    new Strategy(async function verify(username, password, cb) {
      console.log(username);
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
          username,
        ]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;
          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              //Error with password check
              console.error("Error comparing passwords:", err);
              return cb(err);
            } else {
              if (valid) {
                //Passed password check
                return cb(null, user);
              } else {
                //Did not pass password check
                return cb(null, false);
              }
            }
          });
        } else {
          return cb("User not found");
        }
      } catch (err) {
        console.log(err);
      }
    })
  );
  
passport.serializeUser((user, cb) => {
    cb(null, user);
  });
passport.deserializeUser((user, cb) => {
    cb(null, user);
  });
  
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  