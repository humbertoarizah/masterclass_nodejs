//
const _data = require("./data")
const helpers = require("./helpers")
const { envToExport: config } = require("./config")
//
const handlers = {}

handlers.users = (data, callback) => {
  const acceptableMethods = ["POST", "GET", "PUT", "DELETE"]
  if (acceptableMethods.indexOf(data.method) > -1) handlers._users[data.method](data, callback)
  else callback(405)
}

handlers._users = {
  // required data: firstName, phone, phone, password, tosAgreement
  // optional data: none
  POST: (data, callback) => {
    // check required files
    const firstName = typeof data.payload.firstName === "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
    const lastName = typeof data.payload.lastName === "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
    const password = typeof data.payload.password === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    const phone = typeof data.payload.phone === "string" && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
    const tosAgreement = typeof data.payload.tosAgreement === "boolean" && data.payload.tosAgreement === true ? true : false
    if (firstName && lastName && password && tosAgreement) {
      // make sure thtat the user does not already exists
      _data.read("users", phone, (err, data) => {
        if (err) {
          // hash the password
          const hashedPassword = helpers.hash(password)
          if (hashedPassword) {
            const user = {
              firstName,
              lastName,
              phone,
              tosAgreement,
              password: hashedPassword,
            }
            // storing user
            _data.create("users", phone, user, (err) => {
              if (!err) callback(200)
              else {
                console.log(err)
                callback(500, {
                  Error: "Could not create the new user",
                })
              }
            })
          } else callback(500, { Error: "Could not hash the user password" })
        } else
          callback(400, {
            Error: "A user with that phone number already exists",
          })
      })
    } else callback(400, { Error: "Missing required fields" })
  },
  // required data: phone
  // @TODO: only authenticated user can access their own object
  GET: (data, callback) => {
    // check phone number valid
    const phone = typeof data.queryStringObject.phone === "string" && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false
    if (phone) {
      const token = typeof data.headers.token === "string" ? data.headers.token : false
      // verify token for the phone
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read("users", phone, (err, data) => {
            if (!err && data) {
              // remove hash password
              delete data.password
              callback(200, data)
            } else {
              callback(404)
            }
          })
        } else {
          callback(403, {
            error: "Missing required token in header or token is not valid.",
          })
        }
      })
    }
  },
  //Required: phone
  // optional data: else, at least one
  // @TODO: Just authenticated users can update each profile
  PUT: (data, callback) => {
    // Check phone
    const phone = typeof data.payload.phone === "string" && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
    if (!phone) {
      callback(400, { Error: "Missing required field" })
      return
    }
    const token = typeof data.headers.token === "string" ? data.headers.token : false
    // verify token for the phone
    const valid = handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // check other parameters
        const firstName = typeof data.payload.firstName === "string" && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false
        const lastName = typeof data.payload.lastName === "string" && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false
        const password = typeof data.payload.password === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false

        if (!firstName && !lastName && !password) {
          callback(400, { Error: "Missing fields to update" })
          return
        }
        _data.read("users", phone, (err, userData) => {
          if (!err && userData) {
            if (firstName) userData.firstName = firstName
            if (lastName) userData.lastName = lastName
            if (password) {
              const hashedPassword = helpers.hash(password)
              if (hashedPassword) userData.password = password
            }
            _data.update("users", phone, userData, (err) => {
              if (err) {
                console.trace("\x1b[31m", err)
                callback(500, {
                  Error: "Could not update the user",
                })
              } else callback(200)
            })
          } else
            callback(400, {
              Error: "The specified user does not exist",
            })
        })
      } else {
        callback(400, { Error: "Token is missing or invalid" })
        return
      }
    })
  },
  // @TODO: only let authenticated user delete their object, not anyone else
  // @TODO: cleanup delete any another files associated with this user
  DELETE: (data, callback) => {
    // check phone number valid
    const phone = typeof data.queryStringObject.phone === "string" && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false
    if (phone) {
      const token = typeof data.headers.token === "string" ? data.headers.token : false
      // verify token for the phone
      handlers._tokens.verifyToken(token, phone, (tokenIsValid) => {
        if (tokenIsValid) {
          _data.read("users", phone, (err, data) => {
            if (!err && data) {
              _data.delete("users", phone, (err) => {
                if (!err) {
                  const userChecks = typeof data.checks === "object" && data.checks instanceof Array ? data.checks : []
                  const checksToDelete = userChecks.length
                  if (checksToDelete > 0) {
                    let checksDeleted = 0
                    let deletionError = false
                    userChecks.forEach((checkId) => {
                      _data.delete("checks", checkId, (err) => {
                        if (!err) {
                          deletionError = true
                        }
                        checksDeleted++
                        if (checksToDelete == checksToDelete) {
                          if (!deletionError) callback(200)
                          else callback(500, { error: "errors encountered attempting to delete all the users checks" })
                        }
                      })
                    })
                  } else callback(200)
                } else
                  callback(500, {
                    error: "Could not delete specified user",
                  })
              })
            } else {
              callback(400, {
                error: "Could not find the specified user",
              })
            }
          })
        } else
          callback(400, {
            error: "Missing header token or invalid token",
          })
      })
    }
  },
}
handlers.tokens = (data, callback) => {
  const acceptableMethods = ["POST", "GET", "PUT", "DELETE"]
  if (acceptableMethods.indexOf(data.method) > -1) handlers._tokens[data.method](data, callback)
  else callback(405)
}

handlers._tokens = {
  POST: (data, callback) => {
    const password = typeof data.payload.password === "string" && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false
    const phone = typeof data.payload.phone === "string" && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
    if (phone && password) {
      _data.read("users", phone, (err, userData) => {
        if (!err && userData) {
          const hashedPassword = helpers.hash(password)
          if (hashedPassword == userData.password) {
            // create token , expired 1 hour
            const tokenId = helpers.createRandomString(20)
            const expires = Date.now() + 1000 * 60 * 60
            const token = {
              phone,
              id: tokenId,
              expires,
            }
            // store the token
            _data.create("tokens", tokenId, token, (err) => {
              if (!err) callback(200, token)
              else callback(500, { error: "Could not create new token" })
            })
          } else callback(400, { error: "Wrong password" })
        } else callback(400, { error: "Could not find specified user" })
      })
    } else callback(400, { error: "missing required field(s)" })
  },
  // required data: id
  GET: (data, callback) => {
    // check id
    const id = typeof data.queryStringObject.id === "string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
    if (id) {
      _data.read("tokens", id, (err, data) => {
        if (!err && data) {
          callback(200, data)
        } else {
          callback(404)
        }
      })
    }
  },
  // required data: id ,extend
  // optional data:none
  PUT: (data, callback) => {
    const id = typeof data.payload.id === "string" && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false
    const extend = typeof data.payload.extend === "boolean" && data.payload.extend ? data.payload.extend : false
    if (id && extend) {
      // look up the token
      _data.read("tokens", id, (err, data) => {
        if (err || !data) {
          callback(400, { error: "Specified token does not exists" })
          return
        }
        // check expire
        if (data.expires > Date.now()) {
          data.expires = Date.now() + 1000 * 60 * 60
          _data.update("tokens", id, data, (err) => {
            if (!err) callback(200)
            else callback(500, { error: "Could not update" })
          })
        } else callback(400, { error: "token is expired" })
      })
    } else callback(400, { error: "Missing required params" })
  },
  DELETE: (data, callback) => {
    // check phone number valid
    const id = typeof data.queryStringObject.id === "string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
    if (id) {
      _data.read("tokens", id, (err, data) => {
        if (!err && data) {
          _data.delete("tokens", id, (err) => {
            if (!err) callback(200)
            else
              callback(500, {
                error: "Could not delete specified token",
              })
          })
        } else {
          callback(400, { error: "Could not find the specified token" })
        }
      })
    }
  },
}
handlers._tokens.verifyToken = (id, phone, callback) => {
  _data.read("tokens", id, (err, data) => {
    if (!err && data) {
      // check the token is for the given user and has not expired
      if (data.phone === phone && data.expires > Date.now()) callback(true)
      else callback(false)
    } else callback(false)
  })
}

handlers.checks = (data, callback) => {
  const acceptableMethods = ["POST", "GET", "PUT", "DELETE"]
  if (acceptableMethods.indexOf(data.method) > -1) handlers._checks[data.method](data, callback)
  else callback(405)
}
// container all the checks methods
handlers._checks = {
  // protocol,url, method, success code, timeout seconds --- required
  // optional no
  POST: (data, callback) => {
    // validate inputs
    const protocol = typeof data.payload.protocol === "string" && ["http", "https"].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    const url = typeof data.payload.url === "string" && data.payload.url.trim().length > 0 ? data.payload.url : false
    const method = typeof data.payload.method === "string" && ["POST", "PUT", "GET", "DELETE", "post", "put", "get", "delete"].indexOf(data.payload.method) > -1 ? data.payload.method : false
    const successCodes = typeof data.payload.successCodes === "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    const timeoutSeconds = typeof data.payload.timeoutSeconds === "number" && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false
    if (protocol && url && method && successCodes && timeoutSeconds) {
      // get the token from the headers
      const token = typeof data.headers.token === "string" ? data.headers.token : false
      // get the user by read the token
      _data.read("tokens", token, (err, tokenData) => {
        if (!err && tokenData) {
          var userPhone = tokenData.phone
          // get user
          _data.read("users", userPhone, (err, userData) => {
            if (!err && userData) {
              const userChecks = typeof userData.checks === "object" && userData.checks instanceof Array ? userData.checks : []
              if (userChecks.length < config.maxChecks) {
                // create random id for check
                const checkId = helpers.createRandomString(20)
                const checkObject = {
                  id: checkId,
                  userPhone,
                  url,
                  method,
                  successCodes,
                  timeoutSeconds,
                }
                // save
                _data.create("checks", checkId, checkObject, () => {
                  if (!err) {
                    // add the check id to the users object
                    userData.checks = userChecks
                    userData.checks.push(checkId)
                    // save the new user data
                    _data.update("users", userPhone, userData, (err) => {
                      if (!err) {
                        callback(200, checkObject)
                      } else {
                        callback(500, { error: "could not update the user with the new check" })
                      }
                    })
                  } else {
                    callback(500, { error: "Could not create the new check" })
                  }
                })
              } else {
                callback(400, { error: "the user already has the maximum number of checks (" + config.maxChecks + ")" })
              }
            } else {
              callback(403)
            }
          })
        } else {
          callback(403)
        }
      })
    } else {
      callback(400, { error: "Missing required inputs" })
    }
  },
  GET: (data, callback) => {
    // check id
    const id = typeof data.queryStringObject.id === "string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
    if (id) {
      _data.read("checks", id, (err, checksData) => {
        if (!err && checksData) {
          const token = typeof data.headers.token === "string" ? data.headers.token : false
          // verify token for the phone
          handlers._tokens.verifyToken(token, checksData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              callback(200, checksData)
            } else {
              callback(403, {
                error: "Missing required token in header or token is not valid.",
              })
            }
          })
          // callback(200, data)
        } else {
          callback(404)
        }
      })
    }
  },
  PUT: (data, callback) => {
    // check id
    const id = typeof data.queryStringObject.id === "string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
    const protocol = typeof data.payload.protocol === "string" && ["http", "https"].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
    const url = typeof data.payload.url === "string" && data.payload.url.trim().length > 0 ? data.payload.url : false
    const method = typeof data.payload.method === "string" && ["POST", "PUT", "GET", "DELETE", "post", "put", "get", "delete"].indexOf(data.payload.method) > -1 ? data.payload.method : false
    const successCodes = typeof data.payload.successCodes === "object" && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
    const timeoutSeconds = typeof data.payload.timeoutSeconds === "number" && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false
    if (id) {
      if (protocol || url || method || successCodes || timeoutSeconds) {
        _data.read("checks", id, (err, checksData) => {
          if (!err && checksData) {
            const token = typeof data.headers.token === "string" ? data.headers.token : false
            // verify token for the phone
            handlers._tokens.verifyToken(token, checksData.userPhone, (tokenIsValid) => {
              if (tokenIsValid) {
                if (protocol) checksData.protocol = protocol
                if (url) checksData.url = url
                if (method) checksData.method = method
                if (successCodes) checksData.successCodes = successCodes
                if (timeoutSeconds) checksData.timeoutSeconds = timeoutSeconds
                _data.update("checks", id, checksData, (err) => {
                  if (!err) {
                    callback(200)
                  } else {
                    callback(500, { error: "Could not update the check" })
                  }
                })
              } else {
                callback(403, {
                  error: "Missing required token in header or token is not valid.",
                })
              }
            })
          } else {
            callback(400, { error: "the ID does not exist" })
          }
        })
      }
    } else {
      callback(400, { error: "Missing required field" })
    }
  },
  DELETE: (data, callback) => {
    // check phone number valid
    const id = typeof data.queryStringObject.id === "string" && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
    if (id) {
      const token = typeof data.headers.token === "string" ? data.headers.token : false
      _data.read("checks", id, (err, checksData) => {
        if (!err && checksData) {
          handlers._tokens.verifyToken(token, checksData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {
              _data.delete("checks", id, (err) => {
                if (!err) {
                  _data.read("users", checksData.userPhone, (err, userData) => {
                    if (!err && userData) {
                      const userChecks = typeof userData.checks === "object" && userData.checks instanceof Array ? userData.checks : []
                      const checkPosition = userChecks.indexOf(id)
                      if (checkPosition > -1) {
                        userChecks.splice(checkPosition, 1)
                        userData.checks = userChecks
                        _data.update("users", checksData.userPhone, userData, (err) => {
                          if (!err) {
                            callback(200)
                          } else {
                            callback(500, { error: "could not update the user deleting the check" })
                          }
                        })
                      } else {
                        callback(500, { error: "Could not find the check on the users object" })
                      }
                    } else {
                      callback(500, { error: "Could not fin the user that creates the check" })
                    }
                  })
                } else {
                  callback(500, { error: "Could not delete the check" })
                }
              })
            } else {
              callback(403, {
                error: "Missing required token in header or token is not valid.",
              })
            }
          })
        } else {
          callback(400, { error: "the ID does not exist" })
        }
      })
    }
  },
}

handlers.ping = (data, callback) => {
  // callback a http status code and a payload that will be an object.
  callback(200)
}
handlers.notFound = (data, callback) => {
  callback(404)
}
module.exports = handlers
