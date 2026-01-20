import { useState } from "react";
import { FlatList, Text, TextInput, View } from "react-native";
import { DodgeKeyboard } from "react-native-dodge-keyboard";

export default function () {
    const [mt, setMT] = useState('');

    const renderGrid = (key) =>
        <View style={styles.grid}>
            <Text style={styles.gridTxt}>
                {key}
            </Text>
        </View>

    return (
        <View style={{ flex: 1 }}>
            <DodgeKeyboard>
                <FlatList
                    data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
                    style={styles.scrollable}
                    keyExtractor={v => v}
                    renderItem={({ item }) =>
                        item === 5 ?
                            <TextInput placeholder="Text Input" style={styles.input} />
                            : item === 8 ?
                                <TextInput
                                    multiline
                                    value={mt}
                                    placeholder="Multiline Text Input"
                                    style={styles.multiline}
                                    onChangeText={setMT} />
                                : renderGrid(item)
                    } />
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