const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer")

const SECRET_KEY = "secretkey";

main().catch((err) => console.log(err));

//connect to espress app
const app = express();

app.use(cors());

app.use(bodyParser.json());

//connect to MongoDB
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/flavor-swap");
  console.log("Db connected successfully");
}

//userSchema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Recipes' }]
});

const User = mongoose.model("User", userSchema);

//recipeSchema
const recipeSchema = new mongoose.Schema({
  title: { type: String },
  description: {type: String},
  time: { type: Number },
  difficulty: { type: Number },
  ingredients: { type: String },
  method: { type: String },
  image: { type: String },
  userRating: { type: Number },
});

const Recipe = mongoose.model("Recipes", recipeSchema);


//middleware

//multer 
const userStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "../uploads")
    },
    filename: function (req, file, cb) {
        const filename = `${Date.now()}_${file.originalname}`
        return cb(null, filename)
    }
})

const userUpload = multer({storage: userStorage})
//Routes

app.post("/signup", async (req, res) => {
    try {
        console.log(req.body)

      const { useremail, username, password } = req.body;
  
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({
        email: useremail,
        username: username,
        password: hashedPassword,
      });
      await newUser.save();
  
      res.status(201).json({ message: "User created Successfully" });
    } catch (error) {
      console.error("Error during signup", error);
      res.status(500).json({ error: "Error Signing up" });
    }
  });
  
  app.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({ username });
      console.log(user)
      if (!user) {
        return res.status(401).json({ error: "Invalid user" });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid password" });
      }
      const token = jwt.sign({ userId: user._id }, SECRET_KEY, {
        expiresIn: "1hr",
      });
  
      res.status(200).json({ message: "Login Successful", token: token, user: user });
    } catch (error) {
      console.error("Error during login", error);
      res.status(500).json({ error: "Error Signing up" });
    }
  });
  
  app.post("/submitRecipe", userUpload.single('file'), async (req, res) => {
    try {

      const { title, description, cooking_time, difficulty, ingredients, method } = req.body;
  
      const newRecipe = new Recipe({
        title: title,
        description: description,
        time: cooking_time,
        difficulty: difficulty,
        ingredients: ingredients,
        method: method,
        image: req.file.filename,
        userRating: 3,
    
      });
  
      await newRecipe.save();
  
      res.status(200).json({ message: "Recipe Submitted Successfully" });
    } catch (error) {
      console.error("Error during recipe Submisssion", error);
      res.status(500).json({ message: "Error submitting recipe" });
    }
  });
  
  app.get("/getRecipes", async(req, res) => {
      try{
          const recipes = await Recipe.find()
          res.status(200).json(recipes)
      }
      catch(error) {
          console.error("Error while fetching recipes", error)
          res.status(500).json({message: "Error fetching Recipes"})
      }
  })

  app.get("/getUser", async(req,res) => {
    const {userId} = req.query
    try{
      const user = await User.findById(userId)
      res.status(200).json(user);
    }
    catch(error){
      console.error("Error while fetching User Data", error)
      res.status(500).json({message: "Error fetching User Data"})
    }
  })

  app.post("/addFav", async(req,res) => {
    const{userId, recipeId} = req.body
    try{
      const user = await User.findById(userId)
      if(!user.favorites.includes(recipeId)) {
        user.favorites.push(recipeId)
        await user.save()
      }
      res.status(200).json({message: "Recipe added to favourites"})
    }
    catch(error){
      console.error("Error while updating Favourites", error)
    }
  })

  app.post("/removeFav", async(req,res) => {
    const {userId, recipeId} = req.body
    try {
      const user = await User.findById(userId);
      user.favorites = user.favorites.filter(fav => fav.toString() !== recipeId);
      await user.save();
      res.status(200).json({ message: 'Recipe removed from favorites' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  })

  app.get("/searchRecipes", async(req,res) => {
    try{
      const {query} = req.query;
      const recipes = await Recipe.find({
        title: {$regex: query, $options: 'i'}
      })
      console.log(recipes)
      if(recipes.length != 0 ){
        res.status(200).json(recipes)
      }
      else{
        res.status(201).json({message: "No Recipes Found"})
      }
    }
    catch(error){
      console.error("Error while fetching User Data", error)
      res.status(500).json({message: "Error fetching User Data"})
    
    }
  })

  app.get('/getUserFavorites', async (req, res) => {
    const { userId } = req.query;
  
    try {
      // Find the user by ID
      const user = await User.findById(userId).populate('favorites');
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Populate the favorite recipes
      const favoriteRecipes = await Recipe.find({ _id: { $in: user.favorites } });
  
      res.status(200).json(favoriteRecipes);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });

app.listen(3001, () => {
  console.log("Server Started:");
});
