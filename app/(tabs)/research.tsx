import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Linking } from 'react-native';
import { useBriefcase } from '../../context/BriefcaseContext'; 

export default function ResearchHubScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [statusMessage, setStatusMessage] = useState(''); // <-- NEW: On-screen messaging!
  
  const { savedArticles, addArticle } = useBriefcase(); 

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setStatusMessage("⚠️ Please enter a topic to search.");
      return;
    }

    setIsSearching(true);
    setSearchResults([]); 
    setStatusMessage(''); // Clear previous messages

    try {
      const response = await fetch(`http://localhost:8000/api/research?topic=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();

      if (data.error) {
        // If Semantic Scholar blocks us or fails, print it to the screen!
        setStatusMessage(`❌ Search Failed: ${data.error}`);
      } else if (data.papers && data.papers.length === 0) {
        // If the search was too obscure
        setStatusMessage("⚠️ No academic papers found for those exact keywords. Try a broader search.");
      } else {
        setSearchResults(data.papers);
      }
    } catch (error) {
      setStatusMessage(`🔌 Connection Error: Make sure your Python server is running! Details: ${error.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>Research Hub</Text>
            <Text style={styles.subtitle}>Academic Database Search (Semantic Scholar)</Text>
          </View>
        </View>

        {/* SEARCH SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Topic Search</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="e.g., PFAS water treatment"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={performSearch}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={performSearch} disabled={isSearching}>
              <Text style={styles.btnText}>{isSearching ? '...' : 'Search'}</Text>
            </TouchableOpacity>
          </View>
          
          {/* NEW: VISUAL STATUS MESSAGE BOX */}
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
             <Text style={styles.loadingText}>Searching Academic Databases...</Text>
          </View>
        )}

        {/* RESULTS SECTION */}
        {!isSearching && searchResults.length > 0 && (
          <View style={styles.section}>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Results ({searchResults.length})</Text>
              <Text style={styles.briefcaseStatus}>💼 In Briefcase: {savedArticles.length}</Text>
            </View>
            
            {searchResults.map((paper, index) => {
               const isSaved = savedArticles.some(saved => saved.title === paper.title);

               return (
                 <View key={index} style={styles.articleCard}>
                   <Text style={styles.articleTitle}>{paper.title}</Text>
                   <Text style={styles.articleMeta}>{paper.authors} ({paper.year})</Text>
                   <Text style={styles.articleAbstract} numberOfLines={3}>{paper.abstract}</Text>
                   
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
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, padding: 10, fontSize: 16 },
  searchBtn: { backgroundColor: '#3498db', padding: 12, borderRadius: 8, justifyContent: 'center' },
  btnText: { color: 'white', fontWeight: 'bold' },
  
  /* NEW STATUS BOX STYLES */
  statusBox: { marginTop: 15, padding: 10, backgroundColor: '#fdfefe', borderWidth: 1, borderColor: '#e74c3c', borderRadius: 8 },
  statusText: { color: '#c0392b', fontSize: 14, fontWeight: '500' },

  loadingContainer: { alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, color: '#7f8c8d' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  briefcaseStatus: { color: '#16a085', fontWeight: 'bold' },
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