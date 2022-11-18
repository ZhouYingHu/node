const fs = require('fs')
// writeFile内容写入会覆盖，可以使用appendFile追加
fs.appendFile("./avatar/a.text", "\nhello world", err => {
    console.log(err)
})