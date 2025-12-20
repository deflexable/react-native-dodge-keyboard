import * as React from "react";
import { ScrollView, View } from "react-native";

export interface LiftUpDodge {
    /**
     * The amount (in pixels) that the view should be lifted up
     * so the focused target remains visible above the keyboard.
     */
    liftUp: number;

    /**
     * A reference to the view that should be lifted.
     * 
     * null is returned if the view has been recently removed from the node hierarchy
     */
    viewRef: ScrollView | View | null;
}

export interface DodgeKeyboardProps {
    /**
     * Extra distance added on top of the keyboard height.
     * @default 10
     */
    offset?: number;

    /**
     * Completely disables the dodge behavior.
     */
    disabled?: boolean;

    /**
     * Fires when there is not enough space to naturally dodge
     * the focused element above the keyboard.
     *
     * It indicates that *you* should manually lift up the target
     * scroll view by a given amount to keep the focused view visible.
     *
     * Useful inside small bottom-sheet modals or small scroll views placed
     * near the bottom of the screen that are covered by the keyboard.
     */
    onHandleDodging?: (info: LiftUpDodge) => void;

    /**
     * Disables automatic tag detection for scrollable and input components.
     *
     * By default, the known scrollable tags are:
     *  - "ScrollView"
     *  - "FlatList"
     *  - "SectionList"
     *  - "VirtualizedList"
     *
     * If you want a custom scrollable element to support dodging,
     * add the prop: `dodge_keyboard_scrollable={true}`.
     *
     * By default, "TextInput" is the only known input tag.
     * To enable dodging for a custom input element,
     * add the prop: `dodge_keyboard_input={true}`.
     * 
     * Input elements or views with dodge_keyboard_input={true} that are not inside a scrollable view must be manually lifted by responding to the `onHandleDodging` callback.
     */
    disableTagCheck?: boolean;

    /**
     * an handler used internally for checking if a view is focused
     * 
     * @default 
     * ```js
     *  r => r?.isFocused?.()
     * ```
     */
    checkIfElementIsFocused?: (ref: View) => boolean;

    /**
     * Child element(s) wrapped by the dodge container.
     *
     * react-native-dodge-keyboard does not add to or modify your view hierarchy,
     * so you can use the children normally.
     */
    children?: React.ReactNode;

}

export default function DodgeKeyboard(
    props: DodgeKeyboardProps
): React.ReactElement | null;

interface doHijackResult {
    /**
     * element to be replace with, providing this basically ignores the `props` field
     */
    element?: boolean;
    /**
     * props injected into the hijacked node.
     */
    props?: any;
}

interface ReactHijackerProps {
    doHijack: (node: React.ReactNode, path: Array<any> | undefined) => doHijackResult,
    enableLocator?: boolean | undefined;
    children?: React.ReactNode;
}

export function ReactHijacker(props: ReactHijackerProps): React.ReactElement | null;
export function __HijackNode(props: { children: () => React.ReactElement | null }): React.ReactElement | null;

export function createHijackedElement(element?: React.ReactElement | null): { __element: React.ReactElement | null };

export function isDodgeScrollable(element: React.ReactNode, disableTagCheck?: boolean): boolean;
export function isDodgeInput(element: React.ReactNode, disableTagCheck?: boolean): boolean;

interface KeyboardPlaceholderProps {
    doHeight: (keyboardheight: number) => number;
}

export function KeyboardPlaceholderView(props: KeyboardPlaceholderProps): React.ReactElement | null;