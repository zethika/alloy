# [Alloy](https://github.com/zethika/alloy) &middot; [![npm version](https://img.shields.io/npm/v/@zethika/alloy.svg?style=flat)](https://www.npmjs.com/package/@zethika/alloy) 

Alloy is an event bus capable of having both regular event listeners, event payload mutators and delayed execution, within a provided context.  
Both event listeners and data filterers may be either an object describing the registration in more detail, or simply a function.

## Triggering events
To trigger an event, call the "triggerEvent" function.  
It returns a promise which will resolve when all event listeners on the event has finished.

    const alloy = new Alloy();
    alloy.addEventListener("fooEvent",(payload) => {
        console.log(payload) // foo
    })
    await alloy.triggerEvent("fooEvent","foo")


## Event listeners
To add an event listener, you can simply provide a function to the `addEventListener` function

    const alloy = new Alloy();
    alloy.addEventListener("foo", (payload, context) => {
        // do something...
    })

To remove an event listener again, you can call the `removeEventListener` function

    const alloy = new Alloy();
    const callback = () => (payload, context) => {
        // do something
    }
    alloy.addEventListener("foo", callback)
    alloy.removeEventListener("foo", callback)

## Filterers
Alloy has support for filtering the payload before it is sent to the event listeners.  
This allows other parts of the system to easily affect the final value being sent.

Call `addFilterer` to add a filterer. Like with `addEventListener`, this accepts both a plain function and an object describing the registration in more detail.

    const alloy = new Alloy();
    alloy.addFilterer("fooEvent",(_) => {
        return {
            value: "bar"
        }
    })
    alloy.addEventListener("fooEvent", (payload) => {
        console.log(payload) // "bar"
    })
    await alloy.triggerEvent("fooEvent", "foo")

Filterers can also both stop further filters from being called on the event, or stop the event from being fired at all

    const alloy = new Alloy();
    alloy.addFilterer("fooEvent",(_: string) => {
        return {
            value: _,
            cancelEvent: true
        }
    })
    alloy.addEventListener("fooEvent", (payload) => {}) // will not be called
    await alloy.triggerEvent("fooEvent", "foo")

To remove a filterer again, you can call the `removeFilterer` function

    const alloy = new Alloy();
    const callback = (_: string) => {
        return {
            value: "bar",
        }
    };
    alloy.addFilterer("fooEvent",callback)
    alloy.removeFilterer("fooEvent",callback)


## Registration
Both `addFilterer` and `addEventListener` accepts an object instead of a callback function.  
This allows passing more detail, outside of certain defaults, to the function registration.

### cb
Contains the callback function.  
This is the same element which could otherwise have been given directly as the registration, and as such is the only required property if the registration is in object format.

    const alloy = new Alloy();
    alloy.addEventListener("fooEvent",{
        cb: (payload) => console.log(payload),
    })

### priority
Priority defines which order event listeners or filterers are executed in.  
An event listener or filterer with a lower number will be executed first (1 executed before 2, and so on).  
If not given, will default to `10`

    const alloy = new Alloy();
    alloy.addEventListener("fooEvent",{
        cb: (payload) => console.log(payload),
        priority: 1
    })

## Context
Both event listeners and filterers callback functions are called with a second parameter, the execution context.  
The context is largely a plain object which the implementing code can use to provide globally accessible values to the various callback functions  
instead of forcing the individual functions into determining those things themselves.

The only value provided by Alloy here, is the `_alloy` property, which includes the original event before any filters affected it.

    const alloy = new Alloy();
    alloy.addFilterer("fooEvent",() => {
        return {
            value: "bar"
        }
    })

    alloy.addEventListener("fooEvent", (value,context) => {
        console.log(value) // "bar"
        console.log(context) // {"_alloy":{"originalEvent":{"eventName":"fooTest","payload":"foo"}}}
    })

    alloy.triggerEvent("fooEvent","foo")
