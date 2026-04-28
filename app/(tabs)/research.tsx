import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import { useBriefcase } from '../../context/BriefcaseContext'; 

export default function ResearchHubScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [yearStart, setYearStart] = useState('2020'); // <-- NEW: Default year filter
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState(''); 
  
  const { savedArticles, addArticle } = useBriefcase(); 

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setStatusMessage("⚠️ Please enter a topic to search.");
      return;
    }

    setIsSearching(true);
    setSearchResults([]); 
    setStatusMessage('');

    try {
      // ⚠️ Pointed to your live Render server, added year_start, and limit=50
      const url = `https://dijott-ai-engine.onrender.com/api/research?topic=${encodeURIComponent(searchQuery)}&year_start=${yearStart}&limit=50`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        setStatusMessage(`❌ Search Failed: ${data.error}`);
      } else if (data.papers && data.papers.length === 0) {
        setStatusMessage(`⚠️ No academic papers found since ${yearStart}. Try an older year or broader search.`);
      } else {
        setSearchResults(data.papers);
      }
    } catch (error) {
      setStatusMessage(`🔌 Connection Error: Could not reach AI Engine. Details: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // --- NEW: EXPORT SESSION FEATURE ---
  const exportBriefcase = () => {
    if (!savedArticles || savedArticles.length === 0) {
      return Alert.alert("Empty", "No papers in your briefcase to save!");
    }

    const jsonString = JSON.stringify(savedArticles, null, 2);
    
    if (Platform.OS === 'web') {
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dijott_research_session.json";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } else {
      Alert.alert("Notice", "File export is currently optimized for the Web Dashboard.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>Research Hub</Text>
            <Text style={styles.subtitle}>Academic Database Search (Max: 50 Papers)</Text>
          </View>
        </View>

        {/* SEARCH SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topic Search</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g., PFAS water"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={performSearch}
            />
            <TextInput
              style={styles.yearInput}
              placeholder="Year"
              value={yearStart}
              onChangeText={setYearStart}
              keyboardType="numeric"
              maxLength={4}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={performSearch} disabled={isSearching}>
              <Text style={styles.btnText}>{isSearching ? '...' : 'Search'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* VISUAL STATUS MESSAGE BOX */}
          {statusMessage !== '' && (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          )}
        </View>

        {/* LOADING INDICATOR */}
        {isSearching && (
          <View style={styles.loadingContainer}>
             <ActivityIndicator size="large" color="#3498db" />
             <Text style={styles.loadingText}>Scouring Academic Databases...</Text>
          </View>
        )}

        {/* RESULTS SECTION */}
        {!isSearching && searchResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Results ({searchResults.length})</Text>
              
              {/* THE NEW BRIEFCASE EXPORT AREA */}
              <View style={styles.briefcaseContainer}>
                <Text style={styles.briefcaseStatus}>💼 In Briefcase: {savedArticles.length}</Text>
                {savedArticles.length > 0 && (
                  <TouchableOpacity style={styles.exportBtn} onPress={exportBriefcase}>
                    <Text style={styles.exportBtnText}>💾 Save Session</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {searchResults.map((paper, index) => {
               const isSaved = savedArticles.some(saved => saved.title === paper.title);

               return (
                 <View key={index} style={styles.articleCard}>
                   <Text style={styles.articleTitle}>{paper.title}</Text>
                   <Text style={styles.articleMeta}>{paper.authors} ({paper.year})</Text>
                   <Text style={styles.articleAbstract} numberOfLines={4}>{paper.abstract}</Text>
                   
                   <View style={styles.cardActions}>
                     {paper.url ? (
                        <TouchableOpacity onPress={() => Linking.openURL(paper.url)}>
                           <Text style={styles.linkText}>View Source</Text>
                        </TouchableOpacity>
                     ) : (
                        <Text style={styles.noLinkText}>No Link Available</Text>
                     )}
                     
                     <TouchableOpacity 
                       style={[styles.saveBtn, isSaved && styles.savedBtn]} 
                       onPress={() => addArticle(paper)}
                       disabled={isSaved}
                     >
                       <Text style={styles.btnText}>{isSaved ? '✓ Saved to Briefcase' : '➕ Save to Briefcase'}</Text>
                     </TouchableOpacity>
                   </View>
                 </View>
               );
            })}
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#34495e', marginBottom: 10 },
  searchContainer: { flexDirection: 'row', gap: 10 },
  searchInput: { flex: 3, borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 10, fontSize: 16 },
  yearInput: { flex: 1, borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 10, fontSize: 16, textAlign: 'center' },
  searchBtn: { backgroundColor: '#3498db', padding: 12, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  
  statusBox: { marginTop: 15, padding: 10, backgroundColor: '#fdfefe', borderWidth: 1, borderColor: '#e74c3c', borderRadius: 8 },
  statusText: { color: '#c0392b', fontSize: 14, fontWeight: '500' },

  loadingContainer: { alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#7f8c8d' },
  
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, flexWrap: 'wrap' },
  briefcaseContainer: { alignItems: 'flex-end' },
  briefcaseStatus: { color: '#16a085', fontWeight: 'bold', marginBottom: 5 },
  exportBtn: { backgroundColor: '#e67e22', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  exportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  articleCard: { backgroundColor: '#fdfefe', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ecf0f1' },
  articleTitle: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50', marginBottom: 5 },
  articleMeta: { fontSize: 13, color: '#7f8c8d', marginBottom: 10, fontStyle: 'italic' },
  articleAbstract: { fontSize: 14, color: '#34495e', marginBottom: 15, lineHeight: 20 },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { backgroundColor: '#27ae60', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  savedBtn: { backgroundColor: '#95a5a6' },
  linkText: { color: '#2980b9', textDecorationLine: 'underline' },
  noLinkText: { color: '#95a5a6', fontStyle: 'italic' }
});