function render(res, data, type = "") {
    res.writeHead(200, { 'Content-type': `${type ? type : "application/json"};charset=utf8` })
    res.write(data)
    res.end()
}
const apiRouter = {
    "/api/login": (req, res) => {
        const myURL = new URL(req.url, "http://127.0.0.1")
        if (myURL.searchParams.get('username') === 'zhouying' && myURL.searchParams.get('password') === '123456') {
            render(res, `{"ok":1}`)
        } else {
            render(res, `{"ok":0}`)
        }
    },
    "/api/loginpost": (req, res) => {
        var post = ''
        req.on('data', chunk => {
            post += chunk
        })
        req.on('end', () => {
            post = JSON.parse(post)

            render(res, `{"key":1233}`)
        })
    }
}
module.exports = apiRouter