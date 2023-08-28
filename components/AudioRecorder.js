import React, { useState, useEffect } from 'react';
import {
  View, Text, Button, FlatList, StyleSheet,
  Alert, TextInput, TouchableOpacity
} from 'react-native';
import { Card } from '@rneui/themed';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faStop, faMicrophone, faPlay, faPause, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';


export default function AudioRecorder() {
  const [recordings, setRecordings] = useState([]);
  const [recording, setRecording] = useState(null);
  const [audioTitle, setAudioTitle] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [editId, setEditId] = useState(null); // New state variable to track edited recording ID
  const [editTitle, setEditTitle] = useState(''); // New state variable to store edited title



  useEffect(() => {
    getSavedAudios();
  }, []);

  // retrieve the saved recordings from AsyncStorage
  const getSavedAudios = async () => {
    try {
      const savedRecordings = await AsyncStorage.getItem('recordings');
      if (savedRecordings !== null) {
        setRecordings(JSON.parse(savedRecordings));
      }
    } catch (error) {
      // Error retrieving data
      console.log(error);
    }
  };



  // request permission to access the microphone and start recording
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();

      if (permission.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
        );
        setRecording(recording);
      } else {
        setMessage("Please grant permission to app to access microphone");
        setErrorMessage(message);
      }

    } catch (error) {
      console.log("Failed to start recording", error);
    }
  };



  // stop the active recording 
  async function stopRecording() {
    try {
      await recording.stopAndUnloadAsync();

      await Audio.setAudioModeAsync(
        {
          allowsRecordingIOS: false,
        }
      )

      let recordingsArray = [...recordings];
      const { sound, status } = await recording.createNewLoadedSoundAsync();

      const newRecording = {
        id: Date.now().toString(),
        title: audioTitle,
        sound: sound,
        file: recording.getURI(),
        duration: getDurationFormatted(status.durationMillis)
      };
      recordingsArray.push(newRecording);
      setRecordings(recordingsArray);
      setRecording(undefined);
      setAudioTitle('');

      // Save recordings
      await saveRecordings([...recordings, {
        sound: recording.getURI(),
        duration: getDurationFormatted(status.durationMillis),
        file: recording.getURI(),
      }]);

    } catch (error) {
      console.log(error);
      console.error(error);
      setErrorMessage("Failed to save. Record audio first!");
    }
  };



  // Saving the recording to AsyncStorage
  async function saveRecordings(recordings) {
    try {
      await AsyncStorage.setItem('recordings', JSON.stringify(recordings));
      Alert.alert('Success', 'Audio Saved.', [{ text: 'OK' }]);
    } catch (err) {
      console.log('Error saving recordings', err)
      Alert.alert('Error', 'Failed to save audio!, Stop Recording First!', [{ text: 'OK' }]);
    }
  }



  //Get the duration
  function getDurationFormatted(millis) {
    const minutes = millis / 1000 / 60;
    const minutesDisplay = Math.floor(minutes);
    const seconds = Math.round((minutes - minutesDisplay) * 60);
    const secondsDisplay = seconds < 10 ? `0${seconds}` : seconds;
    return `${minutesDisplay}:${secondsDisplay}`;
  }



  // update the title of a recording based on its ID in AsyncStorage
  const updateAudioTitle = async (id, newTitle) => {
    try {
      const savedRecordings = await AsyncStorage.getItem('recordings');
      if (savedRecordings !== null) {
        const recordingsArray = JSON.parse(savedRecordings);
        const updatedRecordings = recordingsArray.map((recording) => {
          if (recording.id === id) {
            return { ...recording, title: newTitle };
          }
          return recording;
        });
        await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
        setRecordings(updatedRecordings);
      }
      Alert.alert('Success', 'Audio Title Updated.', [{ text: 'OK' }]);

    } catch (error) {

      console.log(error);
    }
  };



  // remove a recording from AsyncStorage based on its ID.
  const deleteRecording = async (id) => {
    try {
      const savedRecordings = await AsyncStorage.getItem('recordings');
      if (savedRecordings !== null) {
        const recordingsArray = JSON.parse(savedRecordings);
        const updatedRecordings = recordingsArray.filter((recording) => recording.id !== id);
        await AsyncStorage.setItem('recordings', JSON.stringify(updatedRecordings));
        setRecordings(updatedRecordings);
      }
      Alert.alert('Success', 'Audio Deleted...', [{ text: 'OK' }]);
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to delete audio!', [{ text: 'OK' }]);
    }
  };



  // render each recording item in the FlatList component
  const renderItem = ({ item, index }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>

      <TouchableOpacity onPress={() => {
        if (item.isPlaying) {
          item.sound.pauseAsync();
        } else {
          item.sound.replayAsync();
        }
      }} >
        <FontAwesomeIcon icon={item.isPlaying ? faPause : faPlay} size={30} color="#000080" />
      </TouchableOpacity>

      {editId === item.id ? ( // Show TextInput and Save button when editId matches the current item's ID
        <>
          <TextInput
            style={styles.inputEdit}
            value={editTitle}
            onChangeText={setEditTitle}
            onBlur={() => updateAudioTitle(item.id, editTitle)}
          />
          <Button
            style={styles.button}
            title="Save"
            onPress={() => updateAudioTitle(item.id, editTitle)}
          />
        </>
      ) : (
        <>
          <Text>Audio {index + 1} - </Text>
          <Text>{item.title} - {item.duration}</Text>

          <TouchableOpacity onPress={() => {
            setEditId(item.id);
            setEditTitle(item.title)
          }} >
            <FontAwesomeIcon icon={faEdit} size={30} color='#000080' />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => deleteRecording(item.id)}>
            <FontAwesomeIcon icon={faTrash} size={30} color='#000080' />
          </TouchableOpacity>
        </>
      )}
    </View>
  );



  return (
    <View style={styles.container}>

      <Text style={styles.heading}>Audio Recorder</Text>

      <Card containerStyle={{ marginTop: 15, marginBottom: 15, height: 280, width: 300, backgroundColor: '#87ceeb', borderRadius: 10 }}>
        <Card.Title>RECORD AUDIO</Card.Title>
        <Card.Divider />
        <Text>{errorMessage}</Text>
        {recording ? (
          <TouchableOpacity onPress={stopRecording}>
            <FontAwesomeIcon icon={faStop} size={30} color="red" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={startRecording}>
            <FontAwesomeIcon icon={faMicrophone} size={30} color="black" />
          </TouchableOpacity>
        )}
        {recording && <Text>Recording...</Text>}
        <TextInput
          style={styles.inputs}
          placeholder="Enter Audio Title"
          value={audioTitle}
          onChangeText={(text) => setAudioTitle(text)}
        />
        <Button
          style={styles.button}
          title="Save Recording"
          onPress={stopRecording}
        />
      </Card>

      <Card containerStyle={{ marginTop: 15, marginBottom: 15, height: 280, width: 300, backgroundColor: '#87ceeb', borderRadius: 10 }}>
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      </Card>

    </View>

  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#191970',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ffffff',
  },
  text: {
    fontSize: 18,
    marginBottom: 20,
    color: "#FFFFFF",
  },
  button: {
    backgroundColor: '#f4511e',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: 200,
    shadowColor: 'black',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: 10,
    marginBottom: 10,
  },
  inputs: {
    width: 250,
    height: 30,
    backgroundColor: '#fffafa',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 20,
  },
  inputEdit: {
    width: 100,
    height: 30,
    backgroundColor: '#fffafa',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 20,
    marginBottom: 20,
  },
  labels: {
    color: "#FFFFFF",
  },
});
