import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useBriefcase } from '../../context/BriefcaseContext';

export default function DeepWriterScreen() {
  const { savedArticles } = useBriefcase();
  
  const [rubricText, setRubricText] = useState('');
  const [rubricFileName, setRubricFileName] = useState('');
  
  const [previousSectionsText, setPreviousSectionsText] = useState('');
  const [previousFileName, setPreviousFileName] = useState('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [finalArticle, setFinalArticle] = useState('');
  const [liveStatus, setLiveStatus] = useState('');
  
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  // --- NEW: Universal File Picker & Extractor ---
  const pickAndExtractFile = async (type: 'rubric' | 'previous') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setLiveStatus(`📄 Extracting text from ${file.name}...`);

      // Prepare file for HTTP upload
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);

      // Send to our new Python extraction endpoint
      // ✅ Change this line:
const response = await fetch('https://dijott-ai-engine.onrender.com/api/extract-text', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.error) {
        Alert.alert("Extraction Error", data.error);
        setLiveStatus('');
        return;
      }

      if (type === 'rubric') {
        setRubricText((prev) => prev + "\n\n--- UPLOADED RUBRIC ---\n" + data.text);
        setRubricFileName(file.name);
      } else {
        setPreviousSectionsText(data.text);
        setPreviousFileName(file.name);
      }
      
      setLiveStatus(''); // Clear status

    } catch (error) {
      console.error(error);
      Alert.alert("Upload Failed", "Could not process the document.");
      setLiveStatus('');
    }
  };

  const startDeepWriting = () => {
    if (savedArticles.length === 0) {
      return Alert.alert("Empty Briefcase", "Please save some articles first!");
    }
    if (!rubricText.trim()) {
      return Alert.alert("Missing Instructions", "Please provide or upload a rubric.");
    }

    setIsGenerating(true);
    setFinalArticle('');
    setLiveStatus('🔌 Connecting to AI Engine...');

   // ✅ Change this line:
ws.current = new WebSocket('wss://dijott-ai-engine.onrender.com/ws/deep-research');

    ws.current.onopen = () => {
      setLiveStatus('📡 Connected! Sending Context & Instructions...');
      ws.current?.send(JSON.stringify({
        rubric: rubricText,
        briefcase_data: savedArticles,
        previous_sections: previousSectionsText // <-- Sending the uploaded past context!
      }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status') setLiveStatus(data.message);
      else if (data.type === 'content') setFinalArticle((prevText) => prevText + data.chunk);
      else if (data.type === 'done') {
        setLiveStatus('✨ ' + data.message);
        setIsGenerating(false);
        ws.current?.close();
      } 
      else if (data.type === 'error') {
        Alert.alert("Pipeline Error", data.message);
        setLiveStatus('❌ Error occurred.');
        setIsGenerating(false);
      }
    };

    ws.current.onerror = () => {
      setLiveStatus('❌ Connection lost.');
      setIsGenerating(false);
    };
    ws.current.onclose = () => setIsGenerating(false);
  };

  const exportToWord = async () => { /* ... existing exportToWord logic stays the same ... */ };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View style={styles.headerRow}>
          <Text style={styles.header}>Deep Writer</Text>
          <Text style={styles.subtitle}>Context-Aware Agentic Drafting</Text>
        </View>

        {/* INPUT SECTION 1: RUBRIC */}
        <View style={styles.section}>
          <View style={styles.resultsHeader}>
             <Text style={styles.sectionTitle}>1. Instructions & Rubric</Text>
             <TouchableOpacity style={styles.uploadBtn} onPress={() => pickAndExtractFile('rubric')}>
               <Text style={styles.uploadBtnText}>📄 Upload PDF</Text>
             </TouchableOpacity>
          </View>
          
          {rubricFileName !== '' && <Text style={styles.fileNameText}>✅ Attached: {rubricFileName}</Text>}
          
          <TextInput
            style={styles.textArea}
            placeholder="Type instructions here, or upload a Rubric PDF to auto-fill..."
            multiline={true}
            numberOfLines={4}
            value={rubricText}
            onChangeText={setRubricText}
            textAlignVertical="top"
          />
        </View>

        {/* INPUT SECTION 2: PREVIOUS CONTEXT */}
        <View style={styles.section}>
          <View style={styles.resultsHeader}>
             <Text style={styles.sectionTitle}>2. Previous Sections (Optional)</Text>
             <TouchableOpacity style={styles.uploadBtn} onPress={() => pickAndExtractFile('previous')}>
               <Text style={styles.uploadBtnText}>📄 Upload Draft</Text>
             </TouchableOpacity>
          </View>
          
          {previousFileName !== '' ? (
            <Text style={styles.fileNameText}>✅ Context Loaded: {previousFileName}</Text>
          ) : (
            <Text style={styles.helperText}>Upload existing sections so the AI matches your tone and doesn't repeat itself.</Text>
          )}
        </View>

        {/* STATUS & ACTIONS */}
        <Text style={styles.briefcaseStatus}>💼 Briefcase Ready: {savedArticles.length} papers</Text>

        {liveStatus !== '' && (
          <View style={styles.statusBar}>
            <Text style={styles.statusText}>{liveStatus}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.generateBtn, isGenerating && styles.disabledBtn]} onPress={startDeepWriting} disabled={isGenerating}>
          <Text style={styles.generateBtnText}>
            {isGenerating ? '⏳ AGENT IS WORKING...' : '🚀 START DEEP RESEARCH'}
          </Text>
        </TouchableOpacity>

        {/* OUTPUT BOARD */}
        {finalArticle !== '' && (
          <View style={styles.draftingBoard}>
            <Text style={styles.generatedText}>{finalArticle}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 50, paddingHorizontal: 20 },
  headerRow: { marginBottom: 20 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#2C3E50' },
  subtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 2 },
  section: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#34495e' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  
  /* NEW UPLOAD UI STYLES */
  uploadBtn: { backgroundColor: '#ecf0f1', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#bdc3c7' },
  uploadBtnText: { color: '#2c3e50', fontSize: 12, fontWeight: 'bold' },
  fileNameText: { color: '#27ae60', fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  helperText: { color: '#7f8c8d', fontSize: 13, fontStyle: 'italic' },
  
  briefcaseStatus: { color: '#16a085', fontWeight: 'bold', textAlign: 'center', marginBottom: 10, fontSize: 15 },
  textArea: { backgroundColor: '#fdfefe', borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 12, fontSize: 15, minHeight: 90 },
  statusBar: { backgroundColor: '#e8f8f5', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1abc9c', marginBottom: 10 },
  statusText: { color: '#16a085', fontWeight: '600', fontSize: 14, textAlign: 'center' },
  generateBtn: { backgroundColor: '#8e44ad', padding: 16, borderRadius: 10, alignItems: 'center', marginVertical: 5, elevation: 4 },
  generateBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  disabledBtn: { opacity: 0.6 },
  draftingBoard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: '#bdc3c7', minHeight: 300, marginBottom: 40 },
  generatedText: { color: '#2c3e50', fontSize: 15, lineHeight: 24 },
});