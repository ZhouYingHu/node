const http = require('http')
const Router = {}
function use(obj) {
    Object.assign(Router, obj)
}
function start() {
    http.createServer((req, res) => {
        const myURL = new URL(req.url, 'http://127.0.0.1')
        try {
            Router[myURL.pathname](req, res)
        } catch (err) {
            Router['/404'](req, res)
        }
    }).listen(3000, () => {
        console.log('sever start')
    })
}
exports.start = start
exports.use = use
