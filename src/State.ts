/**
 * This is ArrowJS but i added scuffed refs to it.
 *
 * Its hacked together some values hard castings would be nicer if it could be removed.
 *
 * alo things break if your datasource starts with $. not sure if this a issue in real world
*/
// deno-lint-ignore-file no-explicit-any

import { Component } from "./Component.ts";
import { Custom } from "./components/Custom.ts";
import { Empty } from "./components/Empty.ts";

export function isState<T = StateData>(obj: unknown): obj is StateHandler<T> {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        '$on' in obj &&
        typeof obj.$on === 'function'
    );
}


export function isRef<T>(obj: unknown): obj is Reference<T> {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        'listen' in obj
    );
}
/**
 * Available types of keys for a reactive object.
 */
export type DataSourceKey = string | number | symbol | null;

/**
 * Acceptable types of data targets for the reactive function.
 * TODO: Add much more robust typing for this using generics.
 */
export interface StateData {
    [ index: string ]: any;
    [ index: number ]: any;
}

/**
 * An overly permissive array for data sources.
 */
export type DataSourceArray<T> = Array<unknown> & T;

/**
 * A reactive proxy object.
 */
export type ProxyDataSource<T> = {
    [ K in keyof T ]: StateHandler<T[ K ]> | T[ K ]
} & {
    readonly [ K in keyof T as `$${Extract<K, string>}` ]: Reference<StateHandler<T[ K ]> | T[ K ]>;
};

/**
 * An callback for an observer.
 */
export interface ObserverCallback {
    (value?: any, oldValue?: any): void;
}

export interface PointerEvent<Type> {
    (value: Type, oldValue?: Type): void;
}
/**
 * A controller interface for a reactive proxy object’s dependencies.
 */
export interface DependencyProps {
    /**
     * Adds an observer to a given property.
     * @param p - The property to watch.
     * @param c - The callback to call when the property changes.
     * @returns
     */
    $on: (p: DataSourceKey, c: ObserverCallback) => void;
    /**
     * Removes an observer from a given property.
     * @param p - The property to stop watching.
     * @param c - The callback to stop calling when the property changes.
     * @returns
     */
    $off: (p: DataSourceKey, c: ObserverCallback) => void;
    /**
     * Emits an update "event" for the given property.
     * @param p - Property to emit that an update has occurred.
     * @param newValue - New value of the property.
     * @param oldValue - Old value of the property.
     * @returns
     */
    _em: (p: DataSourceKey, newValue: any, oldValue?: any) => void;
    /**
     * The internal state of the reactive proxy object.
     * @returns
     */
    _st: () => ReactiveProxyState;
    /**
     * The parent proxy object.
     * TODO: This concept should be removed in favor of a more robust dependency
     * tracking system via weakmap reference.
     */
    _p?: ReactiveProxyParent;
}

export interface RefEvent<Type> {
    (value: Type, oldValue?: Type): void;
}

/**
 * Interface representing a Ref.
 * @deprecated
 */
export type Reference<T> = {
    /**
     * Retrieves the current value of the Ref.
     * @returns The current value of the Ref.
     */
    getValue: () => T,
    /**
     * Sets the value of the Ref.
     * @param val The new value to be set.
     */
    setValue: (val: T) => void,
    /**
     * Maps the Ref using a mapping function.
     * @param map The mapping function to be applied to the Ref's value.
     * @returns The converted Ref.
     */
    map: <NewType> (mapper: (val: T) => NewType) => Reference<NewType>;
    /**
     * Adds a callback function to be called when the Ref's value changes.
     * @param c The callback function to be added.
     */
    readonly listen: (c: RefEvent<T>) => void;
} & (T extends Component ? {
    /**
     * Creates an internal HeavyReRender. Do not use this for large DOM updates (as it could effect performance on low end devices).
     */
    readonly asRefComponent: () => Component;
    // deno-lint-ignore ban-types
} : {}) & (T extends (infer G)[] ? {
    readonly addItem: (item: G) => void,
    readonly removeItem: (item: G) => void;
    readonly updateItem: (item: G, newItem: G) => void;
    // deno-lint-ignore ban-types
} : {}) & (T extends boolean ? {
    readonly toggle: () => void;
    // deno-lint-ignore ban-types
} : {});

/**
 * Converts a value or Ref to a Ref.
 *
 * A Ref is a special object that allows you to track and modify a value.
 * It provides methods to set and retrieve the value, as well as additional
 * functionality to convert and listen for value changes.
 * @param value The value or Ref to be converted.
 * @returns The converted Ref.
 * @deprecated
 */
export function asRef<T>(value: T | Reference<T>): Reference<T> {
    if (isRef(value))
        return value as Reference<T>;
    let _val: T = value as T;
    const list = new Set<RefEvent<T>>();

    return {
        setValue: (val: T) => {
            const oldval = _val;
            _val = val;
            if (oldval === _val) return;
            for (const iterator of list) {
                iterator(val, oldval);
            }
        },
        getValue: () => _val,
        map: <E>(map: (val: T) => E) => {
            const Ref = asRef(map(_val));
            list.add((val) => {
                Ref.setValue(map(val));
            });
            return Ref;
        },
        listen: (callback: RefEvent<T>) => {
            list.add(callback);
            callback(_val);
        },
        asRefComponent: () => {
            if (!(_val instanceof Component)) {
                throw new Error("asRefComponent called on a non component Ref.");
            }
            console.debug("asRefComponent got constructed");
            const wrapper = Empty().draw();
            wrapper.append(_val.draw());
            list.add(val => {
                wrapper.textContent = '';
                wrapper.append((<Component>val).draw());
            });
            return Custom(wrapper);
        },
        addItem: (item: T) => {
            if (!Array.isArray(_val)) {
                throw new Error("addItem called on a non array Ref.");
            }
            const oldVal = [ ..._val ];
            _val.push(item);
            list.forEach(it => it(_val, oldVal as T));
        },
        removeItem: (item: T) => {
            if (!Array.isArray(_val)) {
                throw new Error("addItem called on a non array Ref.");
            }
            const index = _val.indexOf(item);
            if (index === -1) return;
            const oldVal = [ ..._val ];
            _val.splice(index, 1);
            list.forEach(it => it(_val, oldVal as T));
        },
        updateItem: (item: T, newItem: T) => {
            if (!Array.isArray(_val)) {
                throw new Error("updateItem called on a non array Ref.");
            }
            const index = _val.indexOf(item);
            if (index === -1) return;
            const oldVal = [ ..._val ];
            _val[ index ] = newItem;
            list.forEach(it => it(_val, oldVal as T));
        },
        toggle: () => {
            if (typeof _val !== "boolean") {
                throw new Error("toggle called on a non boolean Ref.");
            }
            _val = !_val as T;
            for (const iterator of list) {
                iterator(_val as T, !_val as T);
            }
        }
    } as unknown as Reference<T>;
}

export function refMerge<RefRecord extends Record<string, Reference<any>>>(data: RefRecord): Reference<{ [ P in keyof RefRecord ]: ReturnType<RefRecord[ P ][ "getValue" ]> }> {
    const loadData = () => Object.fromEntries(Object.entries(data).map(([ key, value ]) => [ key, value.getValue() ])) as { [ P in keyof RefRecord ]: ReturnType<RefRecord[ P ][ "getValue" ]> };

    const internalValue = asRef(loadData());
    for (const iterator of Object.values(data)) {
        let firstTime = true;
        iterator.listen(() => {
            if (firstTime)
                return firstTime = false;
            internalValue.setValue(loadData());
        });
    }
    return internalValue;
}

export type Refable<T> = T | Reference<T>;

/**
 * A reactive proxy object.
 */
export type StateHandler<T> = {
    [ K in keyof T ]: T[ K ] extends StateData ? StateHandler<T[ K ]> : T[ K ];
} & {
    readonly [ K in keyof T as `$${Extract<K, string>}` ]: Reference<T[ K ] extends StateData ? StateHandler<T[ K ]> : T[ K ]>;
} & DependencyProps;

type ReactiveProxyParent = [
    property: DataSourceKey,
    parent: StateHandler<StateData>
];

interface ReactiveProxyState {
    // o = observers
    o?: ReactiveProxyObservers;
    // op = observerProperties
    op?: ReactiveProxyPropertyObservers;
    // r = old Data
    r?: StateData;
    // p = Parent proxy object.
    p?: ReactiveProxyParent;
}

type ReactiveProxyObservers = Map<DataSourceKey, Set<ObserverCallback>>;

type ReactiveProxyPropertyObservers = Map<ObserverCallback, Set<DataSourceKey>>;

type ReactiveProxyDependencyCollector = Map<
    symbol,
    Map<StateHandler<StateData>, Set<DataSourceKey>>
>;

/**
 * A "global" dependency tracker object.
 */
const dependencyCollector: ReactiveProxyDependencyCollector = new Map();

/**
 * Given a data object, often an object literal, return a proxy of that object
 * with mutation observers for each property.
 *
 * @param  {StateData} data
 * @returns ReactiveProxy
 */
function _state<T>(
    data: T,
    state: ReactiveProxyState = {}
): StateHandler<T> {
    // If this is already reactive or a non object, just return it.
    if (isState<T>(data) || typeof data !== 'object') return data as StateHandler<T>;
    // This is the observer registry itself, with properties as keys and callbacks as watchers.
    const observers: ReactiveProxyObservers = state.o || new Map();
    // This is a reverse map of observers with callbacks as keys and properties that callback is watching as values.
    const observerProperties: ReactiveProxyPropertyObservers =
        state.op || new Map();
    // If the data is an array, we should know...but only once.
    const isArray = Array.isArray(data);

    const children: string[] = [];
    const proxySource: ProxyDataSource<T> = isArray ? [] : Object.create(data, {});
    for (const property in data) {
        const entry = data[ property ];
        if ('HTMLElement' in globalThis && entry instanceof HTMLElement)
            throw new Error("Cannot set a HTMLElement in an State Object");

        if (typeof entry === 'object' && entry !== null) {
            proxySource[ property ] = (!isState(entry) ? _state(entry) : entry) as ProxyDataSource<T>[ typeof property ];
            children.push(property);
        } else {
            proxySource[ property ] = entry as ProxyDataSource<T>[ typeof property ];
        }
    }

    // The add/remove dependency function(s)
    const dep =
        (a: 'add' | 'delete') => (p: DataSourceKey, c: ObserverCallback) => {
            let obs = observers.get(p);
            let props = observerProperties.get(c);
            if (!obs) {
                obs = new Set<ObserverCallback>();
                observers.set(p, obs);
            }
            if (!props) {
                props = new Set<DataSourceKey>();
                observerProperties.set(c, props);
            }
            obs[ a ](c);
            props![ a ](p);
        };
    // Add a property listener
    const $on = dep('add');
    // Remove a property listener
    const $off = dep('delete');
    // Emit a property mutation event by calling all sub-dependencies.
    const _em = (
        property: DataSourceKey,
        newValue: any,
        oldValue?: any
    ): void => {
        observers.has(property) &&
            observers.get(property)!.forEach((c) => c(newValue, oldValue));
    };

    /**
     * Return the reactive proxy state data.
     */
    const _st = (): ReactiveProxyState => {
        return {
            o: observers,
            op: observerProperties,
            r: proxySource,
            p: proxy._p,
        };
    };

    // These are the internal properties of all `r()` objects.
    const depProps: DependencyProps = {
        $on, // Listen to properties
        $off, // Stop listening to properties
        _em, // Emit a change event for a given property
        _st,
        _p: undefined,
    };

    // Create the actual proxy object itself.
    const proxy = new Proxy(proxySource, {
        has(target, key) {
            return key in depProps || key in target;
        },
        get(...args) {
            const [ , p ] = args;
            // For properties of the DependencyProps type, return their values from
            // the depProps instead of the target.
            if (Reflect.has(depProps, p)) return Reflect.get(depProps, p);
            if (typeof p === "string" && p.startsWith("$")) return <Reference<T[]>>{
                getValue: () => proxy[ p.replace("$", "") as keyof typeof proxy ],
                setValue: (val) => {
                    // @ts-ignore TODO: fix typing
                    proxy[ p.replace("$", "") as keyof typeof proxy ] = val;
                },
                map: <newT>(map: (val: T) => newT) => {
                    const key = p.replace("$", "") as any;
                    // @ts-ignore TODO: fix typing
                    const pointer = asRef(proxy[ key ]);
                    const c = (newVal: T) => pointer.setValue(map(newVal));
                    // @ts-ignore TODO: fix typing
                    c(proxy[ key ] as T);
                    // @ts-ignore TODO: fix typing
                    $on(key, (val, oldVal) => c(val, oldVal));
                    // @ts-ignore TODO: fix typing
                    return pointer;
                },
                listen: (c) => {
                    const key = p.replace("$", "") as any;
                    // @ts-ignore TODO: fix typing
                    c(proxy[ key ]);
                    $on(p.replace("$", ""), (val, oldVal) => c(val, oldVal));
                },
                addItem: (item) => {
                    if (!Array.isArray(proxy[ p.replace("$", "") as keyof typeof proxy ])) {
                        throw new Error("addItem called on a non array Ref.");
                    }
                    // @ts-ignore TODO: fix typing
                    proxy[ p.replace("$", "") as keyof typeof proxy ].push(item);
                },
                removeItem: (item) => {
                    if (!Array.isArray(proxy[ p.replace("$", "") as keyof typeof proxy ])) {
                        throw new Error("addItem called on a non array Ref.");
                    }
                    const index = (<T[]>proxy[ p.replace("$", "") as keyof typeof proxy ]).indexOf(item);
                    if (index === -1) return;
                    // @ts-ignore TODO: fix typing
                    proxy[ p.replace("$", "") as keyof typeof proxy ].splice(index, 1);
                },
                updateItem: (oldItem, newItem) => {
                    if (!Array.isArray(proxy[ p.replace("$", "") as keyof typeof proxy ])) {
                        throw new Error("updateItem called on a non array Ref.");
                    }
                    const index = (<T[]>proxy[ p.replace("$", "") as keyof typeof proxy ]).indexOf(oldItem);
                    if (index === -1) return;
                    // @ts-ignore TODO: fix typing
                    proxy[ p.replace("$", "") as keyof typeof proxy ][ index ] = newItem;
                    // @ts-ignore TODO: Remove this code
                    proxy[ p.replace("$", "") as keyof typeof proxy ] = [ ...proxy[ p.replace("$", "") as keyof typeof proxy ] ];
                }
            };
            const value = Reflect.get(...args);

            // For any existing dependency collectors that are active, add this
            // property to their observed properties.
            addDep(proxy as unknown as StateHandler<StateData>, p);

            // We have special handling of array operations to prevent O(n^2) issues.
            if (isArray && p in Array.prototype) {
                return arrayOperation(
                    p as string,
                    proxySource as DataSourceArray<T>,
                    proxy as unknown as StateHandler<StateData>,
                    value
                );
            }
            return value;
        },
        set(...args) {
            const [ target, property, value ] = args;
            const old = Reflect.get(target, property);
            if (Reflect.has(depProps, property)) {
                // We are setting a reserved property like _p
                return Reflect.set(depProps, property, value);
            }
            if (value && isState<T>(old)) {
                const o: StateHandler<T> = old;
                // We're assigning an object (array or pojo probably), so we want to be
                // reactive, but if we already have a reactive object in this
                // property, then we need to replace it and transfer the state of deps.
                const oldState = o._st();
                const newR = isState(value) ? reactiveMerge(value, o as unknown as StateHandler<StateData>) : _state(value, oldState);
                Reflect.set(
                    target,
                    property,
                    // Create a new reactive object
                    newR
                );
                _em(property, newR)
                    // After assignment, we need to check all observers of the new property
                    // and see if any of their respective values changed during the
                    // assignment.
                    ; (oldState.o as ReactiveProxyObservers).forEach((_c, property) => {
                        const oldValue = Reflect.get(old, property!);
                        const newValue = Reflect.get(newR, property!);
                        if (oldValue !== newValue) {
                            o._em(property, newValue, oldValue);
                        }
                    });
                return true;
            }
            const didSet = Reflect.set(...args);
            if (didSet) {
                if (old !== value) {
                    // Notify any discrete property observers of the change.
                    _em(property, value, old);
                }
                if (proxy._p) {
                    // Notify parent observers of a change.
                    proxy._p[ 1 ]._em(...proxy._p);
                }
            }
            return didSet;
        },
    }) as StateHandler<T>;

    if (state.p) proxy._p = state.p;
    // Before we return the proxy object, quickly map through the children
    // and set the parents (this is only run on the initial setup).
    children.map((c) => {
        // @ts-ignore implicit any
        proxy[ c ]._p = [ c, proxy ];
    });
    return proxy;
}

/**
 * Add a property to the tracked reactive properties.
 * @param  {StateHandler} proxy
 * @param  {DataSourceKey} property
 */
function addDep(proxy: StateHandler<StateData>, property: DataSourceKey) {
    dependencyCollector.forEach((tracker) => {
        let properties = tracker.get(proxy);
        if (!properties) {
            properties = new Set();
            tracker.set(proxy, properties);
        }
        properties.add(property);
    });
}

function arrayOperation(
    op: string,
    arr: Array<unknown>,
    proxy: StateHandler<StateData>,
    native: unknown
) {
    const synthetic = (...args: any[]) => {
        // The `as DataSource` here should really be the ArrayPrototype, but we're
        // just tricking the compiler since we've already checked it.
        const retVal = (Array.prototype as StateData)[ op ].call(arr, ...args);
        // @todo determine how to handle notifying elements and parents of elements.
        arr.forEach((item, i) => proxy._em(String(i), item));
        // Notify the the parent of changes.
        if (proxy._p) {
            const [ property, parent ] = proxy._p;
            parent._em(property, proxy);
        }
        return retVal;
    };
    switch (op) {
        case 'shift':
        case 'pop':
        case 'sort':
        case 'reverse':
        case 'copyWithin':
            return synthetic;
        case 'unshift':
        case 'push':
        case 'fill':
            return (...args: any[]) => synthetic(...args.map((arg) => _state(arg)));
        case 'splice':
            return (start: number, remove?: number, ...inserts: any[]) =>
                synthetic(start, remove, ...inserts.map((arg) => _state(arg)));
        default:
            return native;
    }
}

/**
 * Given two reactive proxies, merge the important state attributes from the
 * source into the target.
 * @param  {StateHandler} reactiveTarget
 * @param  {StateHandler} reactiveSource
 * @returns ReactiveProxy
 */
function reactiveMerge(
    reactiveTarget: StateHandler<StateData>,
    reactiveSource: StateHandler<StateData>
): StateHandler<StateData> {
    const state = reactiveSource._st();
    if (state.o) {
        state.o.forEach((callbacks, property) => {
            callbacks.forEach((c) => {
                reactiveTarget.$on(property, c);
            });
        });
    }
    if (state.p) {
        reactiveTarget._p = state.p;
    }
    return reactiveTarget;
}


export const asState = <T>(data: T) => _state<T>(data) as StateHandler<T>;

/**
 * Shorthand for:
 * ```ts
 * const data = State({
 *     val: "Hello World",
 *     date: new Date()
 * });
 *
 * return refMerge({
 *    val: data.$val,
 *    date: data.$date
 * });
 * ```
 * @deprecated
 */
export function listenOnInitalStateKeys<T>(data: StateHandler<T>): Reference<T> {
    const keys = Object.keys(data);
    return refMerge(Object.fromEntries(keys.map(key => ([ key, data[ ("$" + key) as unknown as keyof T ] ]) as any))) as Reference<T>;
}

/**
 * Creates a Reference<string> from a tagged templates
 *
 * ref\`Hello World\` => a Reference of Hello World
 *
 * ref\`Hello ${state.user}\` => a Reference of Hello and the static value of user
 *
 * ref\`Hello ${state.$user}\` => a Reference of Hello and the current value of user (Reference reacts on Reference)
 * @deprecated
 */
export function ref(data: TemplateStringsArray, ...expr: Refable<any>[]) {
    const empty = Symbol("empty");
    const merge = data.map((x, i) => [ x, expr[ i ] ?? empty ]).flat();

    const state = asState({
        val: ""
    });

    function update() {
        let list = "";
        for (const iterator of merge) {
            if (<any>iterator === empty) continue;
            if (isRef(iterator))
                list += iterator.getValue();
            else
                list += iterator;
        }
        state.val = list;
    }

    for (const iterator of merge) {
        if (isRef(iterator))
            iterator.listen(update);
    }
    update();
    return state.$val;
}