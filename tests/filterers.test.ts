import {Alloy, AlloyPossibleEventsMapType} from "../src";

interface TestEvents extends AlloyPossibleEventsMapType {
    fooTest: string
}

describe('Alloy/listeners',() => {
    test('Can filter events', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("fooTest", {cb})
        await alloy.triggerEvent("fooTest", "foo")

        // Should have been triggered once at this point, called with the same value
        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith("foo")


        alloy.addFilterer("fooTest",{
            cb: (_: string) => {
                return {
                    value: "bar"
                }
            }
        })

        await alloy.triggerEvent("fooTest", "foo")

        // Should have been called 2 times in total at this point, and had the value changed from the filter
        expect(cb).toHaveBeenCalledTimes(2)
        expect(cb).toHaveBeenCalledWith("bar")
    })

    test('Can remove filters', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("fooTest", {cb})

        const filter = (_: string) => {
            return {
                value: "bar"
            }
        };

        alloy.addFilterer("fooTest",{
            cb: filter
        })

        await alloy.triggerEvent("fooTest", "foo")

        // Since the filter is on, the value should be bar
        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith("bar")

        alloy.removeFilterer("fooTest",filter)

        await alloy.triggerEvent("fooTest", "foo")

        // Since the filter is off, the value should be bar
        expect(cb).toHaveBeenCalledTimes(2)
        expect(cb).toHaveBeenCalledWith("foo")
    })
})
