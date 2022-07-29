const db = require('./db');
const helper = require('../helper')
const fmt = require('pg-format');

async function checkUsername(username) {
    var qry = fmt(`
    SELECT username
    From users
    WHERE username = %L`, username);

    const rows = await db.query(qry);
    const data = helper.hasRows(rows);
    return data
}

async function insertUser(user_id, username) {
    var qry = fmt(`
    INSERT INTO users(firebase_uid, username)
    VALUES (%L, %L)`, user_id, username);

    const res = await db.query(qry);
    return res
}

async function getUserID(firebase_uid) {
    var qry = fmt(`
    SELECT user_id
    FROM users
    WHERE users.firebase_uid = %L`, firebase_uid);

    const data = await db.query(qry);
    console.log("AFTER GETTING QUERY: ", data)
    return data
}

async function getRoomsList(user_id) {
    var qry = fmt(`
            SELECT R.room_id, R.room_name
            FROM rooms R
            RIGHT JOIN participants P
            ON P.room_id = R.room_id
            WHERE P.user_id = %L`, user_id);
    
    const data = await db.query(qry)
    const rows = helper.hasRows(data)
    return rows
}

async function getRoomInfo(room_name) {
    var qry = fmt(`
    SELECT room_name, room_id
    FROM rooms
    WHERE room_name = %L`, room_name)

    const res = await db.query(qry)
    const rows = helper.hasRows(res)
    return rows
}

async function joinRoom(user_id, room_id) {
    var qry = fmt(`
    INSERT INTO participants(user_id, room_id)
    VALUES (%L, %L)`, user_id, room_id)

    const res = await db.query(qry)
    return res
}

async function createRoom(room_name) {
    var qry = fmt(`
    INSERT INTO rooms(room_name)
    VALUES (%L)`, room_name)

    const res = await db.query(qry)
    let message = "Cannot create room"
    if(res.length) {
        message = "Room created"
    }

    return message
}

async function sendMessage(sender, message_text, room_id) {
    var qry = fmt(`
    INSERT INTO messages(sender, message_text, room_id)
    VALUES (%L, %L, %L)`, sender, message_text, room_id)

    const res = await db.query(qry)
    let message = "Message not sent"
    if (res.length) {
        message = "Message sent"
    }

    return message
}

async function getMessages(room_id) {
    var qry = fmt(`
    SELECT sender, message_text
    FROM messages
    WHERE room_id = %L`, room_id)

    const res = await db.query(qry)
    console.log("GETMESSAGES: ", res)
    const rows = helper.hasRows(res)
    return rows
}

module.exports = {
    checkUsername,
    insertUser,
    getUserID,
    getRoomsList,
    getRoomInfo,
    joinRoom,
    createRoom,
    sendMessage,
    getMessages
}