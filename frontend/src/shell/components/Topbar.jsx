import React from "react";
import { useSelector } from "react-redux";
import {
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Typography,
  Stack,
  Tooltip,
  Badge,
  useTheme,
  useMediaQuery,
  Box,
} from "@mui/material";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";

export default function Topbar({ onMenuClick }) {
  const { user } = useSelector((s) => s.auth);
  const initial = (user?.name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: (th) => th.zIndex.drawer + 1,
        boxShadow: "0 8px 24px rgba(16, 42, 67, 0.18)",
        backdropFilter: "blur(16px)",
      }}
    >
      <Toolbar sx={{ minHeight: 72, px: { xs: 2, sm: 3, lg: 6 } }}>
        {!isDesktop ? (
          <IconButton
            color="inherit"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: 2, bgcolor: "rgba(255,255,255,0.08)", "&:hover": { bgcolor: "rgba(255,255,255,0.18)" } }}
          >
            <MenuRoundedIcon />
          </IconButton>
        ) : (
          <Box sx={{ width: 40 }} />
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Notifications">
            <IconButton sx={{ color: "common.white" }}>
              <Badge color="secondary" variant="dot" overlap="circular">
                <NotificationsNoneRoundedIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title={user?.name || user?.email || "User"}>
            <Avatar
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "common.white",
                border: "2px solid rgba(255,255,255,0.35)",
                fontWeight: 600,
              }}
            >
              {initial}
            </Avatar>
          </Tooltip>
          {isDesktop && (
            <Typography variant="subtitle2" sx={{ color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
              {user?.name || user?.email || "Welcome"}
            </Typography>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
