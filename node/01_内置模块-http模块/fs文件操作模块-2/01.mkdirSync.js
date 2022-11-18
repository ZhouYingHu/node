const fs = require('fs')
// 同步创建文件夹目录
try {
    fs.mkdirSync('./avatar')
    // 阻塞后面代码执行
} catch (err) {
    console.log(err)
}

