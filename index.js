import { Children, cloneElement, createElement, forwardRef, isValidElement, memo, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, findNodeHandle, Keyboard, Platform, StyleSheet, UIManager, useAnimatedValue } from "react-native";

export default function ({ children, offset = 10, disabled, onHandleDodging, disableTagCheck, checkIfElementIsFocused }) {
    if (checkIfElementIsFocused !== undefined) {
        if (typeof checkIfElementIsFocused !== 'function')
            throw 'checkIfElementIsFocused should be a function';

        checkIfElementIsFocused = niceFunction(checkIfElementIsFocused, 'checkIfElementIsFocused');
    } else checkIfElementIsFocused = r => r?.isFocused?.();

    if (onHandleDodging !== undefined) {
        if (typeof onHandleDodging !== 'function')
            throw 'onHandleDodging should be a function';

        onHandleDodging = niceFunction(onHandleDodging, 'onHandleDodging');
    }

    if (!isNumber(offset)) throw `offset must be a valid number but got ${offset}`;

    const [currentPaddedScroller, setCurrentPaddedScroller] = useState();

    /**
     * @type {import("react").RefObject<{[key: string]: { __is_standalone: boolean, _standalone_props: { dodge_keyboard_offset?: number, dodge_keyboard_lift?: boolean }, scrollRef: import("react-native").ScrollView, inputRef: {[key: string]: { ref: import("react-native").TextInput, props: { dodge_keyboard_offset?: number, dodge_keyboard_lift?: boolean } }} }}>}
     */
    const viewRefsMap = useRef({});
    const doDodgeKeyboard = useRef();
    const previousLift = useRef();
    const wasVisible = useRef();

    const clearPreviousDodge = (scrollId) => {
        if (previousLift.current && previousLift.current !== scrollId) {
            const viewRef = viewRefsMap.current[previousLift.current]?.scrollRef;
            onHandleDodging?.({ liftUp: 0, viewRef: viewRef || null });
            previousLift.current = undefined;
        }
    }

    /**
     * @param {import('react-native').KeyboardEvent | undefined} event 
     * @param {boolean} visible
     */
    doDodgeKeyboard.current = (event, visible) => {
        if (typeof visible !== 'boolean') {
            if (typeof wasVisible.current === 'boolean') {
                visible = wasVisible.current;
            } else return;
        }

        wasVisible.current = visible;

        try {
            const keyboardInfo = event?.endCoordinates || Keyboard.metrics();
            const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

            // console.log('doDodgeKeyboard');
            if (
                visible &&
                keyboardInfo &&
                !disabled &&
                (keyboardInfo.width === windowWidth ||
                    keyboardInfo.height + keyboardInfo.screenY === windowHeight) &&
                keyboardInfo.screenY
            ) {
                // console.log('doDodgeKeyboard 1 entries:', Object.keys(viewRefsMap.current).length);
                for (const [scrollId, obj] of Object.entries(viewRefsMap.current)) {
                    const { scrollRef, inputRef, __is_standalone, _standalone_props } = obj;
                    if (scrollRef) {
                        if (__is_standalone) {
                            if (checkIfElementIsFocused(scrollRef)) {
                                if (scrollRef.measureInWindow)
                                    UIManager.measureInWindow(findNodeHandle(scrollRef), (x, y, w, h) => {
                                        const { dodge_keyboard_offset } = _standalone_props || {};
                                        const thisOffset = isNumber(dodge_keyboard_offset) ? dodge_keyboard_offset : offset;

                                        const liftUp = Math.max(0, (y - keyboardInfo.screenY) + Math.min(h + thisOffset, keyboardInfo.screenY));
                                        clearPreviousDodge(scrollId);
                                        if (liftUp) {
                                            previousLift.current = scrollId;
                                            onHandleDodging?.({ liftUp, viewRef: scrollRef });
                                        }
                                    });
                                return;
                            }
                        } else {
                            for (const { ref: inputObj, props } of Object.values(inputRef)) {
                                if (checkIfElementIsFocused(inputObj)) {
                                    UIManager.measureInWindow(findNodeHandle(scrollRef), ((sx, sy, sw, sh) => {
                                        inputObj.measureInWindow((x, y) => { // y is dynamic
                                            inputObj.measureLayout(scrollRef, (l, t, w, h) => { // t is fixed
                                                const { dodge_keyboard_offset } = props || {};
                                                const thisOffset = isNumber(dodge_keyboard_offset) ? dodge_keyboard_offset : offset;

                                                const scrollInputY = y - sy;

                                                if (scrollInputY >= 0 && scrollInputY <= sh) { // is input visible in viewport
                                                    const clampedLift = Math.min(h + thisOffset, keyboardInfo.screenY);

                                                    if (y + clampedLift >= keyboardInfo.screenY) { // is below keyboard
                                                        const requiredScrollY = (t - (keyboardInfo.screenY - sy)) + clampedLift;
                                                        // for lifting up the scroll-view
                                                        const liftUp = Math.max(0, requiredScrollY - t);
                                                        clearPreviousDodge(scrollId);
                                                        if (liftUp) {
                                                            previousLift.current = scrollId;
                                                            onHandleDodging?.({ liftUp, viewRef: scrollRef });
                                                        }

                                                        const scrollLift = Math.max(0, (sy + sh + (thisOffset >= 0 ? thisOffset : 0)) - keyboardInfo.screenY);
                                                        const newScrollY = Math.min(requiredScrollY, t);

                                                        // console.log('scrolling-to:', requiredScrollY, ' scrollLift:', scrollLift);
                                                        if (scrollLift) {
                                                            setCurrentPaddedScroller([scrollId, scrollLift, newScrollY]);
                                                        } else {
                                                            tryPerformScroll(scrollRef, newScrollY, true);
                                                            setCurrentPaddedScroller();
                                                        }
                                                    }
                                                }
                                            });
                                        });
                                    }));
                                    return;
                                }
                            }
                        }
                    }
                }
            } else {
                setCurrentPaddedScroller();
                clearPreviousDodge();
            }
        } catch (error) {
            console.error('doDodgeKeyboard err:', error);
        }
    }

    const tryPerformScroll = (ref, y, animated = true) => {
        if (!ref) return;

        if (ref.scrollTo) {
            ref.scrollTo?.({ y, animated });
        } else if (ref.scrollToOffset) {
            ref.scrollToOffset?.({ offset: y, animated });
        } else {
            ref.getScrollResponder?.()?.scrollTo?.({ y, animated });
        }
    }

    const [paddedId, paddedSize, paddedScroll] = currentPaddedScroller || [];

    useEffect(() => {
        if (currentPaddedScroller) {
            const ref = viewRefsMap.current[paddedId]?.scrollRef;
            tryPerformScroll(ref, paddedScroll, false);
        }
    }, [currentPaddedScroller]);

    useEffect(() => {
        doDodgeKeyboard.current();
    }, [offset, !disabled]);

    useEffect(() => {
        if (disabled) return;
        const frameListener = Keyboard.addListener('keyboardDidChangeFrame', e => doDodgeKeyboard.current(e));
        const showListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
            e => doDodgeKeyboard.current(e, true)
        );
        const hiddenListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
            e => doDodgeKeyboard.current(e, false)
        );

        return () => {
            frameListener.remove();
            showListener.remove();
            hiddenListener.remove();
        }
    }, [!disabled]);

    return (
        <ReactHijacker
            doHijack={(node, path) => {
                if (node?.props?.['dodge_keyboard_scan_off']) return { element: node };

                const isStandalone = isDodgeInput(node);

                if (isStandalone || isDodgeScrollable(node, disableTagCheck)) {
                    const scrollId = path.join('=>');
                    const initNode = () => {
                        if (!viewRefsMap.current[scrollId])
                            viewRefsMap.current[scrollId] = { inputRef: {} };

                        if (isStandalone) {
                            viewRefsMap.current[scrollId].__is_standalone = true;
                            viewRefsMap.current[scrollId]._standalone_props = {
                                dodge_keyboard_offset: node.props?.dodge_keyboard_offset,
                                dodge_keyboard_lift: node.props?.dodge_keyboard_lift
                            };
                        }
                    }
                    const shouldPad = !isStandalone && scrollId === paddedId;
                    const contentStyle = shouldPad && StyleSheet.flatten(node.props?.contentContainerStyle);
                    const rootRenderItem = node.prop?.renderItem;
                    const rootKeyExtractor = node.prop?.keyExtractor;
                    const hasInternalList = !isStandalone && (typeof rootRenderItem === 'function' && !node.props?.children);

                    const doRefCleanup = () => {
                        if (
                            viewRefsMap.current[scrollId]?.scrollRef ||
                            Object.keys(viewRefsMap.current[scrollId]?.inputRef || {}).length
                        ) return;
                        delete viewRefsMap.current[scrollId];
                    }

                    const injectChild = (children, childPath) =>
                        ReactHijacker({
                            children,
                            path: childPath,
                            doHijack: (inputNode, path) => {
                                if (isDodgeInput(inputNode, disableTagCheck)) {
                                    const inputId = path.join('=>');
                                    const initInputNode = () => {
                                        initNode();
                                        if (!viewRefsMap.current[scrollId].inputRef[inputId])
                                            viewRefsMap.current[scrollId].inputRef[inputId] = {};
                                        viewRefsMap.current[scrollId].inputRef[inputId].props = {
                                            dodge_keyboard_offset: inputNode.props?.dodge_keyboard_offset,
                                            dodge_keyboard_lift: inputNode.props?.dodge_keyboard_lift
                                        };
                                    }

                                    initInputNode();

                                    return {
                                        props: {
                                            ...inputNode.props,
                                            onFocus: (...args) => {
                                                doDodgeKeyboard.current();
                                                return inputNode.props?.onFocus?.(...args);
                                            },
                                            onLayout: (...args) => {
                                                doDodgeKeyboard.current();
                                                return inputNode.props?.onLayout?.(...args);
                                            },
                                            ref: r => {
                                                if (r) {
                                                    initInputNode();

                                                    viewRefsMap.current[scrollId].inputRef[inputId].ref = r;
                                                } else if (viewRefsMap.current[scrollId]?.inputRef?.[inputId]) {
                                                    delete viewRefsMap.current[scrollId].inputRef[inputId];
                                                    doRefCleanup();
                                                }

                                                const thatRef = inputNode.props?.ref;
                                                if (typeof thatRef === 'function') {
                                                    thatRef(r);
                                                } else if (thatRef) thatRef.current = r;
                                            }
                                        }
                                    };
                                }
                            }
                        });

                    const extractedKeysMap = [];

                    return {
                        props: {
                            ...node.props,
                            ...shouldPad ? {
                                contentContainerStyle: {
                                    ...contentStyle,
                                    paddingBottom: paddedSize + (isNumber(contentStyle?.paddingBottom) ? contentStyle.paddingBottom : 0)
                                }
                            } : {},
                            ref: r => {
                                if (r) {
                                    initNode();
                                    viewRefsMap.current[scrollId].scrollRef = r;
                                } else if (viewRefsMap.current[scrollId]) {
                                    viewRefsMap.current[scrollId].scrollRef = undefined;
                                    doRefCleanup();
                                }

                                const thatRef = node.props?.ref;
                                if (typeof thatRef === 'function') {
                                    thatRef(r);
                                } else if (thatRef) thatRef.current = r;
                            },
                            ...isStandalone ? {
                                onFocus: (...args) => {
                                    doDodgeKeyboard.current();
                                    return node.props?.onFocus?.(...args);
                                }
                            } : {},
                            onLayout: (...args) => {
                                doDodgeKeyboard.current();
                                return node.props?.onLayout?.(...args);
                            },
                            ...isStandalone ? {} :
                                hasInternalList ? {
                                    ...typeof node.prop?.keyExtractor === 'function' ?
                                        {
                                            keyExtractor: (...args) => {
                                                const res = node.prop.keyExtractor(...args);
                                                extractedKeysMap[args[1]] = res;
                                                return res;
                                            }
                                        } : {},
                                    renderItem: (...args) => {
                                        const { item, index } = args[0] || {};
                                        const childNode = rootRenderItem(...args);
                                        let isUnique;

                                        const extractedKey = extractedKeysMap[index];

                                        if (isSomething(extractedKey)) {
                                            isUnique = extractedKeysMap.findIndex(v => isKeyEqual(v, extractedKey)) === index;
                                        } else {
                                            const nodeKey = isSomething(childNode?.key) ? childNode.key : item.key;
                                            isUnique = isSomething(nodeKey) && !extractedKeysMap.some(v => isKeyEqual(v, nodeKey));
                                        }

                                        return injectChild(
                                            childNode,
                                            [...path, ...isUnique ? [] : [index]]
                                        );
                                    }
                                } : { children: injectChild(node.props?.children, path) }
                        }
                    };
                }
            }}>
            {children}
        </ReactHijacker>
    );
};

const niceFunction = (func, message) => {
    return (...args) => {
        try {
            return func(...args);
        } catch (error) {
            console.error(`${message} err:`, error);
        }
    }
}

const isNumber = t => typeof t === 'number' && !isNaN(t) && Number.isFinite(t);
const isSomething = v => ![undefined, null].includes(v);
const isKeyEqual = (a, b) => isSomething(a) && isSomething(b) && String(a) === String(b);

const REACT_SYMBOLS = {
    forwardRef: Symbol.for('react.forward_ref'),
    memo: Symbol.for('react.memo')
};

export function ReactHijacker({ children, doHijack, path }) {
    const instantDoHijack = useRef();
    instantDoHijack.current = doHijack;

    const injectIntoTree = (node, path = [], handledNodePath) => {
        if (!node) return node;
        if (Array.isArray(node)) {
            path = [...path, ...handledNodePath ? [] : [0]];
            return Children.map(node, (v, i) => {
                const isUnique = isSomething(v?.key) && node.findIndex(b => isKeyEqual(b?.key, v?.key)) === i;

                return injectIntoTree(v, [...path, ...isUnique ? [] : [i]], true);
            });
        }
        if (!isValidElement(node)) return node;

        path = [...path, ...(handledNodePath || isSomething(node.key)) ? [] : [0], getNodeId(node)];

        let thisObj;
        if (thisObj = instantDoHijack.current?.(node, path)) {
            const { element, props } = thisObj;

            if (Object.hasOwn(thisObj, 'element')) return element;
            if (props) return cloneElement(node, props);
            return node;
        }

        if (!isHostElement(node)) {
            const wrapNodeType = (nodeType, pathway, pathKey) => {
                pathway = [...pathway, getNodeId(undefined, nodeType, pathKey)];

                // if (doLogging) console.log('wrapNodeType path:', pathway, ' node:', nodeType);
                const render = (renderedNode) => {
                    // if (doLogging) console.log('deep path:', pathway, ' node:', renderedNode);
                    return injectIntoTree(renderedNode, pathway);
                }

                if (typeof nodeType === 'function') { // check self closed tag
                    return hijackRender(nodeType, render);
                } else if (nodeType?.$$typeof === REACT_SYMBOLS.forwardRef) {
                    return forwardRef(hijackRender(nodeType.render, render));
                } else if (nodeType?.$$typeof === REACT_SYMBOLS.memo) {
                    const newType = memo(wrapNodeType(nodeType.type, pathway), nodeType.compare);
                    newType.displayName = nodeType.displayName || nodeType.name;
                    return newType;
                }
                return nodeType;
            }

            if (
                typeof node.type === 'function' || // check self closed tag
                node.type?.$$typeof === REACT_SYMBOLS.forwardRef || // check forwardRef
                node.type?.$$typeof === REACT_SYMBOLS.memo // check memo
            ) {
                // if (doLogging) console.log('doLog path:', path, ' node:', node);
                return (
                    <__HijackNodePath>
                        {() => {
                            const hijackType = useMemo(() => wrapNodeType(node.type, path.slice(0, -1), node.key), [node.type]);

                            return createElement(
                                hijackType,
                                {
                                    ...node.props,
                                    key: node.key
                                },
                                node.props?.children
                            );
                        }}
                    </__HijackNodePath>
                );
            }
        }

        const children = node.props?.children;
        if (children)
            return cloneElement(node, {
                children: injectIntoTree(children, path)
            });

        return node;
    };

    return injectIntoTree(children, path);
};

function __HijackNodePath({ children }) {
    return children?.();
}
__HijackNodePath.displayName = '__HijackNodePath';

const hijackRender = (type, doHijack) =>
    new Proxy(type, {
        apply(target, thisArg, args) {
            const renderedNode = Reflect.apply(target, thisArg, args);
            return doHijack(renderedNode);
        },
        get(target, prop) {
            return target[prop];
        },
        set(target, prop, value) {
            target[prop] = value;
            return true;
        }
    });

function getNodeId(node, typeObj, typeKey) {
    if ((!node && !typeObj) || (node && !isValidElement(node))) return `${node}`;

    const type = typeObj || node?.type;
    const withKey = (s) => `${s}:${[typeKey || node?.key].find(v => ![null, undefined].includes(v)) || null}`;
    const withWrapper = (tag, name) => `@${tag}#${name}#`;

    // Host component
    if (typeof type === 'string' || typeof type === 'number') return withKey(type);

    if (type?.displayName) return withKey(type.displayName);

    // Function component
    if (typeof type === "function") return withKey(type.name);

    if (type?.$$typeof === REACT_SYMBOLS.forwardRef) { // forwardRef
        return withKey(withWrapper('forwardRef', type.render?.name));
    } else if (type?.$$typeof === REACT_SYMBOLS.memo) { // memo
        return withKey(withWrapper('memo', ''));
    }

    return withKey(
        type?.name ||
        // node?.name ||
        withWrapper('Fragment', type?.$$typeof?.toString?.() || '')
    );
};

export function isHostElement(node) {
    if (!node) return true;
    const t = typeof node.type;

    return (
        t === 'string' ||
        t === 'number' || // RN internal tags
        node?.type?.Context !== undefined ||
        (t !== 'function' && t !== 'object')
    );
}

export const isDodgeScrollable = (element, disableTagCheck) => {
    if (element?.props?.['dodge_keyboard_scrollable']) return true;
    if (!element?.type || element?.props?.horizontal || disableTagCheck) return false;

    const scrollableTypes = ["ScrollView", "FlatList", "SectionList", "VirtualizedList"];

    return scrollableTypes.includes(element.type?.displayName)
        || scrollableTypes.includes(element.type?.name);
};

export const isDodgeInput = (element, disableTagCheck) => {
    if (element?.props?.['dodge_keyboard_input']) return true;
    if (disableTagCheck || !element?.type) return false;

    const inputTypes = ["TextInput"];

    return inputTypes.includes(element.type?.displayName)
        || inputTypes.includes(element.type?.name);
};

export const KeyboardPlaceholderView = ({ doHeight }) => {
    const height = useAnimatedValue(0);

    const instantDoHeight = useRef();
    instantDoHeight.current = doHeight;

    useEffect(() => {
        let wasVisible;
        /**
         * @param {import('react-native').KeyboardEvent} event 
         * @param {boolean} visible 
         */
        const updateKeyboardHeight = (event, visible) => {
            if (typeof visible !== 'boolean') {
                if (typeof wasVisible === 'boolean') {
                    visible = wasVisible;
                } else return;
            }

            wasVisible = visible;

            const { endCoordinates, isEventFromThisApp, duration } = event;
            if (Platform.OS === 'ios' && !isEventFromThisApp) return;

            const kh = visible ? endCoordinates.height : 0;
            const newHeight = Math.max(0, instantDoHeight.current ? instantDoHeight.current(kh) : kh);
            const newDuration = (Math.abs(height._value - newHeight) * duration) / endCoordinates.height;

            Animated.timing(height, {
                duration: newDuration,
                toValue: newHeight,
                useNativeDriver: false
            }).start();
        }

        const initialMetric = Keyboard.metrics();
        if (initialMetric) updateKeyboardHeight(initialMetric, true);

        const frameListener = Keyboard.addListener('keyboardDidChangeFrame', e => updateKeyboardHeight(e));
        const showListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
            e => updateKeyboardHeight(e, true)
        );
        const hiddenListener = Keyboard.addListener(
            Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
            e => updateKeyboardHeight(e, false)
        );

        return () => {
            frameListener.remove();
            showListener.remove();
            hiddenListener.remove();
        }
    }, []);

    return <Animated.View style={{ height }} />;
}