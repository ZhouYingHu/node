// 新版url模块
const http = require('http')
// import { URL } from 'url'
// 创建服务器
let server = http.createServer()
server.on('request', (req, res) => {
    if (req.url === '/favicon.ico') {
        return
    }
    console.log(new URL('/one/two', 'http://127.0.0.1:3000/11/22/'))// 拼接
    const myUrl = new URL(req.url, 'http://127.0.0.1:3000')

    for (let arr of myUrl.searchParams) {
        console.log(arr)
    }
    res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" })// 响应头
    res.write('成功')// 响应文
    res.end()
})
server.listen(3000, () => {
    console.log('server start')
})
// 3000是端口号

