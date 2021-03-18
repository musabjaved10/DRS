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
app.use(express.static(path.join(__dirname, 'public')))
app.use(methodOverride("_method"));


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
    res.locals.currentUser = req.user
    res.locals.returnTO = req.headers.referer

    next();
});
// //Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());

const {checkLoggedIn, isVerified} = require('./middleware')

//importing routes


const userRoutes = require('./routes/user')
app.use("/", userRoutes)

app.get('/', checkLoggedIn, isVerified, (req, res) => {
    res.locals.currentUser = req.user;


    res.render("index")
})

app.get('/newBooking', checkLoggedIn, isVerified, async (req, res) => {
    res.locals.currentUser = req.user;

    const sql = "SELECT * FROM floor"
    try {
        await db.query(sql, (err, floors) => {
            return res.render('newBooking', {floors})
        })

    } catch (e) {
        if (e.errno === 19) {
            res.status(400).json('Duplication error from database');
        } else {
            res.status(400).json('Something broke! ' + e);
        }
    }

})
app.get('/floor/:id', checkLoggedIn, isVerified, async (req, res) => {
    res.locals.currentUser = req.user;


    const sql = `SELECT * FROM room WHERE floor_id = ${req.params.id}`
    try {
        await db.query(sql, req.params.id, (err, rooms) => {
            return res.render('showRoom', {rooms})
        })

    } catch (e) {
        if (e.errno === 19) {
            res.status(400).json('Duplication error from database');
        } else {
            res.status(400).json('Something broke! ' + e);
        }
    }

})
app.get('/room/:id', checkLoggedIn, isVerified, async (req, res) => {
    res.locals.currentUser = req.user;
    const sql = `SELECT * FROM desk WHERE room_id = ${req.params.id}`
    try {
        await db.query(sql, req.params.id, (err, desks) => {
            return res.render('showDesk', {desks})
        })

    } catch (e) {
        if (e.errno === 19) {
            res.status(400).json('Duplication error from database');
        } else {
            res.status(400).json('Something broke! ' + e);
        }
    }

})

app.get('/check/:id', async (req, res) => {
    res.locals.currentUser = req.user;
    const sql = `SELECT * FROM room WHERE floor_id = ${req.params.id}`
    try {
        await db.query(sql, (err, rooms) => {
            console.log(rooms)
        })

    } catch (e) {
        if (e.errno === 19) {
            res.status(400).json('Duplication error from database');
        } else {
            res.status(400).json('Something broke! ' + e);
        }
    }

})


app.listen(PORT, () => {
    console.log(`Server is up on port ${PORT}`)
})