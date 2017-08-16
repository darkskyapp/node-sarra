node-eccc
=========
Consume data from Environment and Climate Change Canada as it is posted.

Example
-------
```javascript
// The following will print the XML body of Canadian weather alerts as they
// come up:
eccc.
  listen({amqp_route: "alerts.cap.#"}).
  on("error", err => console.warn(err.message)).
  on("message", (date, url) => console.log(date, url));
```

Usage
-----
*   `eccc.listen(options)`: listen for new data appearing on the Environment
    and Climate Change Canada data server. The passed `options` object defines
    configuration aspects of the listener, and may have any of the following
    properties defined:

    *   `amqp_broker` (defaults to
        `"amqp://anonymous:anonymous@dd.weather.gc.ca"`): the AMQP server to
        listen to for events. (You should not normally need to override this.)
    *   `amqp_exchange` (defaults to `"xpublic"`): the exchange to bind to for
        events. (You should not normally need to override this.)
    *   `amqp_route` (defaults to `"#"`): the AMQP route, used to filter which
        events are listened for. This corresponds to the directory hierarchy on
        [http://dd.weather.gc.ca/][1]: for example, if you are interested in
        severe weather alerts (which can be found at
        [http://dd.weather.gc.ca/alerts/cap/][2]), then the route
        `"alerts.cap.#"` is appropriate.
    *   `amqp_queue` (defaults to `"q_anonymous_node-eccc_$RANDOM"`): the name
        of the queue to subscribe to. In general, this should simply be a
        unique string starting with `q_anonymous`; the default (which selects a
        random name) should be adequate for the common case. However, you
        should override the default to something nonrandom if you enable
        `amqp_durable`, below.
    *   `amqp_heartbeat` (defaults to `300`): how often a heartbeat should be
        sent to the AMQP server. (You should not normally need to override
        this.)
    *   `amqp_durable` (defaults to `false`): notifies the AMQP server as to
        whether the queue should be durable (e.g. persist in case all clients
        disconnect). This is advisable in production settings where it is
        imperative that messages should not get lost; however, it should be
        used with care, since a prolonged outage may cause a queue to become
        extremely full and induce server problems at ECCC. (And, possibly, get
        our client banned. So be nice!)

    This function returns an EventEmitter that emits the following events:

    *   `emit("error", err)`: indicates that some kind of error has occurred.
    *   `emit("connect", broker)`: indicates that the library has successfully
        connected to the requested broker.
    *   `emit("subscribe", queue, exchange, route)`: indicates that the library
        has successfully subscribed to the requested exchange and route using
        the requested queue.
    *   `emit("message", date, url)`: indicates that data has been updated on
        the data server. The passed information includes a Date object
        (indicating when the event occurred) and a URL (indicating where the
        object that has been updated is located).

    The AMQP connection is robust, automatically reconnecting to the server on
    failure (though if the queue is not durable, messages sent in the meantime
    will be lost).

[1]: http://dd.weather.gc.ca/
[2]: http://dd.weather.gc.ca/alerts/cap/
