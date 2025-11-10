import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1B4D8C',
      light: '#3A6FB8',
      dark: '#123664',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#0F7C7D',
      light: '#4BAEAE',
      dark: '#095455',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F4F6FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1C2534',
      secondary: '#4F5B6E',
    },
    divider: '#E0E6F0',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 600 },
    h2: { fontSize: '2rem', fontWeight: 600 },
    h3: { fontSize: '1.75rem', fontWeight: 600 },
    h4: { fontSize: '1.5rem', fontWeight: 600 },
    h5: { fontSize: '1.25rem', fontWeight: 600 },
    h6: { fontSize: '1.125rem', fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'primary',
      },
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(135deg, #1B4D8C 0%, #0F7C7D 100%)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: 'none',
          backgroundImage: 'linear-gradient(180deg, #102A43 0%, #1B4D8C 100%)',
          color: '#F0F4FF',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          boxShadow: '0px 12px 32px rgba(15, 76, 129, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 20,
        },
      },
    },
  },
});

export default theme;
