const express = require('express')
const app = express()
const IndexRouter = require('./router2/IndexRouter')
// 应用级别
app.use((req, res, next) => {
    console.log('验证token')
    next()
})
// 应用级别
app.use('/', IndexRouter)
app.listen(3000, () => {
    console.log('server start')
})