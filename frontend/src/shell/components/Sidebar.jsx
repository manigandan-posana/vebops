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
} from "@mui/material";
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

const drawerWidth = 280;

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
        spacing={2}
        sx={{ px: 3, py: 2.5, minHeight: 88 }}
      >
        <Box component="img" src={logoSrc} alt="VebOps" sx={{ width: 148, objectFit: "contain" }} />
        {!isDesktop && (
          <IconButton onClick={onClose} sx={{ ml: "auto", color: "#F0F4FF" }}>
            <CloseRoundedIcon />
          </IconButton>
        )}
      </Stack>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}>
        <List sx={{ display: "grid", gap: 0.5 }}>
          {items.map((item) => {
            const Icon = iconFor(item.label);
            return (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.end}
                onClick={!isDesktop ? onClose : undefined}
                sx={{
                  borderRadius: 2,
                  color: "rgba(240,244,255,0.82)",
                  fontWeight: 500,
                  "& .MuiListItemIcon-root": {
                    minWidth: 40,
                    color: "rgba(240,244,255,0.6)",
                  },
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.12)",
                  },
                  "&.active": {
                    bgcolor: "rgba(15, 124, 125, 0.35)",
                    color: "#FFFFFF",
                    "& .MuiListItemIcon-root": {
                      color: "#FFFFFF",
                    },
                  },
                }}
              >
                <ListItemIcon>
                  <Icon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                  primary={item.label}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Box>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />
      <Box sx={{ p: 3 }}>
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          onClick={doLogout}
          startIcon={<LogoutRoundedIcon />}
          sx={{ borderRadius: 12, boxShadow: "none", py: 1.25, fontWeight: 600 }}
        >
          Logout
        </Button>
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
          backgroundColor: "transparent",
          backgroundImage: "none",
          p: 0,
        },
      }}
    >
      <Box
        sx={{
          height: "100%",
          backgroundImage: "linear-gradient(180deg, #102A43 0%, #1B4D8C 85%, #0F7C7D 100%)",
          color: "#F0F4FF",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {drawerContent}
      </Box>
    </Drawer>
  );
}
