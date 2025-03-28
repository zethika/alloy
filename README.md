# [Alloy](https://github.com/zethika/alloy) &middot; [![npm version](https://img.shields.io/npm/v/@zethika/alloy.svg?style=flat)](https://www.npmjs.com/package/@zethika/alloy) 

Alloy is an event bus capable of having both regular event listeners, event payload mutators/deciders ("filterers") and delayed the events' execution, within a provided context.  
Both event listeners and filterers have support for being both async and sync, as well as having a prioritized execution sequence.

## Triggering events
To trigger an event, call the `triggerEvent` function.  
It returns a promise which will resolve when all event listeners on the event has finished.

    const alloy = new Alloy();
    alloy.addEventListener("fooEvent",(payload) => {
        console.log(payload) // foo
    })
    await alloy.triggerEvent("fooEvent","foo")

You can explicitly provide the `triggerEvent` function with an additional callback.
This callback will be fired after all other event listeners have finished, and will fire even if no other registrations exist on an event.

    const alloy = new Alloy();
    await alloy.triggerEvent("fooEvent","foo", (payload) => {
        console.log(payload) // foo
    })

Use this callback to allow remote code to react to single events / affect their payload, which you yourself also needs to react to, without having to register and deregister an event listener / filterer.

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


Filterers can also be used outside of the event loop, for plain modification of values, like so:

    const alloy = new Alloy();
    alloy.addFilterer("fooTest",(previousValue,context) => {
        return {value: "bar"}
    })

    const value = await alloy.applyFilters("fooTest", "foo")
    // value is "bar"

### Running filters again
It's possible to register a rerunner when calling applyFilters in such a way that they can be reran, for example after adding or removing filterers.  
This can be done like so:

    const alloy = new Alloy<TestEvents>();
    const originalFilteredValue = await alloy.applyFilters("fooTest", "foo",undefined,{ // The fourth parameter is a rerunner registration
        id: "fooReg", // An id to identify the rerunner, 
        cb:(newValue) => {
            // newValue will be the filtered value after applying all filters on the original value again.
        }
    })

    // Rerun the registered rerunners on the "fooTest" filter.
    // Reruns use the id of the registration to only match the -latest- filter application which is used as the basis for the rerun.
    await alloy.rerunFilters('fooTest');

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

Within the scope of the same priority, registration order is respected.  
That is to say, the filter which was registered the earliest will be executed first.

## Context
Both event listeners and filterers callback functions are called with a second parameter, the execution context.  
The context is largely a plain object which the implementing code can use to provide globally accessible values to the various callback functions instead of forcing the individual functions into determining those things themselves.

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
