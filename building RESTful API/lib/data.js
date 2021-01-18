const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')
const lib = {}

// base directory
lib.baseDir = path.join(__dirname, '/../.data/')
// create data
lib.create = (dir, file, data, callback) => {
    // open the file
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // convert data to string
            const stringData = JSON.stringify(data)
            fs.writeFile(fileDescriptor, stringData, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, (err) => {
                        if (!err) callback(false)
                        else callback('Error closing new file');
                    })
                }
                else callback('Error writing to new file')
            })
        }
        else callback('Could not create new file, it may already exists')
    })
}

// read file
lib.read = (dir, file, callback) => {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf8', (err, data) => {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data)
            callback(false, parsedData)
        }
        else callback(err, data)
    })
}

// update data from a file
lib.update = (dir, file, data, callback) => {
    // open the file
    fs.open(lib.baseDir + dir + '/' + file + '.json', 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // convert data to string
            const stringData = JSON.stringify(data)
            fs.ftruncate(fileDescriptor, (err) => {
                if (!err) {
                    fs.writeFile(fileDescriptor, stringData, (err) => {
                        if (!err) fs.close(fileDescriptor, (err) => {
                            if (!err) callback(false)
                            else callback('Error closing existing file')
                        })
                        else callback('Error writing to existing file')
                    })
                }
                else callback('Error truncating file')

            })
        }
        else callback('Could not open the file for updating, it may not exist yet')
    })
}
lib.delete = (dir, file, callback) => {
    // unlink the file
    fs.unlink(lib.baseDir + dir + '/' + file + '.json', (err) => {
        if (!err) callback(false)
        else callback('Error trying to delete the file')
    })
}


module.exports = lib