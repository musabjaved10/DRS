const {check} = require('express-validator')

let validateRegister = [
    check("email", "Invalid email").isEmail().trim(),

    check("password", "Password must contain at least 8 characters")
        .isLength({min: 8}),

    check("repeatpassword", "Passwords do not match")
        .custom((value, {req}) => {
            return value === req.body.password

        })
];


module.exports = {
    validateRegister: validateRegister,

};