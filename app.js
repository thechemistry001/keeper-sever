require("dotenv").config();
const express=require("express");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
const path=require("path")
const session=require("express-session")
const passport=require("passport");
const passportLocalMongoose = require('passport-local-mongoose');

var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FacebookStrategy=require("passport-facebook").Strategy
var findOrCreate = require('mongoose-findorcreate')

mongoose.set('strictQuery', false);
// mongoose.connect("mongodb+srv://admin:admin@cluster0.wu6ayr7.mongodb.net/keeperDB")
mongoose.connect("mongodb://localhost/keeperDB");


const app=express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
  }))
  app.use(passport.initialize()); 
  app.use(passport.session());
let KeepSchema=new mongoose.Schema({
    title:String,
    content:String
})
let UserSchema=new mongoose.Schema({
    name:String,
    _username:String,
    password:String,
    Keepnote:[KeepSchema],
    SocialId:String,
    Avatar:String
})

UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate)
const Keep= mongoose.model("Keep",KeepSchema);
const User=mongoose.model("User",UserSchema);

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

  passport.use(User.createStrategy());
  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret:process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/google/loggedin"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ SocialId: profile.id ,name:profile.displayName,Avatar:profile.photos[0].value}, function (err, user) {
        console.log(profile);
      return cb(err, user);
    });
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    callbackURL: "http://localhost:8080/auth/facebook/loggedin"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ SocialId: profile.id,name:profile.displayName}, function (err, user) {
      console.log(profile);
      return cb(err, user);
    });
  }
));
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/loggedin', 
  passport.authenticate('google',{ failureRedirect: 'http://localhost:3000/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("https://keeper-by-saurav.cyclic.app/");
  });
  app.get('/auth/facebook',
  passport.authenticate('facebook'));

  app.get('/auth/facebook/loggedin',
  passport.authenticate('facebook', { failureRedirect: 'http://localhost:3000/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("https://keeper-by-saurav.cyclic.app/");
  });
app.post("/register",function(req,res){
    const title=req.body.title
    const content=req.body.content
    if(req.isAuthenticated()){
        console.log("yess");
    const note=new Keep({
        title:title,
        content:content
    })
    User.findById(req.user.id,function(err,foundlist){
        if(err){
            res.send(err)
        }
        else{
            foundlist.Keepnote.push(note);
            foundlist.save();
            res.json({message:"note saved"})
        }
    })}
    else{
        res.json({message:"user is not logged in"})
    }
    
})

app.post("/delete",function(req,res){
    
     const titleN=req.body.title;
    const contentN=req.body.content;
    if(req.isAuthenticated()){
    User.findOneAndUpdate({_id:req.user.id},{$pull:{Keepnote:{title:titleN,content:contentN}}},function(err){
        if(err){
            console.log("not successfully deleted");
            res.send(err)
        }
        else{
            console.log("successfully deleted");
            res.send("Successfully Deleted")
        }
    })}
})
app.post("/userRegistration",function(req,res){
    const Uname=req.body.name;
    const Uusername=req.body.username;
    const password=req.body.password
    // if(Uname===""){
    //     res.json({message:"Name Can't Be Empty"})
    // }
    
    User.findOne({username:Uusername},function(err,founduser){
        if(err){
            res.json({rescode:-1,message:"An Error Occured While Signing You Up"})
        }
        else{
            if(!founduser){
                if(password.length<8){
                    res.json({rescode:2,message:"Please Enter Min 8 Character"})
                }
                else{
                User.register({username:req.body.username,
                    name:req.body.name , Keepnote:[],active:false},req.body.password,function(err,user){
                        if(err){
                            res.json({errorr:"success"})
                    }
                    else{
                        passport.authenticate("local")(req,res,function(){
                            res.json({rescode:1,message:"Successfully Registered"})
                        })
                       }
                })}

            }
            else{
                res.json({rescode:0,message:"User Already Registered with "+Uusername+" Please Login"})
            }
        }
    })

  
    
    
})
app.get("/getnote",(req,res)=>{
   
   if(req.isAuthenticated()){
    User.findById(req.user.id,function(err,foundlist){
        if(err){
            res.send(err)
        }
        else{
            res.json(foundlist.Keepnote)
        }
    })}
    else{
        res.json([]);
        
    }



   
})
 app.post("/login",function(req,res){
        const user=new User({
           username:req.body.username,
            password:req.body.password
    
        })
        User.findOne({username:user.username},function(err,founduser){
            if(!err){
                if(!founduser){
                    res.status(300).send("user not found")
                }
                else{
                    req.login(user,function(err){
                    if(err){
                       res.send(err)
                    }
                    else{
                        passport.authenticate("local")(req,res,function(err){
                          res.status(200).send("logged in")
                        })
                    }})}}})})
              

app.get("/logout",function(req,res){
    req.logout(function(err) {
        if (err) { return next(err); 

        }
        if(!err){
            res.json({msg:"success"});
        }
      });
})
app.get("/isLoggedin",function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user.id,function(err,founduser){
            if(!err){
                res.json(founduser);
            }
        })
    }
    else{
        res.json(null)
    }
})
app.use(express.static(path.join(__dirname,"./client/build")))
app.get("*",function (req,res) {
    res.sendFile(path.join(__dirname,"./client/build/index.html"));
  })
const PORT= process.env.PORT || 8080
app.listen(PORT,()=>{ console.log(`Server started on port ${PORT}`)});