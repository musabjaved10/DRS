if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config();
}
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

const multer  = require('multer')



const expressError = require('./utils/expressError')
const catchAsync = require("./utils/catchAsync");

const {isSuperAdmin} = require("./middleware");


app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')))
app.use(methodOverride("_method"));

const storageFloor = multer.diskStorage({
    destination: function (req, file, cb) {

        cb(null, './public/img/FloorImages/')
    },
    filename: function (req, file, cb) {

        cb(null, file.originalname)
    }
})
const floorUpload = multer({ storage: storageFloor })

const storageRoom = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/img/roomImages/')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})
const roomUpload = multer({ storage: storageRoom })

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
app.use(
    async function(req,res,next){
        await db.query(`SELECT * FROM floor`,(err, Floors)=>{
            allFloors= Floors
            res.locals.allFloors =  allFloors
        })
        next();
    }

)

app.use((req, res, next) => {

    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.currentUser = req.user
    res.locals.returnTO = req.headers.referer
    res.locals.myDate = req.session.date || mydate
    res.locals.todayDate = todayDate
    next();
});
// //Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use(
    function(req,res,next){
        res.locals.currentFloor = 0
        next();
    }

)

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
let getIP = require('ipware')().get_ip;
app.use(
    function(req, res, next) {
        let ipInfo = getIP(req);
        // console.log(ipInfo.clientIp);
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
    return res.redirect(req.headers.referer)

})


app.get('/newBooking', checkLoggedIn, isVerified, catchAsync(async (req, res, next) => {
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

}))
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
            return res.redirect("/mybookings")
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})
app.get('/floor/:id', checkLoggedIn, isVerified,catchAsync( async (req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.currentFloor = req.params.id


    const sql = `SELECT * from room right join floor on room.floor_id = floor.floor_id where floor.floor_id = ${req.params.id}`

    try {
        await db.query({sql, nestTables: true}, async (err, mydata) => {
            if(err){
                return next(new expressError('Page not found', 404))
            }
            // console.log(mydata)
            res.render("showRoom",{mydata, CF: req.params.id})
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))

app.get('/room/:id', checkLoggedIn, isVerified, catchAsync(async (req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date
    res.locals.currentFloor = res.locals.currentFloor
    const sql = `SELECT * FROM desk       
        left join room on room.room_id = desk.room_id
        left join floor on room.floor_id = floor.floor_id
        left join booking_details on desk.desk_id = booking_details.desk_id 
        AND book_date = "${req.session.date}"  
        left join users on booking_details.user_id = users.user_id 
        WHERE desk.room_id = ${req.params.id}
        `

    try {
        await db.query({sql, nestTables: true}, async (err, desks) => {
            // console.log(desks)
            if(err){
                console.log(err)
                return next(new expressError('Page not found', 404))
            }
            // console.log(desks)
            return res.render('showDesk', {desks})
        })


    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))
app.get('/mybookings', checkLoggedIn, isVerified, catchAsync(async (req, res, next) => {
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

}))
app.get('/allbookings', checkLoggedIn, isVerified,isSuperAdmin, async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date
    try {
        const sql = `SELECT * FROM booking_details left JOIN desk on booking_details.desk_id = desk.desk_id
                     left join room on room.room_id = desk.room_id
                     left join floor on floor.floor_id = room.floor_id 
                     left join users on booking_details.user_id = users.user_id ORDER BY booking_details.book_date DESC`

        await db.query({sql,nestTables:true},(err,bookings)=>{
            if(err){
                console.log(err)
                return next(new expressError('Page not found', 404))
            }
            return res.render('allBookings',{bookings})
        })



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
            return res.redirect(req.headers.referer || '/mybookings')

        })


    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})

app.get('/superadmin', checkLoggedIn, isVerified, isSuperAdmin, catchAsync(async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date
    try {
        res.render('superAdmin')

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))
app.get('/managefloor', checkLoggedIn, isVerified, isSuperAdmin, catchAsync(async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    try {
        const sql = `SELECT * FROM floor`
        await db.query(sql,(err,floors)=>{
            if(err){
                return next(new expressError('Page not found', 404))
            }
            return res.render('floorManage',{floors})
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))
app.post('/addfloor', checkLoggedIn, isVerified, isSuperAdmin,floorUpload.single('floor_image'), catchAsync(async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    try {
        const {floor_name,total_rooms, floor_image ='/img/defaultFloorImage.jpg'} =req.body
        const sql = `INSERT INTO floor set ?`
        const dir = req.file.destination.replace('./public','')
        const newFloor = {
            floor_name,
            floor_image:dir+req.file.originalname,
            total_rooms
        }
        // console.log(req.file)

        await db.query(sql,newFloor,(err,floors)=>{
            if(err){
                return next(new expressError('Page not found', 404))
            }
            req.flash('success',`${floor_name} has been added.`)
            return res.redirect('/managefloor')
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))
app.post('/deletefloor', checkLoggedIn, isVerified, isSuperAdmin, async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    try {
        const {floor_id,floor_name} =req.body
        const sql = `DELETE FROM floor where floor_id = ${floor_id}`
        await db.query(sql,(err,floors)=>{
            if(err){
                return next(new expressError('Page not found', 404))
            }
            req.flash('success',`${floor_name} has been deleted.`)
            return res.redirect(req.headers.referer)
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

})
app.get('/manageroom', checkLoggedIn, isVerified, isSuperAdmin, catchAsync(async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date
    // res.locals.allFloors =  allFloors
    // console.log(allFloors)

    try {
        const sql = `SELECT * FROM room left join floor on room.floor_id = floor.floor_id`
        await db.query({sql, nestTables:true},(err,rooms)=>{
            if(err){
                return next(new expressError('Page not found', 404))
            }
            // console.log(rooms)
            return res.render('roomManage',{rooms})
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))
app.post('/addroom', checkLoggedIn, isVerified, isSuperAdmin,roomUpload.single('room_image'), catchAsync(async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    try {
        const {room_name,floor_id, room_image ='/img/defaultRoomImage.jpg'} =req.body
        const sql = `INSERT INTO room set ?`
        const dir = req.file.destination.replace('./public','')
        const newRoom = {
            room_name,
            floor_id,
            room_image:dir+req.file.originalname
        }
        // console.log(req.body)

        await db.query(sql,newRoom,(err,result)=>{
            if(err){
                return next(new expressError('Page not found', 404))
            }
            req.flash('success',`${room_name} has been added.`)
            return res.redirect('/manageroom')
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))
app.post('/deleteroom', checkLoggedIn, isVerified, isSuperAdmin, catchAsync(async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    try {
        const {room_id,room_name} =req.body
        const sql = `DELETE FROM room where room_id = ${room_id}`
        await db.query(sql,(err,floors)=>{
            if(err){
                return next(new expressError('Page not found', 404))
            }
            req.flash('success',`${room_name} has been deleted.`)
            return res.redirect(req.headers.referer)
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))

app.get('/managedesk', checkLoggedIn, isVerified, isSuperAdmin, catchAsync(async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    try {
        const sql = `SELECT * FROM desk left join room on desk.room_id = room.room_id left join floor on floor.floor_id = room.floor_id`
        await db.query({sql, nestTables:true},async(err,desks)=>{
            if(err){
                return next(new expressError('Page not found', 404))
            }
            // console.log(rooms)
            await db.query({sql:'SELECT * FROM room left join floor on room.floor_id = floor.floor_id', nestTables:true},(err,rooms)=>{
                if(err){
                    return next(new expressError('Page not found', 404))
                }
                // console.log(rooms)
                return res.render('deskManage',{desks,rooms})
            })
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))
app.post('/adddesk', checkLoggedIn, isVerified, isSuperAdmin, catchAsync(async (req, res,next) => {
    res.locals.currentUser = req.user;
    res.locals.date = req.session.date

    try {
        const {desk_name,room_id, } =req.body
        const sql = `INSERT INTO desk set ?`

        const newRoom = {
            desk_name,
            room_id,
        }
        // console.log(req.body)

        await db.query(sql,newRoom,(err,result)=>{
            if(err){
                console.log(err)
                return next(new expressError('Page not found', 404))
            }
            req.flash('success',`${desk_name} has been added.`)
            return res.redirect('/managedesk')
        })

    } catch (e) {
        req.flash('error', 'Something is wrong. Please try again later.');
        res.redirect("/")
    }

}))




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