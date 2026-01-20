import { useRef } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { DodgeKeyboard } from "react-native-dodge-keyboard";

export default function () {
    const fakeInputRef = useRef();
    const currentFocusId = useRef();

    const renderGrid = (counts = 1) =>
        Array(counts).fill().map((_, i) =>
            <View key={i} style={styles.grid}>
                <Text style={styles.gridTxt}>
                    {i}
                </Text>
            </View>
        );

    const renderCustomDodgeItem = focusId =>
        <TouchableOpacity
            ref={r => {
                if (r) r._isCustomFocused = () => currentFocusId.current === focusId;
            }}
            style={styles.dodgItem}
            dodge_keyboard_input
            onPress={() => {
                currentFocusId.current = focusId;
                fakeInputRef.current.focus();
            }}>
            <Text style={styles.dodgItemTxt}>
                Custom Focus Dodging ({focusId})
            </Text>
        </TouchableOpacity>

    return (
        <View style={{ flex: 1 }}>
            {/* this is only used for opening the keyboard */}
            <TextInput ref={fakeInputRef} style={{ height: 0, overflow: 'hidden' }} />

            <DodgeKeyboard
                checkIfElementIsFocused={r => r._isCustomFocused?.()}>
                <ScrollView style={styles.scrollable}>
                    {renderGrid(4)}
                    {renderCustomDodgeItem(1)}
                    {renderGrid(2)}
                    {renderCustomDodgeItem(2)}
                    {renderGrid(3)}
                </ScrollView>
            </DodgeKeyboard>
        </View>
    );
}

const styles = {
    scrollable: {
        flex: 1,
        backgroundColor: '#fcffa4ff'
    },

    grid: {
        marginHorizontal: 15,
        marginTop: 15,
        height: 170,
        backgroundColor: '#4fa579ff',
        justifyContent: 'center'
    },

    gridTxt: {
        fontSize: 23,
        fontWeight: 'bold',
        textAlign: 'center'
    },

    dodgItem: {
        width: 120,
        height: 120,
        backgroundColor: '#ff9696ff',
        alignSelf: 'center',
        marginTop: 15,
        justifyContent: 'center'
    },

    dodgItemTxt: {
        textAlign: 'center',
        justifyContent: 'center',
        fontWeight: 'bold'
    }
}