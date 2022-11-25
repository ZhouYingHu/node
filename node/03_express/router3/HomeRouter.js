
const express = require('express')
const router = express.Router()
// 路由级别
router.get('/', (req, res) => {
    res.send(req.query)
})
// 响应前端的post请求
router.post('/hai', (req, res) => {
    console.log(req.body) // 必须配置中间件
    res.send(req.body)
})
router.get('/zhou', (req, res) => {
    res.send('zhou')
})
router.get('/login', (req, res) => {
    res.send('login')
})
module.exports = router