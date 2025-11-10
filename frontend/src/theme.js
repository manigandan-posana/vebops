import { alpha, createTheme } from '@mui/material/styles';

const primaryMain = '#2563EB';
const secondaryMain = '#6366F1';
const slate950 = '#0F172A';
const slate700 = '#334155';
const slate100 = '#F1F5F9';
const slate200 = '#E2E8F0';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      light: '#60A5FA',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: secondaryMain,
      light: '#A5B4FC',
      dark: '#4F46E5',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8FAFC',
      paper: '#FFFFFF',
    },
    text: {
      primary: slate950,
      secondary: slate700,
    },
    divider: slate200,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.75rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h2: { fontSize: '2.25rem', fontWeight: 600, letterSpacing: '-0.02em' },
    h3: { fontSize: '1.875rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.5rem', fontWeight: 600 },
    h5: { fontSize: '1.25rem', fontWeight: 600 },
    h6: { fontSize: '1.125rem', fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#F8FAFC',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'inherit',
      },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: slate950,
          borderBottom: `1px solid ${slate200}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 72,
          '@media (min-width:600px)': {
            minHeight: 72,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          color: slate700,
          borderRight: `1px solid ${slate200}`,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 20,
          paddingBlock: 10,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: '0px 12px 30px rgba(15, 23, 42, 0.06)',
          border: `1px solid ${alpha(slate200, 0.9)}`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            fontSize: '0.75rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 600,
            color: slate700,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          letterSpacing: 0.2,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
          border: `1px solid ${alpha(slate200, 0.8)}`,
          boxShadow: '0px 24px 64px rgba(15, 23, 42, 0.16)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 44,
          paddingInline: 18,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        flexContainer: {
          gap: 8,
        },
        indicator: {
          display: 'none',
        },
      },
    },
  },
});

export default theme;
