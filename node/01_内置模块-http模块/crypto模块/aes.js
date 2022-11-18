const crypto = require('crypto')
function encrypt(key, iv, data) {
    let decipher = crypto.createCipheriv('aes-128-cbc', key, iv)
    return decipher.update(data, 'binary', 'hex') + decipher.final('hex')
}
function decrypt(key, iv, data) {
    data = Buffer.from(data, 'hex').toString('binary')
    let dep = crypto.createDecipheriv('aes-128-cbc', key, iv)
    return dep.update(data, 'binary', 'utf-8') + dep.final('utf-8')
}
let key = '1234567890qwerty'
let iv = 'tbcdey1234567890'
let data = 'zhouying'
let name = encrypt(key, iv, data)
let deName = decrypt(key, iv, name)
console.log('加密结果-', name)
console.log('解密结果-', deName)