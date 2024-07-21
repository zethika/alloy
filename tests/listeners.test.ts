import {Alloy, AlloyPossibleEventsMapType} from "../src";

interface TestEvents extends AlloyPossibleEventsMapType {
    noParameterTest: undefined
}

describe('Alloy/listeners',() => {
    test('Can trigger events', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("noParameterTest",{cb})
        await alloy.triggerEvent("noParameterTest",undefined)

        // Should have been triggered once at this point, called with undefined
        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith(undefined)

        await alloy.triggerEvent("noParameterTest",undefined)
        await alloy.triggerEvent("noParameterTest",undefined)

        // Should have been called 3 times in total at this point
        expect(cb).toHaveBeenCalledTimes(3)
    })
    test('Can handle just being fed a function', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("noParameterTest",cb)
        await alloy.triggerEvent("noParameterTest",undefined)

        // Should have been triggered once at this point, called with undefined
        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith(undefined)
    })
    test('Can have multiple listeners', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb1 = jest.fn();
        const cb2 = jest.fn();

        alloy.addEventListener("noParameterTest",{cb:cb1})
        alloy.addEventListener("noParameterTest",{cb:cb2})

        await alloy.triggerEvent("noParameterTest",undefined)

        // Both callbacks should have been called exactly once
        expect(cb1).toHaveBeenCalledTimes(1)
        expect(cb1).toHaveBeenCalledWith(undefined)
        expect(cb2).toHaveBeenCalledTimes(1)
        expect(cb2).toHaveBeenCalledWith(undefined)
    })
    test('Listeners can be deregistered', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb1 = jest.fn();
        const cb2 = jest.fn();

        alloy.addEventListener("noParameterTest",{cb:cb1})
        alloy.addEventListener("noParameterTest",{cb:cb2})

        await alloy.triggerEvent("noParameterTest",undefined)

        alloy.removeEventListener("noParameterTest",cb2);

        await alloy.triggerEvent("noParameterTest",undefined)

        // The callback which has been deregistered should not have been called the second time
        expect(cb1).toHaveBeenCalledTimes(2)
        expect(cb2).toHaveBeenCalledTimes(1)
    })
    test('Can handle priorities', async () => {
        const alloy = new Alloy<TestEvents>();

        let sequence: number[] = [];
        const cb1 = () => {sequence.push(1)};
        const cb2 = () => {sequence.push(2)};
        const cb3 = () => {sequence.push(3)};

        alloy.addEventListener("noParameterTest",{cb:cb1,priority:1})
        alloy.addEventListener("noParameterTest",{cb:cb2,priority: 100})
        alloy.addEventListener("noParameterTest",{cb:cb3})

        await alloy.triggerEvent("noParameterTest",undefined)

        alloy.removeEventListener("noParameterTest",cb1)
        alloy.removeEventListener("noParameterTest",cb2)
        alloy.removeEventListener("noParameterTest",cb3)
        alloy.addEventListener("noParameterTest",{cb:cb2,priority: 100})
        alloy.addEventListener("noParameterTest",{cb:cb3})
        alloy.addEventListener("noParameterTest",{cb:cb1,priority:1})

        await alloy.triggerEvent("noParameterTest",undefined)

        alloy.removeEventListener("noParameterTest",cb1)
        alloy.removeEventListener("noParameterTest",cb2)
        alloy.removeEventListener("noParameterTest",cb3)
        alloy.addEventListener("noParameterTest",{cb:cb3})
        alloy.addEventListener("noParameterTest",{cb:cb1,priority:1})
        alloy.addEventListener("noParameterTest",{cb:cb2,priority: 100})

        await alloy.triggerEvent("noParameterTest",undefined)

        // Priority should be respected no matter the sequence registrations are added in, so even though we have fired the event 3 times while adding / removing the event listeners in different sequences, they should still be in the same actual sequence
        expect(sequence).toMatchObject([1,3,2,1,3,2,1,3,2])
    })
    test('Can handle promises', async () => {
        const alloy = new Alloy<TestEvents>();

        let sequence: number[] = [];
        const cb1 = () => {sequence.push(1)};
        const cb2 = () => {
            return new Promise<void>((resolve) => {
                setTimeout(() => {
                    sequence.push(2)
                    resolve();
                },100)
            })
        };
        const cb3 = () => {sequence.push(3)};

        alloy.addEventListener("noParameterTest",{cb:cb1})
        alloy.addEventListener("noParameterTest",{cb:cb2})
        alloy.addEventListener("noParameterTest",{cb:cb3})

        await alloy.triggerEvent("noParameterTest",undefined)

        // Sequence should be respected, even though one of the callbacks is a promise which takes some time to finish.
        // The final callback should not be called before the promise has resolved
        expect(sequence).toMatchObject([1,2,3])
    })
});