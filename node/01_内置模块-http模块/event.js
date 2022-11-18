const EventEmitter = require('events')
const event = new EventEmitter
event.on('play', (data) => {
    console.log('事件触发了', data)
})
event.on('run', (data) => {
    console.log('事件触发了--run', data)
})
setTimeout(() => {
    event.emit('play', '1111')
}, 1000)