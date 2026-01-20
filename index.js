import { Children, cloneElement, createElement, forwardRef, isValidElement, memo, useEffect, useMemo, useRef, useState, useImperativeHandle } from "react";
import { Animated, Dimensions, findNodeHandle, Keyboard, Platform, StyleSheet, UIManager, useAnimatedValue } from "react-native";

export const DodgeKeyboard = forwardRef(({ children, offset = 10, disabled, onHandleDodging, disableTagCheck, checkIfElementIsFocused }, ref) => {
    if (checkIfElementIsFocused !== undefined) {
        if (typeof checkIfElementIsFocused !== 'function')
            throw 'checkIfElementIsFocused should be a function';

        checkIfElementIsFocused = niceFunction(checkIfElementIsFocused, 'checkIfElementIsFocused');
    }

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
    const previousLift = useRef({ scrollId: undefined, lift: undefined });
    const wasVisible = useRef();
    const pendingIdleTask = useRef();
    const resizerTimer = useRef();
    const lastKeyboardEvent = useRef();

    const clearPreviousDodge = (scrollId) => {
        if (previousLift.current.scrollId && previousLift.current.scrollId !== scrollId) {
            const viewRef = viewRefsMap.current[previousLift.current.scrollId]?.scrollRef;
            onHandleDodging?.({
                liftUp: 0,
                viewRef: viewRef || null,
                keyboardEvent: lastKeyboardEvent.current
            });
            previousLift.current = { scrollId: undefined, lift: undefined };
        }
    }

    /**
     * @param {import('react-native').KeyboardEvent | undefined} event 
     * @param {boolean} visible
     * @param {{ fromIdle?: boolean, fromTimer?: boolean } | undefined} eventContext
     */
    doDodgeKeyboard.current = (event, visible, eventContext) => {
        if (Platform.OS === 'ios' && event && !event?.isEventFromThisApp) return;

        if (typeof visible !== 'boolean') {
            if (typeof wasVisible.current === 'boolean') {
                visible = wasVisible.current;
            } else return;
        }

        wasVisible.current = visible;
        if (event) lastKeyboardEvent.current = event;

        try {
            const keyboardInfo = event?.endCoordinates || Keyboard.metrics();

            // console.log('doDodgeKeyboard');

            if (pendingIdleTask.current !== undefined)
                cancelIdleCallback(pendingIdleTask.current);
            pendingIdleTask.current = undefined;

            if (resizerTimer.current !== undefined)
                clearTimeout(resizerTimer.current);
            resizerTimer.current = undefined;

            if (
                visible &&
                keyboardInfo &&
                !disabled &&
                (!isOffScreenY(keyboardInfo) && !isOffScreenX(keyboardInfo)) &&
                keyboardInfo.screenY
            ) {
                // console.log('doDodgeKeyboard 1 entries:', Object.keys(viewRefsMap.current).length);
                const itemIteList = Object.entries(viewRefsMap.current);
                const allInputList = checkIfElementIsFocused && itemIteList.map(v =>
                    v[1].__is_standalone
                        ? [v[1].scrollRef]
                        : Object.values(v[1].inputRef).map(v => v.ref)
                ).flat();

                const initIdleTask = () => {
                    if (!eventContext && pendingIdleTask.current === undefined)
                        pendingIdleTask.current = requestIdleCallback(() => {
                            doDodgeKeyboard.current(undefined, undefined, { fromIdle: true });
                        }, { timeout: 300 });

                    if (!eventContext?.fromTimer && resizerTimer.current === undefined)
                        resizerTimer.current = setTimeout(() => {
                            doDodgeKeyboard.current(undefined, undefined, { fromTimer: true });
                        }, 500);
                }

                const checkFocused = checkIfElementIsFocused || (r => r?.isFocused?.());

                for (const [scrollId, obj] of itemIteList) {
                    const { scrollRef, inputRef, __is_standalone, _standalone_props } = obj;
                    if (scrollRef) {
                        if (__is_standalone) {
                            if (checkFocused(scrollRef, allInputList)) {
                                UIManager.measure(findNodeHandle(scrollRef), (x, y, width, height, pageX, pageY) => {
                                    const { dodge_keyboard_offset, dodge_keyboard_clipping } = _standalone_props || {};
                                    const thisOffset = isNumber(dodge_keyboard_offset) ? dodge_keyboard_offset : offset;

                                    const liftUp = (pageY - keyboardInfo.screenY) + Math.min(height + thisOffset, keyboardInfo.screenY);
                                    clearPreviousDodge(scrollId);
                                    if (liftUp > 0 || (dodge_keyboard_clipping && liftUp && previousLift.current.lift !== liftUp)) {
                                        previousLift.current = { scrollId, lift: liftUp };
                                        onHandleDodging?.({
                                            liftUp,
                                            layout: { x, y, width, height, pageX, pageY },
                                            viewRef: scrollRef,
                                            keyboardEvent: lastKeyboardEvent.current
                                        });
                                    }
                                    initIdleTask();
                                });
                                return;
                            }
                        } else {
                            for (const { ref: inputObj, props } of Object.values(inputRef)) {
                                if (checkFocused(inputObj, allInputList)) {
                                    Promise.all([
                                        new Promise(resolve => {
                                            UIManager.measure(findNodeHandle(scrollRef), (x, y, width, height, pageX, pageY) => {
                                                resolve({
                                                    h: height,
                                                    py: pageY,
                                                    scrollLayout: { x, y, width, height, pageX, pageY }
                                                });
                                            });
                                        }),
                                        new Promise(resolve => {
                                            UIManager.measure(findNodeHandle(inputObj), (x, y, width, height, pageX, pageY) => { // y is dynamic
                                                resolve({ py: pageY, layout: { x, y, width, height, pageX, pageY } });
                                            });
                                        }),
                                        new Promise((resolve, reject) => {
                                            UIManager.measureLayout(findNodeHandle(inputObj), findNodeHandle(scrollRef), reject, (l, t, width, height) => { // t is fixed
                                                resolve({ t, h: height, relativeLayout: { left: l, top: t, width, height } });
                                            });
                                        })
                                    ]).then(([{ h: sh, py: sy, scrollLayout }, { py: y, layout }, { t, h, relativeLayout }]) => {

                                        const { dodge_keyboard_offset, dodge_keyboard_clipping } = props || {};
                                        const thisOffset = isNumber(dodge_keyboard_offset) ? dodge_keyboard_offset : offset;

                                        const scrollInputY = y - sy;

                                        if (scrollInputY >= 0 && scrollInputY <= sh) { // is input visible in viewport
                                            const clampedLift = Math.min(h + thisOffset, keyboardInfo.screenY);

                                            if (y + clampedLift >= keyboardInfo.screenY) { // is below keyboard
                                                const requiredScrollY = (t - (keyboardInfo.screenY - sy)) + clampedLift;
                                                // for lifting up the scroll-view
                                                const liftUp = Math.max(0, requiredScrollY - t);
                                                clearPreviousDodge(scrollId);
                                                if (liftUp > 0 || (dodge_keyboard_clipping && liftUp && previousLift.current.lift !== liftUp)) {
                                                    previousLift.current = { scrollId, lift: liftUp };
                                                    onHandleDodging?.({
                                                        liftUp,
                                                        layout,
                                                        scrollLayout,
                                                        relativeLayout,
                                                        viewRef: scrollRef,
                                                        keyboardEvent: lastKeyboardEvent.current
                                                    });
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
                                                initIdleTask();
                                            }
                                        }
                                    }).catch(e => {
                                        console.error('frame calculation error:', e);
                                    });
                                    return;
                                }
                            }
                        }
                    }
                }
            } else if (!visible) {
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
            if (Platform.OS === 'android') {
                tryPerformScroll(ref, paddedScroll, false);
            } else {
                // this seem to be removing `the flash bang` on IOS
                setTimeout(() => {
                    tryPerformScroll(ref, paddedScroll, false);
                }, 1);
            }
        }
    }, [currentPaddedScroller]);

    useEffect(() => {
        doDodgeKeyboard.current();
    }, [offset, !disabled]);

    useImperativeHandle(ref, () => ({
        trigger: () => doDodgeKeyboard.current()
    }), []);

    useEffect(() => {
        if (disabled) return;
        const frameListener = Keyboard.addListener('keyboardDidChangeFrame', e => doDodgeKeyboard.current(e));
        const showListener = Keyboard.addListener(
            'keyboardWillShow',
            e => doDodgeKeyboard.current(e, true)
        );
        const hiddenListener = Keyboard.addListener(
            'keyboardWillHide',
            e => doDodgeKeyboard.current(e, false)
        );
        const didShowListener = Keyboard.addListener(
            'keyboardDidShow',
            e => doDodgeKeyboard.current(e, true)
        );
        const didHideListener = Keyboard.addListener(
            'keyboardDidHide',
            e => doDodgeKeyboard.current(e, false)
        );

        return () => {
            frameListener.remove();
            showListener.remove();
            hiddenListener.remove();
            didShowListener.remove();
            didHideListener.remove();
        }
    }, [!disabled]);

    const nodeIdIte = useRef(0);

    const onHijackNode = node => {
        if (offDodgeScan(node)) return createHijackedElement(node);

        const isStandalone = isDodgeInput(node);
        if (!isStandalone && !isDodgeScrollable(node, disableTagCheck)) return;

        const renderer = () => {
            const scrollId = useMemo(() => `${++nodeIdIte.current}`, []);

            const initNode = () => {
                if (!viewRefsMap.current[scrollId])
                    viewRefsMap.current[scrollId] = { inputRef: {} };

                if (isStandalone) {
                    viewRefsMap.current[scrollId].__is_standalone = true;
                    viewRefsMap.current[scrollId]._standalone_props = {
                        dodge_keyboard_offset: node.props?.dodge_keyboard_offset,
                        dodge_keyboard_lift: node.props?.dodge_keyboard_lift,
                        dodge_keyboard_clipping: node.props?.dodge_keyboard_clipping
                    };
                }
            }
            const shouldPad = !isStandalone && scrollId === paddedId;
            const contentStyle = shouldPad && StyleSheet.flatten(node.props?.contentContainerStyle);
            const rootRenderItem = node.props?.renderItem;
            const hasInternalList = !isStandalone && (typeof rootRenderItem === 'function' && !node.props?.children);

            const doRefCleanup = () => {
                if (
                    viewRefsMap.current[scrollId]?.scrollRef ||
                    Object.keys(viewRefsMap.current[scrollId]?.inputRef || {}).length
                ) return;
                delete viewRefsMap.current[scrollId];
            }

            const injectChild = inputNode => {
                if (offDodgeScan(inputNode)) return createHijackedElement(inputNode);

                if (!isDodgeInput(inputNode, disableTagCheck)) return;

                const inputRenderer = () => {
                    const inputId = useMemo(() => `${++nodeIdIte.current}`, []);
                    const initInputNode = () => {
                        initNode();
                        if (!viewRefsMap.current[scrollId].inputRef[inputId])
                            viewRefsMap.current[scrollId].inputRef[inputId] = {};
                        viewRefsMap.current[scrollId].inputRef[inputId].props = {
                            dodge_keyboard_offset: inputNode.props?.dodge_keyboard_offset,
                            dodge_keyboard_lift: inputNode.props?.dodge_keyboard_lift,
                            dodge_keyboard_clipping: inputNode.props?.dodge_keyboard_clipping
                        };
                    }

                    initInputNode();

                    const newProps = {
                        ...inputNode.props,
                        __dodging_keyboard: true,
                        onFocus: (...args) => {
                            doDodgeKeyboard.current(lastKeyboardEvent.current);
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
                    };

                    return cloneElement(inputNode, newProps);
                }

                return createHijackedElement(
                    <__HijackNode>
                        {inputRenderer}
                    </__HijackNode>
                );
            }

            const newProps = {
                ...node.props,
                __dodging_keyboard: true,
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
                        doDodgeKeyboard.current(lastKeyboardEvent.current);
                        return node.props?.onFocus?.(...args);
                    }
                } : {},
                onLayout: (...args) => {
                    doDodgeKeyboard.current();
                    return node.props?.onLayout?.(...args);
                },
                ...isStandalone ? {} :
                    hasInternalList ? {
                        renderItem: (...args) => {
                            return (
                                <ReactHijacker
                                    doHijack={injectChild}>
                                    {rootRenderItem(...args)}
                                </ReactHijacker>
                            );
                        }
                    } : {
                        children:
                            ReactHijacker({
                                children: node.props?.children,
                                doHijack: injectChild
                            })
                    }
            };

            return cloneElement(node, newProps);
        }

        return createHijackedElement(
            <__HijackNode>
                {renderer}
            </__HijackNode>
        );
    };

    return (
        <ReactHijacker
            doHijack={onHijackNode}>
            {children}
        </ReactHijacker>
    );
});

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

const REACT_SYMBOLS = {
    forwardRef: Symbol.for('react.forward_ref'),
    memo: Symbol.for('react.memo')
};

export function ReactHijacker({ children, doHijack, enableLocator }) {
    const instantDoHijack = useRef();
    instantDoHijack.current = doHijack;

    const injectIntoTree = (node, path) => {
        if (!node) return node;
        if (Array.isArray(node)) {
            return Children.map(node, (v, i) => injectIntoTree(v, path && [...path, i]));
        }
        if (!isValidElement(node)) return node;

        if (path) path = [...path, getNodeId(node)];

        let thisObj;
        if (Object.hasOwn((thisObj = instantDoHijack.current?.(node, path)) || {}, '__element')) {
            return thisObj.__element;
        }

        if (!isHostElement(node)) {
            const wrapNodeType = (nodeType, pathway, pathKey) => {
                if (pathway) pathway = [...pathway, getNodeId(undefined, nodeType, pathKey)];

                // if (doLogging) console.log('wrapNodeType path:', pathway, ' node:', nodeType);
                const render = (renderedNode) => {
                    // if (doLogging) console.log('deep path:', pathway, ' node:', renderedNode);
                    return injectIntoTree(renderedNode, pathway && [...pathway, 0]);
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
                            const hijackType = useMemo(() =>
                                wrapNodeType(node.type, path && path.slice(0, -1), node.key),
                                [node.type]
                            );

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
                children: injectIntoTree(children, path && [...path, 0])
            });

        return node;
    };

    return injectIntoTree(children, enableLocator ? [] : undefined);
};

export const createHijackedElement = (element) => ({ __element: element });
export function __HijackNode({ children }) {
    return children?.();
}

function __HijackNodePath({ children }) {
    return children?.();
}

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

const offDodgeScan = (node) => node?.props?.dodge_keyboard_scan_off || node?.props?.__dodging_keyboard;

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

const isOffScreenY = (keyboardInfo, minimumThreshold = .27) =>
    !keyboardInfo ||
    keyboardInfo.height <= 0 ||
    ((keyboardInfo.screenY / (keyboardInfo.screenY + keyboardInfo.height)) < .40) ||
    (keyboardInfo.screenY / Dimensions.get('window').height) < minimumThreshold;

const isOffScreenX = (keyboardInfo, minimumThreshold = .7) => {
    const vw = Dimensions.get('window').width;

    return !keyboardInfo ||
        (Math.min(keyboardInfo.width, vw) / Math.max(keyboardInfo.width, vw)) < minimumThreshold;
}

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

            const kh = (visible && !isOffScreenX(endCoordinates) && !isOffScreenY(endCoordinates, .3))
                ? Math.max(Dimensions.get('window').height - endCoordinates.screenY, 0)
                : 0;

            const newHeight = Math.max(0, instantDoHeight.current ? instantDoHeight.current(kh) : kh);
            const newDuration = (Math.abs(height._value - newHeight) * duration) / Math.max(0, endCoordinates.height);

            Animated.timing(height, {
                duration: newDuration || 0,
                toValue: newHeight,
                useNativeDriver: false
            }).start();
        }

        const initialMetric = Keyboard.metrics();
        if (initialMetric)
            updateKeyboardHeight({
                endCoordinates: initialMetric,
                isEventFromThisApp: true,
                duration: 0
            }, true);

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