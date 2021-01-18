const http = require('http')
const https = require('https')

const fs = require('fs')

// JS Modules
const { envToExport, httpsServerOptions } = require('./lib/config')
const unifiedServer = require('./lib/middleware/unifiedServer')


// instantiate http and https
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res)
})

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res)
})

httpServer.listen(envToExport.httpPort, () => {
    console.log(`the server is listening the port ${envToExport.httpPort} in environment ${envToExport.envName} now`)
})

httpsServer.listen(envToExport.httpsPort, () => {
    console.log(`the https server is listening the port ${envToExport.httpsPort} in environment ${envToExport.envName} now`)
})
