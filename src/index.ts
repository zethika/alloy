import Alloy from "./Alloy";

export type ValueOf<T> = T[keyof T];
export type AlloyPossibleEventsMapType = object

export interface AlloyEventType<Events extends AlloyPossibleEventsMapType>{eventName: keyof Events, payload: ValueOf<Events>}

export interface AlloyInternalContextMapType<Events extends AlloyPossibleEventsMapType> {
    originalEvent?: AlloyEventType<Events>
}

export interface AlloyContextMapType<Events extends AlloyPossibleEventsMapType> {
    _alloy?: AlloyInternalContextMapType<Events>,
    _cb?: Record<string, any>
}

export interface AlloyFilterCallbackResponseType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events> {
    stopFilters?: boolean,
    cancelEvent?: boolean,
    value: Events[Event]
}

export interface AlloyApplyFilterResponse<Events extends AlloyPossibleEventsMapType, Event extends keyof Events> {
    value: Events[Event],
    cancelEvent?: boolean
}

export type AlloyEventListenerCallbackType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events, Context> = (payload: Events[Event], context: Context) => any|Promise<any>;
export type AlloyFilterCallbackType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events, Context> = (payload: Events[Event], context: Context) => AlloyFilterCallbackResponseType<Events,Event>|Promise<AlloyFilterCallbackResponseType<Events,Event>>;

export interface AlloyRegistrationType {
    priority?: number
}

export interface AlloyEventListenerRegistrationType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events,Context> extends AlloyRegistrationType{
    cb: AlloyEventListenerCallbackType<Events,Event,Context>
}

export interface AlloyEventFiltererRegistrationType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events,Context> extends AlloyRegistrationType{
    cb: AlloyFilterCallbackType<Events,Event,Context>
}

export {
    Alloy
}