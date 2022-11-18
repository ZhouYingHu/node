var http = require("http")
var https = require('https')
http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json;charset=utf-8",
        "access-control-allow-origin": '*'
    })
    httppost((data) => {
        res.end(data)
    })
}).listen(8080)
function httppost(cd) {
    var data = ''
    var options = {
        hostname: 'www.xiaomiyoupin.com',
        port: "443",
        path: '/mtop/market/search/placeHolder',
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        }
    }
    var req = https.request(options, (res) => {
        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            cd(data)
        })
    })
    req.write(JSON.stringify([{}, { "ypClient": 3 }]))
    req.end()
}