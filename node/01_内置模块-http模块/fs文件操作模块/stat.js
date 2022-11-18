const fs = require('fs')
// 文件或者目录信息
fs.stat("./avatar", (err, data) => {
    console.log(err, data.isFile(), data.isDirectory())
})