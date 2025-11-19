# react-native-dodge-keyboard

### Ultra-lightweight, zero-dependency keyboard dodging for React Native - works 100% of the time inside any scrollable view.

react-native-dodge-keyboard is a tiny, zero-dependency library designed to flawlessly move your UI out of the way of the keyboard.
It is built to solve a long-standing React Native pain point: TextInputs inside ScrollViews, FlatLists, and custom scrollable layouts not being properly lifted when focused.

Unlike KeyboardAvoidingView and older third-party libraries, react-native-dodge-keyboard:

- Works with any scrollable container
- Supports dynamic layout sizes
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

## Usage

Wrap your screen (or only the part you want to dodge) with the DodgeKeyboard component.

### Basic Example

```js
import DodgeKeyboard from 'react-native-dodge-keyboard';
import { ScrollView, TextInput } from 'react-native';

export default function TestingScreen() {

  return (
    <DodgeKeyboard>
      <ScrollView contentContainerStyle={{ flex: 1 }}>
        <TextInput placeholder="Name" style={styles.input} />
        <TextInput multiline placeholder="Message" style={styles.multiline} />
      </ScrollView>
    </DodgeKeyboard>
  );
}
```