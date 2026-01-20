import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { DodgeKeyboard } from "react-native-dodge-keyboard";

export default function () {
    const [mt, setMT] = useState('');

    const renderGrid = (counts = 1) =>
        Array(counts).fill().map((_, i) =>
            <View key={i} style={styles.grid}>
                <Text style={styles.gridTxt}>
                    {i}
                </Text>
            </View>
        )

    return (
        <View style={{ flex: 1 }}>
            <DodgeKeyboard>
                <ScrollView style={styles.scrollable}>
                    {renderGrid(4)}
                    <TextInput placeholder="Text Input" style={styles.input} />
                    {renderGrid(2)}
                    <TextInput
                        multiline
                        value={mt}
                        placeholder="Multiline Text Input"
                        style={styles.multiline}
                        onChangeText={setMT} />
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

    input: {
        marginHorizontal: 15,
        height: 50,
        backgroundColor: '#fff',
        marginVertical: 15,
        fontSize: 18,
        paddingHorizontal: 10
    },

    multiline: {
        marginHorizontal: 15,
        backgroundColor: '#fff',
        minHeight: 50,
        maxHeight: 150,
        marginVertical: 15,
        fontSize: 18,
        padding: 10
    }
}