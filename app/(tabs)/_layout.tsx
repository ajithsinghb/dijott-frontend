import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native'; 

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#9b59b6', 
        tabBarStyle: {
          backgroundColor: '#1e272e', 
          borderTopWidth: 0,
          elevation: 10,
          height: Platform.OS === 'web' ? 60 : 70, 
          paddingBottom: Platform.OS === 'web' ? 10 : 20,
        },
      }}>
      
      {/* TAB 1: Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>, 
        }}
      />

      {/* TAB 2: Research Hub */}
      <Tabs.Screen
        name="research" 
        options={{
          title: 'Research Hub',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💼</Text>, 
        }}
      />

      {/* TAB 3: Deep Writer */}
      <Tabs.Screen
        name="deep-writer"
        options={{
          title: 'Deep Writer',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>✍️</Text>, 
        }}
      />

      {/* TAB 4: The Calculator */}
      <Tabs.Screen
        name="engineer"
        options={{
          title: 'Calc',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>⚙️</Text>,
        }}
      />
      
      {/* --- HIDE UNWANTED TABS --- */}
      <Tabs.Screen
        name="writer"
        options={{
          href: null, // ✅ This hides the rogue "writer" tab!
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hides the default explore tab
        }}
      />
    </Tabs>
  );
}
