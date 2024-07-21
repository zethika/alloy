import Alloy from "./Alloy";

export type AlloyPossibleEventsMapType = object

export type AlloyEventListenerCallbackType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events> = (payload: Events[Event]) => any|Promise<any>;

export interface AlloyFilterCallbackResponseType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events> {
    stopFilters?: boolean,
    preventEvent?: boolean,
    value: Events[Event]
}
export type AlloyFilterCallbackType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events> = (payload: Events[Event]) => AlloyFilterCallbackResponseType<Events,Event>|Promise<AlloyFilterCallbackResponseType<Events,Event>>;

export interface AlloyRegistrationType {
    priority?: number
}

export interface AlloyEventListenerRegistrationType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events> extends AlloyRegistrationType{
    cb: AlloyEventListenerCallbackType<Events,Event>
}

export interface AlloyEventFiltererRegistrationType<Events extends AlloyPossibleEventsMapType, Event extends keyof Events> extends AlloyRegistrationType{
    cb: AlloyFilterCallbackType<Events,Event>
}

export {
    Alloy
}