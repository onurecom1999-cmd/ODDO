// The app's fonts as TTF for iOS and Android. Each weight is imported on its own so the bundle carries
// only the seven files the app uses, not every weight of every family.
import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { Caveat_600SemiBold } from '@expo-google-fonts/caveat/600SemiBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';

export const fontFiles = { Anton_400Regular, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Caveat_600SemiBold };
