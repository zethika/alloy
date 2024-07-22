import {Alloy, AlloyContextMapType, AlloyPossibleEventsMapType} from "../src";

interface TestEvents extends AlloyPossibleEventsMapType {
    fooTest: string
}

interface TestContextType extends AlloyContextMapType {
    bar?:string
}

describe('Alloy/context',() => {
    test('Can update context', async () => {
        const alloy = new Alloy<TestEvents,TestContextType>();
        expect(alloy.context.bar).toBeUndefined()
        alloy.context.bar = 'foo'
        expect(alloy.context.bar).toBe('foo')
    })
    test('Event listeners have access to context', async () => {
        const alloy = new Alloy<TestEvents,TestContextType>();
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
})