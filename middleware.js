module.exports.checkLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    next();
};

module.exports.checkLoggedOut = (req, res, next) => {
    if (req.isAuthenticated()) {
        return res.redirect("/");
    }
    next();
};

module.exports.isVerified = (req,res,next)=>{
    if(req.user.isVerified === 0){
        return res.redirect("/changepassword")
    }
    next()
}