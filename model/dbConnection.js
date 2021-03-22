const mysql = require('mysql');

const db = mysql.createConnection({
    host : "www.deghjee.com",
    user : "jiyoscic_musabTest",
    password: "lr7kjtqm110",
    database: "jiyoscic_desk",
    dateStrings: true
});

db.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Database connected successfully !')
});


module.exports = db;