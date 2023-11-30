const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(bodyParser.urlencoded({ extended: true }));

require("dotenv").config();

let connectionUrl = process.env.MONGO_DB_URL;

mongoose
  .connect(connectionUrl)
  .then(() => {
    console.log("Connection with DB is successful!");
  })
  .catch((err) => {
    console.log("ERROR: ", err);
  });

const itemsSchema = new mongoose.Schema({
  //creating Schema
  name: String,
});

const customListSchema = new mongoose.Schema({
  //Schema for the custom lists
  name: String,
  items: [itemsSchema],
});

const Item = new mongoose.model("item", itemsSchema); //Creating a new mongoose model(collection)
const customList = new mongoose.model("customList", customListSchema); //Creating a model for the custom lists
//customList is a collection that has 2 things: A name and an array of documents. Each document represents a Custom List(or collection).
//And each collection has its own array of documents(todo list items)
// So to delete an item from custom list, we need to modify the array of that particular collection

// Creating 3 new documents of 'Item' model
const item1 = new Item({
  name: "Welcome to ToDoBuddy — your ToDo List app!",
});

const item2 = new Item({
  name: "Hit the + button to add an item",
});

const item3 = new Item({
  name: "← Hit this to delete a particular item",
});

const defaultItems = [item1, item2, item3]; //Creating an array of docs

const insertItems = async () => {
  //Adding the docs to the collection
  try {
    await Item.insertMany(defaultItems);
    console.log("Successfully saved default items to DB.");
  } catch (err) {
    console.log("Error: ", err);
  }
};

const readItems = async (req, res) => {
  try {
    const result = await Item.find({});
    if (result.length === 0) {
      insertItems();
    }
    result.forEach((item) => {
      //just logging the docs present in Item model
      console.log(item);
    });

    res.render("todolist", {
      //rendering the response
      listTitle: "Today",
      listItems: result,
    });

    console.log("READ operation successful.");
  } catch (err) {
    console.log("ERROR: ", err);
  }
};

app.get("/", (req, res) => {
  readItems(req, res);
});

app.post("/", async (req, res) => {
  try {
    const itemName = req.body.item; //itemName will store the user input
    const listName = req.body.list; //storing the name of the list from which form data has been posted

    const newItem = new Item({
      //Creating a document containing the user input
      name: itemName,
    });

    if (listName === "Today") {
      newItem.save();
      res.redirect("/");
    } else {
      //First we need to find out the list from the customlists COllection
      const foundList = await customList.findOne({ name: listName }); //Now we have the list where we wanna insert data
      foundList.items.push(newItem);
      foundList.save();
      res.redirect("/" + listName);
    }
  } catch (err) {
    console.log("ERROR: ", err);
  }
});

app.post("/delete", async (req, res) => {
  try {
    console.log(req.body);
    const deleteID = req.body.deleteItem;
    const listName = req.body.listName;

    console.log("List Name:", listName);
    console.log("Delete ID:", deleteID);

    if (listName !== "Today") {
      //If the document to be deleted belongs to the Custom List
      if (deleteID) {
        //First, check if deleteID even exists or not

        const foundList = await customList.findOne({ name: listName }); //if deleteID exists, try find out that particular list(a document) from the array
        if (foundList) {
          //if the list is found successfully
          const index = await foundList.items.findIndex(
            //finding the index of the document to be deleted within the list
            (item) => item._id === deleteID
          );
          foundList.items.splice(index, 1); //deleting the document from the list
          await foundList.save(); //Saving the updated document
          console.log("Doc successfully deleted.");
        }
      }
      res.redirect("/" + listName);
    } else {
      if (deleteID) {
        await Item.findByIdAndDelete(deleteID);
        console.log("Doc successfully deleted.");
      }
      res.redirect("/");
    }
  } catch (err) {
    console.log("ERROR: ", err);
  }
});

//A function to capitalize the first letter of a word and making the remaining letters lowercase
const capitalize = (str) => {
  return str.slice(0, 1).toUpperCase() + str.slice(1).toLowerCase();
};

//Using Route Parameters to create Routes dynamically
app.get("/:listName", async (req, res) => {
  const newListName = capitalize(req.params.listName);

  try {
    const foundList = await customList.findOne({ name: newListName });

    if (!foundList) {
      //if no such document is present in the customlists collection, we create a brand new document.
      const list = new customList({
        name: newListName,
        items: [],
      });

      await list.save();
      res.redirect("/" + newListName);

      // Handle the response/rendering here
    } else {
      console.log("Document already exists!");
      res.render("todolist", {
        //rendering the response
        listTitle: newListName,
        listItems: foundList.items,
      });

      // The list already exists, handle the response/rendering here
    }
  } catch (error) {
    // Handle any errors that occur during the process
    console.error(error);
    res.status(500).send("An error occurred");
  }
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.listen("5000", () => {
  console.log("Server running on Port 5000.");
});
