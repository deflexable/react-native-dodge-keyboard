import { useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { DodgeKeyboard } from "react-native-dodge-keyboard";

export default function () {
    const [liftUp, setLiftUp] = useState(0);
    const [mt, setMT] = useState('');

    return (
        <View style={{ flex: 1 }}>
            <DodgeKeyboard
                onHandleDodging={d => {
                    console.log('onHandleDodging:', d);
                    setLiftUp(d.liftUp);
                }}>
                <View style={{ flex: 1 }}>
                    <TouchableOpacity
                        style={styles.hideKeyboardCon}
                        onPress={() => {
                            TextInput.State.currentlyFocusedInput()?.blur?.();
                        }}>
                        <Text>
                            Hide Keyboard
                        </Text>
                    </TouchableOpacity>

                    <TextInput
                        multiline
                        value={mt}
                        placeholder="Multiline Text Input Outside Scrollable View"
                        style={[styles.multiline, { marginBottom: liftUp }]}
                        onChangeText={setMT} />
                </View>
            </DodgeKeyboard>
        </View>
    );
}

const styles = {
    scrollable: {
        flex: 1,
        backgroundColor: '#eeeeeeff'
    },

    hideKeyboardCon: {
        marginTop: 90,
        backgroundColor: '#8aaaffff',
        padding: 7,
        alignSelf: 'center'
    },

    multiline: {
        backgroundColor: '#ffe59cff',
        minHeight: 50,
        maxHeight: 150,
        fontSize: 18,
        padding: 10,
        position: 'absolute',
        bottom: 45,
        width: '90%',
        alignSelf: 'center'
    }
}