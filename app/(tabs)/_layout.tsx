import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native'; // ✅ Added Text import here!

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hides the duplicate top header
        tabBarActiveTintColor: '#9b59b6', // The purple color for the active tab
        tabBarStyle: {
          backgroundColor: '#1e272e', // A sleek dark mode tab bar
          borderTopWidth: 0,
          elevation: 10,
          height: Platform.OS === 'web' ? 60 : 70, // Gives it breathing room
          paddingBottom: Platform.OS === 'web' ? 10 : 20,
        },
      }}>
      
      {/* TAB 1: The Main Notepad */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>, // ✅ Swapped span for Text
        }}
      />

      {/* TAB 2: The Briefcase/Research Hub */}
      <Tabs.Screen
        name="research" 
        options={{
          title: 'Research Hub',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>💼</Text>, // ✅ Swapped span for Text
        }}
      />

      {/* TAB 3: The AI Writer */}
      <Tabs.Screen
        name="deep-writer"
        options={{
          title: 'Deep Writer',
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>✍️</Text>, // ✅ Swapped span for Text
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
      
      {/* Hide the default "explore" tab if you still have that file */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // This completely hides the tab from the bar
        }}
      />
    </Tabs>
  );
}
