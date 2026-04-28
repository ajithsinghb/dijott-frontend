import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function EngineerCalcScreen() {
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState('');

  // --- MEDIA PICKERS ---
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedFile({
        uri: result.assets[0].uri,
        name: 'upload.jpg',
        type: 'image/jpeg',
        isImage: true
      });
    }
  };

  const pickDocument = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/pdf',
        fileObj: Platform.OS === 'web' ? asset.file : null, // Needed for web uploads
        isImage: asset.mimeType?.startsWith('image/')
      });
    }
  };

  // --- SEND TO PYTHON BACKEND ---
  const runCalculation = async () => {
    if (!selectedFile) return Alert.alert("Wait!", "Please attach an image or PDF first.");
    if (!prompt.trim()) return Alert.alert("Wait!", "Please type what you want to calculate.");

    setIsCalculating(true);
    setResult('');

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);

      // Web requires the actual File object, mobile requires the URI mapping
      if (Platform.OS === 'web' && selectedFile.fileObj) {
        formData.append('file', selectedFile.fileObj);
      } else {
        formData.append('file', {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.type,
        } as any);
      }

      const response = await fetch('https://dijott-ai-engine.onrender.com/api/engineer-calc', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          // Do NOT set Content-Type manually here; fetch sets it automatically with the boundary for FormData
        },
      });

      const data = await response.json();
      
      if (data.error) {
        setResult(`❌ Error: ${data.error}`);
      } else {
        setResult(data.result);
      }
    } catch (error: any) {
      setResult(`🔌 Network Error: Could not reach the server. (${error.message})`);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Engineering Space</Text>
          <Text style={styles.headerSubtitle}>Multimodal P&ID & Chemistry Calculator</Text>
        </View>

        {/* STEP 1: ATTACH FILE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Attach Diagram or PDF</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={pickImage}>
              <Text style={styles.actionBtnText}>🖼️ Upload Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#34495e' }]} onPress={pickDocument}>
              <Text style={styles.actionBtnText}>📄 Upload PDF</Text>
            </TouchableOpacity>
          </View>

          {/* Show a preview if it's an image, or just the file name */}
          {selectedFile && (
            <View style={styles.previewBox}>
              <Text style={styles.previewText}>✅ Attached: {selectedFile.name}</Text>
              {selectedFile.isImage && <Image source={{ uri: selectedFile.uri }} style={styles.imagePreview} />}
            </View>
          )}
        </View>

        {/* STEP 2: THE PROMPT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. What do you need to solve?</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g., Balance the chemical equation in this photo, or calculate the pressure drop across this valve..."
            multiline={true}
            value={prompt}
            onChangeText={setPrompt}
          />
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity 
          style={[styles.calcBtn, isCalculating && { opacity: 0.7 }]} 
          onPress={runCalculation} 
          disabled={isCalculating}
        >
          {isCalculating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.calcBtnText}>⚙️ RUN CALCULATION</Text>
          )}
        </TouchableOpacity>

        {/* RESULT AREA */}
        {result !== '' && (
          <View style={styles.resultBox}>
            <Text style={styles.resultTitle}>Analysis & Solution:</Text>
            {/* Note: This will currently output raw text/LaTeX. We will add a LaTeX renderer next! */}
            <Text style={styles.resultText}>{result}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { marginBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#2C3E50' },
  headerSubtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50', marginBottom: 10 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#2980b9', padding: 15, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  previewBox: { marginTop: 15, padding: 10, backgroundColor: '#e8f8f5', borderRadius: 8, borderWidth: 1, borderColor: '#1abc9c', alignItems: 'center' },
  previewText: { color: '#16a085', fontWeight: 'bold', marginBottom: 5 },
  imagePreview: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'contain' },
  textArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 15, fontSize: 16, minHeight: 100, textAlignVertical: 'top', color: '#2c3e50' },
  calcBtn: { backgroundColor: '#e67e22', padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 20, elevation: 2 },
  calcBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },
  resultBox: { backgroundColor: '#fff3e0', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#ffb74d', minHeight: 200 },
  resultTitle: { fontWeight: 'bold', color: '#e65100', fontSize: 18, marginBottom: 15 },
  resultText: { color: '#424242', fontSize: 16, lineHeight: 26 },
});
