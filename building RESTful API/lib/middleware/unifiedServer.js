const url = require("url");
const StringDecoder = require("string_decoder").StringDecoder;

const handlers = require("../handlers");
const helpers = require("../helpers");

const router = {
  ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks,
};

const unifiedServer = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, "");

  // get the query string object
  const queryStringObject = parsedUrl.query;
  // get http method
  const method = req.method.toUpperCase();
  // get headers
  const headers = req.headers;
  // get the payload
  const decoder = new StringDecoder("utf-8");
  let buffer = "";
  req.on("data", (data) => {
    buffer += decoder.write(data);
  });

  req.on("end", () => {
    buffer += decoder.end();
    // chose the handle this request should use
    const chosenHandler = typeof router[trimmedPath] !== "undefined" ? router[trimmedPath] : handlers.notFound;
    // construct data object to the handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      payload: buffer && helpers.parseJsonToObject(buffer),
    };
    chosenHandler(data, (statusCode, payload) => {
      // use the statusCode code or default 200 code
      statusCode = typeof statusCode === "number" ? statusCode : 200;
      // use the payload or return empty object
      payload = typeof payload === "object" ? payload : {};

      // Convert payload to string
      const payloadString = JSON.stringify(payload);
      // return the response
      res.setHeader("Content-Type", "application/json");
      res.writeHead(statusCode);
      res.end(payloadString);
    });
  });
};
module.exports = unifiedServer;
