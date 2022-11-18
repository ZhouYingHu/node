// querystring模块
const querystring = require('querystring')
var qs = 'x=3&y=4'
var parsed = querystring.parse(qs) //解析html表单编码成对象
var str = querystring.stringify(parsed) // 转化为form格式的编码
var a = querystring.escape(qs) //转义编码
var b = querystring.unescape(querystring.escape(qs)) //解码
console.log(parsed, str, a, b)