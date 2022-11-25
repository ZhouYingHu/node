const express = require('express')
const app = express()
const HomeRouter = require('./router3/HomeRouter')
// 配置静态资源
app.use('/', express.static("static"))
// 配置解析post参数的--不用带三方
app.use(express.urlencoded({
    extended: false
}))// post参数--username=zhou&password=123
app.use(express.json())// post参数-{"name":"zhou","age":11}
// 应用级别
app.use((req, res, next) => {
    console.log('验证token')
    next()
})
// 应用级别
app.use('/home', HomeRouter)
app.use((req, res) => {
    res.status(404).send('没找到')
})
app.listen(3000, () => {
    console.log('server start')
})