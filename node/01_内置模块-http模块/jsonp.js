const http = require('http')
const url = require('url')
const app = http.createServer((req, res) => {
    let urlObj = url.parse(req.url, true)
    res.writeHead(200, {
        "Content-Type": "application/json;charset=utf-8",
        // cors头
        "access-control-allow-origin": "*"
    })
    res.end(`${JSON.stringify({
        name: 'zhouying',
        age: 24
    })}`)
})
app.listen(8080, () => {
    console.log('localhost:8080')
})