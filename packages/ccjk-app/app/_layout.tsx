import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'CCJK Remote' }} />
      <Stack.Screen name="sessions" options={{ title: 'Sessions' }} />
    </Stack>
  );
}
