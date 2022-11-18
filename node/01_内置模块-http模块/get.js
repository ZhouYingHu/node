var http = require("http")
var https = require('https')
var { EventEmitter } = require('events')
let event = null
http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json;charset=utf-8",
        "access-control-allow-origin": '*'
    })
    event = new EventEmitter()
    event.on('play', (data) => {
        res.end(data)
    })
    httpget()
}).listen(8080)
function httpget() {
    var data = ''
    https.get(`https://portal-portm.meituan.com/horn/v1/modules/lx-web-config/prod?_lxsdk_rnd=1843ca2dce50`, (res) => {
        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            event.emit('play', data)
        })
    })
}