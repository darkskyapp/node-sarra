"use strict";
const amqp = require("amqp");
const crypto = require("crypto");
const EventEmitter = require("events");
const url = require("url");
const {name: APPLICATION, version: VERSION} = require("./package.json");
const AMQP_HOST = "dd.weather.gc.ca";
const AMQP_PORT = 5672;
const AMQP_TOPIC_PREFIX = "v02.post";
const AMQP_EXCHANGE = "xpublic";
const AMQP_HEARTBEAT = 300;

function random_string() {
  return crypto.pseudoRandomBytes(8).toString("hex");
}

function listen(options) {
  // Determine configurable parameters.
  let amqp_user = "anonymous";
  let amqp_password = "anonymous";
  let amqp_subtopic = "#";
  let amqp_queue = "q_anonymous_" + APPLICATION + "_" + random_string();
  let amqp_durable = false;
  if(options) {
    if(options.amqp_user) {
      amqp_user = options.amqp_user;
    }
    if(options.amqp_password) {
      amqp_password = options.amqp_password;
    }
    if(options.amqp_subtopic) {
      amqp_subtopic = options.amqp_subtopic;
    }
    if(options.amqp_queue) {
      amqp_queue = options.amqp_queue;
    }
    if(options.amqp_durable) {
      amqp_durable = options.amqp_durable;
    }
  }

  // Create the EventEmitter that we'll be returning.
  const emitter = new EventEmitter();

  // Create an AMQP connection.
  const connection = amqp.createConnection(
    {
      host: AMQP_HOST,
      port: AMQP_PORT,
      login: amqp_user,
      password: amqp_password,
      heartbeat: AMQP_HEARTBEAT,
      clientProperties: {applicationName: APPLICATION, version: VERSION},
    },
    {reconnectBackoffStrategy: "exponential"}
  );

  // If there's an error on the connection, pass it along to the consumer.
  connection.on("error", err => emitter.emit("error", err));

  // When a connection becomes available (either because we are connecting for
  // the first time, or because we're reconnecting after some kind of network
  // failure), create a queue and bind it to the requested exchange and topic.
  connection.on("ready", () => {
    connection.queue(
      amqp_queue,
      {durable: amqp_durable, autoDelete: !amqp_durable},
      q => {
        q.bind(AMQP_EXCHANGE, AMQP_TOPIC_PREFIX + "." + amqp_subtopic);

        // Subscribe to messages on the queue. If we get a message, parse it
        // and pass it along to the caller.
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
            emitter.emit("message", date, path);
          }
        });
      }
    );
  });

  return emitter;
}

exports.listen = listen;
