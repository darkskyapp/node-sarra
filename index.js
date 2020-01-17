"use strict";
const amqp = require("amqp");
const crypto = require("crypto");
const EventEmitter = require("events");
const url = require("url");
const {name: APPLICATION, version: VERSION} = require("./package.json");
const AMQP_HEARTBEAT = 300;

function random_string() {
  return crypto.pseudoRandomBytes(8).toString("hex");
}

function listen(options) {
  // Determine configurable parameters.
  let amqp_host = "dd.weather.gc.ca";
  let amqp_port = 5671;
  let amqp_user = "anonymous";
  let amqp_password = "anonymous";
  let amqp_exchange = "xpublic";
  let amqp_topic_prefix = "v02.post";
  let amqp_subtopic = "#";
  let amqp_queue = null;
  let amqp_expires = 10800000; // three hours in milliseconds
  if(options) {
    if(options.amqp_host) {
      amqp_host = options.amqp_host;
    }
    if(options.amqp_port > 0) {
      amqp_port = options.amqp_port;
    }
    if(options.amqp_user) {
      amqp_user = options.amqp_user;
    }
    if(options.amqp_password) {
      amqp_password = options.amqp_password;
    }
    if(options.amqp_exchange) {
      amqp_exchange = options.amqp_exchange;
    }
    if(options.amqp_topic_prefix) {
      amqp_topic_prefix = options.amqp_topic_prefix;
    }
    if(options.amqp_subtopic) {
      amqp_subtopic = options.amqp_subtopic;
    }
    if(options.amqp_queue) {
      amqp_queue = options.amqp_queue;
    }
    if(options.amqp_expires > 0) {
      amqp_expires = options.amqp_expires;

      // Do not allow queues to persist for longer than 24 hours, even if
      // requested. We want to be polite customers!
      if(amqp_expires > 86400000) {
        amqp_expires = 86400000;
      }
    }
    if(options.v03) {
      amqp_host = "hpfx.collab.science.gc.ca";
      amqp_exchange = "xs_pas037_wmosketch_public";
      amqp_topic_prefix = "v03.post";
    }
  }

  // Determine queue options.
  const amqp_queue_options = {};
  if(amqp_queue === null) {
    amqp_queue = APPLICATION + "_" + random_string();
    amqp_queue_options.exclusive = true;
  }
  else {
    amqp_queue_options.durable = true;
    amqp_queue_options.autoDelete = false;
    amqp_queue_options.arguments = {"x-expires": amqp_expires};
  }

  // Create the EventEmitter that we'll be returning.
  const emitter = new EventEmitter();

  // Create an AMQP connection.
  const connection = amqp.createConnection(
    {
      host: amqp_host,
      port: amqp_port,
      login: amqp_user,
      password: amqp_password,
      heartbeat: AMQP_HEARTBEAT,
      clientProperties: {applicationName: APPLICATION, version: VERSION},
      ssl: {enabled: true},
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
      "q_" + amqp_user + "_" + amqp_queue,
      amqp_queue_options,
      q => {
        q.bind(amqp_exchange, amqp_topic_prefix + "." + amqp_subtopic);

        // Subscribe to messages on the queue. If we get a message, parse it
        // and pass it along to the caller.
        // 
        // http://metpx.sourceforge.net/sr_post.7.html
        q.subscribe(message => {
          // Parse the posted message from the server.
          const data = message.data.toString("utf8");
          let pubTime;
          let baseUrl;
          let relPath;

          // If the message starts with a "{", then we assume the payload is a
          // v03 JSON payload.
          if(data.startsWith("{")) {
            const obj = JSON.parse(data);
            pubTime = obj.pubTime;
            baseUrl = obj.baseUrl;
            relPath = obj.relPath;
          }

          // Otherwise, we assume it's a v02 text payload.
          else {
            [pubTime, baseUrl, relPath] = data.split("\n", 1)[0].split(" ", 3);
          }

          // Convert pubTime into a Date object.
          const date = new Date(
            pubTime.slice(0, 4) + "-" + pubTime.slice(4, 6) + "-" +
            pubTime.slice(6, 8) + "T" + pubTime.slice(8, 10) + ":" +
            pubTime.slice(10, 12) + ":" + pubTime.slice(12, 18) + "Z"
          );

          // Resolve baseUrl+relPath into a full URL.
          const path = url.resolve(baseUrl, relPath);

          // Emit the Date and URL.
          emitter.emit("message", date, path);
        });
      }
    );
  });

  return emitter;
}

exports.listen = listen;
