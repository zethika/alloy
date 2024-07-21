import {
    AlloyEventFiltererRegistrationType,
    AlloyEventListenerRegistrationType,
    AlloyPossibleEventsMapType,
    AlloyEventListenerCallbackType,
    AlloyFilterCallbackType, AlloyFilterCallbackResponseType, AlloyApplyFilterResponse
} from "./index";

type ListenerRegistrationsMapType<Events extends AlloyPossibleEventsMapType> = Partial<Record<keyof Events, Record<number,AlloyEventListenerRegistrationType<Events,any>[]>>>;
type FiltererRegistrationsMapType<Events extends AlloyPossibleEventsMapType> = Partial<Record<keyof Events, Record<number,AlloyEventFiltererRegistrationType<Events,any>[]>>>;

export default class Alloy<Events extends AlloyPossibleEventsMapType> {
    private listeners: ListenerRegistrationsMapType<Events> = {}
    private filterers: FiltererRegistrationsMapType<Events> = {}

    /**
     *
     * @param eventName
     * @param registration
     */
    addEventListener<T extends keyof Events>(eventName: T, registration: AlloyEventListenerRegistrationType<Events,T>|AlloyEventListenerCallbackType<Events,T>)
    {
        const parsed:AlloyEventListenerRegistrationType<Events,T> = typeof registration === 'function' ? {cb: registration} : registration
        this.addRegistrationOnMap(this.listeners,eventName,parsed)
    }

    /**
     *
     * @param eventName
     * @param fn
     */
    removeEventListener<T extends keyof Events>(eventName: T, fn: AlloyEventListenerCallbackType<Events,T>)
    {
        this.removeRegistrationOnMap(this.listeners,eventName,fn)
    }

    /**
     *
     * @param eventName
     * @param registration
     */
    addFilterer<T extends keyof Events>(eventName: T, registration: AlloyEventFiltererRegistrationType<Events,T>|AlloyFilterCallbackType<Events,T>)
    {
        const parsed: AlloyEventFiltererRegistrationType<Events,T> = typeof registration === 'function' ? {cb: registration} : registration
        this.addRegistrationOnMap(this.filterers,eventName,parsed)
    }

    /**
     *
     * @param eventName
     * @param fn
     */
    removeFilterer<T extends keyof Events>(eventName: T, fn: AlloyFilterCallbackType<Events,T>)
    {
        this.removeRegistrationOnMap(this.filterers,eventName,fn)
    }

    /**
     *
     * @param map
     * @param eventName
     * @param registration
     * @private
     */
    private addRegistrationOnMap<T extends keyof Events>(map: ListenerRegistrationsMapType<Events>|FiltererRegistrationsMapType<Events>, eventName: T, registration: AlloyEventListenerRegistrationType<Events,T>|AlloyEventFiltererRegistrationType<Events,T>){
        if(typeof map[eventName] === 'undefined')
        {
            // @todo can this be typed reliably?
            // @ts-ignore
            map[eventName] = [];
        }

        const priority = typeof registration.priority !== 'undefined' ? registration.priority : 10;

        if(typeof map[eventName][priority] === 'undefined')
            map[eventName][priority] = [];

        map[eventName][priority].push(registration);
    }


    /**
     *
     * @param map
     * @param eventName
     * @param fn
     * @private
     */
    private removeRegistrationOnMap<T extends keyof Events>(map: ListenerRegistrationsMapType<Events>|FiltererRegistrationsMapType<Events>, eventName: T, fn: AlloyEventListenerCallbackType<Events,T>|AlloyFilterCallbackType<Events,T>)
    {
        const priorities = map[eventName];
        if (typeof priorities === 'undefined')
            return;

        let toDelete:number[] = [];
        Object.entries(priorities).forEach(([key,priority]) => {
            let index = parseInt(key);
            priorities[index] = priority.filter(reg => reg.cb !== fn)
            if(priorities[index].length === 0)
                toDelete.push(index)
        });

        toDelete.forEach(index => {
            delete priorities[index]
        })

        if(Object.keys(priorities).length === 0)
            delete map[eventName];
    }

    /**
     *
     * @param eventName
     * @param payload
     */
    async triggerEvent<T extends keyof Events>(eventName: T, payload: Events[T])
    {
        const registrations = this.listeners[eventName];
        if (typeof registrations === 'undefined')
            return;


        let callbacks: AlloyEventListenerCallbackType<Events,T>[] = [];
        Object.values(registrations).forEach((priorities) => {
            priorities.forEach(registration => {
                callbacks.push(registration.cb)
            })
        });

        // If no callbacks are present, we don't need to perform further calculation
        if(callbacks.length === 0)
            return;

        const filterResponse = await this.applyFilters(eventName,payload);
        if(filterResponse.cancel)
            return;

        for(let i = 0; i < callbacks.length; i++){
            const response = callbacks[i](filterResponse.value);
            if(this.isPromise(response))
                await response;
        }
    }

    /**
     *
     * @param eventName
     * @param payload
     */
    async applyFilters<T extends keyof Events>(eventName: T, payload: Events[T]): Promise<AlloyApplyFilterResponse<Events,T>>{
        const registrations = this.filterers[eventName];
        if (typeof registrations === 'undefined')
            return {value: payload};

        let callbacks: AlloyFilterCallbackType<Events,T>[] = [];
        Object.values(registrations).forEach((priorities) => {
            priorities.forEach(registration => {
                callbacks.push(registration.cb)
            })
        });

        for(let i = 0; i < callbacks.length; i++){
            let response: AlloyFilterCallbackResponseType<Events,T>;
            const first = callbacks[i](payload);
            if(this.isPromise(first))
            {
                response = await first;
            }
            else
            {
                response = first as unknown as AlloyFilterCallbackResponseType<Events,T>;
            }

            if(response.cancelEvent)
                return {value: response.value, cancel: true};

            if(response.stopFilters)
                return {value: response.value};

            payload = response.value;
        }

        return {value: payload};
    }

    /**
     *
     * @param maybePromise
     * @private
     */
    private isPromise(maybePromise:any) {
        return !!maybePromise && (typeof maybePromise === 'object' || typeof maybePromise === 'function') && typeof maybePromise.then === 'function';
    }
}