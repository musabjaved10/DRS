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
module.exports.isAdmin = (req,res,next)=>{
    if(req.user.role == 0 || req.user.role == 1 ){
        return next()
    }
    req.flash('error', 'You are not authorized');
    return res.redirect("/")
}
module.exports.isSuperAdmin = (req,res,next)=>{
    if(req.user.role != 0){
        req.flash('error', 'You are not authorized');
        return res.redirect("/")
    }
    next()
}