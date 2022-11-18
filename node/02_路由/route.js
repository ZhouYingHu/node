const fs = require('fs')
const path = require('path') // 可以拼接成本地文件位置
const mime = require('mime')//可以根据读到的文件类型转化为content-type
function render(res, path, type = "") {
    res.writeHead(200, { 'Content-type': `${type ? type : "text/html"};charset=utf8` })
    res.write(fs.readFileSync(path), "utf-8")
    res.end()
}
const route = {
    '/login': (req, res) => {

        render(res, './static/login.html')
    },
    '/home': (req, res) => {
        render(res, './static/home.html')

    },
    "/404": (req, res) => {
        if (readStaticFile(req, res)) {
            return
        }
        res.writeHead(200, { 'Content-type': "text/html;charset=utf8" })
        res.write(fs.readFileSync('./static/404.html'), "utf-8")
        res.end()
    }
}
function readStaticFile(req, res) {
    const myURL = new URL(req.url, 'http://127.0.0.1')
    const pathname = path.join(__dirname, "/static", myURL.pathname)
    if (myURL.pathname === '/') return false
    if (fs.existsSync(pathname)) {
        render(res, pathname, mime.getType(myURL.pathname.split(".")[1]))
        return true
    } else {
        return false
    }
}
// favicon.ico的请求头是"Content-type:image/x-icon"
module.exports = route