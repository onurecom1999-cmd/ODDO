// On the web the app waits for its fonts before it shows anything, so it loads small WOFF2 copies that
// only hold the letters DE/TR/EN need (about 250 KB instead of 2 MB). Rebuild them with
// scripts/subset-fonts.py after adding text in a new script.
export const fontFiles = {
  Anton_400Regular: require('../assets/fonts/Anton_400Regular.woff2'),
  Inter_400Regular: require('../assets/fonts/Inter_400Regular.woff2'),
  Inter_500Medium: require('../assets/fonts/Inter_500Medium.woff2'),
  Inter_600SemiBold: require('../assets/fonts/Inter_600SemiBold.woff2'),
  Inter_700Bold: require('../assets/fonts/Inter_700Bold.woff2'),
  Inter_800ExtraBold: require('../assets/fonts/Inter_800ExtraBold.woff2'),
  Caveat_600SemiBold: require('../assets/fonts/Caveat_600SemiBold.woff2'),
};
