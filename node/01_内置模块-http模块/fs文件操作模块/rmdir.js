const fs = require('fs')
// 删除目录，文件夹
fs.rmdir('./avatar2', (err) => {
    if (err && err.code == "ENOENT") {
        console.log('目录不存在')
    }
})