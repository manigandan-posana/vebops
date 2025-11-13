import { alpha, createTheme } from '@mui/material/styles';

const paletteWhite = '#FFFFFF';
const paletteBlue = '#0000FF';
const paletteBlueDark = '#000099';
const paletteBlueLight = '#9999FF';
const paletteGreen = '#00FF00';
const paletteGreenDark = '#009900';
const paletteGreenLight = '#99FF99';
const paletteRed = '#FF0000';
const paletteRedLight = '#FF6666';
const paletteYellow = '#FFFF00';
const neutral50 = '#F9FAFB';
const neutral100 = '#F4F6F8';
const neutral200 = '#E5E7EB';
const neutral300 = '#D1D5DB';
const neutral500 = '#6B7280';
const textPrimary = '#111827';
const textSecondary = '#4B5563';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: paletteBlue,
      light: paletteBlueLight,
      dark: paletteBlueDark,
      contrastText: paletteWhite,
    },
    secondary: {
      main: paletteGreen,
      light: paletteGreenLight,
      dark: paletteGreenDark,
      contrastText: '#003300',
    },
    warning: {
      main: paletteYellow,
      contrastText: '#4A4300',
    },
    error: {
      main: paletteRed,
      light: paletteRedLight,
    },
    info: {
      main: paletteBlue,
    },
    background: {
      default: paletteWhite,
      paper: paletteWhite,
    },
    divider: neutral200,
    text: {
      primary: textPrimary,
      secondary: textSecondary,
      disabled: neutral500,
    },
    success: {
      main: paletteGreen,
      contrastText: '#004400',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 12,
    h1: { fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h2: { fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h3: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontSize: '1.25rem', fontWeight: 600 },
    h5: { fontSize: '1.125rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600, fontSize: '0.8125rem' },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    body1: { fontSize: '0.8125rem', lineHeight: 1.55 },
    body2: { fontSize: '0.75rem', lineHeight: 1.5 },
    caption: { fontSize: '0.6875rem' },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: paletteWhite,
          color: textPrimary,
          fontFeatureSettings: '"ss02"',
          letterSpacing: '-0.01em',
        },
        '*::-webkit-scrollbar': {
          width: 6,
          height: 6,
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: neutral300,
          borderRadius: 4,
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
          backgroundColor: paletteWhite,
          color: textPrimary,
          boxShadow: '0 1px 0 rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 52,
          '@media (min-width:600px)': {
            minHeight: 52,
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: paletteWhite,
          borderRight: `1px solid ${neutral200}`,
          color: textPrimary,
          borderRadius: 0,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        size: 'small',
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          paddingBlock: 6,
          paddingInline: 16,
          fontWeight: 600,
          letterSpacing: '0.02em',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 14px 28px rgba(15, 23, 42, 0.04)',
          border: `1px solid ${neutral200}`,
          backgroundColor: paletteWhite,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: {
          padding: '14px 18px 10px',
        },
        title: {
          fontSize: '0.875rem',
          fontWeight: 600,
        },
        subheader: {
          fontSize: '0.6875rem',
          color: textSecondary,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '14px 18px 18px',
          '&:last-child': {
            paddingBottom: 18,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          minHeight: 44,
          paddingBlock: 10,
          paddingInline: 16,
          fontWeight: 600,
          '&.active': {
            backgroundColor: alpha(paletteBlue, 0.12),
            color: paletteBlue,
          },
          '&:hover': {
            backgroundColor: alpha(paletteBlue, 0.08),
            color: paletteBlue,
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
          padding: '8px 14px',
        },
        head: {
          fontSize: '0.6875rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: textSecondary,
          backgroundColor: alpha(paletteBlue, 0.06),
        },
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${neutral200}`,
          boxShadow: '0 16px 32px rgba(15, 23, 42, 0.05)',
          backgroundColor: paletteWhite,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            borderBottom: `1px solid ${neutral200}`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&.MuiTableRow-head': {
            backgroundColor: 'transparent',
            '&:hover': {
              backgroundColor: 'transparent',
            },
          },
          '&:not(.MuiTableRow-head):nth-of-type(even)': {
            backgroundColor: neutral50,
          },
          '&:not(.MuiTableRow-head):hover': {
            backgroundColor: alpha(paletteBlue, 0.04),
          },
          '&:hover': {
            backgroundColor: alpha(paletteWhite, 0.08),
            color: paletteWhite,
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
          padding: '6px 10px',
        },
        head: {
          fontSize: '0.6875rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 600,
          color: textSecondary,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          letterSpacing: 0,
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${neutral200}`,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: paletteWhite,
          height: 2,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 44,
          paddingInline: 10,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.6875rem',
          color: textSecondary,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: paletteWhite,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& fieldset': {
            borderColor: neutral200,
          },
          '&:hover fieldset': {
            borderColor: paletteBlue,
          },
          '&.Mui-focused fieldset': {
            borderColor: paletteBlue,
            boxShadow: `0 0 0 3px ${alpha(paletteBlue, 0.12)}`,
          },
        },
        input: {
          paddingBlock: 10,
        },
      },
    },
  },
});

theme.brandPalette = {
  tailwind: {
    white: {
      DEFAULT: '#FFFFFF',
      100: '#F9FAFB',
      200: '#F3F4F6',
      300: '#E5E7EB',
      400: '#D1D5DB',
      500: '#FFFFFF',
      600: '#FFFFFF',
      700: '#FFFFFF',
      800: '#FFFFFF',
      900: '#FFFFFF',
    },
    blue: {
      DEFAULT: '#0000FF',
      100: '#000033',
      200: '#000066',
      300: '#000099',
      400: '#0000CC',
      500: '#0000FF',
      600: '#3333FF',
      700: '#6666FF',
      800: '#9999FF',
      900: '#CCCCFF',
    },
    green: {
      DEFAULT: '#00FF00',
      100: '#003300',
      200: '#006600',
      300: '#009900',
      400: '#00CC00',
      500: '#00FF00',
      600: '#33FF33',
      700: '#66FF66',
      800: '#99FF99',
      900: '#CCFFCC',
    },
    red: {
      DEFAULT: '#FF0000',
      100: '#330000',
      200: '#660000',
      300: '#990000',
      400: '#CC0000',
      500: '#FF0000',
      600: '#FF3333',
      700: '#FF6666',
      800: '#FF9999',
      900: '#FFCCCC',
    },
    yellow: {
      DEFAULT: '#FFFF00',
      100: '#333300',
      200: '#666600',
      300: '#999900',
      400: '#CCCC00',
      500: '#FFFF00',
      600: '#FFFF33',
      700: '#FFFF66',
      800: '#FFFF99',
      900: '#FFFFCC',
    },
  },
  csv: 'FFFFFF,FFFF00,00FF00,FF0000,0000FF',
  withHash: ['#FFFFFF', '#FFFF00', '#00FF00', '#FF0000', '#0000FF'],
  array: ['FFFFFF', 'FFFF00', '00FF00', 'FF0000', '0000FF'],
  object: { White: 'FFFFFF', Yellow: 'FFFF00', Green: '00FF00', Red: 'FF0000', Blue: '0000FF' },
  extendedArray: [
    { name: 'White', hex: 'FFFFFF', rgb: [255, 255, 255], cmyk: [0, 0, 0, 0], hsb: [0, 0, 100], hsl: [0, 0, 100], lab: [100, 0, 0] },
    { name: 'Yellow', hex: 'FFFF00', rgb: [255, 255, 0], cmyk: [0, 0, 100, 0], hsb: [60, 100, 100], hsl: [60, 100, 50], lab: [97, -16, 93] },
    { name: 'Green', hex: '00FF00', rgb: [0, 255, 0], cmyk: [100, 0, 100, 0], hsb: [120, 100, 100], hsl: [120, 100, 50], lab: [88, -86, 83] },
    { name: 'Red', hex: 'FF0000', rgb: [255, 0, 0], cmyk: [0, 100, 100, 0], hsb: [0, 100, 100], hsl: [0, 100, 50], lab: [53, 80, 67] },
    { name: 'Blue', hex: '0000FF', rgb: [0, 0, 255], cmyk: [100, 100, 0, 0], hsb: [240, 100, 100], hsl: [240, 100, 50], lab: [32, 79, -108] },
  ],
  xml: `
<palette>
  <color name="White" hex="FFFFFF" r="255" g="255" b="255" />
  <color name="Yellow" hex="FFFF00" r="255" g="255" b="0" />
  <color name="Green" hex="00FF00" r="0" g="255" b="0" />
  <color name="Red" hex="FF0000" r="255" g="0" b="0" />
  <color name="Blue" hex="0000FF" r="0" g="0" b="255" />
</palette>
`,
};

export default theme;
