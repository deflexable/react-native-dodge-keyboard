# react-native-dodge-keyboard

### Ultra-lightweight, zero-dependency keyboard dodging for React Native - works 100% of the time inside any scrollable view.

react-native-dodge-keyboard is a tiny, zero-dependency library designed to flawlessly move your UI out of the way of the keyboard.
It is built to solve a long-standing React Native pain point: TextInputs inside ScrollViews, FlatLists, and custom scrollable layouts not being properly lifted when focused.

Unlike `KeyboardAvoidingView` and older third-party libraries, react-native-dodge-keyboard:

- Works with any scrollable container (ScrollView, FlatList, SectionList, ...more)
- Supports dynamic layout sizes
- Handles elements that are not inside a scrollable view.
- Handles scrollviews placed anywhere (nested, offset, inside modals, bottom sheets, etc.)
- Works on both iOS and Android
- Requires zero configuration
- Has no dependencies, no native modules, and no reanimated
- Smooth scrolling & stable behavior across all devices

## Installation

```sh
npm install react-native-dodge-keyboard --save
```

or using yarn

```sh
yarn add react-native-dodge-keyboard
```

## Demo

<p>
  <img src="https://github.com/deflexable/react-native-dodge-keyboard/blob/main/screenshots/main.gif" width="260">
  <img src="https://github.com/deflexable/react-native-dodge-keyboard/blob/main/screenshots/android_main.gif" width="260">
</p>

## Usage

Wrap your screen (or only the part you want to dodge) with the DodgeKeyboard component.

### Basic Example

```js
import { DodgeKeyboard } from 'react-native-dodge-keyboard';
import { ScrollView, TextInput } from 'react-native';

export default function TestScreen() {

  return (
    <DodgeKeyboard>
      <ScrollView style={{ flex: 1 }}>
        <TextInput placeholder="Name" style={styles.input} />
        <TextInput multiline placeholder="Message" style={styles.multiline} />
      </ScrollView>
    </DodgeKeyboard>
  );
}
```

## Known Issues

### Android Soft Input
Some Android devices handle keyboard dodging natively, which can lead to unexpected behavior when used with this library. To disable the native behavior and avoid issues, set `android:windowSoftInputMode="adjustNothing"` in your AndroidManifest.xml.

## Advance Use Cases

### Dodging custom views
Out of the box, `TextInput` is the only component that supports keyboard dodging. To enable this behavior for other components, pass `dodge_keyboard_input={true}` as a prop.

You can also listen to `checkIfElementIsFocused` prop and return whether the element passed as an argument is currently focused and needs to dodge the keyboard.

Kindly check [examples/CustomFocusDodge.jsx](https://github.com/deflexable/react-native-dodge-keyboard/blob/main/examples/CustomFocusDodge.jsx) for example on this approach.

A demo of the example is attach below:

<img src="https://github.com/deflexable/react-native-dodge-keyboard/blob/main/screenshots/custom.gif" width="260">


### Dodging static element
To dodge `TextInput` or component with prop `dodge_keyboard_input={true}` that are not inside a scrollable view, you need to listen to `onHandleDodging` to manually lift up the component yourself.

Kindly check [examples/ManualLifting.jsx](https://github.com/deflexable/react-native-dodge-keyboard/blob/main/examples/ManualLifting.jsx) for example on this approach.

A demo of the example is attach below:

<img src="https://github.com/deflexable/react-native-dodge-keyboard/blob/main/screenshots/static.gif" width="260">