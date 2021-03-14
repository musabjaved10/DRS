const express = require("express");
const app = express();
const ejsMate = require('ejs-mate');
const path = require('path')
const PORT = process.env.PORT || '3000'
const db = require('./model/dbConnection')




app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.get('/',(req,res)=>{

    res.send('hello')
})


app.listen(PORT,()=>{
    console.log(`Server is up on port ${PORT}`)
})