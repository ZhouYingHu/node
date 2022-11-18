const fs = require('fs')
// 重命名
fs.rename("./avatar", "./avatar2", (err) => {
    if (err && err.code == "ENOENT") {
        console.log('目录不存在')
    }
})