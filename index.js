import express from "express";
import bodyParser from "body-parser";
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from "bcrypt";//hashing passwords and comparisons
import connectPgSimple from 'connect-pg-simple';//to store sessions(id) in db
import passport from "passport";
import { Strategy } from "passport-local";//to handle common username-pwd auth
import GoogleStrategy from "passport-google-oauth2";//to handle google auth
import OAuth2Strategy from 'passport-oauth2';//to handle dauth 
import session from "express-session";
import env from "dotenv";
import axios from "axios";
import qs from "qs";
// import React from "react";
// import Card from "./components/Card";
// import "./public/css/Cards_style.css";
// import ReactDOMServer from "react-dom/server";
import ejs from "ejs";

const app = express();
const port = 3000;
const saltRounds = 10;
const PgSession = connectPgSimple(session);
env.config();

//db init 
const pool = new Pool({
  user: process.env.NEW_USER,
  host: process.env.NEW_HOST,
  database: process.env.NEW_DATABASE,
  password: process.env.NEW_PASSWORD,
  port: process.env.NEW_PORT,
});
// db.connect();

app.use(
    session({
      store: new PgSession({
        pool, // Connection pool
        tableName: 'session', // Table name for storing sessions
      }),
      
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
      cookie:{
        maxAge:1000*60*60,
      }
    })
  );
  app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(passport.initialize());
app.use(passport.session());



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
  
// app.get("/logout", (req, res) => {
//     req.logout(function (err) {
//       if (err) {
//         return next(err);
//       }
//       res.redirect("/");
//     });
//   });
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
      const result2=await pool.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
      const result3=await pool.query(`SELECT * FROM songs inner join likedsongs on songs.id=likedsongs.song_id where likedsongs.user_id=$1`,[parseInt(req.user.id, 10)]);
      const result4=await pool.query(`SELECT  DISTINCT playlist.name FROM playlist inner join users on playlist.user_id=users.id where playlist.user_id=$1`,[parseInt(req.user.id, 10)]);
      res.render("home.ejs",{musicList:songBundle,likedSongs:result2.rows,musicListLiked:result3.rows,playLists:result4.rows});
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
app.get("/about",(req,res)=>{
  if (req.isAuthenticated()){
    res.render("about.ejs");
  }
  else{
    res.redirect('/');
  }
});
app.get("/playlist",async (req,res)=>{
  if (req.isAuthenticated()){
    const result2=await pool.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
      
      const result3=await pool.query(`SELECT * FROM songs inner join likedsongs on songs.id=likedsongs.song_id where likedsongs.user_id=$1`,[parseInt(req.user.id, 10)]);
    const result4=await pool.query(`SELECT  DISTINCT playlist.name FROM playlist inner join users on playlist.user_id=users.id where playlist.user_id=$1`,[parseInt(req.user.id, 10)]);
      var playlists=result4.rows;
      // console.log(playlists);
      for(var i=0;i<playlists.length;i++){
        const result5=await pool.query(`SELECT * from songs inner join playlist on songs.id=playlist.song_id where playlist.name=$1`,[playlists[i].name]);
        playlists[i].song=result5.rows;
      }
      // console.log(playlists);
      res.render("playlist.ejs",{playlists,likedSongs:result2.rows,musicListLiked:result3.rows});
      
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
app.get("/auth/dauth",
  passport.authenticate('dauth')
  //async (req,res)=>{
  // try{
  //   res.redirect(`https://auth.delta.nitt.edu/authorize?client_id=${process.env.DAUTH_CLIENT_ID}&redirect_uri=${encodeURIComponent('http://localhost:3000/auth/dauth/verified')}&response_type=code&grant_type=authorisation_code&scope=email+openid+profile`);
  // }catch(err){
  //   console.log("Error in making request to DAuth:",err);
  //   res.status(500).send("Error initiating DAuth");
  // }
//}
);
app.get("/auth/dauth/verified",passport.authenticate('dauth',{
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
//      const result = await axios.get(`https://api.jamendo.com/v3.0/oauth/authorize?client_id=${process.env.JAMENDO_CLIENT_ID}&redirect_uri=http://localhost:3000/auth/jamendo/verified&scope=music&response_type=code`);
//      console.log(result.data);
    
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
      const checkResult = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);
  
      if (checkResult.rows.length > 0) {
        req.redirect("/login");
      } else {
        bcrypt.hash(password, saltRounds, async (err, hash) => {
          if (err) {
            console.error("Error hashing password:", err);
          } else {
            const result = await pool.query(
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

app.post("/search",async (req,res)=>{
  // console.log(req.body.search.toLowerCase());
  // console.log(req.body.option);
  // console.log(req.body);
  var songBundle;
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

      songBundle=result.data.results;
      console.log(req.user.id);
      const result2=await pool.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
      const result3=await pool.query(`SELECT * FROM songs inner join likedsongs on songs.id=likedsongs.song_id where likedsongs.user_id=$1`,[parseInt(req.user.id, 10)]);
      console.log(result2.rows);
      const result4=await pool.query(`SELECT  DISTINCT playlist.name FROM playlist inner join users on playlist.user_id=users.id where playlist.user_id=$1`,[parseInt(req.user.id, 10)]);
      res.render("search.ejs",{musicList:songBundle,likedSongs:result2.rows,musicListLiked:result3.rows,playLists:result4.rows});

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

    songBundle=result.data.results;
    console.log(req.user.id);
    const result2=await pool.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
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
    songBundle=result.data.results;
    console.log(req.user.id);
    const result2=await pool.query(`SELECT song_id from likedsongs where user_id=$1`,[parseInt(req.user.id, 10)]);
    console.log(result2.rows);
    res.render("search.ejs",{musicList:songBundle,likedSongs:result2.rows});
    
  }
  catch(err){
    console.log("Error in retrieving data to home page ",err);
  }
} 

  for (var song of songBundle){
    console.log(song);
    var existingSong=await pool.query(`SELECT name from songs where id=$1`,[song.id]);
    if (existingSong.rows.length==0){
      await pool.query(`INSERT INTO songs (id, name, artist_name, album_name,image_url,track_url) VALUES ($1, $2, $3, $4,$5,$6)`,
            [song.id, song.name, song.artist_name, song.album_name,song.album_image,song.audio]);
    }
  }
}});


app.post("/like_update",async(req,res)=>{
  const data=req.body;
  console.log("req.body");console.log(req.body);
  try{
    if (req.isAuthenticated()){
      const id=req.user.id;
     
      console.log("User id:");console.log(req.user.id);
      if(data.liked){
          await pool.query(`INSERT INTO likedsongs values($1,$2)`,[req.user.id,data.liked]);
      }
      else if (data.disliked){
          await pool.query(`DELETE FROM likedsongs where user_id=$1 and  song_id=$2`,[req.user.id,data.disliked]);
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
app.post("/new_playlist",async(req,res)=>{
  console.log(req.body);
  try{
    if(req.isAuthenticated()){
      if(req.body.search!=''){
        await pool.query(`INSERT into playlist values($1,$2,$3)`,[req.body.search,req.user.id,req.body.songId]);
        res.redirect('/home');
      }else{
        res.redirect("/");
      }

    }else{
      res.redirect("/");
    }
  }catch(err){
    console.error('Error handling playlist creation and addition update:', err);
  }
});
app.post("/existing_playlist",async(req,res)=>{
    console.log(req.body);
    try{
      if(req.isAuthenticated()){
        
          await pool.query(`INSERT into playlist values($1,$2,$3)`,[req.body.playlistChosen,req.user.id,req.body.songId]);
          res.redirect('/home');
        
  
      }else{
        res.redirect("/");
      }
    }catch(err){
      console.error('Error handling adding song in existing playlist :', err);
    }
});
passport.use('dauth', new OAuth2Strategy({
    authorizationURL: 'https://auth.delta.nitt.edu/authorize',
    tokenURL: 'https://auth.delta.nitt.edu/api/oauth/token',
    clientID:process.env.DAUTH_CLIENT_ID,
    clientSecret: process.env.DAUTH_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/dauth/verified',
    scope: 'email profile user',
    
},
async(accessToken, refreshToken, profile, cb)=>{
  
  // console.log(accessToken);
  try{
      const result2 = await axios.post('https://auth.delta.nitt.edu/api/resources/user', {}, {
      headers: { Authorization: `Bearer ${accessToken}` }});
      
      // console.log(result2.data);
      
    const result= await pool.query("Select * from users where email=$1",[result2.data.email]);
    if(result.rows.length==0){
      const NewUser=await pool.query("Insert into users(email,password) values($1,$2)",[result2.data.email,"dauth"]);
      cb(null,NewUser.rows[0])
    }else{
      //existing user
      cb(null,result.rows[0]);
    }
  }catch(err){
    cb(err);
  }
}
));
passport.use("google",new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/home",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",//@@@@@@@@@@@@@@@@@@@@@
},
  async(accessToken, refreshToken, profile, cb)=>{
  // console.log(profile);
  console.log("0000000000000000000000000000");
  console.log(accessToken);
  try{
    const result= await pool.query("Select * from users where email=$1",[profile.email]);
    if(result.rows.length==0){
      const NewUser=await pool.query("Insert into users(email,password) values($1,$2)",[profile.email,"google"]);
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
        const result = await pool.query("SELECT * FROM users WHERE email = $1 ", [
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
process.on('exit', () => {
    pool.end(() => {
      console.log('Pool has ended');
    });
  });