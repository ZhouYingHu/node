const http = require('http')
const zlib = require('zlib')
const fs = require('fs')
const gzip = zlib.createGzip()
http.createServer((req, res) => {
    // res 可写流
    const readStream = fs.createReadStream('./test.js')
    res.writeHead(200, { "Content-Type": "application/x-javascript;charset=utf-8", "Content-Encoding": "gzip" })
    readStream.pipe(gzip).pipe(res)
}).listen(3000, () => {
    console.log('sever start')
})