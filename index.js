import React, { cloneElement, useEffect, useRef, useState } from "react";
import { Dimensions, Keyboard, StyleSheet } from "react-native";

export default function ({ children, offset = 10, disabled, onHandleDodging, disableTagCheck, forceDodgeFocusId }) {

    if (forceDodgeFocusId !== undefined) {
        if (typeof forceDodgeFocusId !== 'string' || !forceDodgeFocusId.trim())
            throw `forceDodgeFocusId should be a non-empty string but got ${forceDodgeFocusId}`;
    }

    if (!isNumber(offset)) throw `offset must be a valid number but got ${offset}`;

    const [currentPaddedScroller, setCurrentPaddedScroller] = useState();

    /**
     * @type {import("react").RefObject<{[key: string]: { scrollRef: import("react-native").ScrollView, inputRef: {[key: string]: import("react-native").TextInput}, focusIdMap: {[key: string]: string} }}>}
     */
    const viewRefsMap = useRef({});
    const isKeyboardVisible = useRef();
    const onKeyboardChanged = useRef();
    const previousLift = useRef();

    const clearPreviousDodge = (scrollId) => {
        if (previousLift.current && previousLift.current !== scrollId) {
            const viewRef = viewRefsMap.current[previousLift.current]?.scrollRef;
            if (viewRef) onHandleDodging?.({ liftUp: 0, viewRef });
            previousLift.current = undefined;
        }
    }

    onKeyboardChanged.current = () => {
        const keyboardInfo = Keyboard.metrics();
        const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

        if (
            isKeyboardVisible.current &&
            keyboardInfo &&
            !disabled &&
            (keyboardInfo.width === windowWidth ||
                keyboardInfo.height + keyboardInfo.screenY === windowHeight) &&
            keyboardInfo.screenY
        ) {
            for (const [scrollId, obj] of Object.entries(viewRefsMap.current)) {
                const { scrollRef, inputRef, focusIdMap } = obj;
                if (scrollRef) {
                    for (const [inputId, inputObj] of Object.entries(inputRef)) {
                        if (forceDodgeFocusId ? focusIdMap[inputId] === forceDodgeFocusId : inputObj?.isFocused?.()) {
                            scrollRef?.getNativeScrollRef?.()?.measureInWindow?.((sx, sy, sw, sh) => {
                                inputObj.measureInWindow((x, y) => { // y is dynamic
                                    inputObj.measureLayout(scrollRef, (l, t, w, h) => { // t is fixed
                                        const scrollInputY = y - sy;

                                        if (scrollInputY >= 0 && scrollInputY <= sh) { // is input visible in viewport
                                            const clampedLift = Math.min(h, keyboardInfo.screenY);

                                            if (y + clampedLift >= keyboardInfo.screenY) { // is below keyboard
                                                const requiredScrollY = (t - (keyboardInfo.screenY - sy)) + clampedLift + offset;
                                                // for lifting up the scroll-view
                                                const liftUp = Math.max(0, requiredScrollY - t);
                                                clearPreviousDodge(scrollId);
                                                if (liftUp) {
                                                    previousLift.current = scrollId;
                                                    onHandleDodging?.({ liftUp, viewRef: scrollRef });
                                                }

                                                const scrollLift = Math.max(0, (sy + sh + (offset >= 0 ? offset : 0)) - keyboardInfo.screenY);
                                                const newScrollY = Math.min(requiredScrollY, t);

                                                console.log('scrolling-to:', requiredScrollY, ' scrollLift:', scrollLift);
                                                if (scrollLift) {
                                                    setCurrentPaddedScroller([scrollId, scrollLift, newScrollY]);
                                                } else {
                                                    scrollRef.scrollTo({ y: newScrollY, animated: true });
                                                    setCurrentPaddedScroller();
                                                }
                                            }
                                        }
                                    });
                                });
                            });
                            return;
                        }
                    }
                }
            }
        } else {
            clearPreviousDodge();
            setCurrentPaddedScroller();
        }
    }

    const [paddedId, paddedSize, paddedScroll] = currentPaddedScroller || [];

    useEffect(() => {
        if (currentPaddedScroller) {
            viewRefsMap.current[paddedId].scrollRef.scrollTo({ y: paddedScroll, animated: true });
        }
    }, [currentPaddedScroller]);

    useEffect(() => {
        try {
            onKeyboardChanged.current();
        } catch (error) {
            console.error('onDodgeKeyboard err:', error);
        }
    }, [offset, !disabled, !forceDodgeFocusId]);

    useEffect(() => {
        if (disabled) {
            isKeyboardVisible.current = false;
            return;
        }
        const frameListener = Keyboard.addListener('keyboardDidChangeFrame', e => {
            onKeyboardChanged.current();
        });

        const showListener = Keyboard.addListener('keyboardDidShow', e => {
            isKeyboardVisible.current = true;
            onKeyboardChanged.current();
        });

        const hiddenListener = Keyboard.addListener('keyboardDidHide', e => {
            isKeyboardVisible.current = false;
            onKeyboardChanged.current();
        });

        return () => {
            frameListener.remove();
            showListener.remove();
            hiddenListener.remove();
        }
    }, [!disabled]);

    return (
        <ReactHijacker
            doHijack={(node, path) => {
                if (isDodgeScrollable(node, disableTagCheck)) {
                    const scrollId = path.join('=>');
                    const initNode = () => {
                        if (!viewRefsMap.current[scrollId])
                            viewRefsMap.current[scrollId] = { inputRef: {} };
                    }
                    const shouldPad = scrollId === paddedId;
                    const contentStyle = shouldPad && StyleSheet.flatten(node.props?.contentContainerStyle);
                    const dodgeFocusIdDuplicateCheck = {};

                    return {
                        persist: true,
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
                                    delete viewRefsMap.current[scrollId];
                                }

                                const thatRef = node.props?.ref;
                                if (typeof thatRef === 'function') {
                                    thatRef(r);
                                } else if (thatRef) thatRef.current = r;
                            },
                            onLayout: (...args) => {
                                onKeyboardChanged.current();
                                return node.props?.onLayout?.(...args);
                            },
                            children:
                                <ReactHijacker
                                    path={path}
                                    doHijack={(inputNode, path) => {
                                        if (isDodgeInput(inputNode, disableTagCheck)) {
                                            const inputId = path.join('=>');

                                            const dodge_focus_id = inputNode.props?.['dodge-keyboard-focus-id'];

                                            if (dodge_focus_id) {
                                                if (typeof dodge_focus_id !== 'string' || !dodge_focus_id.trim())
                                                    throw `dodge-keyboard-focus-id must be a non-empty string but got ${dodge_focus_id}`;

                                                if (dodgeFocusIdDuplicateCheck[dodge_focus_id])
                                                    throw `duplicate dodge-keyboard-focus-id must not exist inside the same <DodgeKeyboard> ancestor component`;

                                                dodgeFocusIdDuplicateCheck[dodge_focus_id] = true;

                                                initNode();
                                                viewRefsMap.current[scrollId].focusIdMap[inputId] = dodge_focus_id;
                                            }

                                            return {
                                                persist: true,
                                                props: {
                                                    ...inputNode.props,
                                                    ...dodge_focus_id ? { key: dodge_focus_id } : {},
                                                    onFocus: (...args) => {
                                                        onKeyboardChanged.current();
                                                        return inputNode.props?.onFocus?.(...args);
                                                    },
                                                    onLayout: (...args) => {
                                                        onKeyboardChanged.current();
                                                        return inputNode.props?.onLayout?.(...args);
                                                    },
                                                    ref: r => {
                                                        if (r) {
                                                            initNode();

                                                            viewRefsMap.current[scrollId].inputRef[inputId] = r;
                                                        } else if (viewRefsMap.current[scrollId]?.inputRef?.[inputId]) {
                                                            delete viewRefsMap.current[scrollId].inputRef[inputId];
                                                        }

                                                        const thatRef = inputNode.props?.ref;
                                                        if (typeof thatRef === 'function') {
                                                            thatRef(r);
                                                        } else if (thatRef) thatRef.current = r;
                                                    }
                                                }
                                            };
                                        }
                                    }}>
                                    {node.props?.children}
                                </ReactHijacker>
                        }
                    };
                }
            }}>
            {children}
        </ReactHijacker>
    );
}

const isNumber = t => typeof t === 'number' && !isNaN(t) && Number.isFinite(t);

export function ReactHijacker({ children, doHijack, path }) {
    let proceedHijacking = true;

    const injectIntoTree = (node, path = [], wasArray) => {
        if (!proceedHijacking || !node) return node;
        if (Array.isArray(node)) {
            return React.Children.map(node, (v, i) => injectIntoTree(v, [...path, i], true));
        }
        if (!React.isValidElement(node)) return node;

        path = [...path, ...wasArray ? [] : [0], buildNodeId(node)];

        let thisObj;
        if (thisObj = doHijack(node, path)) {
            const { persist, props } = thisObj;
            proceedHijacking = persist;

            return cloneElement(node, props);
        }

        const children = node.props?.children;
        if (children)
            return cloneElement(node, {
                children: injectIntoTree(children, path)
            });

        return node;
    };

    return injectIntoTree(children, path);
}

const buildNodeId = (node) => {
    const type = node?.type;
    const finalType = typeof type === "string" ? type : (type?.displayName || type?.name || "@#Fragment");
    return `${finalType}:${node?.key}`;
}

const isDodgeScrollable = (element, disableTagCheck) => {
    if (element?.props?.['dodge-keyboard-scrollview'])
        return true;
    if (!element?.type || element?.props?.horizontal || disableTagCheck) return false;

    const scrollableTypes = ["ScrollView", "FlatList", "SectionList", "VirtualizedList"];

    return scrollableTypes.includes(element.type.displayName)
        || scrollableTypes.includes(element.type?.name);
};

const isDodgeInput = (element, disableTagCheck) => {
    if (
        element?.props?.['dodge-keyboard-input'] ||
        element?.props?.['dodge-keyboard-focus-id']
    ) return true;
    if (disableTagCheck) return false;
    const { placeholder, onChangeText } = element?.props || {};
    if (
        typeof onChangeText === 'function' ||
        (typeof placeholder === 'string' && placeholder.trim())
    ) return true;
    if (!element?.type) return false;

    const inputTypes = ["TextInput"];

    return inputTypes.includes(element.type.displayName)
        || inputTypes.includes(element.type?.name);
};