const fs = require('fs')
// 删除文件
fs.unlink("./avatar", err => {
    console.log(err)
})