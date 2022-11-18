const http = require('http')
const url = require('url')// url模块
// 创建服务器
let server = http.createServer()
server.on('request', (req, res) => {
    if (req.url === '/favicon.ico') {
        return
    }
    res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" })// 响应头
    res.write('成功')// 响应文
    let theUrl = url.parse(req.url, true)
    url.resolve('/one/two/three', 'four');         // '/one/two/four'
    var b = url.resolve('/one/two/three/', 'four');         // '/one/two/three/four'
    url.resolve('http://example.com/', '/one');    // 'http://example.com/one'
    var a = url.resolve('http://example.com/one/33/', '/two'); // 'http://example.com/two'
    console.log(theUrl, url.format(theUrl), a, b)
    //url模块的parse用来解析地址，第二个参数true,可以把值转化为对象
    //format可以把对象格式化成地址
    res.end()
})
server.listen(3000, () => {
    console.log('server start')
})
// 3000是端口号

