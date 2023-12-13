const axios = require("axios");
const http = require("http");
const path = require("path");
const express = require("express"); 
const app = express(); 
const portNumber = 5000;
const bodyParser = require('body-parser');
const fs = require("fs");


console.log(`Web server started and running at http://localhost:${portNumber}`);

app.use(bodyParser.urlencoded({ extended: true }));

process.stdin.setEncoding("utf8");

//MongoDB

require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') })  

const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection:process.env.MONGO_COLLECTION};
const databaseAndCollection2 = {db: process.env.MONGO_DB_NAME, collection:"userList"};


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://tvo2709:WwNISbYNvn6lMpUg@cluster0.c1daquy.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// WebApplication


app.set("views", path.resolve(__dirname, "templates"));

app.set("view engine", "ejs");

app.get("/", (request, response) => { 
  
  response.render("index");
})

app.post("/processRestaurants", (request, response) => { 
  let address = request.body.address;
  let quantity = request.body.quantity;
  const geocodes = {
    method: 'GET',
    url: 'https://maps-data.p.rapidapi.com/geocoding.php',
    params: {
      query: address,
      lang: 'en'
    },
    headers: {
      'X-RapidAPI-Key': '89ddd77d45msheb2bcd25c2ada19p1db08bjsnb6f9a5ccaa83',
      'X-RapidAPI-Host': 'maps-data.p.rapidapi.com'
    }
  };
  
  async function testFunc2() {
    try {
      const response = await axios.request(geocodes);
      let coord = {
        add: response.data.data.address,
        lat: response.data.data.lat,
        lng: response.data.data.lng
      }
      return coord;
    } catch (error) {
      console.error(error);
    }
  };
  let testResult = testFunc2();
  testResult.then((value) => {
    let restaurant = getRestaurant(value.lat, value.lng, quantity);
    
    let text = "";
    restaurant.then((value) => {
      value.forEach((element) => {    
        insertRestaurant(client, databaseAndCollection, element);  
        if (element.name != null) {
          text += "<p>Name: <b>" + element.name + "</b><br>";
        }

        if (element.full_address != null) {
          text += "Address: " + element.full_address + "<br>";
        }

        if (element.website != null) {
          text += "Website: " + element.website + "<br>";
        }

        if (element.rating != null && element.review_count != null) {
          text += "Overall rating: " + element.rating + " by " + element.review_count + " reviews<br>";
        }

        if (element.price_level != null) {
          text += "Price level: " + element.price_level + "<br>"
        }  
        text += "<img src=" + element.photos[0].src + " alt=\"Restaurant Image\"><br>";          
        text +="</p>";
        
      });
      const variables = {
        names: text,
        
      }
      response.render("listRestaurants", variables);
    })
  })

})

app.post("/added", (request, response) => {
  let restName = request.body.restName;
  //console.log(request.body.restName);
  let filter = {name: restName};
  let list = "";
  let result = findRestaurant(client, databaseAndCollection, filter);

  result.then((value) => {
    //console.log(value);
    insertRestaurant(client, databaseAndCollection2, value);
  })

  response.render("addedPage");

})

app.post("/viewList", (request, response) => {
  let result = findAllRestaurant(client, databaseAndCollection2, {});
  let list = "";
  result.then((value) => {
    value.forEach((element) => {
      if (element.name != null) {
        list += "<p>Name: <b>" + element.name + "</b><br>";
      }

      if (element.full_address != null) {
        list += "Address: " + element.full_address + "<br>";
      }

      if (element.website != null) {
        list += "Website: " + element.website + "<br>";
      }
      list += "<img src=" + element.photos[0].src + " alt=\"Restaurant Image\"><br>";          
      list +="</p>";

    })
    const variables = {
      list: list
    }
    response.render("view", variables);
  })
  
})

app.post("/removeAll", (request, response) => {
  removeAll(client, databaseAndCollection2);
  response.render("removed")
})

//API

function getRestaurant(latitude, langtitude, quantity) {
  const options = {
    method: 'GET',
    url: 'https://maps-data.p.rapidapi.com/searchmaps.php',
    params: {
      query: 'restaurant',
      limit: quantity,
      lang: 'en',
      lat: latitude,
      lng: langtitude,
      offset: '0',
      zoom: '13'
    },
    headers: {
      'X-RapidAPI-Key': '89ddd77d45msheb2bcd25c2ada19p1db08bjsnb6f9a5ccaa83',
      'X-RapidAPI-Host': 'maps-data.p.rapidapi.com'
    }
  };
  async function testFunc() {
    try {
      const response = await axios.request(options);
      return response.data.data;
    } catch (error) {
      console.error(error);
    }
    
  }
  return testFunc();
  
}

async function removeAll(client, databaseAndCollection) {
  await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .deleteMany({});

}

async function insertRestaurant(client, databaseAndCollection, newRes) {
  const collection = client.db(databaseAndCollection.db).collection(databaseAndCollection.collection);

  const existingRestaurant = await collection.findOne({ name: newRes.name });

  if (existingRestaurant) {
    console.log('Restaurant with the same key already exists.');
  } else {
    client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newRes);    console.log('New <link>restaurant</link> inserted successfully.');
  }  
}

async function findAllRestaurant(client, databaseAndCollection, filter) {
  const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .find(filter).toArray();                    
  return result;
}

async function findRestaurant(client, databaseAndCollection, filter) {
  const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);                    
  return result;
}

app.use(bodyParser.urlencoded({ extended: true }));

app.listen(portNumber);