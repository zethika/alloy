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

    private orderedListeners: Partial<Record<keyof Events, AlloyEventListenerRegistrationType<Events,any>[]>> = {};
    private orderedFilterers: Partial<Record<keyof Events, AlloyEventFiltererRegistrationType<Events,any>[]>> = {};

    /**
     *
     * @param eventName
     * @param registration
     */
    addEventListener<T extends keyof Events>(eventName: T, registration: AlloyEventListenerRegistrationType<Events,T>|AlloyEventListenerCallbackType<Events,T>)
    {
        const parsed:AlloyEventListenerRegistrationType<Events,T> = typeof registration === 'function' ? {cb: registration} : registration
        this.addRegistrationOnMap(this.listeners,eventName,parsed)

        this.recalculateOrder(eventName,'event');
    }

    /**
     *
     * @param eventName
     * @param fn
     */
    removeEventListener<T extends keyof Events>(eventName: T, fn: AlloyEventListenerCallbackType<Events,T>)
    {
        this.removeRegistrationOnMap(this.listeners,eventName,fn)
        this.recalculateOrder(eventName,'event');
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
        this.recalculateOrder(eventName,'filterer');
    }

    /**
     *
     * @param eventName
     * @param fn
     */
    removeFilterer<T extends keyof Events>(eventName: T, fn: AlloyFilterCallbackType<Events,T>)
    {
        this.removeRegistrationOnMap(this.filterers,eventName,fn)
        this.recalculateOrder(eventName,'filterer');
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
        const registrations = this.orderedListeners[eventName];
        // If no registrations are present, we don't need to perform further calculation
        if (typeof registrations === 'undefined' || registrations.length === 0)
            return;

        const filterResponse = await this.applyFilters(eventName,payload);
        if(filterResponse.cancelEvent)
            return;

        for(let i = 0; i < registrations.length; i++){
            const response = registrations[i].cb(filterResponse.value);
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
        const registrations = this.orderedFilterers[eventName];
        if (typeof registrations === 'undefined')
            return {value: payload};

        for(let i = 0; i < registrations.length; i++){
            let response: AlloyFilterCallbackResponseType<Events,T>;
            const first = registrations[i].cb(payload);
            if(this.isPromise(first))
            {
                response = await first;
            }
            else
            {
                response = first as unknown as AlloyFilterCallbackResponseType<Events,T>;
            }

            if(response.cancelEvent)
                return {value: response.value, cancelEvent: true};

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

    /**
     * @param eventName
     * @param target
     * @private
     */
    private recalculateOrder<T extends keyof Events>(eventName: T, target: 'filterer'|'event'){
        let registrations = target === 'filterer' ? this.filterers[eventName] : this.listeners[eventName];
        let map = (target === 'filterer') ? this.orderedFilterers : this.orderedListeners;
        if (typeof registrations === 'undefined')
        {
            delete map[eventName];
            return;
        }

        let flattened: (AlloyEventListenerRegistrationType<Events,any>|AlloyEventFiltererRegistrationType<Events,any>)[] = [];
        Object.values(registrations).forEach((priorities) => {
            priorities.forEach(registration => {
                flattened.push(registration)
            })
        });


        if(flattened.length === 0)
        {
            if(typeof map[eventName] !== 'undefined')
                delete map[eventName]
        }
        else
        {
            map[eventName] = flattened;
        }
    }
}