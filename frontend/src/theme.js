import { alpha, createTheme } from '@mui/material/styles';

const gray50 = '#F3F4F6';
const gray100 = '#E5E7EB';
const gray300 = '#D0D7DE';
const gray700 = '#374151';
const gray900 = '#111827';
const primaryMain = '#0F766E';
const secondaryMain = '#2563EB';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      light: '#14B8A6',
      dark: '#115E59',
      contrastText: '#F9FAFB',
    },
    secondary: {
      main: secondaryMain,
      light: '#60A5FA',
      dark: '#1E3A8A',
      contrastText: '#FFFFFF',
    },
    background: {
      default: gray50,
      paper: '#FFFFFF',
    },
    divider: gray300,
    text: {
      primary: gray900,
      secondary: gray700,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 13,
    h1: { fontSize: '2.25rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: '1.875rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.125rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    body1: { fontSize: '0.875rem' },
    body2: { fontSize: '0.8125rem' },
    caption: { fontSize: '0.75rem' },
  },
  shape: {
    borderRadius: 2,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: gray50,
          fontFeatureSettings: '"ss02"',
          letterSpacing: '-0.01em',
        },
        '*::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: gray300,
          borderRadius: 4,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'transparent',
      },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: gray900,
          borderBottom: `1px solid ${gray300}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 56,
          '@media (min-width:600px)': {
            minHeight: 56,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#F9FAFB',
          borderRight: `1px solid ${gray300}`,
          color: gray700,
          borderRadius: 0,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        size: 'small',
      },
      styleOverrides: {
        root: {
          borderRadius: 2,
          paddingBlock: 8,
          paddingInline: 18,
          fontWeight: 600,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          boxShadow: 'none',
          border: `1px solid ${gray300}`,
          backgroundColor: '#FFFFFF',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 2,
          boxShadow: 'none',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '16px 20px 12px',
        },
        title: {
          fontSize: '0.9375rem',
          fontWeight: 600,
        },
        subheader: {
          fontSize: '0.75rem',
          color: gray700,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px 20px 20px',
          '&:last-child': {
            paddingBottom: 20,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          minHeight: 40,
          paddingBlock: 10,
          paddingInline: 14,
          '&.active': {
            backgroundColor: alpha(primaryMain, 0.12),
            color: primaryMain,
          },
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.08),
            color: primaryMain,
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 32,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '8px 12px',
        },
        head: {
          fontSize: '0.6875rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: gray700,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          letterSpacing: 0,
          borderRadius: 2,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 4,
          border: `1px solid ${gray300}`,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: primaryMain,
          height: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          paddingInline: 12,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.75rem',
          color: gray700,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 2,
        },
      },
    },
  },
});

export default theme;
