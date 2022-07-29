const { Pool } = require('pg');
const config = require('../config');
const pool = new Pool(config.db)

pool.connect(err => {
    if(err) {
        console.log('Cannot connect to database');
    } else {
        console.log('Connected to database');
    }
})

async function query(query) {
    try {
        const { rows, fields } = await pool.query(query);
        return rows;
    } catch (err) {
        console.log(err.stack)
        return []
    }
}

module.exports = {
    query
}