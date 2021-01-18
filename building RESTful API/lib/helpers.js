const crypto = require('crypto')
const { envToExport } = require('./config')
const helpers = {}
// Create a SHA256 HASH
helpers.hash = (password) => {
    if (typeof (password) === 'string' && password.length > 0) {
        const hash = crypto.createHmac('sha256', envToExport.hashingSecret).update(password).digest('hex')
        return hash
    }
    else return false
}
helpers.parseJsonToObject = (str) => {
    try {
        const parsed = JSON.parse(str)
        return parsed
    } catch (e) {
        console.log("\x1b[31m", e)
        return {}
    }
}

helpers.createRandomString = (strLength) => {
    strLength = typeof (strLength) === 'number' && strLength > 0 ? strLength : false
    if (strLength) {
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789'
        let str = ''
        for (let i = 1; i <= strLength; i++) {
            const randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
            str += randomChar
        }
        return str
    }
    else return false
}
module.exports = helpers