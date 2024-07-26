import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import session from "express-session";
import env from "dotenv";
import axios from "axios";
// import React from "react";
// import Card from "./components/Card";
// import "./public/css/Cards_style.css";
// import ReactDOMServer from "react-dom/server";
import ejs from "ejs";

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
  app.use(express.json());
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
app.get("/home",async(req,res)=>{
  if (req.isAuthenticated()){
    try{
      const result=await axios.get("https://api.jamendo.com/v3.0/tracks",{
        params:{
          client_id:process.env.JAMENDO_CLIENT_ID,
          format:'jsonpretty',
          random:true,
          limit:20
        }
      });
      const songBundle=result.data.results;
      // for(var i=0;i<songBundle.length;i++){
      //   console.log(songBundle[i]);
      // }
      // console.log(req.user.id);
      const result2=await db.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
      // console.log(result2.rows);
      // console.log(JSON.stringify(result.data.results));
      // for(var i=0;i<songBundle.length;i++){
      //   await db.query(`INSERT INTO songs(id,name,artist_name,album_name,image_url,track_url) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,[songBundle[i].id,songBundle[i].name,songBundle[i].artist_name,songBundle[i].album_name,songBundle[i].image,songBundle[i].audio]);
      //   console.log(JSON.stringify(songBundle[i]));
      // }
      const result3=await db.query('SELECT * FROM songs inner join likedsongs on songs.id=likedsongs.song_id where likedsongs.user_id=$1',[parseInt(req.user.id, 10)]);

      res.render("home.ejs",{musicList:songBundle,likedSongs:result2.rows,musicListLiked:result3.rows});
    }
    catch(err){
      console.log("Error in retrieving data to home page ",err);
    }    
  }else{
    res.redirect('/');
  }
});
app.get("/search",(req,res)=>{
  if (req.isAuthenticated()){
    res.render("search.ejs");
  }
  else{
    res.redirect('/');
  }
});

//app.home page
app.get("/auth/google",passport.authenticate("google",{
    scope:["profile","email"],
  }));
app.get("/auth/google/home",passport.authenticate("google",{
    failureRedirect:"/login",
    successRedirect:"/home"
}));
// app.get("/auth/google/home",passport.authenticate("google",{
//     failureRedirect:"/login",
//   }),async (req,res)=>{
//     try{
//       console.log(req.user);
//       const res1=await db.query(`select jamendoauthorised from users where email='${req.user.email}'`);
//       console.log(res1.rows);
//       if (res1.rows[0].jamendoauthorised==null){
//         console.log("Entered");
//           res.redirect("/auth/jamendo");
//       }
//       else{
//         res.redirect('/home');
//       }
//     }
//     catch(err){
//       console.log(err);
//     }
//   });
// app.get("/auth/jamendo",(req,res)=>{
//   try{
//     // const result = await axios.get(`https://api.jamendo.com/v3.0/oauth/authorize?client_id=${process.env.JAMENDO_CLIENT_ID}&redirect_uri=http://localhost:3000/auth/jamendo/verified&scope=music&response_type=code`);
//     // console.log(result.data);
    
//     res.redirect(`https://api.jamendo.com/v3.0/oauth/authorize?client_id=${process.env.JAMENDO_CLIENT_ID}&redirect_uri=${encodeURIComponent("http://localhost:3000/auth/jamendo/verified")}&scope=music&response_type=code`);
//   }
//   catch(err){
//     console.error("Error initiating Jamendo OAuth:", err);
//     res.status(500).send("Error initiating Jamendo OAuth");
//   }
// });
// app.get("/auth/jamendo/verified",async (req,res)=>{
//   const { code, state } = req.query;
//   console.log(code);
//   const data = {
//     client_id:process.env.JAMENDO_CLIENT_ID,
//     client_secret: clientSecret,
//     grant_type: "authorization_code",
//     code: code,
//     redirect_uri: redirectUri
//   };
//   try{
//     const result=await axios.post(`https://api.jamendo.com/v3.0/oauth/grant?client_id=${process.env.JAMENDO_CLIENT_ID}&client_secret=${process.env.JAMENDO_CLIENT_SECRET}&grant_type=authorization_code&code=${code}&redirect_uri=http://localhost:3000/auth/jamendo/verified`);
//     console.log('Access Token:', result.data.access_token);
//     console.log('Refresh Token:', result.data.refresh_token);
//     console.log('Expires In:', result.data.expires_in);
//   }catch(err){
//     console.error("Error initiating Jamendo OAuth:", err);
//   }
  
// });

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
//Authorize jamendo user
app.post("/new_playlist",(req,res)=>{

});
app.post("/search",async (req,res)=>{
  // console.log(req.body.search.toLowerCase());
  // console.log(req.body.option);
  // console.log(req.body);
if (req.isAuthenticated()){
if (req.body.option=="song")
{
  try{
    const result=await axios.get("https://api.jamendo.com/v3.0/tracks",{
      params:{
        client_id:process.env.JAMENDO_CLIENT_ID,
        format:'jsonpretty',
        namesearch:req.body.search,
        limit:20
      }
    });

      const songBundle=result.data.results;
      console.log(req.user.id);
      const result2=await db.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
      console.log(result2.rows);
      res.render("search.ejs",{musicList:songBundle,likedSongs:result2.rows});

  }
  catch(err){
    console.log("Error in retrieving post data to home page ",err);
  }
}
else if (req.body.option=="artist")
{
  try{
    const result=await axios.get("https://api.jamendo.com/v3.0/tracks",{
      params:{
        client_id:process.env.JAMENDO_CLIENT_ID,
        format:'jsonpretty',
        artist_name:req.body.search,
        limit:20
      }
    });

    const songBundle=result.data.results;
    console.log(req.user.id);
    const result2=await db.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
    console.log(result2.rows);
    res.render("search.ejs",{musicList:songBundle,likedSongs:result2.rows});
   
  }
  catch(err){
    console.log("Error in retrieving data to home page ",err);
  }
}
else{
  try{
    const result=await axios.get("https://api.jamendo.com/v3.0/tracks",{
      params:{
        client_id:process.env.JAMENDO_CLIENT_ID,
        format:'jsonpretty',
        album_name:req.body.search,
        limit:20
      }
    });
    const songBundle=result.data.results;
    console.log(req.user.id);
    const result2=await db.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
    console.log(result2.rows);
    res.render("search.ejs",{musicList:songBundle,likedSongs:result2.rows});
    
  }
  catch(err){
    console.log("Error in retrieving data to home page ",err);
  }
}
}
     
  
})

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
app.post("/like_update",async(req,res)=>{
  const data=req.body;
  console.log("req.body");console.log(req.body);
  try{
    if (req.isAuthenticated()){
      const id=req.user.id;
      console.log("User id:");console.log(req.user.id);
      if(data.liked){
          await db.query(`INSERT INTO likedsongs values($1,$2)`,[req.user.id,data.liked]);
      }
      else if (data.disliked){
          await db.query(`DELETE FROM likedsongs where user_id=$1 and  song_id=$2`,[req.user.id,data.disliked]);
      }
      res.status(200).json({ success: true });
      
    }else{
      res.status(401).json({ success: false, message: "User not authenticated" });
    }
  }catch(err){
    console.error('Error handling like update:', err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
  }
  

}
);
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
  