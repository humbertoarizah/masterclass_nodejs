// all the enviroments

const { type } = require("os")
const fs = require("fs")

const environments = {}
// Staging (Default)
environments.staging = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: "staging",
  hashingSecret: "thisIsSecret",
  maxChecks: 5,
}
// Production
environments.production = {
  httpPort: 6000,
  httpsPort: 6001,
  envName: "production",
  hashingSecret: "thisIsProductionSecret",
  maxChecks: 5,
}
// determine which environment was passed

const currentEnvironment = typeof process.env.NODE_ENV === "string" ? process.env.NODE_ENV.toLowerCase() : ""

// check that current environment is one of the existing, not pass default
const envToExport = typeof environments[currentEnvironment] === "object" ? environments[currentEnvironment] : environments.staging

const httpsServerOptions = {
  key: fs.readFileSync("./https/key.pem"),
  cert: fs.readFileSync("./https/cert.pem"),
}
module.exports = { envToExport, httpsServerOptions }
