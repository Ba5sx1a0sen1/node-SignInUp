var http = require('http') //请求HTTP模块
var fs = require('fs') //请求文件模块
var url = require('url') // 请求URL模块
var queryString = require('querystring') //请求查询参数处理模块
var port = process.argv[2] //获取node xxx xxx命令的第三个参数，用于指定启用端口

if (!port) {
    console.log(`请指定端口，如 node server.js 8888`) //如果没指定端口，即port=undefined，则提示
    process.exit(1)
}

var server = http.createServer((request, response) => {
    var parsedUrl = url.parse(request.url, true)
    var pathWithQuery = request.url   //
    var queryString = parsedUrl.query //查询字符串

    var path = parsedUrl.pathname
    var query = parsedUrl.query
    var method = request.method

    /* ********************* */
    console.log(`含查询字符串的路径为: ${pathWithQuery} \n\n`)

    if (path === '/') {
        let string = fs.readFileSync('./_index.html', 'utf8')
        let cookies
        // 可做异常捕获处理，如果cookie是undefined会报错
        try{
            cookies = request.headers.cookie.split(';') // ['email=xx@xxx','a=1','b=2']    
        }catch(e){
            cookies = []
        }
        let hash = {}
        for (key in cookies) {
            let parts = cookies[key].split('=')
            hash[parts[0]] = parts[1]
        }
        let email = hash['sign_in_email']
        let users = fs.readFileSync('./db/user', 'utf8')
        users = JSON.parse(users) //需要保证有数据，且格式正确
        let founderUser
        for (let i = 0; i < users.length; i++) {
            if (users[i].email === email) {
                founderUser = users[i]
                break
            }
        }
        // console.log(founderUser) //如果找不到则显示undefined
        if (founderUser) {
            string = string.replace('XXX', founderUser.password)
        } else {
            string = string.replace('XXX', '我不知道你是谁啊')
        }
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(string)
        response.end()
    } else if (path === '/sign_up' && method === 'GET') {//注册页面
        let string = fs.readFileSync('./sign_up.html', 'utf8')
        response.statusCode = 200
        response.setHeader('Content-Type', 'text/html;charset=utf-8')
        response.write(string)
        response.end()
    } else if (path === '/sign_up' && method === 'POST') {//注册页提交表单数据
        readBody(request).then((body) => {
            let strings = body.split('&') // ['email=1','password=2','password_confirmation=3']
            let hash = {}
            createFormDataHash(hash,strings) //将strings中的键值对填入hash
            let {email,password,password_confirmation} = hash
            if(email.indexOf('@')===-1){//不符合邮箱格式
                response.statusCode = 400
                response.setHeader('Content-type','application/json;charset=utf-8')
                response.write(`{
                    "errors":{
                        "email":"invalid"
                    }
                }`)
            }else if(password!==password_confirmation){
                response.statusCode=400
                response.write('password not match')
            }else{
                var users = fs.readFileSync('./db/user','utf8')
                try{
                    users = JSON.parse(users)
                }catch(exception){
                    users = []
                }
                let inUse = false
                for(let i=0;i<users.length;i++){
                    let user = users[i]
                    if(user.email === email){
                        inUse = true
                        break
                    }
                }
                if(inUse){
                    response.statusCode = 400
                    response.write('email in use')
                }else{
                    users.push({'email':email,'password':password})
                    var usersString = JSON.stringify(users)
                    fs.writeFileSync('./db/user',usersString)
                    response.statusCode = 200
                }
            }
            response.end()
        })
    }else if(path==='/sign_in' && method === 'GET'){
        let string  = fs.readFileSync('./sign_in.html','utf8')
        response.statusCode = 200
        response.setHeader('Content-Type','text/html;charset=utf-8')
        response.write(string)
        response.end()
    }else if(path==='/sign_in' && method === 'POST'){
        readBody(request).then((body)=>{
            let strings = body.split('&')
            let hash = {}
            createFormDataHash(hash,strings)
            let {email,password} = hash
            var users = fs.readFileSync('./db/user','utf8')
            try{
                users = JSON.parse(users)
            }catch(e){
                users = []
            }
            let found = false
            for(let i=0;i<users.length;i++){
                if(users[i].email === email && users[i].password === password){
                    found = true
                    break
                }
            }
            if(found){
                response.setHeader('Set-Cookie',[`sign_in_email=${email}`])
                response.statusCode = 200
            }else{
                response.statusCode = 401
            }
            response.end()
        })
    }else{
        let string = fs.readFileSync('./404.html','utf8')
        response.statusCode = 404
        response.setHeader('Content-Type','text/html;charset=utf-8')
        response.write(string)
        response.end()
    }




    /* ********************* */

})

function readBody(request) {//读取表单数据体
    return new Promise((resolve, reject) => {
        let body = []
        request.on('data', (chunk) => {
            body.push(chunk)
        }).on('end', () => {
            body = Buffer.concat(body).toString()
            resolve(body)
        })
    })
}

function createFormDataHash(hash, strings) {
    strings.forEach((string) => {
        //string === 'email=1'
        let parts = string.split('=')
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value) // hash['email'] = 'xxxx@xxx.xxx'
    })
}

server.listen(port)
console.log(`监听 ${port}端口 成功`)