const fs = require('fs')
// 读取目录下的文件
fs.readdir('./avatar', (err, data) => {
    if (!err) {
        console.log(data)
    }
})