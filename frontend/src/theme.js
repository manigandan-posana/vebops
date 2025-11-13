import { alpha, createTheme } from '@mui/material/styles';

const paletteWhite = '#FFFFFF';
const paletteBlue = '#0000FF';
const paletteBlueDark = '#000099';
const paletteBlueDarker = '#000066';
const paletteBlueLight = '#6666FF';
const paletteGreen = '#00FF00';
const paletteGreenDark = '#009900';
const paletteGreenLight = '#66FF66';
const neutral100 = '#F4F6FB';
const neutral300 = '#D7DBE6';
const neutral500 = '#9AA0AF';
const textPrimary = '#000033';
const textSecondary = '#666666';

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
    background: {
      default: neutral100,
      paper: paletteWhite,
    },
    divider: neutral300,
    text: {
      primary: textPrimary,
      secondary: textSecondary,
      disabled: neutral500,
    },
    success: {
      main: '#00CC55',
      contrastText: '#002B0F',
    },
    error: {
      main: '#FF3B30',
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
    body1: { fontSize: '0.8125rem' },
    body2: { fontSize: '0.75rem' },
    caption: { fontSize: '0.6875rem' },
  },
  shape: {
    borderRadius: 0,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: neutral100,
          backgroundImage:
            'linear-gradient(135deg, rgba(0,0,255,0.04) 0%, rgba(0,255,0,0.04) 45%, rgba(255,255,255,0.9) 100%)',
          fontFeatureSettings: '"ss02"',
          letterSpacing: '-0.01em',
        },
        '*::-webkit-scrollbar': {
          width: 6,
          height: 6,
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: neutral300,
          borderRadius: 3,
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
          backgroundImage: `linear-gradient(90deg, ${paletteBlueDarker} 0%, ${paletteBlue} 60%, ${paletteGreenDark} 100%)`,
          color: paletteWhite,
          borderBottom: 'none',
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
          backgroundImage: `linear-gradient(180deg, ${paletteBlueDarker} 0%, ${paletteBlueDark} 100%)`,
          borderRight: 'none',
          color: paletteWhite,
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
          borderRadius: 0,
          paddingBlock: 6,
          paddingInline: 14,
          fontWeight: 600,
          letterSpacing: '0.02em',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 2,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
          border: `1px solid ${neutral300}`,
          backgroundColor: paletteWhite,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
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
          borderRadius: 0,
          minHeight: 40,
          paddingBlock: 9,
          paddingInline: 16,
          '&.active': {
            backgroundColor: alpha(paletteWhite, 0.12),
            color: paletteWhite,
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
          borderRadius: 0,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 2,
          border: `1px solid ${neutral300}`,
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
          borderRadius: 0,
        },
      },
    },
  },
});

theme.brandPalette = {
  tailwind: {
    white: {
      DEFAULT: '#FFFFFF',
      100: '#333333',
      200: '#666666',
      300: '#999999',
      400: '#cccccc',
      500: '#ffffff',
      600: '#ffffff',
      700: '#ffffff',
      800: '#ffffff',
      900: '#ffffff',
    },
    blue: {
      DEFAULT: '#0000FF',
      100: '#000033',
      200: '#000066',
      300: '#000099',
      400: '#0000cc',
      500: '#0000ff',
      600: '#3333ff',
      700: '#6666ff',
      800: '#9999ff',
      900: '#ccccff',
    },
    green: {
      DEFAULT: '#00FF00',
      100: '#003300',
      200: '#006600',
      300: '#009900',
      400: '#00cc00',
      500: '#00ff00',
      600: '#33ff33',
      700: '#66ff66',
      800: '#99ff99',
      900: '#ccffcc',
    },
  },
  csv: 'FFFFFF,0000FF,00FF00',
  withHash: ['#FFFFFF', '#0000FF', '#00FF00'],
  array: ['FFFFFF', '0000FF', '00FF00'],
  object: { White: 'FFFFFF', Blue: '0000FF', Green: '00FF00' },
  extendedArray: [
    { name: 'White', hex: 'FFFFFF', rgb: [255, 255, 255], cmyk: [0, 0, 0, 0], hsb: [0, 0, 100], hsl: [0, 0, 100], lab: [100, 0, 0] },
    { name: 'Blue', hex: '0000FF', rgb: [0, 0, 255], cmyk: [100, 100, 0, 0], hsb: [240, 100, 100], hsl: [240, 100, 50], lab: [32, 79, -108] },
    { name: 'Green', hex: '00FF00', rgb: [0, 255, 0], cmyk: [100, 0, 100, 0], hsb: [120, 100, 100], hsl: [120, 100, 50], lab: [88, -86, 83] },
  ],
  xml: `
<palette>
  <color name="White" hex="FFFFFF" r="255" g="255" b="255" />
  <color name="Blue" hex="0000FF" r="0" g="0" b="255" />
  <color name="Green" hex="00FF00" r="0" g="255" b="0" />
</palette>
`,
};

export default theme;
