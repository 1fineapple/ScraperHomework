var express = require("express");
// var logger = require("morgan");
var mongoose = require("mongoose");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");
var exphbs = require("express-handlebars");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 3000;

// Initialize Express
var app = express();


// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

app.engine("handlebars", exphbs({defaultLayout: "main"}));
app.set("view engine", "handlebars");

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI);

// Routes
app.get("/", function(req,res){
  res.render("index");
});

// A GET route for scraping the  website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html 

  axios.get("https://www.sciencenews.org").then( function(response, err) {
    console.log("Cheerio: ", response);
    
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    var num = 0;
    // Now, we grab every h2 within an article tag, and do the following:
    $("article h2").each(function(i, element) {
      // Save an empty result object
      var articles = [];
      var result = {};
      num =(i);

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this).children("a").attr("title");
      result.link = $(this).children("a").attr("href");    
      if (result.title && result.link && result.teaser && result.imgLink) {
        articles.push(result);
    }
      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
          console.log(err);
        });
        
    });
    // Send a message to the client
    
    var object = { article: articles, num:num}
    res.render(object);
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true },  { useNewUrlParser: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});




//delete article and notes 
// app.delete("/delete/:id", function(req,res){
//  //find article to delete its notes
//  Article.findOne({ "_id": req.params.id }, function(err, data) {
//   if (err) {
//       console.log(err);
//   } else if (data.note) {
//       console.log("deleting note");
//       var noteIDs = data.note;
//       //loop through notes array to delete all notes linked to this article
//       for (var i = 0; i < noteIDs.length; i++) {
//           Note.findByIdAndRemove(noteIDs[i], function(error, doc) {
//               if (error) {
//                   console.log(error)
//               }
//           });
//       }
//    }
// });

//delete article
// Article.findByIdAndRemove(req.params.id, function(error, doc) {
//   if (error) {
//       console.log(error);
//   }
//   res.send(doc);
// });

// });

// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
