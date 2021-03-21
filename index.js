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

const date = new Date();
let mydate = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${date.getDate() + 1}`


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
    res.locals.myDate = req.session.date || mydate
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
    req.session.date = req.session.date || mydate
    res.render("index")
})
app.post('/', checkLoggedIn, isVerified, (req, res) => {
    res.locals.currentUser = req.user;
    req.session.date = req.body.date
    return res.redirect('/')

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
app.post('/book', checkLoggedIn, isVerified, async (req, res) => {

    const sql = `INSERT into booking_details set ?`
    try {
        const booking = {
            user_id: req.user.user_id,
            room_id: req.body.room_id,
            desk_id: req.body.desk_id,
            floor_id: req.body.floor_id,
            book_date: req.session.date,
        }
        console.log(req.body)
        await db.query(sql, booking, (err, data) => {
            req.flash('success',`success, your desk has been booked for ${req.session.date}`)
            return res.redirect("/")
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
    console.log(req.session.date)
    res.locals.date = req.session.date
    const sql = `SELECT * FROM desk       
        left join room on room.room_id = desk.room_id
        left join booking_details on desk.desk_id = booking_details.desk_id 
        AND book_date = "${req.session.date}"  
        left join users on booking_details.user_id = users.user_id 
        WHERE desk.room_id = ${req.params.id}
        `

    try {
        await db.query({sql, nestTables: true}, async (err, desks) => {
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

app.get('/blank', async (req, res) => {
    res.locals.currentUser = req.user;
    res.render("blankPage")
})

app.get('/check/:id', async (req, res) => {
    res.locals.currentUser = req.user;
    let deskResult = []
    let deskBooked = []

    function newDesk(desk_id, desk_status, desk_name, room_id) {
        const result = {desk_id, desk_status, desk_name, room_id}
        return result
    }

    const sql = `SELECT * from desk where desk_id = ${req.params.id}`
    const sql1 = `SELECT desk_id from booking_details WHERE book_date = "${req.session.date || mydate}"`

    try {
        await db.query(sql1, async (err, data) => {
            for (let item of data) {
                deskBooked.push(item.desk_id)
            }
        })
        await db.query(sql, async (err, data) => {
                console.log(data)
                for (let item of data) {

                    if (deskBooked.includes(item.desk_id)) {

                        deskResult.push(newDesk(item.desk_id, 'booked', item.desk_name, item.room_id))
                    } else {

                        deskResult.push(newDesk(item.desk_id, 'available', item.desk_name, item.room_id))
                    }
                }
                res.render("deskDetails", {deskResult})
            }
        )


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