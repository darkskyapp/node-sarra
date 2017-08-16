"use strict";
const amqp = require("amqp");
const crypto = require("crypto");
const EventEmitter = require("events");
const minhttp = require("minhttp");
const url = require("url");
const {name: APPLICATION, version: VERSION} = require("./package.json");
const USER_AGENT = APPLICATION + "/" + VERSION;
const AMQP_ROUTE_PREFIX = "v02.post";

function random_string() {
  return crypto.pseudoRandomBytes(8).toString("hex");
}

function listen(options) {
  // Determine configurable parameters.
  let amqp_broker = "amqp://anonymous:anonymous@dd.weather.gc.ca";
  let amqp_exchange = "xpublic";
  let amqp_route = "#";
  let amqp_queue = "q_anonymous_" + APPLICATION + "_" + random_string();
  let amqp_heartbeat = 300;
  let amqp_durable = false;
  let fetch_method = "body";
  let fetch_timeout = 10000;
  if(options) {
    if(options.amqp_broker) {
      amqp_broker = options.amqp_broker;
    }
    if(options.amqp_exchange) {
      amqp_exchange = options.amqp_exchange;
    }
    if(options.amqp_route) {
      amqp_route = options.amqp_route;
    }
    if(options.amqp_queue) {
      amqp_queue = options.amqp_queue;
    }
    if(options.amqp_heartbeat > 0) {
      amqp_heartbeat = options.amqp_heartbeat;
    }
    if(options.amqp_durable) {
      amqp_durable = options.amqp_durable;
    }
    if(options.fetch_method === "stream" || options.fetch_method === "body") {
      fetch_method = options.fetch_method;
    }
    if(options.fetch_timeout > 0) {
      fetch_timeout = options.fetch_timeout;
    }
  }

  // Create the EventEmitter that we'll be returning.
  const emitter = new EventEmitter();

  // Create an AMQP connection.
  const connection = amqp.createConnection(
    {
      url: amqp_broker,
      heartbeat: amqp_heartbeat,
      clientProperties: {applicationName: "node-eccc", version: VERSION},
    },
    {reconnectBackoffStrategy: "exponential"}
  );

  // If there's an error on the connection, pass it along to the consumer.
  connection.on("error", err => emitter.emit("error", err));

  // When a connection becomes available (either because we are connecting for
  // the first time, or because we're reconnecting after some kind of network
  // failure), create a queue and bind it to the requested exchange and route.
  connection.on("ready", () => {
    emitter.emit("connect", amqp_broker);

    connection.queue(
      amqp_queue,
      {durable: amqp_durable, autoDelete: !amqp_durable},
      q => {
        const route = AMQP_ROUTE_PREFIX + "." + amqp_route;
        q.bind(amqp_exchange, route);
        emitter.emit("subscribe", amqp_queue, amqp_exchange, route);

        // Subscribe to messages on the queue. If we get a message, attempt to
        // parse it; if that works, then pass it along to the caller. Further,
        // if the caller requested that we fetch data for them, then do so.
        // 
        // http://metpx.sourceforge.net/sr_post.7.html
        q.subscribe(message => {
          if(message.contentType === "text/plain") {
            const [timestamp, srcpath, relativepath] = message.data.
              toString("utf8").split("\n", 1)[0].split(" ", 3);
            const date = new Date(
              timestamp.slice(0, 4) + "-" + timestamp.slice(4, 6) + "-" +
              timestamp.slice(6, 8) + "T" + timestamp.slice(8, 10) + ":" +
              timestamp.slice(10, 12) + ":" + timestamp.slice(12, 14) + "Z"
            );
            const path = !srcpath.endsWith("/")?
              srcpath:
              url.resolve(srcpath, relativepath);
            emitter.emit("metadata", date, path);

            if(fetch_method) {
              const obj = url.parse(path);

              if(obj.protocol === "http:" || obj.protocol === "https:") {
                obj.method = "GET";
                obj.timeout = fetch_timeout;
                obj.headers = {"User-Agent": USER_AGENT};
                minhttp[fetch_method](obj).then(
                  res => emitter.emit("data", date, path, res),
                  err => emitter.emit("error", err)
                );
              }
            }
          }
        });
      }
    );
  });

  return emitter;
}

exports.listen = listen;
