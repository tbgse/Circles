var express = require('express'),
    http = require('http'),
    router = express(),
    server = http.createServer(router),
    jdenticon = require('jdenticon'),
    fs = require('fs'),
    md5 = require('js-md5'),
    userObj = {},
    activeUsers = [],
    io = require('socket.io')(server),
    dotenv = require('dotenv').config();

router.get('/',function(req,res){
    res.sendFile(process.cwd()+'/public/index.html')
})

router.use(express.static('public'))
io.on('connection',function(socket){
    var username;
    console.log('a user connected');
    socket.on('disconnect',function(){
        
        console.log('user '+username+ ' is disconnecting')
        delete userObj[username]
        console.log(userObj)
        if (activeUsers.indexOf(username) >= 0){
        activeUsers.splice(activeUsers.indexOf(username),1);
        console.log("currently active "+activeUsers)
        }
        io.emit('channel leave',username)
        fs.access(process.cwd()+"/public/icons/"+encodeFilename(username)+".svg", fs.R_OK | fs.W_OK, function (err) {
        console.log(err ? 'no access!' : 'can read/write');
        if(!err){
        fs.unlink(process.cwd()+"/public/icons/"+encodeFilename(username)+".svg",function(){
        console.log('file '+encodeFilename(username)+'.svg has been deleted.')
        })
        }
});
    })
    socket.on('channel join',function(user){


        while (activeUsers.indexOf(user) >=0 ) {
        console.log('user already exists, creating alter ego')
        user = user += Math.floor(Math.random()*100)
        }
        username = user;
        userObj[username] = socket.id;
        console.log(userObj)
        activeUsers.push(user)
        console.log('currently active '+activeUsers)
        var hash = md5(username);
        var size = 50;
        var svg = jdenticon.toSvg(hash, size);
        socket.emit('channel load',activeUsers);
        fs.writeFile(process.cwd()+"/public/icons/"+encodeFilename(username)+".svg",svg,function(err){
            if (err) console.log(err);
        socket.broadcast.emit('channel join',user);
        })

    })
    socket.on('text message',function(msg){
        socket.broadcast.emit('text message',msg)
    })
    socket.on('whisper message',function(msg){
        var recipient = msg.input[0];
        msg.input.splice(0,1);
        var message = msg.input.join(" ");
        var socketid = userObj[recipient]
        console.log(message);
        var socketid = userObj[recipient];
        if (io.sockets.connected[socketid]) {
          console.log("socket found!");
          io.sockets.connected[socketid].emit('whisper message',{username:msg.username, message:message});
        }
    })
})

server.listen(process.env.PORT, function(){
    console.log('Server listening on port '+ process.env.PORT);
});


String.prototype.hashCode = function() {
  var hash = 0, i, chr, len;
  if (this.length === 0) return hash;
  for (i = 0, len = this.length; i < len; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function encodeFilename(str){
    return encodeURIComponent(str).replace(/[%\.]/gi,'_');
}
