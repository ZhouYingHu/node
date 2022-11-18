// 异步删除
const fs = require('fs').promises
fs.readdir("./avatar").then(async (data) => {
    await Promise.all(data.map(item => fs.unlink(`./avatar/${item}`)))
    await fs.rmdir('./avatar')
})