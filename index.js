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
const passport = require('passport')


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

    next();
});
// //Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());

const {checkLoggedIn} = require('./middleware')

//importing routes

app.get('/',checkLoggedIn, (req, res) => {
    res.locals.currentUser = req.user;
    res.render("index")
})

const userRoutes = require('./routes/user')
app.use("/", userRoutes)


app.listen(PORT, () => {
    console.log(`Server is up on port ${PORT}`)
})