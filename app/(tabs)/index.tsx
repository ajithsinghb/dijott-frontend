import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Text, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system'; 
import * as Sharing from 'expo-sharing'; 
import { Audio } from 'expo-av'; 
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { useUser, useAuth } from "@clerk/clerk-expo";

// --- THE ACTUAL NOTEPAD APP ---
export default function NotepadScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();

  const [note, setNote] = useState('');
  const [status, setStatus] = useState('🟢 Connected to Cloud AI');
  
  const [draftImages, setDraftImages] = useState([]); 
  const [draftPdfs, setDraftPdfs] = useState([]); 
  
  const [recording, setRecording] = useState(null);
  const [draftAudio, setDraftAudio] = useState(null);
  const [isRecording, setIsRecording] = useState(false); 

  const [aiResponse, setAiResponse] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setDraftAudio(null); 
    } catch (err) { Alert.alert('Microphone Error', 'Please allow microphone permissions.'); }
  }

  async function stopRecording() {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setDraftAudio({ uri: uri, name: Platform.OS === 'web' ? 'audio.webm' : 'audio.m4a', type: Platform.OS === 'web' ? 'audio/webm' : 'audio/m4a' });
    setRecording(null);
  }

  const toggleRecording = () => isRecording ? stopRecording() : startRecording();

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Permission Needed", "We need camera access.");
    let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.5 });
    if (!result.canceled) {
      const timeTaken = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setDraftImages(prev => [...prev, { ...result.assets[0], timestamp: timeTaken }]);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.5 });
    if (!result.canceled) {
      const timeTaken = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setDraftImages(prev => [...prev, { ...result.assets[0], timestamp: timeTaken }]);
    }
  };

  const pickPdf = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: true });
    if (!result.canceled) {
      setDraftPdfs(prev => [...prev, ...result.assets]);
    }
  };

  const exportToWord = async () => {
    const textToExport = aiResponse || note;
    if (!textToExport.trim()) return Alert.alert("Empty", "There is no text to export!");

    setStatus('⏳ Generating Word Doc...');
    try {
      const doc = new Document({
        sections: [{ properties: {}, children: textToExport.split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 24 })] })) }],
      });
      const blob = await Packer.toBlob(doc);

      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'dijott_Report.docx';
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url); 
      } else {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
        const fileUri = FileSystem.documentDirectory + 'dijott_Report.docx';
        await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(fileUri, { dialogTitle: 'Save Report to OneDrive' });
      }
      setStatus('🟢 Connected to Cloud AI');
    } catch (error) {
      Alert.alert("Error", "Could not generate Word document: " + error.message);
      setStatus('🟢 Connected to Cloud AI');
    }
  };

  // --- THE NEW RENDER API CONNECTION ---
  const processNote = async () => {
    if (!note.trim()) return Alert.alert("Hold on!", "Please type some field notes first.");

    setIsThinking(true);
    setAiResponse('🧠 Gemini is analyzing and formatting your text...');

    try {
      // Pointing directly to your live Render server!
      const response = await fetch('https://dijott-ai-engine.onrender.com/api/format-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: note })
      });

      const data = await response.json();
      
      if (data.error) {
        setAiResponse(`Error: ${data.error}`);
      } else if (data.formatted_text) {
        setAiResponse(data.formatted_text);
      }
    } catch (error) { 
      setAiResponse(`Network Error: Could not connect to Render. (${error.message})`); 
    }
    
    setIsThinking(false);
  };

  return (
    <View style={styles.container}>
      {/* --- ADDED SCROLLVIEW HERE TO PREVENT TAB PUSH-DOWN --- */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>{user?.firstName ? `${user.firstName}'s dijott` : 'dijott'}</Text>
            <Text style={styles.status}>{status}</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
            <Text style={styles.buttonText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.toolbar}>
          <TouchableOpacity style={[styles.button, isRecording ? styles.recordingButton : styles.audioButton]} onPress={toggleRecording}>
            <Text style={styles.buttonText}>{isRecording ? '🛑 Stop' : draftAudio ? '🎵 Saved!' : '🎙️ Record'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.cameraButton]} onPress={takePhoto}>
            <Text style={styles.buttonText}>📷 Snap Pic</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={pickImage}>
            <Text style={styles.buttonText}>{draftImages.length > 0 ? `🖼️ ${draftImages.length} Picked` : '📎 Image'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.wordButton]} onPress={exportToWord}>
            <Text style={styles.buttonText}>📄 Save Word Doc</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.pdfButton]} onPress={pickPdf}>
            <Text style={styles.buttonText}>📑 Add PDF{draftPdfs.length > 0 ? `s (${draftPdfs.length})` : ''}</Text>
          </TouchableOpacity>

          {draftPdfs.length > 0 && (
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={() => setDraftPdfs([])}>
              <Text style={styles.buttonText}>❌ Clear PDFs</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={[styles.button, styles.aiButton, isThinking && styles.disabledButton]} onPress={processNote} disabled={isThinking}>
          <Text style={styles.buttonText}>✨ Format with AI</Text>
        </TouchableOpacity>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <Text style={styles.recordingText}>🔴 Recording in progress... feel free to snap photos!</Text>
          </View>
        )}

        {draftImages.length > 0 && (
           <View style={styles.photoCountIndicator}>
             <Text style={styles.photoCountText}>✅ {draftImages.length} photos ready for report</Text>
           </View>
        )}

        <TextInput style={styles.input} multiline placeholder="Type field notes or instructions here..." value={note} onChangeText={setNote} />

        {aiResponse !== '' && (
          <View style={styles.aiBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.aiHeader}>Generated Report:</Text>
            </View>
            <ScrollView style={styles.aiScroll}>
              <Text style={styles.aiText}>{aiResponse}</Text>
            </ScrollView>
          </View>
        )}
      
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#F5F7FA', paddingTop: 50 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#2C3E50' },
  status: { color: '#27ae60', fontWeight: '600', marginTop: 5 },
  toolbar: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  button: { backgroundColor: '#3498db', padding: 10, borderRadius: 8, minWidth: '22%', flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  signOutButton: { backgroundColor: '#95a5a6', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8 },
  wordButton: { backgroundColor: '#2980b9' },
  audioButton: { backgroundColor: '#e67e22' },
  cameraButton: { backgroundColor: '#16a085' },
  pdfButton: { backgroundColor: '#34495e' }, 
  recordingButton: { backgroundColor: '#e74c3c' },
  clearButton: { backgroundColor: '#c0392b' }, 
  aiButton: { 
  backgroundColor: '#9b59b6', 
  width: '100%', 
  marginBottom: 10, 
  paddingVertical: 15, // Gives it nice normal height
  borderRadius: 12,    // Rounds the corners
  flexGrow: 0,         // <-- THIS IS THE FIX! Stops the infinite stretching
},, 
  disabledButton: { opacity: 0.5 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  recordingIndicator: { backgroundColor: '#ffebee', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ef9a9a' },
  recordingText: { color: '#c62828', fontWeight: 'bold', textAlign: 'center' },
  photoCountIndicator: { backgroundColor: '#e8f8f5', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#1abc9c' },
  photoCountText: { color: '#16a085', fontWeight: 'bold', textAlign: 'center' },
  input: { flex: 1, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 15, fontSize: 18, textAlignVertical: 'top', elevation: 3, minHeight: 120 },
  aiBox: { minHeight: 250, flexShrink: 1, backgroundColor: '#f3e5f5', padding: 15, borderRadius: 15, marginTop: 15, borderWidth: 1, borderColor: '#ce93d8' },
  aiHeader: { fontWeight: 'bold', color: '#6a1b9a', fontSize: 16 },
  aiScroll: { flexGrow: 1 },
  aiText: { color: '#4a148c', lineHeight: 22, fontSize: 16 },
});