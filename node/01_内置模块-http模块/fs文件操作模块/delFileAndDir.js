const fs = require('fs')
fs.readdir('./avatar', (err, data) => {
    data.forEach(item => {
        fs.unlink(`./avatar/${item}`, (err) => {
        })
    })
    fs.rmdir('./avatar', (err) => {
        console.log(err)
    })
})