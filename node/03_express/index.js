const express = require('express')
const app = express()
app.get("/", (req, res) => {
    // res.send(`<html>
    // <h1>1111</h1>
    // </html>`)
    res.send({
        name: '周瀛',
        age: 18
    })
})
app.get('/login', (req, res) => {
    res.write('login')
    res.end()
})
// 字符串模式的路由路径示例
//  匹配acd和abcd
app.get('/ab?cd', function(req, res) {
    res.send('ab?cd')
})
// 匹配/ab/****
app.get('/ab/:id', (req, res) => {
    res.send('匹配/ab/****')
})
// 匹配abcd、abbcd、abbbcd等
app.get('/a+cd', (req, res) => {
    res.send('ab+cd')// 只能重复加号前面的字符
})
// 匹配abcd、abxcd、ab...cd等
app.get('/ab*cd', (req, res) => {
    res.send('ab*cd'); // 中间任意
})
// 匹配/abe 和 /abcde
app.get('/ab(cd)?e', (req, res) => {
    res.send('ab(cd)?e')
})
// 使用正则表达式的路由路径示例：
// 匹配fly结尾的
app.get(/.*fly$/, (req, res) => {
    res.send('/.*fly$/')
})
const fun1 = (req, res, next) => {
    const a = false
    if (a) {
        next()
    } else {
        res.send('fun1')
    }
}
const fun2 = (req, res) => {
    res.send({ list: [1, 23, 11] })
}
app.use([fun1, fun2])
app.get('/zhou')
app.listen(3000, () => {
    console.log('sever start')
})