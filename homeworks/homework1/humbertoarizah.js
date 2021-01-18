const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder

const PORT = 3000 || process.env.PORT
const handlers = {
    hello: (data, callback) => {
        callback(200, { 'message': 'Welcome to my http server' })
    }
}
const router = {
    'hello': handlers.hello,
}

const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res)
})
httpServer.listen(PORT, () => {
    console.log(`the http server is listening the PORT ${PORT}`)
})

function unifiedServer(req, res) {
    const parsedUrl = url.parse(req.url, true)
    const path = parsedUrl.pathname
    const trimmedPath = path.replace(/^\/+|\/+$/g, '')

    // get the query string object
    const queryStringObject = parsedUrl.query
    // get http method
    const method = req.method.toUpperCase()
    // get headers
    const headers = req.headers
    // get the payload 
    const decoder = new StringDecoder('utf-8')
    let buffer = ''
    req.on('data', (data) => {
        buffer += decoder.write(data)
    })

    req.on('end', () => {
        buffer += decoder.end()
        // chose the handle this request should use
        const chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound
        // construct data object to the handler
        const data = {
            trimmedPath,
            queryStringObject,
            method,
            headers,
            payload: buffer
        }
        chosenHandler(data, (statusCode, payload) => {
            // use the statusCode code or default 200 code
            statusCode = typeof (statusCode) === 'number' ? statusCode : 200
            // use the payload or return empty object
            payload = typeof (payload) === 'object' ? payload : {}

            // Convert payload to string
            const payloadString = JSON.stringify(payload)
            // return the response
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode)
            res.end(payloadString)

        })

    })
}