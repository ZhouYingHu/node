# 一、Node.js基础

## 1、模块、包、commonJS

把公共的功能抽离成为一个单独的JS文件，作为一个模块，默认情况下面这个模块里面的方法或者属性，外面是没法访问的。如果要让外部访问模块的方法或者属性，就必须在模块里面通过**export**或者**module.exports**暴露属性或者方法。

```js
// 接口暴露方法一：
module.exports = {
say:sayName 
}
// 接口暴露方法二：
exports.say = sayName
// 其他模块引入
const ml = require('./m')
ml.say
```

## 2、npm&yarn的使用

```js
npm init
npm install 包名 -g  （uninstall,update）
npm install 包名 --save-dev （uninstall,update）
npm list -g (不加-g,列举当前目录下的安装包)
npm info 包名（详细信息） npm info 包名 version(获取最新版本)
npm install md5@1(安装指定版本)
npm outdated(检查包是否已经过时)

// yarn 缓存了每一个下载过的包，再次使用时无需重复下载。同时利用并行下载以最大化资源利用率
// 开始新项目
yarn init
//添加依赖包
yarn add 包@版本 --dev
//升级依赖包
yarn upgrade 包@版本
// 移除依赖包
yarn remove 包
// 安装项目所有依赖
yarn install
```

##  3、内置模块

####  1、http模块

要是用http服务器和客户端，则必须require('http')

```js
const http = require('http')
// 创建服务器
let server = http.createServer((req, res) => {
    // req 接受浏览器的参数
    // res 返回渲染的内容
    // text/plain解析为普通文本，text/html解析为html结构
    res.writeHead(renderStatus(req.url), { "Content-Type": "text/html;charset=utf-8" })// 响应头
    res.write(renderHTML(req.url)),// 响应文
    res.end()
})
server.listen(3000, () => {
    console.log('server start')
})
// 3000是端口号
function renderStatus(url) {
    const arr = ['/home', 'list']
    return arr.includes(url) ? 200 : 400
}
function renderHTML(url) {
    switch (url) {
        case '/home':
            return `<html>
                     <h1>HOME</h1>
                   <html>`
        case '/list':
            return '[list1,list2,list3]'
        default:
            return 'Not found'
    }
}
```

#### 2、url模块

```js
const http = require('http')
const url = require('url')// url模块
// 创建服务器
let server = http.createServer()
server.on('request', (req, res) => {
    if (req.url === '/favicon.ico') {
        return
    }
    res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" })// 响应头
    res.write('成功')// 响应文
    let theUrl = url.parse(req.url, true)
    url.resolve('/one/two/three', 'four');         // '/one/two/four'
    url.resolve('http://example.com/', '/one');    // 'http://example.com/one'
    var a = url.resolve('http://example.com/one/33', '/two'); // 'http://example.com/two'
    console.log(theUrl, url.format(theUrl), a)
    //url模块的parse用来解析地址，第二个参数true,可以把值转化为对象
    //format可以把网址对象格式化成地址
    res.end()
})
server.listen(3000, () => {
    console.log('server start')
})
// 3000是端口号
```

新版url模块

```js
// 新版url模块
const http = require('http')
// import { URL } from 'url'
// 创建服务器
let server = http.createServer()
server.on('request', (req, res) => {
    if (req.url === '/favicon.ico') {
        return
    }
    console.log(new URL('/one/two', 'http://127.0.0.1:3000/11/22/'))// 拼接
    const myUrl = new URL(req.url, 'http://127.0.0.1:3000')
    for (let arr of myUrl.searchParams) {
        console.log(arr)
    }
    res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" })// 响应头
    res.write('成功')// 响应文
    res.end()
})
server.listen(3000, () => {
    console.log('server start')
})
```

#### 3、querystring模块

```js
// querystring模块
const querystring = require('querystring')
var qs = 'x=3&y=4'
var parsed = querystring.parse(qs) //解析html表单编码成对象
var str = querystring.stringify(parsed) // 转化为form格式的编码
var a = querystring.escape(qs) //转义编码
var b = querystring.unescape(querystring.escape(qs)) //解码
console.log(parsed, str, a, b)
```

#### 4、http模块补充

##### jsonp解决跨域

```js
// jsonp返回参数
const http = require('http')
const url = require('url')
const app = http.createServer((req, res) => {
    let urlObj = url.parse(req.url, true)
    res.end(`${urlObj.query.callback}({"name":"gp145"})`)
})
app.listen(8080, () => {
    console.log('localhost:8080')
})
```

```html
// jsonp请求
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <script>
        var script = document.createElement('script')
        script.src = "http://localhost:8080?callback=test"
        document.body.appendChild(script)
        function test(obj) {
            console.log(obj)
        }
    </script>
</body>
</html>
```

##### CORS解决跨域问题

```js
// CORS解决跨域问题: "access-control-allow-origin": "*"
const http = require('http')
const url = require('url')
const app = http.createServer((req, res) => {
    let urlObj = url.parse(req.url, true)
    res.writeHead(200, {
        "Content-Type": "application/json;charset=utf-8",
        // cors头
        "access-control-allow-origin": "*"
    })
    res.end(`${JSON.stringify({
        name: 'zhouying',
        age: 24
    })}`)
})
app.listen(8080, () => {
    console.log('localhost:8080')
})
```

##### GET请求别人的接口，传给前端

```js
var http = require("http")
var https = require('https')
http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json;charset=utf-8",
        "access-control-allow-origin": '*'
    })
    httpget((data) => {
        res.end(data)
    })
}).listen(8080)
function httpget(cd) {
    var data = ''
    https.get(`https://portal-portm.meituan.com/horn/v1/modules/lx-web-config/prod?_lxsdk_rnd=1843ca2dce50`, (res) => {
        res.on('data', (chunk) => {
            data += chunk
        }) //数据流一点点返回
        res.on('end', () => {
            cd(data)
        }) // 得到所有数据返回
    })
}
```

##### POST请求别人的接口，传给前端

```js
var http = require("http")
var https = require('https')
http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json;charset=utf-8",
        "access-control-allow-origin": '*'
    })
    httppost((data) => {
        res.end(data)
    })
}).listen(8080)
function httppost(cd) {
    var data = ''
    var options = {
        hostname: 'www.xiaomiyoupin.com',
        port: "443",
        path: '/mtop/market/search/placeHolder',
        method: 'POST',
        headers: {
            "Content-Type": "application/json"
        }
    }
    var req = https.request(options, (res) => {
        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            cd(data)
        })
    })
    req.write(JSON.stringify([{}, { "ypClient": 3 }]))
    req.end()
}
```

#### 5、event模块

event订阅发布模式

```js
var http = require("http")
var https = require('https')
var { EventEmitter } = require('events')
let event = null
http.createServer((req, res) => {
    res.writeHead(200, {
        "Content-Type": "application/json;charset=utf-8",
        "access-control-allow-origin": '*'
    })
    event = new EventEmitter()
    event.on('play', (data) => {
        res.end(data)
    })
    httpget()
}).listen(8080)
function httpget() {
    var data = ''
    https.get(`https://portal-portm.meituan.com/horn/v1/modules/lx-web-config/prod?_lxsdk_rnd=1843ca2dce50`, (res) => {
        res.on('data', (chunk) => {
            data += chunk
        })
        res.on('end', () => {
            event.emit('play', data)
        })
    })
}
```

#### 6、fs文件操作模块-1

```js
const fs = require('fs')
// 创建目录
fs.mkdir("./avatar", (err) => {
    if (err && err.code === "EEXIST") {
        console.log('目录已经存在')
    }
})
// 写入文件（没有文件，就会新建一个文件）
fs.writeFile("./avatar/a.text", "你好", err => {
    console.log(err)
})
// writeFile内容写入会覆盖，可以使用appendFile追加
fs.appendFile("./avatar/a.text", "\nhello world", err => {
    console.log(err)
})
// 重命名
fs.rename("./avatar", "./avatar2", (err) => {
    if (err && err.code == "ENOENT") {
        console.log('目录不存在')
    }
})
// 删除目录，文件夹
fs.rmdir('./avatar2', (err) => {
    if (err && err.code == "ENOENT") {
        console.log('目录不存在')
    }
}
// 删除文件
fs.unlink("./avatar", err => {
    console.log(err)
})
// 读取文件
// error-first
// utf-8编码的普通文本
fs.readFile("./avatar/a.text", 'utf-8', (err, data) => {
    if (!err) {
        console.log(data)
    }
})
// 读取目录下的文件
fs.readdir('./avatar', (err, data) => {
    if (!err) {
        console.log(data)
    }
})
// 文件或者目录信息
fs.stat("./avatar", (err, data) => {
    console.log(err, data.isFile(), data.isDirectory())
})
```

#### 7、fs文件操作模块-2

在node环境执行的js代码是服务器端代码，所以，绝大部分需要在服务器运行期反复执行业务逻辑的代码，必须使用异步代码，否则，同步代码在执行期间，服务器将停止响应，因为js只有一个执行线程。

```js
const fs = require('fs')
// 同步创建文件夹目录
try {
    fs.mkdirSync('./avatar')
    // 阻塞后面代码执行
} catch (err) {
    console.log(err)
}
```

```js
// 异步删除
const fs = require('fs').promises
fs.readdir("./avatar").then(async (data) => {
    await Promise.all(data.map(item => fs.unlink(`./avatar/${item}`)))
    await fs.rmdir('./avatar')
})
```

#### 8、stream流操作

stream是Nodejs提供的又一个仅在服务区端可用的模块，目的是支持“流”这种数据结构。

```js
// 可读流
const fs = require('fs')
const rs = fs.createReadStream('./1.txt', 'utf-8')
rs.on('data', (chunk) => {
    console.log('chunk', chunk)
})

rs.on('end', () => {
    console.log('end')
})
rs.on('error', (err) => {
    console.log(err)
})
```

```js
// 可写流
const fs = require('fs')
const ws = fs.createWriteStream("./1.txt", "utf-8")
ws.write('周瀛')
ws.write('18')
ws.end()
```

```js
// 高性能复制文件:把1复制到了2里面
const fs = require('fs')
const readStream = fs.createReadStream("./1.txt")
const writeStream = fs.createWriteStream('./2.txt')
readStream.pipe(writeStream)
```

#### 9、zlib模块

```js
const http = require('http')
const zlib = require('zlib')
const fs = require('fs')
const gzip = zlib.createGzip()
http.createServer((req, res) => {
    // res 可写流
    //"Content-Encoding": "gzip"告诉浏览器端压缩方式
    const readStream = fs.createReadStream('./test.js')
    res.writeHead(200, { "Content-Type": "application/x-javascript;charset=utf-8", "Content-Encoding": "gzip" })
    readStream.pipe(gzip).pipe(res)
}).listen(3000, () => {
    console.log('sever start')
})
```

#### 10、crypto模块

crypto模块的目的是为了提供通用的加密和哈希算法，用纯js代码实现这些功能不是不可能，但速度会非常慢。Nodejs用C/C++实现这些算法后，通过crypto这个模块暴露为js接口，这样用起来方便，运行速度也快了。MD5是一种常用的哈希算法，用于给任意数据一个“签名”。这个签名通常用一个十六进制的字符串表示：

```js
const crypto = require('crypto')
const hash = crypto.createHash('md5')
const Hmac = crypto.createHmac('md5', 'zhouying')// 第二个是密钥
hash.update('hello world')
Hmac.update('hello world')
console.log(hash.digest('hex'), Hmac.digest('hex'))
```

AES加密解密

```js
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
```

## 4、路由-基础一

```js
const http = require('http')
const route = require('./route')
http.createServer((req, res) => {
    const myURL = new URL(req.url, 'http://127.0.0.1')
     try {
        route[myURL.pathname](res)
    } catch (err) {
        route['/404'](res)
    }
    res.end()
}).listen(3000, () => {
    console.log('sever start')
})
```

```js
const fs = require('fs')
const route = {
    '/login': (res) => {
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
        res.write(fs.readFileSync('./static/login.html', "utf-8"))
    },
    '/home': (res) => {
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
        res.write(fs.readFileSync('./static/home.html', "utf-8"))
    },
    "/404": (res) => {
        res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' })
        res.write(fs.readFileSync('./static/404.html', "utf-8"))
    }
}
module.exports = route
```

