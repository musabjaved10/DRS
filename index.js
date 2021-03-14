const express = require("express");
const app = express();
const ejsMate = require('ejs-mate');
const path = require('path')
const PORT = process.env.PORT || '3000'
const db = require('./model/dbConnection')
const methodOverride = require('method-override')
const flash = require('connect-flash')
const cookieParser = require('cookie-parser')
const session = require('express-session')


app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "public")));

//use cookie parser
app.use(cookieParser('secret'));

//config session
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 86400000 1 day
    }
}));

//Connect flash
app.use(flash());
app.use((req, res, next) => {
    // console.log(req.session)
    // if(!["/login","/"].includes(req.originalUrl)){
    //     req.session.returnTo = req.originalUrl;
    // };
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.user;
    next();
});

//importing routes

app.get('/',(req,res)=>{

    res.send('Root')
})

const userRoutes = require('./routes/user')
app.use("/",userRoutes)




app.listen(PORT,()=>{
    console.log(`Server is up on port ${PORT}`)
})