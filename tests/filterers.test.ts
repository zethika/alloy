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
        expect(cb).toHaveBeenCalledWith("foo",expect.anything())


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
        expect(cb).toHaveBeenCalledWith("bar",expect.anything())
    })

    test('Can handle just being fed a function', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("fooTest",cb)

        alloy.addFilterer("fooTest",(payload:string) => {
            return {value: payload+'1'}
        })

        await alloy.triggerEvent("fooTest","foo")

        // Should have been triggered once at this point, called with undefined
        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith("foo1",expect.anything())
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
        expect(cb).toHaveBeenCalledWith("bar",expect.anything())

        alloy.removeFilterer("fooTest",filter)

        await alloy.triggerEvent("fooTest", "foo")

        // Since the filter is off, the value should be bar
        expect(cb).toHaveBeenCalledTimes(2)
        expect(cb).toHaveBeenCalledWith("foo",expect.anything())
    })

    test('Can handle priority', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("fooTest", {cb})

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return {value: payload+'2'};
            },
        })

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return {value: payload+'3'};
            },
            priority: 100
        })

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return {value: payload+'1'};
            },
            priority: 1
        })

        await alloy.triggerEvent("fooTest", "foo")

        // Since the filter is off, the value should be bar
        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith("foo123",expect.anything())
    })

    test('Can handle promises', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("fooTest", {cb})

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return {
                    value: payload+'1'
                }
            }
        })

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            value: payload+'2'
                        })
                    },50)
                })
            }
        })

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return {
                    value: payload+'3'
                }
            }
        })

        await alloy.triggerEvent("fooTest", "foo")

        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith("foo123",expect.anything())
    })

    test('Can handle stop filters', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("fooTest", {cb})

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return {
                    value: payload+'1',
                    stopFilters: true
                }
            },
            priority: 1
        })

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return {
                    value: payload+'2'
                }
            }
        })

        await alloy.triggerEvent("fooTest", "foo")

        // the value should only have a 1, since the second filter shouldn't have been called
        expect(cb).toHaveBeenCalledTimes(1)
        expect(cb).toHaveBeenCalledWith("foo1",expect.anything())
    })

    test('Can handle cancel event', async () => {
        const alloy = new Alloy<TestEvents>();

        const cb = jest.fn();
        alloy.addEventListener("fooTest", {cb})

        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                return {
                    value: payload+'1',
                    cancelEvent: true
                }
            },
            priority: 1
        })

        let hasFired = false
        alloy.addFilterer("fooTest",{
            cb: (payload: string) => {
                hasFired = true;
                return {
                    value: payload+'2'
                }
            }
        })

        await alloy.triggerEvent("fooTest", "foo")

        // The event should never have been fired and the second filterer should never have been called
        expect(cb).toHaveBeenCalledTimes(0)
        expect(hasFired).toBeFalsy()
    })

    test('Can alter plain value', async () => {
        const alloy = new Alloy<TestEvents>();
        alloy.addFilterer("fooTest",(_v1,ctx) => {
            return {value: ctx._cb?.newValue}
        })

        const newValue = await alloy.applyFilters("fooTest", "foo",{newValue: "bar"})
        expect(newValue.value).toBe("bar")
    })

    test('Can handle reruns', async () => {
        const alloy = new Alloy<TestEvents>();
        let callbackValue = null;
        const newValue = await alloy.applyFilters("fooTest", "foo",undefined,{
            id: "fooReg",
            cb:(value) => {
                callbackValue = value.value
            }
        })
        // Nothing has been done yet
        expect(newValue.value).toBe("foo")
        expect(callbackValue).toBe(null)

        alloy.addFilterer("fooTest",(_v,_c) => {
            return {value: 'bar'}
        })

        // Running the filters now results in the new value being changed to bar
        const newValue2 = await alloy.applyFilters("fooTest", "foo")
        expect(newValue2.value).toBe("bar")

        // Rerun the filters
        await alloy.rerunFilters('fooTest');

        // Hasn't changed previous value
        expect(newValue.value).toBe("foo")
        expect(newValue2.value).toBe("bar")

        // The callback received bar from the newly added filter
        expect(callbackValue).toBe('bar')

        // Removing another rerunnner has no effect
        alloy.removeReRunner("fooTest","bar")
        callbackValue = null;

        // Rerun the filters and check that the callback value is still being set
        await alloy.rerunFilters('fooTest');
        expect(callbackValue).toBe("bar")

        // Removing the rerunner makes it so the callback wont be called again
        alloy.removeReRunner("fooTest","fooReg")
        callbackValue = null;

        await alloy.rerunFilters('fooTest');
        expect(callbackValue).toBe(null)
    })
})
