let username = document.querySelector('#username')
let password = document.querySelector('#password')
let login = document.querySelector('#login')
let loginPost = document.querySelector('#loginPost')
login.onclick = () => {
    fetch(`/api/login?username=${username.value}&password=${password.value}`, {
    }).then((res) => {
        res.text()
    }).then(res => {
        console.log(res)
    })
}
loginPost.onclick = () => {
    fetch(`/home/hai`, {
        method: 'POST',
        body: JSON.stringify({
            username: username.value,
            password: password.value
        }),
        headers: {
            "Content-Type": "application/json"
        },
    }).then(res => res.text()).then(res => {
        console.log(res)
    })
}