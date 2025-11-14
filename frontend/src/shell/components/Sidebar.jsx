import React from "react";
import { NavLink } from "react-router-dom";
import {
  Drawer,
  Box,
  Stack,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  useTheme,
  useMediaQuery,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import PeopleOutlineRoundedIcon from "@mui/icons-material/PeopleOutlineRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import LayersRoundedIcon from "@mui/icons-material/LayersRounded";
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import useLogout from "./hooks/useLogout";

const drawerWidth = 236;

const iconFor = (label = "") => {
  const key = label.toLowerCase();
  if (key.includes("dashboard")) return DashboardRoundedIcon;
  if (key.includes("tenant")) return GroupRoundedIcon;
  if (key.includes("user")) return PeopleOutlineRoundedIcon;
  if (key.includes("billing") || key.includes("invoice")) return ReceiptLongRoundedIcon;
  if (key.includes("setting")) return SettingsRoundedIcon;
  if (key.includes("health") || key.includes("activity")) return InsightsRoundedIcon;
  if (key.includes("proposal")) return DescriptionRoundedIcon;
  if (key.includes("assigned") || key.includes("work order")) return AssignmentTurnedInRoundedIcon;
  if (key.includes("inventory")) return Inventory2RoundedIcon;
  if (key.includes("catalog")) return MenuBookRoundedIcon;
  if (key.includes("service")) return ConfirmationNumberRoundedIcon;
  if (key.includes("job")) return WorkOutlineRoundedIcon;
  if (key.includes("operations")) return LayersRoundedIcon;
  if (key.includes("subscription")) return CreditCardRoundedIcon;
  return FiberManualRecordRoundedIcon;
};

export default function Sidebar({ items = [], open = false, onClose }) {
  const doLogout = useLogout();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const logoSrc =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_LOGO_URL) ||
    "/VebOps.png";

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.75}
        sx={{ px: 2.5, py: 2.25, minHeight: 68 }}
      >
        <Box
          component="img"
          src={logoSrc}
          alt="VebOps"
          sx={{ width: 112, objectFit: "contain" }}
        />
        {!isDesktop && (
          <IconButton onClick={onClose} sx={{ ml: "auto", color: alpha(theme.palette.text.primary, 0.6) }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      <Divider sx={{ borderColor: alpha(theme.palette.text.primary, 0.08) }} />
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List sx={{ py: 1 }}>
          {items.map((item) => {
            const Icon = iconFor(item.label);
            const accent = accentColors[index % accentColors.length];
            return (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.end}
                onClick={!isDesktop ? onClose : undefined}
                sx={{
                  color: alpha(theme.palette.text.primary, 0.8),
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  '& .MuiListItemIcon-root': {
                    color: alpha(theme.palette.primary.main, 0.85),
                  },
                  '&.active': {
                    background: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    '& .MuiListItemIcon-root': {
                      color: '#0F172A',
                    },
                  },
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 8,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      background: alpha(theme.palette.primary.main, 0.1),
                      color: theme.palette.primary.main,
                    }}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500, letterSpacing: '0.02em' }}
                  primary={item.label}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
      <Divider sx={{ borderColor: alpha(theme.palette.text.primary, 0.08) }} />
      <Box sx={{ p: 2.5 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={doLogout}
          startIcon={<LogoutRoundedIcon fontSize="small" />}
          sx={{
            justifyContent: 'flex-start',
            gap: 1,
            fontWeight: 500,
            color: theme.palette.text.primary,
            borderColor: alpha(theme.palette.primary.main, 0.2),
            '&:hover': {
              borderColor: theme.palette.primary.main,
              background: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
            },
          }}
        >
          Logout
        </Button>
        <Typography variant="caption" sx={{ mt: 1.5, display: 'block', color: alpha(theme.palette.text.primary, 0.6) }}>
          Securely sign out of VebOps
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isDesktop ? "permanent" : "temporary"}
      open={isDesktop ? true : open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: "border-box",
          p: 0,
          backgroundImage: `linear-gradient(195deg, ${alpha('#0000FF', 0.92)} 0%, ${alpha('#000033', 0.98)} 70%)`,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export { drawerWidth as SIDEBAR_WIDTH };
