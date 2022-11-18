const crypto = require('crypto')
const hash = crypto.createHash('md5')
const Hmac = crypto.createHmac('md5', 'zhouying')// 第二个是密钥

hash.update('hello world')
Hmac.update('hello world')
console.log(hash.digest('hex'), Hmac.digest('hex'))