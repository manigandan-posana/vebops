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
import HandymanOutlinedIcon from "@mui/icons-material/HandymanOutlined";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import BusinessIcon from "@mui/icons-material/Business";
import useLogout from "./hooks/useLogout";

const drawerWidth = 256;

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
  if (key.includes("kit")) return HandymanOutlinedIcon;
  if (key.includes("purchase")) return ShoppingCartIcon;
  if (key.includes("company")) return BusinessIcon;
  return FiberManualRecordRoundedIcon;
};

export default function Sidebar({ items = [], open = false, onClose }) {
  const doLogout = useLogout();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const accentColors = React.useMemo(
    () => [theme.palette.primary.main],
    [theme.palette.primary.main]
  );

  const logoSrc =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_LOGO_URL) ||
    "/VebOps.png";

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header / Logo */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.75}
        sx={{
          px: 2.5,
          py: 2,
          minHeight: 68,
        }}
      >
        <Box
          component="img"
          src={logoSrc}
          alt="VebOps"
          sx={{
            width: 120,
            objectFit: "contain",
          }}
        />
        {!isDesktop && (
          <IconButton
            onClick={onClose}
            sx={{
              ml: "auto",
              color: alpha(theme.palette.text.primary, 0.6),
            }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.8) }} />

      {/* Nav items */}
      <Box sx={{ flex: 1, overflowY: "auto", py: 1 }}>
        <List sx={{ py: 0, px: 1 }}>
          {items.map((item, index) => {
            const Icon = iconFor(item.label);
            const accent =
              accentColors[index % accentColors.length] || theme.palette.primary.main;

            return (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.end}
                onClick={!isDesktop ? onClose : undefined}
                sx={{
                  mx: 1,
                  my: 0.25,
                  borderRadius: 1.5,
                  px: 1.75,
                  py: 0.85,
                  color: alpha(theme.palette.text.primary, 0.8),
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  transition: "background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease",
                  "& .MuiListItemIcon-root": {
                    color: alpha(accent, 0.9),
                  },
                  "&.active": {
                    backgroundColor: alpha(accent, 0.08),
                    color: accent,
                    boxShadow: `0 0 0 1px ${alpha(accent, 0.18)}`,
                    "& .MuiListItemIcon-root": {
                      color: accent,
                    },
                  },
                  "&:hover": {
                    backgroundColor: alpha(accent, 0.04),
                    color: accent,
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 1,
                      border: `1px solid ${alpha(accent, 0.24)}`,
                      background: alpha(accent, 0.06),
                      color: accent,
                    }}
                  >
                    <Icon sx={{ fontSize: 18 }} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{
                    variant: "body2",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    noWrap: true,
                  }}
                  primary={item.label}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.8) }} />

      {/* Logout section */}
      <Box sx={{ p: 2.5 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={doLogout}
          startIcon={<LogoutRoundedIcon fontSize="small" />}
          sx={{
            justifyContent: "flex-start",
            gap: 1,
            fontWeight: 500,
            textTransform: "none",
            borderRadius: 1.5,
            color: alpha(theme.palette.text.primary, 0.9),
            borderColor: alpha(theme.palette.primary.main, 0.25),
            "&:hover": {
              borderColor: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.06),
              color: theme.palette.primary.main,
            },
          }}
        >
          Logout
        </Button>
        <Typography
          variant="caption"
          sx={{
            mt: 1.5,
            display: "block",
            color: alpha(theme.palette.text.primary, 0.6),
          }}
        >
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
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          p: 0,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
          borderRight: `1px solid ${alpha(theme.palette.divider, 0.9)}`,
          boxShadow: isDesktop
            ? "0 0 24px rgba(15,23,42,0.06)"
            : "0 0 18px rgba(15,23,42,0.12)",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}

export { drawerWidth as SIDEBAR_WIDTH };
