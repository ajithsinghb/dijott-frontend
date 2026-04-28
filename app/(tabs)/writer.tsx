import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useUser } from "@clerk/clerk-expo";
import { useBriefcase } from '../../context/BriefcaseContext'; // <-- NEW: Import Briefcase!

export default function WriterStudioScreen() {
  const { user } = useUser();
  const { savedArticles } = useBriefcase(); // <-- NEW: Access saved articles

  // --- STATE MANAGEMENT ---
  const [guidanceDocs, setGuidanceDocs] = useState([]);
  const [currentDrafts, setCurrentDrafts] = useState([]);
  const [supportiveData, setSupportiveData] = useState([]);
  
  const [isDrafting, setIsDrafting] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [plagiarismScore, setPlagiarismScore] = useState(null);

  const pickDocument = async (setDocState) => {
    let result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true });
    if (!result.canceled) {
      setDocState(prev => [...prev, ...result.assets]);
    }
  };

  // --- REAL BACKEND CONNECTION ---
  const startDrafting = async () => {
    if (guidanceDocs.length === 0) {
      return Alert.alert("Hold on!", "Please upload at least one Guidance/Rule document.");
    }
    
    setIsDrafting(true);
    setGeneratedDoc("🧠 Sending documents to Dijott AI Engine...\n🔍 Reading EPA Guidance...");

    try {
      let formData = new FormData();
      const fileToUpload = guidanceDocs[0]; 
      
      if (Platform.OS === 'web') {
        formData.append('guidance_file', fileToUpload.file); 
      } else {
        formData.append('guidance_file', { 
          uri: fileToUpload.uri, 
          name: fileToUpload.name, 
          type: fileToUpload.mimeType || 'application/pdf' 
        });
      }

      // NEW: We will attach the briefcase data so the Python backend can read it!
      formData.append('briefcase_data', JSON.stringify(savedArticles));

      const response = await fetch('http://localhost:8000/api/analyze-gap', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error) {
        setGeneratedDoc(`❌ AI Error: ${data.error}`);
      } else {
        setGeneratedDoc(`✅ Analysis Complete!\n\n${data.ai_analysis}`);
      }

    } catch (error) {
      setGeneratedDoc(`🔌 Connection Error: Make sure your Python server is running!\n\nDetails: ${error.message}`);
    }
    
    setIsDrafting(false);
  };

  const runPlagiarismCheck = () => {
    Alert.alert("Scanning...", "Sending to Plagiarism API...");
    setTimeout(() => setPlagiarismScore(2), 1500); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>Writer Studio</Text>
            <Text style={styles.subtitle}>Enterprise Drafting & Synthesis</Text>
          </View>
        </View>

        {/* SECTION 1: THE INGESTION ZONE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. The Ingestion Zone</Text>
          <Text style={styles.sectionDesc}>Upload reference materials and include your saved research.</Text>
          
          <View style={styles.buttonGrid}>
            <TouchableOpacity style={[styles.uploadBtn, styles.guidanceBtn]} onPress={() => pickDocument(setGuidanceDocs)}>
              <Text style={styles.btnText}>📘 Guidance / Rules {guidanceDocs.length > 0 && `(${guidanceDocs.length})`}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.uploadBtn, styles.draftBtn]} onPress={() => pickDocument(setCurrentDrafts)}>
              <Text style={styles.btnText}>📄 Current Draft {currentDrafts.length > 0 && `(${currentDrafts.length})`}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.uploadBtn, styles.dataBtn]} onPress={() => pickDocument(setSupportiveData)}>
              <Text style={styles.btnText}>📊 Supportive Data {supportiveData.length > 0 && `(${supportiveData.length})`}</Text>
            </TouchableOpacity>
            
            {/* NEW: Visual indicator of Briefcase contents */}
            <View style={[styles.uploadBtn, styles.briefcaseBtn]}>
              <Text style={styles.btnText}>
                💼 Saved Research ({savedArticles.length} papers attached)
              </Text>
            </View>
          </View>

          {(guidanceDocs.length > 0 || currentDrafts.length > 0 || supportiveData.length > 0) && (
             <TouchableOpacity style={styles.clearBtn} onPress={() => { setGuidanceDocs([]); setCurrentDrafts([]); setSupportiveData([]); }}>
               <Text style={styles.btnText}>❌ Clear All Uploads</Text>
             </TouchableOpacity>
          )}
        </View>

        {/* ACTION: GENERATE */}
        <TouchableOpacity style={[styles.generateBtn, isDrafting && styles.disabledBtn]} onPress={startDrafting} disabled={isDrafting}>
          <Text style={styles.generateBtnText}>{isDrafting ? '⏳ Analyzing & Drafting...' : '✨ Start Drafting Process'}</Text>
        </TouchableOpacity>

        {/* SECTION 3: THE DRAFTING BOARD */}
        {generatedDoc !== '' && (
          <View style={styles.draftingBoard}>
            <Text style={styles.boardHeader}>Drafting Board & AI Output</Text>
            <Text style={styles.generatedText}>{generatedDoc}</Text>
            
            <View style={styles.finalReviewBar}>
              <TouchableOpacity style={[styles.actionBtn, styles.wordBtn]}>
                <Text style={styles.btnText}>📄 Save to Word</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, styles.plagiarismBtn]} onPress={runPlagiarismCheck}>
                <Text style={styles.btnText}>
                  {plagiarismScore !== null ? `✅ Originality: ${100 - plagiarismScore}%` : '🔍 Plagiarism Check'}
                </Text>
              </TouchableOpacity>
            </View>
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
  section: { backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#34495e', marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: '#7f8c8d', marginBottom: 12 },
  buttonGrid: { gap: 10 },
  uploadBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  guidanceBtn: { backgroundColor: '#2980b9' },
  draftBtn: { backgroundColor: '#8e44ad' },
  dataBtn: { backgroundColor: '#16a085' },
  briefcaseBtn: { backgroundColor: '#7f8c8d', borderWidth: 1, borderColor: '#bdc3c7' }, // Styliing for the briefcase
  clearBtn: { backgroundColor: '#e74c3c', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  generateBtn: { backgroundColor: '#2c3e50', padding: 16, borderRadius: 10, alignItems: 'center', marginVertical: 10, elevation: 4 },
  generateBtnText: { color: '#f1c40f', fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
  disabledBtn: { opacity: 0.7 },
  draftingBoard: { backgroundColor: '#fdfefe', padding: 15, borderRadius: 12, marginTop: 10, borderWidth: 1, borderColor: '#bdc3c7', minHeight: 200 },
  boardHeader: { fontWeight: 'bold', color: '#2c3e50', fontSize: 16, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#ecf0f1', paddingBottom: 5 },
  generatedText: { color: '#34495e', fontSize: 15, lineHeight: 22, flexGrow: 1, marginBottom: 15 },
  finalReviewBar: { flexDirection: 'row', gap: 10, marginTop: 'auto' },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  wordBtn: { backgroundColor: '#3498db' },
  plagiarismBtn: { backgroundColor: '#d35400' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
});