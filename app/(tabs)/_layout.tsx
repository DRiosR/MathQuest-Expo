import { AnimatedTabBar } from '@/components/AnimatedTabBar';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="play"
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
        {/* Hide index tab
      <Tabs.Screen
        name="index"
        options={{
          title: 'QUEST',
          href: null,
        }}
        
      />
      */}
      <Tabs.Screen
        name="extras"
        options={{
          title: 'INFINITO',
        }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: '1V1',
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'TIENDA',
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          title: 'PERFIL',
        }}
      />
    </Tabs>
  );
}
