import Alloy from "./Alloy";

export type AlloyPossibleEventsMapType = object
export type AlloyContextMapType = object

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