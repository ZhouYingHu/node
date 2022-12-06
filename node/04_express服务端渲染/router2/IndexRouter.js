const express = require('express')
const router = express.Router()
// 路由级别
router.get('/home', (req, res) => {
    res.send('home')
})
router.get('/', (req, res) => {
    // res.send('login')//send片段&&json
    // res,json([1,2,3]) // json
    res.render('login', { error: false }) //渲染模板（找到views文件下的login.ejs）
})
router.post('/', (req, res) => {
    if (req.body.username === 'zhouying' && req.body.password === '123456') {
        console.log('登录成功')
        // 重定向
        res.redirect('/home')
    } else {
        console.log('登陆失败')
        res.render('login', { error: true })
    }
})
module.exports = router