const express = require('express');
const router = express.Router();
const {validationResult} = require("express-validator");
const auth = require('../validation/authValidation')
const bcrypt = require('bcrypt')
const db = require('../model/dbConnection')
const passport = require('../model/strategies')
const {checkLoggedIn, checkLoggedOut, isVerified ,isAdmin, isSuperAdmin} = require('../middleware')


router.get("/login", (req, res) => {
    res.render("authentication/login")
})
router.post("/login",checkLoggedOut, passport.authenticate("local", {
        successRedirect: '/',
        failureRedirect: '/login',
        successFlash: true,
        failureFlash: true
    })
);
router.get('/logout', (req, res) => {
    req.session.destroy(function (err) {
        return res.redirect("/login");
    });
})

router.get("/register", checkLoggedIn, isAdmin, (req, res) => {
    res.render("authentication/signup")
})
router.get("/newAdmin", checkLoggedIn, isSuperAdmin,(req, res) => {
    res.render("authentication/signup")
})
router.post("/register", auth.validateRegister, async (req, res) => {

    const {name, surname, email, password} = req.body;
    //validate required fields
    let errorsArr = [];
    let validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
        let errors = Object.values(validationErrors.mapped());
        errors.forEach((item) => {
            errorsArr.push(item.msg);
        });
        req.flash("error", errorsArr);
        return res.redirect("/register");
    }
    //create a new user
    let newUser = {
        name: name,
        surname: surname,
        email: email,
        password: password
    };
    try {
        const user = await createNewUser(newUser);
        console.log(user)
        req.flash('success', `Thanks for signing up ${name}`);
        return res.redirect("/login");
    } catch (err) {
        req.flash("error", err);
        console.log('error from catch', err)
        return res.redirect("/register");
    }
})


router.get("/forgot", (req, res) => {
    res.render("authentication/forgotpass")
})
router.get("/changepassword",checkLoggedIn,(req,res)=>{
    res.locals.currentUser = req.user
    res.render("authentication/changepass",)
})

let createNewUser = (data) => {
    return new Promise(async (resolve, reject) => {
        // check email is exist or not
        let isEmailExist = await checkExistEmail(data.email);
        if (isEmailExist) {
            reject(`Email ${data.email} already exist`);
        } else {
            // hash password
            let salt = bcrypt.genSaltSync(10);
            let userItem = {
                name: data.name,
                surname: data.surname,
                email: data.email,
                password: bcrypt.hashSync(data.password, salt),
            };

            //create a new account
            db.query(' INSERT INTO users set ? ', userItem, function (err, rows) {
                    if (err) {
                        console.log('error from createuser func', err)
                        reject(false)
                    }
                    resolve("User Created");
                }
            );
        }
    });
};

let checkExistEmail = (email) => {
    return new Promise((resolve, reject) => {
        try {
            db.query(' SELECT * FROM `users` WHERE `email` = ?  ', email, function (err, rows) {
                    if (err) {
                        reject(err)
                    }
                    if (rows.length > 0) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                }
            );
        } catch (err) {
            reject(err);
        }
    });
};


module.exports = router