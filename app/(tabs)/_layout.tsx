import { Tabs } from 'expo-router';
import { FontAwesome5 } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{
        headerShown: false, // We hide the default headers because you built custom ones
        tabBarActiveTintColor: '#2980b9', // The color when a tab is selected
        tabBarInactiveTintColor: '#95a5a6', // The color when a tab is not selected
        tabBarStyle: { 
          backgroundColor: '#ffffff', 
          borderTopWidth: 1, 
          borderTopColor: '#ecf0f1', 
          paddingBottom: 5, 
          paddingTop: 5,
          height: 60 
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold'
        }
      }}
    >
      {/* TAB 1: THE FIELD NOTEPAD */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Field Notes',
          tabBarIcon: ({ color }) => <FontAwesome5 name="clipboard-list" size={20} color={color} />,
        }}
      />
      
      {/* TAB 2: THE WRITER STUDIO */}
      <Tabs.Screen
        name="writer"
        options={{
          title: 'Writer Studio',
          tabBarIcon: ({ color }) => <FontAwesome5 name="pen-fancy" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}