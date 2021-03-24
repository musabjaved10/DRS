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

const expressError = require('./utils/expressError')
const catchAsync = require("./utils/catchAsync");


app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')))
app.use(methodOverride("_method"));

const date = new Date();
let mydate = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${date.getDate() + 1}`
let todayDate = `${date.getFullYear()}-${("0" + (date.getMonth() + 1)).slice(-2)}-${date.getDate()}`


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
let allFloors;
db.query(`SELECT * FROM floor`,(err, Floors)=>{
    allFloors= Floors
})
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
    res.locals.todayDate = todayDate
    res.locals.allFloors = allFloors
    next();
});
// //Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());

const {checkLoggedIn, isVerified} = require('./middleware')
//ip address functionality

// const { networkInterfaces } = require('os');
// const nets = networkInterfaces();
// const results = {};
// for (const name of Object.keys(nets)) {
//     for (const net of nets[name]) {
//         // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
//         if (net.family === 'IPv4' && !net.internal) {
//             if (!results[name]) {
//                 results[name] = [];
//             }
//             results[name].push(net.address);
//         }
//     }
// }


//ip functionality?////
var getIP = require('ipware')().get_ip;
app.use(
    function(req, res, next) {
        var ipInfo = getIP(req);
        console.log(ipInfo.clientIp);
        // { clientIp: '127.0.0.1', clientIpRoutable: false }
        next();
    }
)
//importing routes


const userRoutes = require('./routes/user')
app.use("/", userRoutes)

app.get('/', checkLoggedIn, isVerified, (req, res) => {
    res.locals.currentUser = req.user;
    req.session.date = req.session.date || mydate
    // console.log(results)

    res.render("index")
})
app.post('/', checkLoggedIn, isVerified, (req, res, next) => {
    res.locals.currentUser = req.user;
    req.session.date = req.body.date
    return res.redirect('/')

})


app.get('/newBooking', checkLoggedIn, isVerified, async (req, res, next) => {
    res.locals.currentUser = req.user;
    const sql = "SELECT * FROM floor"
    try {
        await db.query(sql, (err, floors) => {
            if(err){
                return next(new expressError('Page not found', 404))
            }
            return res.render('newBooking', {floors})
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})
app.post('/book', checkLoggedIn, isVerified, async (req, res, next) => {

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
            if(err){
                return next(new expressError('Page not found', 404))
            }
            req.flash('success',`success, your desk has been booked for ${req.session.date}`)
            return res.redirect("/")
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})
app.get('/floor/:id', checkLoggedIn, isVerified, async (req, res, next) => {
    res.locals.currentUser = req.user;


    const sql = `SELECT * FROM room WHERE floor_id = ${req.params.id}`
    const sql2 = `SELECT * FROM floor`
    let mydata = {rooms:[], floors:[]}
    try {
        await db.query(sql, req.params.id, async (err, rooms) => {
            if(err){
                return next(new expressError('Page not found', 404))
            }
            mydata.rooms = rooms
            await db.query(sql2, req.params.id, (err, floors) => {
                mydata.floors = floors
                res.render("showRoom",{mydata})
            })
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})

app.get('/room/:id', checkLoggedIn, isVerified, async (req, res, next) => {
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
            // console.log(desks)
            if(err){
                return next(new expressError('Page not found', 404))
            }
            return res.render('showDesk', {desks})
        })


    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})
app.get('/mybookings', checkLoggedIn, isVerified, async (req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    const sql = `SELECT * FROM desk               
        left join room on desk.room_id = room.room_id 
        left join floor on floor.floor_id = room.room_id
        left join booking_details on desk.desk_id = booking_details.desk_id           
        left join users on booking_details.user_id = users.user_id 
        where booking_details.user_id = ${req.user.user_id} ORDER BY booking_details.book_date DESC
        `

    try {
        await db.query({sql, nestTables: true}, async (err, bookings) => {
            if(err){
                return next(new expressError('Page not found', 404))
            }
            // console.log(bookings)
            return res.render('myAllBookings', {bookings})
        })


    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})
app.get('/allbookings', checkLoggedIn, isVerified, async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date



    try {
        res.render('allBookings')

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})
app.post('/checkin', checkLoggedIn, isVerified, async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date


    try {
        const {booking_id, book_date} = req.body;
        const sql = `UPDATE booking_details set checked_in = 1 WHERE booking_id = "${booking_id}" and book_date = "${book_date}" `

        await db.query({sql, nestTables: true}, async (err, data) => {
            req.flash('success','You have checked-in')
            if(err){
               return next(new expressError('Page not found', 404))
            }
            return res.redirect('/mybookings')

        })


    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})

app.get('/superadmin', checkLoggedIn, isVerified, async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    try {
        res.render('superAdmin')

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})


app.get('/blank', async (req, res, next) => {
    res.locals.currentUser = req.user;
    res.render("blankPage")
})

app.get('/check/:id', catchAsync(async (req, res, next) => {
    res.locals.currentUser = req.user;
    try{
        req.flash('error','from check route')
    res.redirect('/')

    } catch (e) {
            req.flash('error', 'Something is wrong. Please try later');
            res.redirect('/')
    }

}))
app.all("*",  checkLoggedIn, isVerified,(req, res, next) => {
    res.locals.currentUser = req.user
    next(new expressError('Page not found', 404))
})

app.use((err, req, res, next) => {
    const {statusCode = 500} = err;
    const error = err
    if (!err.message) err.message = "Something went wrong";
    res.status(statusCode).render("error", {err});
});

app.listen(PORT, () => {
    console.log(`Server is up on port ${PORT}`)
})