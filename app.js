//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt=require('mongoose-encryption')
const md5=require('md5');
const app = express();
const bcrypt = require('bcrypt');
const saltRounds=10;
const session=require('express-session')
const passport = require('passport');
const passportLocalMongoose=require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));  

app.use(session({
    secret:"this can be anything ",
    resave:false,
    saveUninitialized:false
}))

app.use(passport.initialize());
app.use(passport.session());

//TODO
mongoose.connect("mongodb://localhost:27017/userDB");

// level 1
// const userSchema{
//     username:String,
//     password:String
// }


// level 2
const userSchema=new mongoose.Schema({
    username:String,
    password:String,
    googleId:String,
    secret:String
});


// level -5 
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// level 2
// const secret=process.env.SECRET;
// userSchema.plugin(encrypt,{secret:secret,encryptedFields:["password"]});

const User=new mongoose.model("User",userSchema);

// level 5
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, {  id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    // userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
})
app.get("/auth/google",
    passport.authenticate("google",{scope:['profile']})
)
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    // console.log(req);
    // console.log(res);
    res.redirect('/secrets')
    // res.render("secrets");
  });
app.get("/login",function(req,res){
    res.render("login");
})
app.post("/login",function(req,res){
    const userName=req.body.username;
    const password=(req.body.password);

    const user=new User({
        username:userName,
        password:password
    })
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets"); 
            })
        }
    })

    // level -4
    // User.findOne({username:userName},function(err,foundUser){
    //     if(err){
    //         console.log(err);
    //     }
    //     else{
    //         if(foundUser){
    //             // bcrypt method lev-4
                
    //             bcrypt.compare(password, foundUser.password, function(err, result) {
    //                 if(result==true){
    //                     res.render("secrets");
    //                 }
    //                 else{
    //                     res.send("<h1>wrong password</h1>")
    //                 }
                    
                    
    //             });  
            
    //             // md5 method lev-3
    //             // if(foundUser.password===password){
    //             //     res.render("secrets");
    //             // }
                
    //     }
    //     else{
    //         res.send("<h1>User doesn't exist</h1>")
    //     }
    //     }
    // })
})
// app.get("/secrets",function(req,res){
//     if(req.isAuthenticated()){
//         res.render("secrets");
//     }
//     else{
//         res.redirect("/login")
//     }
// })
app.get("/register",function(req,res){
    res.render("register");
})

app.post("/register",function(req,res){
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })


    // level-4
    // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    //     // Store hash in your password DB.
    //     const newUser=User({
    //         username:req.body.username,
    //         password:hash
    //     })
    //     newUser.save(function(err){
    //         if(err){
    //             console.log(err);
    //         }
    //         else{
    //             res.render("secrets");
    //         }
    //     })
    // });
    
})
app.get("/secrets",function(req,res){
    User.find({"secret":{$ne:null}},function(err,foundUsers){
        if(err){
            console.log(err);
        }
        else{
            res.render("secrets",{usersWithSecrets:foundUsers});
        }
    })
    // res.render("secrets");
})
app.get("/submit",function(req,res){
    // res.render("submit");
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login")
    }

})

app.post("/submit",function(req,res){
    const submittedSecret = req.body.secret;
    console.log(req.user.id);
    User.findById(req.user.id,function(err, foundUser){
        if(err){
            console.log(err)
        }
        else{
            if(foundUser){
                foundUser.secret=submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets")
                })
            }
        }
    })
      
})

app.get("/logout",function(req,res){
    req.logout(function(err){
        if(err){
            console.log(err);
        }
    });
    res.redirect("/secrets");
})

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
