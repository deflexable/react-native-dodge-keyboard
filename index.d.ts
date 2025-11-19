import * as React from "react";
import { ScrollView } from "react-native";

export interface LiftUpDodge {
    /**
     * The amount (in pixels) that the view should be lifted up
     * so the focused target remains visible above the keyboard.
     */
    liftUp: number;

    /**
     * A reference to the scrollable view that should be lifted.
     * This should be a ref to a ScrollView, FlatList, or any custom scrollable view.
     */
    viewRef: ScrollView;
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
     * add the prop: `dodge-keyboard-scrollview={true}`.
     *
     * By default, "TextInput" is the only known input tag.
     * To enable dodging for a custom input element,
     * add the prop: `dodge-keyboard-input={true}`.
     */
    disableTagCheck?: boolean;

    /**
     * If provided, this prevents ALL other input views from dodging the keyboard
     * except the one with the matching `dodge-keyboard-focus-id` prop.
     *
     * This is useful when trying to dodge a non-input view
     * or when you want strict control over which view should move.
     */
    forceDodgeFocusId?: string;

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
     * continue crawling other react node hierarchy.
     */
    persist?: boolean;
    /**
     * props injected into the hijacked node.
     */
    props?: any;
}

interface ReactHijackerProps {
    doHijack: (node: React.ReactNode, path: Array<any> | undefined) => doHijackResult,
    path?: Array<any> | undefined;
    children?: React.ReactNode;
}

export function ReactHijacker(props: ReactHijackerProps): React.ReactElement | null;