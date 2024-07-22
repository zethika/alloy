import {Alloy, AlloyContextMapType, AlloyPossibleEventsMapType} from "../src";

interface TestEvents extends AlloyPossibleEventsMapType {
    fooTest: string
}

interface TestContextType<Events extends AlloyPossibleEventsMapType> extends AlloyContextMapType<Events> {
    bar?:string
}

describe('Alloy/context',() => {
    test('Can update context', async () => {
        const alloy = new Alloy<TestEvents,TestContextType<TestEvents>>();
        expect(alloy.context.bar).toBeUndefined()
        alloy.context.bar = 'foo'
        expect(alloy.context.bar).toBe('foo')
    })
    test('Event listeners have access to context', async () => {
        const alloy = new Alloy<TestEvents,TestContextType<TestEvents>>();
        alloy.context.bar = 'bar'

        let contextValue: string|undefined = '';
        let payloadValue = '';

        alloy.addEventListener("fooTest", (payload, context) => {
            payloadValue = payload;
            contextValue = context.bar;
        })

        await alloy.triggerEvent("fooTest", "foo")

        expect(contextValue).toBe('bar')
        expect(payloadValue).toBe('foo')
    })
    test('Original event is still available in context, even after filters', async () => {
        const alloy = new Alloy<TestEvents,TestContextType<TestEvents>>();

        // First filterer changes value to bar
        alloy.addFilterer("fooTest",() => {
            return {
                value: "bar"
            }
        })

        let filterContext = '';
        alloy.addFilterer("fooTest",(newValue,context) => {
            filterContext = JSON.stringify(context);
            return {
                value: newValue,
            }
        })

        let eventContext = '';
        let eventValue = '';
        alloy.addEventListener("fooTest", (value,context) => {
            eventContext = JSON.stringify(context);
            eventValue = value
        })

        await alloy.triggerEvent("fooTest", "foo")

        expect(filterContext).toBe('{"_alloy":{"originalEvent":{"eventName":"fooTest","payload":"foo"}}}')
        expect(eventContext).toBe('{"_alloy":{"originalEvent":{"eventName":"fooTest","payload":"foo"}}}')
        expect(eventValue).toBe('bar')

    })
})