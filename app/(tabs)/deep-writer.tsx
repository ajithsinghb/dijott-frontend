import React, { useState, useRef } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function DeepWriterScreen() {
  const [rubric, setRubric] = useState('');
  const [previousSections, setPreviousSections] = useState('');
  
  // This holds the papers we load from the JSON file
  const [briefcaseData, setBriefcaseData] = useState([]); 
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Idle');
  const [generatedContent, setGeneratedContent] = useState('');

  const ws = useRef(null);

  // --- NEW: LOAD JSON FILE FUNCTION ---
  const loadSavedSession = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ 
        type: 'application/json',
        copyToCacheDirectory: true 
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileObj = result.assets[0].file; 
        const uri = result.assets[0].uri;

        let fileText = "";
        
        // Handle web vs mobile file reading
        if (Platform.OS === 'web' && fileObj) {
           fileText = await fileObj.text();
        } else {
           const response = await fetch(uri);
           fileText = await response.text();
        }

        const savedPapers = JSON.parse(fileText);
        setBriefcaseData(savedPapers);
        setStatusMessage(`✅ Successfully loaded ${savedPapers.length} papers from disk!`);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      Alert.alert("Error", "Could not read the JSON file.");
      setStatusMessage("❌ Failed to load JSON file.");
    }
  };

  // --- THE WEBSOCKET PIPELINE ---
  const startDeepResearch = () => {
    if (!rubric.trim()) {
      return Alert.alert("Hold on!", "Please enter your Instructions & Rubric.");
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setStatusMessage('🔌 Connecting to AI Engine...');

    // Connect to the Render backend
    ws.current = new WebSocket('wss://dijott-ai-engine.onrender.com/ws/deep-research');

    ws.current.onopen = () => {
      setStatusMessage('🟢 Connected! Uploading instructions and briefcase data...');
      
      // Fire the payload to Python!
      ws.current.send(JSON.stringify({
        rubric: rubric,
        briefcase_data: briefcaseData, 
        previous_sections: previousSections
      }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "status") {
        setStatusMessage(data.message);
      } else if (data.type === "content") {
        // Append the incoming text chunk to the screen
        setGeneratedContent(prev => prev + data.chunk);
      } else if (data.type === "error") {
        setStatusMessage(`❌ Error: ${data.message}`);
        setIsGenerating(false);
      } else if (data.type === "done") {
        setStatusMessage('✅ Deep Research Complete!');
        setIsGenerating(false);
      }
    };

    ws.current.onerror = (e) => {
      setStatusMessage('❌ WebSocket Error. Is the Render server asleep?');
      setIsGenerating(false);
    };

    ws.current.onclose = () => {
      setIsGenerating(false);
    };
  };

  // Safe manual abort button
  const stopGeneration = () => {
    if (ws.current) {
      ws.current.close();
      setStatusMessage('🛑 Generation aborted by user.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Deep Writer</Text>
          <Text style={styles.headerSubtitle}>Context-Aware Agentic Drafting</Text>
        </View>

        {/* SECTION 1: INSTRUCTIONS */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Instructions & Rubric</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="e.g., Write a literature review on PFAS effects on health..."
            multiline={true}
            value={rubric}
            onChangeText={setRubric}
          />
        </View>

        {/* SECTION 2: PREVIOUS CONTEXT */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Previous Sections (Optional)</Text>
            <Text style={styles.helperText}>Paste existing sections so the AI matches your tone and doesn't repeat itself.</Text>
          </View>
          <TextInput
            style={[styles.textArea, { minHeight: 80 }]}
            placeholder="Paste your existing draft here..."
            multiline={true}
            value={previousSections}
            onChangeText={setPreviousSections}
          />
        </View>

        {/* SECTION 3: THE BRIEFCASE DATA LOADER */}
        <View style={styles.statusBox}>
          <Text style={styles.briefcaseText}>
            💼 Briefcase Ready: {briefcaseData.length} papers
          </Text>
          <TouchableOpacity style={styles.loadBtn} onPress={loadSavedSession}>
             <Text style={styles.loadBtnText}>📂 Load Saved JSON</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.statusBox, { backgroundColor: '#e8f8f5', borderColor: '#1abc9c' }]}>
          <Text style={[styles.briefcaseText, { color: '#16a085' }]}>
            {statusMessage}
          </Text>
        </View>

        {/* ACTION BUTTON */}
        {!isGenerating ? (
          <TouchableOpacity style={styles.startBtn} onPress={startDeepResearch}>
            <Text style={styles.startBtnText}>🚀 START DEEP RESEARCH</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: '#e74c3c' }]} onPress={stopGeneration}>
            <Text style={styles.startBtnText}>🛑 STOP GENERATION</Text>
          </TouchableOpacity>
        )}

        {/* AI OUTPUT AREA */}
        {generatedContent !== '' && (
          <View style={styles.outputBox}>
            <Text style={styles.outputTitle}>AI Draft Output:</Text>
            <Text style={styles.outputText}>{generatedContent}</Text>
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
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2C3E50' },
  helperText: { fontSize: 13, color: '#7F8C8D', fontStyle: 'italic', marginTop: 2 },
  
  textArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 15, fontSize: 16, minHeight: 120, textAlignVertical: 'top', color: '#2c3e50' },
  
  statusBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fdfefe', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#ecf0f1', marginBottom: 10 },
  briefcaseText: { fontSize: 16, fontWeight: 'bold', color: '#2980b9' },
  
  loadBtn: { backgroundColor: '#34495e', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6 },
  loadBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  startBtn: { backgroundColor: '#9b59b6', padding: 20, borderRadius: 8, alignItems: 'center', marginBottom: 20, elevation: 2 },
  startBtnText: { color: 'white', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 },

  outputBox: { backgroundColor: '#f3e5f5', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#ce93d8', minHeight: 300 },
  outputTitle: { fontWeight: 'bold', color: '#6a1b9a', fontSize: 18, marginBottom: 15 },
  outputText: { color: '#4a148c', fontSize: 16, lineHeight: 26 },
});
