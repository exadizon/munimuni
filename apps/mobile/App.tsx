import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import JournalApp from './src/JournalApp';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <JournalApp />
    </SafeAreaProvider>
  );
}
