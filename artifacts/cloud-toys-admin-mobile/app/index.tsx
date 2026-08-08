import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/ScreenState';

export default function EntryScreen() {
  const { identity, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1 }}>
        <LoadingState />
      </View>
    );
  }
  return <Redirect href={identity ? '/(tabs)' : '/login'} />;
}