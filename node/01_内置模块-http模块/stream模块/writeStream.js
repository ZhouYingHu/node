// 可写流
const fs = require('fs')
const ws = fs.createWriteStream("./1.txt", "utf-8")
ws.write('周瀛')
ws.write('18')
ws.end()