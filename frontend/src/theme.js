import { alpha, createTheme } from '@mui/material/styles';

const primaryMain = '#1A73E8';
const primaryDark = '#1558D6';
const primaryLight = '#E8F0FE';
const accentGreen = '#188038';
const accentRed = '#D93025';
const accentYellow = '#F9AB00';

const grey50 = '#F8F9FA';
const grey200 = '#E8EAED';
const grey300 = '#DADCE0';
const grey400 = '#BDC1C6';
const grey500 = '#5F6368';
const grey600 = '#3C4043';
const grey900 = '#202124';

// Backwards-compatible aliases for older palette helpers referenced during the
// recent design refresh. These ensure runtime imports that still expect the
// previous naming scheme continue to work without throwing reference errors.
export const paletteBlue = primaryMain;
export const paletteBlueDark = primaryDark;
export const neutral50 = grey50;
export const neutral200 = grey200;

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: primaryMain,
      dark: primaryDark,
      light: primaryLight,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: grey600,
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
    divider: neutral200,
    text: {
      primary: grey900,
      secondary: grey500,
      disabled: grey400,
    },
    divider: grey200,
    success: {
      main: accentGreen,
    },
    error: {
      main: accentRed,
    },
    warning: {
      main: accentYellow,
    },
    info: {
      main: primaryMain,
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h1: { fontSize: '2.125rem', fontWeight: 500, letterSpacing: '-0.01em' },
    h2: { fontSize: '1.75rem', fontWeight: 500, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.5rem', fontWeight: 500, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.25rem', fontWeight: 500 },
    h5: { fontSize: '1.125rem', fontWeight: 500 },
    h6: { fontSize: '1rem', fontWeight: 500, letterSpacing: '0.02em' },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500, fontSize: '0.875rem' },
    body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', lineHeight: 1.55 },
    button: { textTransform: 'none', fontWeight: 500, letterSpacing: '0.02em' },
    caption: { fontSize: '0.75rem', color: grey500 },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FFFFFF',
          color: grey900,
          fontFeatureSettings: '"case"',
          letterSpacing: '0',
          WebkitFontSmoothing: 'antialiased',
        },
        a: {
          color: primaryMain,
        },
        '*::-webkit-scrollbar': {
          width: 8,
          height: 8,
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: grey300,
          borderRadius: 8,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        color: 'primary',
      },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: grey900,
          borderBottom: `1px solid ${grey200}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 60,
          '@media (min-width:600px)': {
            minHeight: 64,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: `1px solid ${grey200}`,
          color: grey900,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        size: 'medium',
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingBlock: 8,
          paddingInline: 18,
        },
        outlined: {
          borderColor: grey300,
          '&:hover': {
            borderColor: primaryMain,
            backgroundColor: alpha(primaryMain, 0.08),
          },
        },
        contained: {
          backgroundColor: primaryMain,
          '&:hover': {
            backgroundColor: primaryDark,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: grey600,
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.1),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0px 6px 18px rgba(60, 64, 67, 0.12)',
        },
        outlined: {
          boxShadow: 'none',
          border: `1px solid ${grey200}`,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0px 6px 18px rgba(60, 64, 67, 0.12)',
          border: `1px solid ${grey200}`,
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '18px 20px 12px',
        },
        title: {
          fontSize: '1rem',
          fontWeight: 500,
        },
        subheader: {
          color: grey500,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '12px 20px 20px',
          '&:last-child': {
            paddingBottom: 20,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingBlock: 10,
          paddingInline: 16,
          fontWeight: 500,
          '&.active': {
            backgroundColor: alpha(primaryMain, 0.12),
            color: primaryMain,
            '& .MuiListItemIcon-root': {
              color: primaryMain,
            },
          },
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.08),
            color: primaryMain,
            '& .MuiListItemIcon-root': {
              color: primaryMain,
            },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 36,
          color: grey500,
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: `1px solid ${grey200}`,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: grey50,
          '& .MuiTableCell-head': {
            color: grey600,
            fontWeight: 600,
            letterSpacing: '0.04em',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '12px 16px',
          borderBottom: `1px solid ${grey200}`,
        },
        head: {
          fontSize: '0.75rem',
          textTransform: 'uppercase',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(primaryMain, 0.04),
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          padding: 4,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& fieldset': {
            borderColor: grey300,
          },
          '&:hover fieldset': {
            borderColor: primaryMain,
          },
          '&.Mui-focused fieldset': {
            borderColor: primaryMain,
            boxShadow: `0 0 0 3px ${alpha(primaryMain, 0.16)}`,
          },
        },
        input: {
          paddingBlock: 10,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        indicator: {
          height: 3,
          borderRadius: 3,
          backgroundColor: primaryMain,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 44,
        },
      },
    },
  },
});

theme.brandPalette = {
  csv: 'FFFFFF,1A73E8,1558D6',
  withHash: ['#FFFFFF', '#1A73E8', '#1558D6'],
  array: ['FFFFFF', '1A73E8', '1558D6'],
  object: { White: 'FFFFFF', GoogleBlue: '1A73E8', GoogleBlueDark: '1558D6' },
  extendedArray: [
    { name: 'White', hex: 'FFFFFF', rgb: [255, 255, 255], cmyk: [0, 0, 0, 0], hsb: [0, 0, 100], hsl: [0, 0, 100], lab: [100, 0, 0] },
    { name: 'Google Blue', hex: '1A73E8', rgb: [26, 115, 232], cmyk: [89, 50, 0, 9], hsb: [213, 89, 91], hsl: [213, 81, 51], lab: [56, 0, -52] },
    { name: 'Google Blue Dark', hex: '1558D6', rgb: [21, 88, 214], cmyk: [90, 59, 0, 16], hsb: [218, 90, 84], hsl: [218, 81, 46], lab: [48, 15, -61] },
  ],
  xml: `
<palette>
  <color name="White" hex="FFFFFF" r="255" g="255" b="255" />
  <color name="Google Blue" hex="1A73E8" r="26" g="115" b="232" />
  <color name="Google Blue Dark" hex="1558D6" r="21" g="88" b="214" />
</palette>
`,
};

export default theme;
