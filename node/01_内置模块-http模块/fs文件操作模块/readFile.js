const fs = require('fs')
// 读取文件
// error-first
// utf-8编码的普通文本
fs.readFile("./avatar/a.text", 'utf-8', (err, data) => {
    if (!err) {
        console.log(data)
    }
})