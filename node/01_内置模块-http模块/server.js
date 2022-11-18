const http = require('http')
// 创建服务器
let server = http.createServer()
server.on('request', (req, res) => {
    // req 接受浏览器的参数
    // ree 返回渲染的内容
    // text/plain解析为普通文本，text/html解析为html结构
    res.writeHead(renderStatus(req.url), { "Content-Type": "text/html;charset=utf-8" })// 响应头
    res.write(renderHTML(req.url)),// 响应文
        res.end()
})
server.listen(3000, () => {
    console.log('server start')

})
// 3000是端口号

function renderStatus(url) {
    const arr = ['/home', 'list']
    return arr.includes(url) ? 200 : 400
}
function renderHTML(url) {
    switch (url) {
        case '/home':
            return `<html>
                     <h1>HOME</h1>
                   <html>`
        case '/list':
            return '[list1,list2,list3]'
        default:
            return 'Not found'
    }
}