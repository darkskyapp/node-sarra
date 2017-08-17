node-sarra
==========
Consume data from Environment and Climate Change Canada in real-time.

This is a Node.JS client of [Sarracenia][1], the Government of Canada's push
service for data. While this service is used across the Canadian government's
services, this module is presently developed with the intention of consuming
open weather data from Environment and Climate Change Canada. This module is
presently rather embryonic, but is intended to grow to support more
sophisticated use-cases and time goes on.

Example
-------
```javascript
// The following will print the URL of Canadian weather alerts files that get
// posted, as they get posted:
eccc.
  listen({amqp_subtopic: "alerts.cap.#"}).
  on("error", err => console.warn(err.message)).
  on("message", (date, url) => console.log(date, url));
```

Usage
-----
*   `eccc.listen(options)`: listen for new data appearing on the Environment
    and Climate Change Canada data server. The passed `options` object defines
    configuration aspects of the listener, and may have any of the following
    properties defined:

    *   `amqp_user` (defaults to `anonymous`): the AMQP server username.
    *   `amqp_password` (defaults to `anonymous`): the AMQP server password.
    *   `amqp_subtopic` (defaults to `"#"`): the event subtopic, used to filter
        which events are listened for. This corresponds to the directory
        hierarchy on [http://dd.weather.gc.ca/][2]: for example, if you are
        interested in severe weather alerts (which can be found at
        [http://dd.weather.gc.ca/alerts/cap/][3]), then the subtopic
        `"alerts.cap.#"` is appropriate.
    *   `amqp_queue` (defaults to `"node-eccc_$RANDOM"`): the name of the queue
        to subscribe to. In general, this should simply be a unique string; the
        default (which selects a random name) should be adequate for the common
        case. However, you should override the default to something nonrandom
        if you enable `amqp_durable`, below.
    *   `amqp_expires` (defaults to `3*3600*1000`): how long (in milliseconds)
        the queue will survive after all clients have disconnected. (This is
        only meaningful if `amqp_durable`, below, is set.)
    *   `amqp_durable` (defaults to `false`): notifies the AMQP server as to
        whether the queue should be durable (e.g. persist in case all clients
        disconnect). This is advisable in production settings where it is
        imperative that messages should not get lost; however, it should be
        used with care (alongside `amqp_expires`, see above), since it is
        impolite to leave discarded queues lying around the ECCC server.

    This function returns an EventEmitter that emits the following events:

    *   `emit("error", err)`: indicates that some kind of error has occurred.
    *   `emit("message", date, url)`: indicates that data has been updated on
        the data server. The passed information includes a Date object
        (indicating when the event occurred) and a URL (indicating where the
        object that has been updated is located).

    The AMQP connection is robust, automatically reconnecting to the server on
    failure (though if the queue is not durable, messages sent in the meantime
    may be lost).

[1]: http://metpx.sourceforge.net/sarra-e.html
[2]: http://dd.weather.gc.ca/
[3]: http://dd.weather.gc.ca/alerts/cap/
