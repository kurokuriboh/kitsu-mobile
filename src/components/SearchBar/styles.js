import { StyleSheet } from 'react-native';
import * as colors from 'kitsu/constants/colors';

export const styles = StyleSheet.create({
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 3,
    height: 40,
  },
  searchIcon: {
    position: 'absolute',
    backgroundColor: 'transparent',
    padding: 10,
  },
  searchIconFocus: {
    left: 0,
    paddingRight: 0,
  },
  input: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 10,
  },
});