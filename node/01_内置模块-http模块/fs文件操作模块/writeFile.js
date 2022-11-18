const fs = require('fs')
// 写入文件（没有文件，就会新建一个文件）
fs.writeFile("./avatar/a.text", "你好", err => {
    console.log(err)
})