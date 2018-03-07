node-sarra
==========
Consume data from Environment and Climate Change Canada in real-time.

This is a Node.JS client of [Sarracenia][1], the Government of Canada's push
service for data. While this service is used across the Canadian government's
services, this module is presently developed with a focus on consuming open
weather data from Environment and Climate Change Canada, and has settings tuned
for that usage. However, as time goes on, the module is intended to support
more sophisticated usage; if you have a demand for features not supported,
please open an issue or a pull request.

Example
-------
```javascript
// The following will print the URL of Canadian weather alerts files that get
// posted, as they get posted:
sarra.
  listen({amqp_subtopic: "alerts.cap.#"}).
  on("error", err => console.warn(err.message)).
  on("message", (date, url) => console.log(date, url));
```

Usage
-----
*   `sarra.listen(options)`: listen for new data appearing on the Environment
    and Climate Change Canada data server. The passed `options` object defines
    configuration aspects of the listener, and may have any of the following
    properties defined:

    *   `amqp_host` (defaults to `"dd.weather.gc.ca"`): the AMQP server host.
    *   `amqp_port` (defaults to `5672`): the AMQP server port.
    *   `amqp_user` (defaults to `"anonymous"`): the AMQP server username.
    *   `amqp_password` (defaults to `"anonymous"`): the AMQP server password.
    *   `amqp_subtopic` (defaults to `"#"`): the event subtopic, used to filter
        which events are listened for. This corresponds to the directory
        hierarchy on [http://dd.weather.gc.ca/][2]: for example, if you are
        interested in severe weather alerts (which can be found at
        [http://dd.weather.gc.ca/alerts/cap/][3]), then the subtopic
        `"alerts.cap.#"` is appropriate.
    *   `amqp_queue` (defaults to `null`): the queue to subscribe to on the
        remote server. If set to `null`, then a randomly-named queue will be
        created and will disappear once the process ends. This is good for
        development and experimental applications. However, in production, more
        durability may be desirable: in such cases, you should pass a unique
        queue name; this will cause the queue to persist if all connections to
        it close and if even across server restarts (but see `amqp_expires`,
        below).
    *   `amqp_expires` (defaults to `3*3600*1000`): how long (in milliseconds)
        the queue will survive after all clients have disconnected. (This
        option is ignored if `amqp_queue` is `null`, and must be a positive
        number. Even if you request it, this client does not allow a queue to
        persist for longer than 24 hours, in order to prevent dead queues from
        cluttering up the server.)

    This function returns an EventEmitter that emits the following events:

    *   `emit("error", err)`: indicates that some kind of error has occurred.
    *   `emit("message", date, url)`: indicates that data has been updated on
        the data server. The passed information includes a Date object
        (indicating when the event occurred) and a URL (indicating where the
        object that has been updated is located).

    The AMQP connection is robust, automatically reconnecting to the server on
    failure. If the queue is not durable, or if the connection is interrupted
    for longer than the expiration setting, then messages may be lost.

[1]: https://github.com/MetPX/sarracenia
[2]: http://dd.weather.gc.ca/
[3]: http://dd.weather.gc.ca/alerts/cap/
