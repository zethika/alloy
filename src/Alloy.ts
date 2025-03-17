import {
    AlloyEventFiltererRegistrationType,
    AlloyEventListenerRegistrationType,
    AlloyPossibleEventsMapType,
    AlloyEventListenerCallbackType,
    AlloyFilterCallbackType,
    AlloyFilterCallbackResponseType,
    AlloyApplyFilterResponse,
    AlloyContextMapType,
    AlloyEventType, AlloyInternalContextMapType, ValueOf
} from "./index";

type ListenerRegistrationsMapType<Events extends AlloyPossibleEventsMapType, Context extends AlloyContextMapType<Events> = AlloyContextMapType<Events>> = Partial<Record<keyof Events, Record<number,AlloyEventListenerRegistrationType<Events,any,Context>[]>>>;
type FiltererRegistrationsMapType<Events extends AlloyPossibleEventsMapType, Context extends AlloyContextMapType<Events> = AlloyContextMapType<Events>> = Partial<Record<keyof Events, Record<number,AlloyEventFiltererRegistrationType<Events,any,Context>[]>>>;

export default class Alloy<Events extends AlloyPossibleEventsMapType, Context extends AlloyContextMapType<Events> = AlloyContextMapType<Events>> {
    private _running: boolean = true;

    private _context: Context;

    private pendingEvents: AlloyEventType<Events>[] = [];

    private listeners: ListenerRegistrationsMapType<Events,Context> = {}
    private filterers: FiltererRegistrationsMapType<Events,Context> = {}

    private orderedListeners: Partial<Record<keyof Events, AlloyEventListenerRegistrationType<Events,any,Context>[]>> = {};
    private orderedFilterers: Partial<Record<keyof Events, AlloyEventFiltererRegistrationType<Events,any,Context>[]>> = {};

    constructor(context?: Context) {
        this._context = context ?? {} as Context;
    }

    pause(){
        this._running = false;
    }

    async start() {
        this._running = true;
        await this.firePending();
    }

    get context(): Context {
        return this._context;
    }

    set context(value: Context) {
        this._context = value;
    }

    /**
     *
     * @param eventName
     * @param registration
     */
    addEventListener<T extends keyof Events>(eventName: T, registration: AlloyEventListenerRegistrationType<Events,T,Context>|AlloyEventListenerCallbackType<Events,T,Context>)
    {
        const parsed:AlloyEventListenerRegistrationType<Events,T,Context> = typeof registration === 'function' ? {cb: registration} : registration
        this.addRegistrationOnMap(this.listeners,eventName,parsed)
        this.recalculateOrder(eventName,'event');
    }

    /**
     *
     * @param eventName
     * @param fn
     */
    removeEventListener<T extends keyof Events>(eventName: T, fn: AlloyEventListenerCallbackType<Events,T,Context>)
    {
        this.removeRegistrationOnMap(this.listeners,eventName,fn)
        this.recalculateOrder(eventName,'event');
    }

    /**
     *
     * @param eventName
     * @param registration
     */
    addFilterer<T extends keyof Events>(eventName: T, registration: AlloyEventFiltererRegistrationType<Events,T,Context>|AlloyFilterCallbackType<Events,T,Context>)
    {
        const parsed: AlloyEventFiltererRegistrationType<Events,T,Context> = typeof registration === 'function' ? {cb: registration} : registration
        this.addRegistrationOnMap(this.filterers,eventName,parsed)
        this.recalculateOrder(eventName,'filterer');
    }

    /**
     *
     * @param eventName
     * @param fn
     */
    removeFilterer<T extends keyof Events>(eventName: T, fn: AlloyFilterCallbackType<Events,T,Context>)
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
    private addRegistrationOnMap<T extends keyof Events>(map: ListenerRegistrationsMapType<Events,Context>|FiltererRegistrationsMapType<Events,Context>, eventName: T, registration: AlloyEventListenerRegistrationType<Events,T,Context>|AlloyEventFiltererRegistrationType<Events,T,Context>){
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
    private removeRegistrationOnMap<T extends keyof Events>(map: ListenerRegistrationsMapType<Events,Context>|FiltererRegistrationsMapType<Events,Context>, eventName: T, fn: AlloyEventListenerCallbackType<Events,T,Context>|AlloyFilterCallbackType<Events,T,Context>)
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
     * @param callback
     */
    async triggerEvent<T extends keyof Events>(eventName: T, payload: Events[T], callback?: AlloyEventListenerCallbackType<Events,T,Context>)
    {
        if(this._running)
        {
            await this.fireSingleEvent({eventName,payload},callback);
        }
        else
        {
            this.pendingEvents.push({eventName,payload});
        }
    }

    /**
     *
     */
    private async firePending(){
        let toFire = [...this.pendingEvents]
        this.pendingEvents = [];
        for(let i = 0; i < toFire.length; i++)
        {
            await this.fireSingleEvent(toFire[i])
        }
    }

    /**
     *
     * @param event
     * @param callback
     * @private
     */
    private async fireSingleEvent(event: AlloyEventType<Events>,callback?: AlloyEventListenerCallbackType<Events,any,Context>){
        const registrations = this.orderedListeners[event.eventName];

        // If no registrations are present, we don't need to perform further calculation
        if ((typeof registrations === 'undefined' || registrations.length === 0) && typeof callback !== 'function')
            return;

        this.setAlloyContextKey('originalEvent',event)

        const filterResponse = await this.applyFilters(event.eventName,event.payload);
        // If the filters requests the event to cancel, neither the registrations nor the callback is called
        if(filterResponse.cancelEvent)
        {
            this.setAlloyContextKey('originalEvent',undefined)
            return;
        }

        if(Array.isArray(registrations))
        {
            for(let i = 0; i < registrations.length; i++){
                await this.maybePerformPromiseLikeCallback(filterResponse.value,registrations[i].cb)
            }
        }

        await this.maybePerformPromiseLikeCallback(event.payload,callback)
        this.setAlloyContextKey('originalEvent',undefined)
    }

    /**
     *
     * @param value
     * @param callback
     * @private
     */
    private async maybePerformPromiseLikeCallback(value: ValueOf<Events>,callback?: AlloyEventListenerCallbackType<Events,any,Context>){
        if(typeof callback === 'function')
        {
            const response = callback(value,this.context)
            if(this.isPromise(response))
                await response;
        }
    }

    /**
     *
     * @param eventName
     * @param payload
     * @param callbackContext
     */
    async applyFilters<T extends keyof Events>(eventName: T, payload: Events[T], callbackContext?: Record<string, any>): Promise<AlloyApplyFilterResponse<Events,T>>{
        const registrations = this.orderedFilterers[eventName];
        if (typeof registrations === 'undefined')
            return {value: payload};

        let context = {...this.context};
        if(typeof callbackContext !== 'undefined')
            context._cb = callbackContext;

        for(let i = 0; i < registrations.length; i++){
            let response: AlloyFilterCallbackResponseType<Events,T>;
            const first = registrations[i].cb(payload,context);
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

        let flattened: (AlloyEventListenerRegistrationType<Events,any,Context>|AlloyEventFiltererRegistrationType<Events,any,Context>)[] = [];
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

    /**
     *
     * @param key
     * @param value
     * @private
     */
    private setAlloyContextKey(key: keyof AlloyInternalContextMapType<Events>, value: ValueOf<AlloyInternalContextMapType<Events>>){
        if(typeof this.context._alloy === 'undefined')
            this.context._alloy = {};

        this.context._alloy[key] = value;
    }
}