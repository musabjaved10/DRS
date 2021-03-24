const express = require('express');
const router = express.Router();
const {validationResult} = require("express-validator");
const auth = require('../validation/authValidation')
const bcrypt = require('bcrypt')
const db = require('../model/dbConnection')
const passport = require('../model/strategies')
const {checkLoggedIn, checkLoggedOut, isVerified ,isAdmin, isSuperAdmin} = require('../middleware')


router.get("/login",checkLoggedOut, (req, res) => {
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
        req.flash('success', `User ${name} ${surname} has been created`);
        return res.redirect("/");
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
router.post("/changepassword",checkLoggedIn,async(req,res)=>{
    res.locals.currentUser = req.user
    try {
        const {currentPassword, newPassword} = req.body;
        let match = await comparePassword(currentPassword,req.user.password)
        if(match === true){
            let salt = bcrypt.genSaltSync(10);
            let hashedPassword = bcrypt.hashSync(newPassword,salt)
            await db.query(`UPDATE users SET password = "${hashedPassword}" WHERE user_id = ${req.user.user_id} `,async(err,result)=>{
                if(err){
                    console.log(err)
                    req.flash("error",err)
                    return res.redirect('/changepassword')
                }
                await db.query(`UPDATE users SET isVerified = 1 where user_id = ${req.user.user_id}`,(err,result)=>{
                    if(err){
                        console.log(err)
                        req.flash("error",'Oops! something went wrong. Please try again')
                        return res.redirect('/changepassword')
                    }

                    req.flash('success','Password has been changed successfully')

                    return res.redirect('/')
                })
            })
        }else{
            req.flash('error','Incorrect current password')
            return res.redirect('/changepassword')
        }

    } catch (err) {
        req.flash("error", err);
        console.log('error from catch', err)
        return res.redirect("/changepassword");
    }


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

let comparePassword = (password,hashedPassword) => {
    return new Promise(async (resolve, reject) => {
        try {
            await bcrypt.compare(password, hashedPassword).then((isMatch) => {
                if (isMatch) {
                    resolve(true);
                } else {
                    resolve(`Incorrect Password`);
                }
            });
        } catch (e) {

            reject(e);
        }
    });
};


module.exports = router