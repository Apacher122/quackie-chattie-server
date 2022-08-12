const app = require('express');
const socketIO = require('socket.io');
const queries = require('./database/queries')

const PORT = process.env.PORT || 3000;
const INDEX = '/index.html'

const server = app()
    .use((req,res) => res.sendFile(INDEX, { root: __dirname}))
    .listen(PORT, () => console.log('Listening on ', PORT));

const io = socketIO(server);

io.on('connection', function(socket) {
    var username = '';
    var user_id = '';
    var room_id = '';

    console.log('Connection : Socket ID = ', socket.id)
    io.to(socket.id).emit("connected")

    // Login, Sign-Up, Sign-Out
    socket.on('signUp', async function(data) {
        const newUserData = JSON.parse(data)
        username = newUserData.uName
        const uid = newUserData.uid
        console.log(username, " attempting Sign-Up")

        const res = await queries.insertUser(uid, username)
    })

    socket.on('checkUsername', async function(data) {
        const newUserData = JSON.parse(data)
        username = newUserData.uName
        console.log(username, " attempting Sign-In")

        const res = await queries.checkUsername(username)
        
        if (res) {
            var count = Object.keys(res).length;
            if (count > 0) {
                console.log(username, " found")
                io.to(socket.id).emit("USER_EXISTS")
            } else {
                console.log(username, " not found")
                io.to(socket.id).emit("NEW_USER")
            }
        }
    })
    
    socket.on('disconnect', function(){
        console.log("One of sockets disconnected from server")
    });

    // Populate chat rooms or join chat rooms
    socket.on('getRooms', async function(data) {
        const userData = JSON.parse(data)
        const uid = userData.uid 

        // Grab user_id to find rooms
        const getUserID = await queries.getUserID(uid)
        user_id = getUserID[0].user_id

        // Now get room_id and room_name
        const rooms = await queries.getRoomsList(user_id)

        if(rooms) {
            var count = Object.keys(rooms).length;
            console.log("ROOMS SIZE: ", count)
            for (let i = 0; i < count; i++) {
                const roomData = {
                    room_id: rooms[i].room_id,
                    room_name: rooms[i].room_name,
                    user_name: username
                }
                io.to(socket.id).emit("populate_chat_list", JSON.stringify(roomData))
            }
        }
    })

    socket.on('joinRoom', async function(data) {
        const userData = JSON.parse(data)
        username = userData.user_name
        const room_name = userData.room_name

        const res = await queries.getRoomInfo(room_name)

        if(res) {
            var count = Object.keys(res).length;
            if (count > 0) {
                // room exists
                console.log("\tJoining room: ", room_name)
                room_id = res[0].room_id
            } else {
                // create room
                const res = await queries.createRoom(room_name)
                console.log("\tAttempting to create room: ", res)
                const temp = await queries.getRoomInfo(room_name)
                if (temp) {
                    var count = Object.keys(temp).length;
                    if (count > 0) {
                        room_id = temp[0].room_id
                    }
                }
            }
        }

        // Refactor participants table
        const message = await queries.joinRoom(user_id, room_id)

        socket.join(room_name)
        console.log('Username:',username ,'joined the room')
        io.to(room_name).emit('userJoined', username);
    })

    // Chat-Room funsies
    socket.on('getMessages', async function(data) {
        const roomData = JSON.parse(data)
        const room_name = roomData.room_name
        
        // LOAD MESSAGES
        const roomInfo = await queries.getRoomInfo(room_name)
        if (roomInfo) {
            var count = Object.keys(roomInfo).length;
            if (count > 0) {
                room_id = roomInfo[0].room_id
            }
        }

        // Populate chats
        const messages = await queries.getMessages(room_id)
        console.log("TRYING TO POPULATE MESSAGES FOR ROOM: ", room_name)
        if (messages) {
            var count = Object.keys(messages).length;
            for (let i = 0; i < count; i++) {
                const messageData = {
                    sender: messages[i].sender,
                    message_text: messages[i].message_text,
                    room_name: room_name
                }
                io.to(socket.id).emit("populateMessages", JSON.stringify(messageData))
            }
        }  
    })

    socket.on('newMessage', async function(data) {
        const messageData = JSON.parse(data)
        const messageContent = messageData.content
        const rName = messageData.rName
        console.log('[Room Number :', rName, ', ', username, ': ', {messageContent})
        
        const temp = await queries.getRoomInfo(rName)
        if (temp) {
            var count = Object.keys(temp).length;
            if (count > 0) {
                room_id = temp[0].room_id
            }
        }
        const res = await queries.sendMessage(username, messageContent, room_id)


        const chatData = {
            uName : username,
            content : messageContent,
            rName : rName
        }
        socket.broadcast.to(rName).emit('update', JSON.stringify(chatData))
    })

    socket.on('leave_room', function(data) {
        const room_data = JSON.parse(data)
        const uName = room_data.user_name;
        const rName = room_data.room_name;

        console.log('Username :', uName, ' left the room')
        socket.broadcast.to(rName).emit('userLeft', uName)
        socket.leave(rName)
    })
})

module.exports = server;