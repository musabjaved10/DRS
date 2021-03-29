
const express = require('express');
const router = express.Router();
const {validationResult} = require("express-validator");
const auth = require('../validation/authValidation')
const bcrypt = require('bcrypt')
const db = require('../model/dbConnection')
const passport = require('../model/strategies')
const {checkLoggedIn, checkLoggedOut, isVerified ,isAdmin, isSuperAdmin} = require('../middleware')
const nodemailer = require('nodemailer')

function sendEmail(email,name,password ) {
    const output = `    
    <h3>Credentials for your account</h3>           
    <p>Dear ${name}, Your account has been created. Please note the credentials</p>    
    <ul>
        <li>email: ${email}</li>
        <li>pass: ${password}</li>
    </ul>    
    <p>You will be asked to change your password after first login</p>
    <p>Regards, <strong>Admin</strong></p>
  `;

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'mail.deghjee.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.sender_email || 'info@deghjee.com', // use your own email in env file or here
            pass: process.env.sender_email_pass || 'saifali18'  // use your pass in env file or here
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"noreply" <musabjaved10@gmail.com>', // sender address
        to: `${email}`, // list of receivers
        subject: 'Account has been created.', // Subject line
        text: 'Desk management system', // plain text body
        html: output // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        res.render('contact', {msg: 'Email has been sent'});
    });
}

function sendForgotEmail(email,hash ) {
    const output = `    
    <h3>Reset you password</h3>           
    <p>Dear user, a password reset request was made for your email</p>    
    <p><a href="http:${process.env.domain}/reset/${hash}/${email}">CLick here to reset your password</a></p>  
    <p>If above doesn't work. Paste the following link in the url</p>
    <ul>           <li>http:${process.env.domain}/reset/${hash}/${email}</li>
    </ul>
    <p>Regards, <strong>Admin</strong></p>
  `;

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'mail.deghjee.com',
        port: 465,
        secure: true, // true for 465, false for other ports
        auth: {
            user: process.env.sender_email || 'info@deghjee.com', // use your own email in env file or here
            pass: process.env.sender_email_pass || 'saifali18'  // use your pass in env file or here
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    // setup email data with unicode symbols
    let mailOptions = {
        from: '"noreply" <musabjaved10@gmail.com>', // sender address
        to: `${email}`, // list of receivers
        subject: 'Reset credentials', // Subject line
        text: 'Desk management system', // plain text body
        html: output // html body
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        res.render('contact', {msg: 'Email has been sent'});
    });
}


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
    res.render("authentication/makeNewAdmin")
})
router.post("/newadmin", auth.validateRegister, async (req, res) => {

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
        password: password,
        role: 1
    };
    try {
        const user = await createNewUser(newUser);
        console.log(user)
        req.flash('success', `Admin ${name} ${surname} has been created. Notification email also sent`);
        sendEmail(email,name,password)
        return res.redirect("/");
    } catch (err) {
        req.flash("error", err);
        console.log('error from catch', err)
        return res.redirect("/register");
    }
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
        password: password,
        role: 2
    };
    try {
        const user = await createNewUser(newUser);
        console.log(user)
        req.flash('success', `User ${name} ${surname} has been created. Notification email also sent`);
        sendEmail(email,name,password)
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
router.post("/forgot", async(req, res) => {
    try {
        let val = (Math.floor(1000 + Math.random() * 9000)).toString();
        const {email} = req.body
        if(typeof(email)=='undefined' ){
            return res.redirect('/forgot')
        }
        await findUserByEmail(email).then(async (user) => {

            if (!user) {
                req.flash('error',`'Email ${email} doesn't exist.`)
                return res.redirect('/forgot')
            }
            if (user) {
                // console.log('heyyy its a user', user)
                const newItem = {
                    email,
                    hash:val
                }
                await db.query('INSERT INTO forgot set ?',newItem,async (err,result)=>{
                    if(err){
                        req.flash('error','Something went wrong. Please try later')
                        return res.redirect("/forgot")
                    }
                    await sendForgotEmail(email,val)
                    req.flash('success','An email has been sent to you')
                    return res.redirect('/login')
                })

            }
        });


    }catch (e) {
        console.log(e)
        req.flash('error','Something went wrong. Please try later')
        return res.redirect("/login")
    }
})

router.get("/reset/:c/:email",async(req,res)=>{
    try{
        const{c,email} = req.params
        await db.query(`SELECT * FROM forgot WHERE email = "${email}" and hash = "${c}"`,(err,result)=>{
            if(err){
                console.log(err)
                req.flash('error','Something went wrong. Please try later')
                return res.redirect("/login")
            }
            else{

                if(result.length===0){
                    req.flash('error','Link expired')
                    return res.redirect("/login")
                }
                else{
                    return res.render('authentication/resetPass',{c,email})
                }
            }

        })


    }catch (e) {
        console.log(e)
        req.flash('error','Link expired')
        return res.redirect("/login")
    }
})
router.post("/reset/:c/:email",async(req,res)=>{
    try{
        const {newPassword} = req.body;
        const{c,email} = req.params
        let salt = bcrypt.genSaltSync(10);
        let hashedPassword = bcrypt.hashSync(newPassword,salt)
        await db.query(`UPDATE users SET password = "${hashedPassword}" WHERE email = "${email}" `,async(err,result)=> {
            if (err) {
                console.log(err)
                req.flash("error", 'Something went wrong. Please try later')
                return res.redirect('//login')
            }
            await db.query(`DELETE FROM forgot WHERE email = "${email}" `,async(err,result)=> {
                req.flash('success','Password has been changed')
                return res.redirect('/login')
            })

        })


    }catch (e) {
        req.flash('error','Link expired')
        return res.redirect("/login")
    }
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
                role: data.role
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

let findUserByEmail = (email) => {
    // console.log('printing email from userbyEMAIL func ' + email)

    return new Promise((resolve, reject) => {
        try {
            const sql = ' SELECT * FROM users WHERE email = ?  '
            db.query(sql, email, function (err, rows) {
                    if (err) {
                        // console.log('erorrrr')
                        reject(err)
                    }
                    // console.log(rows )
                    let user = rows[0];
                    // console.log(user)
                    resolve(user);
                }
            );
        } catch (err) {
            // console.log('error from findUserByEmail catch')
            reject(err);
        }
    });
};


module.exports = router