node-eccc
=========
Consume data from Environment and Climate Change Canada as it is posted.

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
        hierarchy on [http://dd.weather.gc.ca/][1]: for example, if you are
        interested in severe weather alerts (which can be found at
        [http://dd.weather.gc.ca/alerts/cap/][2]), then the subtopic
        `"alerts.cap.#"` is appropriate.
    *   `amqp_queue` (defaults to `"q_anonymous_node-eccc_$RANDOM"`): the name
        of the queue to subscribe to. In general, this should simply be a
        unique string starting with `q_anonymous`; the default (which selects a
        random name) should be adequate for the common case. However, you
        should override the default to something nonrandom if you enable
        `amqp_durable`, below.
    *   `amqp_durable` (defaults to `false`): notifies the AMQP server as to
        whether the queue should be durable (e.g. persist in case all clients
        disconnect). This is advisable in production settings where it is
        imperative that messages should not get lost; however, it should be
        used with care, since a prolonged outage may cause a queue to become
        extremely full and induce server problems at ECCC. (And, possibly, get
        our client banned. So be nice!)

    This function returns an EventEmitter that emits the following events:

    *   `emit("error", err)`: indicates that some kind of error has occurred.
    *   `emit("message", date, url)`: indicates that data has been updated on
        the data server. The passed information includes a Date object
        (indicating when the event occurred) and a URL (indicating where the
        object that has been updated is located).

    The AMQP connection is robust, automatically reconnecting to the server on
    failure (though if the queue is not durable, messages sent in the meantime
    will be lost).

[1]: http://dd.weather.gc.ca/
[2]: http://dd.weather.gc.ca/alerts/cap/
