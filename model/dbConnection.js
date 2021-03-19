const mysql = require('mysql');

const db = mysql.createConnection({
    host : "localhost",
    user : "root",
    password: "",
    database: "desk",
    dateStrings: true
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Database connected successfully !')
});


module.exports = db;